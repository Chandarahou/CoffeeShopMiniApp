import mongoose from 'mongoose';

export const ADMIN_ROLES = ['super_admin', 'owner', 'staff'];

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, default: 'staff' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true },
);

export const Admin = mongoose.model('Admin', adminSchema);
