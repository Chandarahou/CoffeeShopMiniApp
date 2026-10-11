import mongoose from 'mongoose';

// A Telegram customer. telegramUserId is the stable identifier; username/name can change.
const userSchema = new mongoose.Schema(
  {
    telegramUserId: { type: String, required: true, unique: true },
    telegramUsername: { type: String, index: true },
    firstName: { type: String, default: '' },
    lastName: String,
    languageCode: String,
    lastSeenAt: Date,
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
