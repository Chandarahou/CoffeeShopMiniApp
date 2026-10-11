import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import { badRequest, notFound } from '../../lib/errors.js';

export const adminProductsRouter = Router();

const cents = z.number().int().min(0).max(1_000_000);

const choiceSchema = z.object({
  _id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  priceDelta: cents.default(0),
  isDefault: z.boolean().default(false),
});

const optionGroupSchema = z.object({
  _id: z.string().optional(),
  key: z.string().trim().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and _').max(40),
  name: z.string().trim().min(1).max(60),
  type: z.enum(['single', 'multiple']).default('single'),
  required: z.boolean().default(false),
  choices: z.array(choiceSchema).min(1).max(30),
});

const productBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(''),
  imageUrl: z.url({ protocol: /^https?$/ }).or(z.literal('')).optional(),
  category: z.string(),
  price: cents,
  optionGroups: z
    .array(optionGroupSchema)
    .max(10)
    .default([])
    .refine((groups) => new Set(groups.map((g) => g.key)).size === groups.length, 'Option group keys must be unique'),
  isActive: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  stock: z.number().int().min(0).nullable().optional(),
});

async function assertCategory(id) {
  const exists = await Category.exists({ _id: id });
  if (!exists) throw badRequest('Category not found');
}

adminProductsRouter.get('/', async (req, res) => {
  const filter = {};
  if (typeof req.query.category === 'string') filter.category = req.query.category;
  const products = await Product.find(filter).populate('category', 'name').sort({ sortOrder: 1, name: 1 }).lean();
  res.json(products);
});

adminProductsRouter.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw notFound('Product not found');
  res.json(product);
});

adminProductsRouter.post('/', async (req, res) => {
  const body = productBody.parse(req.body);
  await assertCategory(body.category);
  const product = await Product.create(body);
  res.status(201).json(product);
});

adminProductsRouter.put('/:id', async (req, res) => {
  const body = productBody.parse(req.body);
  await assertCategory(body.category);
  const product = await Product.findByIdAndUpdate(req.params.id, body, { returnDocument: 'after', runValidators: true });
  if (!product) throw notFound('Product not found');
  res.json(product);
});

// Quick toggles from the product list (sold out / active / featured)
// Built without defaults on purpose: a default would silently reset every flag that wasn't sent.
const patchBody = z
  .object({ isActive: z.boolean(), isSoldOut: z.boolean(), isFeatured: z.boolean(), isPopular: z.boolean() })
  .partial()
  .strict();

adminProductsRouter.patch('/:id', async (req, res) => {
  const body = patchBody.parse(req.body);
  const product = await Product.findByIdAndUpdate(req.params.id, { $set: body }, { returnDocument: 'after' });
  if (!product) throw notFound('Product not found');
  res.json(product);
});

// Orders keep their own snapshot of name, price and options, so history is unaffected.
// To just hide a product from the menu, deactivate it instead.
adminProductsRouter.delete('/:id', async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw notFound('Product not found');
  res.json({ deleted: true });
});
