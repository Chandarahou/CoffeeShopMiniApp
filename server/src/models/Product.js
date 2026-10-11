import mongoose from 'mongoose';

const choiceSchema = new mongoose.Schema({
  label: { type: String, required: true },
  priceDelta: { type: Number, default: 0, min: 0 }, // cents
  isDefault: { type: Boolean, default: false },
});

// e.g. { key: 'size', name: 'Size', type: 'single', required: true, choices: [...] }
//      { key: 'addons', name: 'Add-ons', type: 'multiple', choices: [...] }
const optionGroupSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['single', 'multiple'], default: 'single' },
  required: { type: Boolean, default: false },
  choices: { type: [choiceSchema], default: [] },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    imageUrl: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    price: { type: Number, required: true, min: 0 }, // base price in cents
    optionGroups: { type: [optionGroupSchema], default: [] },
    isActive: { type: Boolean, default: true }, // false = deactivated, hidden from the menu
    isSoldOut: { type: Boolean, default: false }, // temporarily unavailable, still shown
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    // null = stock not tracked. Reserved for basic inventory management later.
    stock: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

export const Product = mongoose.model('Product', productSchema);
