import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { conflict, notFound } from '../../lib/errors.js';

export const adminCategoriesRouter = Router();

const categoryFields = {
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and -')
    .max(60),
  description: z.string().trim().max(300).optional(),
  isActive: z.boolean(),
};
const createBody = z.object({ ...categoryFields, isActive: categoryFields.isActive.default(true) });
// No defaults here, so editing a name can't reactivate a deactivated category
const updateBody = z.object(categoryFields).partial().strict();

adminCategoriesRouter.get('/', async (_req, res) => {
  res.json(await Category.find().sort({ sortOrder: 1, name: 1 }).lean());
});

adminCategoriesRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body);
  const last = await Category.findOne().sort({ sortOrder: -1 }).lean();
  const category = await Category.create({ ...body, sortOrder: (last?.sortOrder ?? -1) + 1 });
  res.status(201).json(category);
});

const reorderBody = z.object({ ids: z.array(z.string()).min(1).max(200) });

adminCategoriesRouter.put('/reorder', async (req, res) => {
  const { ids } = reorderBody.parse(req.body);
  await Category.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { sortOrder: index } } })));
  res.json(await Category.find().sort({ sortOrder: 1, name: 1 }).lean());
});

adminCategoriesRouter.put('/:id', async (req, res) => {
  const body = updateBody.parse(req.body);
  const category = await Category.findByIdAndUpdate(req.params.id, body, { returnDocument: 'after', runValidators: true });
  if (!category) throw notFound('Category not found');
  res.json(category);
});

// A category with products can't be deleted (they'd be orphaned); deactivate it to hide it instead.
adminCategoriesRouter.delete('/:id', async (req, res) => {
  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount) {
    throw conflict(`This category still has ${productCount} product${productCount === 1 ? '' : 's'}. Move or delete them first.`);
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw notFound('Category not found');
  res.json({ deleted: true });
});
