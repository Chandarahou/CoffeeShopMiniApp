import { Router } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { notFound } from '../lib/errors.js';
import { khqrEnabled } from '../services/khqr.js';

// Public, read-only menu endpoints for the Mini App
export const catalogRouter = Router();

// Which payment options checkout should offer
catalogRouter.get('/payment-methods', (_req, res) => {
  res.json({ methods: ['cash_at_counter', ...(khqrEnabled() ? ['khqr'] : [])] });
});

catalogRouter.get('/categories', async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(categories);
});

catalogRouter.get('/products', async (req, res) => {
  const activeCategoryIds = await Category.find({ isActive: true }).distinct('_id');
  const filter = { isActive: true, category: { $in: activeCategoryIds } };

  const { category, featured, popular } = req.query;
  if (typeof category === 'string' && mongoose.isValidObjectId(category)) {
    filter.category = activeCategoryIds.some((id) => id.equals(category)) ? category : null;
  }
  if (featured === 'true') filter.isFeatured = true;
  if (popular === 'true') filter.isPopular = true;

  const products = await Product.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(products);
});

catalogRouter.get('/products/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Product not found');
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name slug').lean();
  if (!product) throw notFound('Product not found');
  res.json(product);
});
