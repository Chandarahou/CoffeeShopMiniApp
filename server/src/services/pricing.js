import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { badRequest, conflict } from '../lib/errors.js';

/**
 * Prices cart items using current product data from the database.
 * The client only sends product IDs, quantities and selected choice IDs —
 * never prices — so the server is the source of truth for totals.
 *
 * @param {{ productId: string, quantity: number, selections?: Record<string, string | string[]> }[]} items
 */
export async function priceItems(items) {
  const ids = [...new Set(items.map((i) => i.productId))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw badRequest('Invalid product id');

  const products = await Product.find({ _id: { $in: ids } }).lean();
  const activeCategories = new Set((await Category.find({ isActive: true }).distinct('_id')).map(String));
  const byId = new Map(products.filter((p) => activeCategories.has(String(p.category))).map((p) => [String(p._id), p]));

  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.isActive) throw badRequest('One of the products is no longer available');
    if (product.isSoldOut) throw conflict(`${product.name} is sold out`);

    const selections = item.selections ?? {};
    const knownKeys = new Set(product.optionGroups.map((g) => g.key));
    for (const key of Object.keys(selections)) {
      if (!knownKeys.has(key)) throw badRequest(`Unknown option "${key}" for ${product.name}`);
    }

    const options = [];
    let unitPrice = product.price;

    for (const group of product.optionGroups) {
      const raw = selections[group.key];
      let choiceIds = raw == null ? [] : [...new Set(Array.isArray(raw) ? raw : [raw])];

      if (group.type === 'single' && choiceIds.length > 1) {
        throw badRequest(`Choose only one ${group.name} for ${product.name}`);
      }
      if (choiceIds.length === 0 && group.required) {
        const fallback = group.choices.find((c) => c.isDefault);
        if (!fallback) throw badRequest(`Please choose ${group.name} for ${product.name}`);
        choiceIds = [String(fallback._id)];
      }

      for (const choiceId of choiceIds) {
        const choice = group.choices.find((c) => String(c._id) === choiceId);
        if (!choice) throw badRequest(`Invalid ${group.name} option for ${product.name}`);
        options.push({
          groupKey: group.key,
          groupName: group.name,
          choiceId: choice._id,
          label: choice.label,
          priceDelta: choice.priceDelta,
        });
        unitPrice += choice.priceDelta;
      }
    }

    return {
      product: product._id,
      productName: product.name,
      imageUrl: product.imageUrl,
      basePrice: product.price,
      options,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  // Promotions / promo codes plug in here later
  const discount = 0;

  return { items: lines, subtotal, discount, total: subtotal - discount };
}
