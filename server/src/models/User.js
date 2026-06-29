const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  bwId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, default: '' },
  email: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  transferCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
