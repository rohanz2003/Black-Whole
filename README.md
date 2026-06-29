# BlackWhole

"Drop it in. It arrives."

A cosmic-themed, peer-to-peer file transfer platform for the open web. Send ANY file (audio, video, image, document, archive) directly between devices using WebRTC. No cloud storage. No size limits. End-to-end encrypted.

## Architecture Diagram (ASCII)

```
                  ┌─────────────┐                   ┌─────────────┐
                  │   User A    │                   │   User B    │
                  │ (Sender)    │                   │ (Receiver)  │
                  └──────┬──────┘                   └──────┬──────┘
                         │                               │
           ┌─────────────▼─────────────┐         ┌───────▼─────────────┐
           │                           │         │                     │
           │     WebRTC Connection     ◄───────► │     WebRTC Connection     │
           │   (DTLS 1.3 Encrypted)    │         │   (DTLS 1.3 Encrypted)    │
           │                           │         │                     │
           └─────────────┬─────────────┘         └───────┬─────────────┘
                         │                               │
                  ┌──────▼───────┐               ┌───────▼───────┐
                  │              │               │               │
                  │  File Data   │   ◄───────►   │  File Data    │
                  │ (Chunks)     │               │ (Reassembled) │
                  │              │               │               │
                  └──────▲───────┘               └───────▲───────┘
                         │                               │
                  ┌──────▼───────┐               ┌───────▼───────┐
                  │              │               │               │
                  │    UI        │               │    UI         │
                  │              │               │               │
                  └──────┬───────┘               └───────▲───────┘
                         │                               │
                  ┌──────▼───────┐               ┌───────▼───────┐
                  │              │               │               │
                  │ Firebase     │◄──────────────► Firebase      │
                  │ (Auth/Firestore)│ Signalling  │ (Auth/Firestore)│
                  │              │               │               │
                  └──────┬───────┘               └───────▲───────┘
                         │                               │
                  ┌──────▼───────┐               ┌───────▼───────┐
                  │              │               │               │
                  │   coturn     │◄──────────────►   coturn      │
                  │ (STUN/TURN)  │   Signalling   │ (STUN/TURN)   │
                  │              │               │               │
                  └──────────────┘               └───────────────┘
```

## Prerequisites

- Node.js 20 LTS or later
- Firebase project (with Authentication, Firestore, and Cloud Messaging enabled)
- coturn server (for TURN/STUN servers)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd blackwhole
   ```

2. Install dependencies:
   ```bash
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. Configure environment variables:
   - Copy `client/.env.example` to `client/.env` and fill in your Firebase values
   - Copy `server/.env.example` to `server/.env` and fill in your Firebase service account credentials

4. Start the TURN server:
   ```bash
   docker-compose up -d
   ```

5. Start the development servers:
   ```bash
   # In client directory
   npm run dev
   
   # In server directory (in another terminal)
   npm run dev
   ```

## Firebase Setup Steps

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication:
   - Enable Google Sign-In provider
   - Enable Email/Password provider
3. Create Firestore Database:
   - Start in test mode or locked mode (we'll add security rules)
   - Create a `users` collection
4. Enable Cloud Messaging (for notifications)
   - Get your VAPID key from Cloud Messaging tab
5. Get your Firebase config values:
   - Go to Project Settings > General
   - Copy the Firebase config object values
6. Generate a Firebase service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file and copy the values to server/.env

## Deploy Instructions

### Client (Vercel)
1. Push your code to a Git repository
2. Import the project to Vercel
3. Set the environment variables in Vercel dashboard
4. Vercel will automatically detect it's a Vite project and deploy

### Server (Railway)
1. Push your code to a Git repository
2. Import the project to Railway
3. Add the environment variables
4. Add a MongoDB or PostgreSQL database if needed (we're using Firebase so no additional DB needed)
5. Railway will detect the Node.js project and deploy

## How the P2P Transfer Works

1. **Authentication**: Users sign in with Google or email/password via Firebase Auth
2. **BW-ID Generation**: On first login, a unique BW-ID is generated from the Firebase UID using SHA-256 (first 6 chars uppercased, prefixed with "BW-")
3. **Signaling Server Connection**: Client connects to Node.js/Socket.io signaling server with Firebase ID token
4. **Peer Discovery**: To send a file, sender enters recipient's BW-ID
5. **Offer/Answer Exchange**:
   - Sender creates WebRTC offer and sends via signaling server to recipient
   - Receiver creates answer and sends back via signaling server
   - ICE candidates are exchanged through signaling server
6. **P2P Connection Established**: Direct WebRTC data channel established (using STUN/TURN if needed)
7. **File Transfer**:
   - File is split into 64KB chunks
   - Each chunk sent with metadata (chunk index, total chunks, checksum, filename)
   - Receiver acknowledges each chunk
   - On final chunk, file is reassembled and auto-saved using showSaveFilePicker() (with anchor fallback)
8. **Security**: 
   - All data transfer is DTLS 1.3 encrypted via WebRTC
   - No file data touches servers (only metadata for signaling)
   - Firebase only stores user metadata (BW-ID, display name, etc.)
   - TURN credentials are time-limited HMAC-SHA1 tokens

## Security Model

- **Authentication**: Firebase Auth (Google Sign-In + Email/Password)
- **Authorization**: Firebase ID token verification on Socket.io connection
- **Data Protection**: 
  - WebRTC data channels use DTLS 1.3 encryption by default
  - No file data persists on servers (only transient signaling metadata)
  - Firebase Firestore rules restrict access to user data
- **NAT Traversal**: STUN server (Google's) + TURN server (coturn) for relay when needed
- **Credentials**: TURN credentials are time-limited HMAC-SHA1 tokens generated server-side
- **Privacy**: 
  - Only BW-ID is discoverable (not email or Firebase UID)
  - Users control who they share their BW-ID with
  - Minimal data stored in Firestore (just user profile info)

## Technology Stack

### Frontend
- React 18 + Vite
- Tailwind CSS (utility-first styling)
- Three.js (black hole animation)
- Socket.io-client (signaling)
- Firebase SDK v10 (Auth + Firestore + FCM)
- native WebRTC API

### Backend (Node.js server)
- Node.js 20 LTS
- Express.js
- Socket.io
- firebase-admin (token verification)
- cors, dotenv, helmet

### Infrastructure
- coturn STUN/TURN server (docker-compose.yml)
- Firebase Firestore (metadata only, no file bytes)
- Firebase Auth (Google Sign-In + email/password)

## Local Development

```bash
# Start TURN server
docker-compose up -d

# Start client (http://localhost:5173)
cd client
npm run dev

# Start server (http://localhost:4000)
cd server
npm run dev
```

## Environment Variables

### client/.env.example
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_SIGNALING_SERVER_URL=http://localhost:4000
VITE_STUN_URL=stun:stun.l.google.com:19302
VITE_TURN_URL=turn:localhost:3478
VITE_TURN_USERNAME=blackwhole
VITE_TURN_CREDENTIAL=secret123
```

### server/.env.example
```
PORT=4000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
TURN_SECRET=secret123
TURN_SERVER_URL=localhost:3478
CLIENT_ORIGIN=http://localhost:5173
```#   B l a c k - W h o l e  
 