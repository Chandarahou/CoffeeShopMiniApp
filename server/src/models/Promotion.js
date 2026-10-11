import mongoose from 'mongoose';

// Not wired into pricing yet — reserved for the promotions / promo-code phase.
const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    imageUrl: String,
    code: { type: String, uppercase: true, trim: true, sparse: true, unique: true },
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    discountValue: { type: Number, default: 0 }, // percent (0-100) or cents
    minSubtotal: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Promotion = mongoose.model('Promotion', promotionSchema);
