import { useState, useEffect } from 'react';

export default function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-bw-red/90 text-bw-white text-center py-2 text-sm font-inter font-medium backdrop-blur-sm">
      ⚠ You are offline — transfers are queued and will resume when you reconnect
    </div>
  );
}
