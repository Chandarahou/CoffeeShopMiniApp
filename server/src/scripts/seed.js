// Seeds the first owner account and a sample menu. Safe to re-run: existing
// admins are left alone and the menu is only created when there are no categories.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Admin } from '../models/Admin.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

const sizes = (medium = 50, large = 100) => ({
  key: 'size',
  name: 'Size',
  type: 'single',
  required: true,
  choices: [
    { label: 'Small', priceDelta: 0, isDefault: true },
    { label: 'Medium', priceDelta: medium },
    { label: 'Large', priceDelta: large },
  ],
});
const ice = {
  key: 'ice',
  name: 'Ice level',
  type: 'single',
  required: true,
  choices: [
    { label: 'Normal Ice', isDefault: true },
    { label: 'Less Ice' },
    { label: 'No Ice' },
  ],
};
const sugar = {
  key: 'sugar',
  name: 'Sugar level',
  type: 'single',
  required: true,
  choices: ['0%', '25%', '50%', '75%', '100%'].map((label) => ({ label, isDefault: label === '50%' })),
};
const coffeeAddons = {
  key: 'addons',
  name: 'Add-ons',
  type: 'multiple',
  required: false,
  choices: [
    { label: 'Extra shot', priceDelta: 50 },
    { label: 'Vanilla syrup', priceDelta: 30 },
    { label: 'Caramel syrup', priceDelta: 30 },
    { label: 'Whipped cream', priceDelta: 25 },
  ],
};
const iced = [sizes(), ice, sugar, coffeeAddons];

const MENU = [
  {
    category: { name: 'Coffee', slug: 'coffee' },
    products: [
      { name: 'Iced Latte', description: 'Espresso with cold milk over ice.', price: 250, optionGroups: iced, isPopular: true, isFeatured: true },
      { name: 'Iced Americano', description: 'Espresso topped with cold water and ice.', price: 200, optionGroups: iced },
      { name: 'Cappuccino', description: 'Espresso with steamed milk and thick foam.', price: 250, optionGroups: [sizes(), sugar, coffeeAddons] },
      { name: 'Caramel Macchiato', description: 'Vanilla, milk, espresso and caramel drizzle.', price: 300, optionGroups: iced, isPopular: true },
    ],
  },
  {
    category: { name: 'Non-Coffee', slug: 'non-coffee' },
    products: [
      { name: 'Iced Matcha Latte', description: 'Ceremonial-grade matcha with milk.', price: 300, optionGroups: [sizes(), ice, sugar], isPopular: true, isFeatured: true },
      { name: 'Iced Chocolate', description: 'Rich cocoa with cold milk.', price: 250, optionGroups: [sizes(), ice, sugar] },
    ],
  },
  {
    category: { name: 'Tea', slug: 'tea' },
    products: [
      { name: 'Peach Iced Tea', description: 'Black tea with peach.', price: 200, optionGroups: [sizes(), ice, sugar] },
      { name: 'Jasmine Green Tea', description: 'Fragrant jasmine green tea.', price: 180, optionGroups: [sizes(), ice, sugar] },
    ],
  },
  {
    category: { name: 'Bakery', slug: 'bakery' },
    products: [
      { name: 'Butter Croissant', description: 'Flaky, all-butter croissant.', price: 150, isPopular: true },
      { name: 'Almond Croissant', description: 'Filled with almond cream.', price: 200 },
    ],
  },
  {
    category: { name: 'Desserts', slug: 'desserts' },
    products: [
      { name: 'Matcha Cheesecake', description: 'Creamy baked cheesecake with matcha.', price: 350, isFeatured: true },
      { name: 'Brownie', description: 'Fudgy chocolate brownie.', price: 175 },
    ],
  },
];

await connectDb();

// Accounts created on first run. Existing accounts are never modified.
const ADMINS = [
  { email: 'super@admin', name: 'Super Admin', role: 'super_admin', password: 'Lolz@7777' },
  { email: process.env.SEED_ADMIN_EMAIL, name: 'Owner', role: 'owner', password: process.env.SEED_ADMIN_PASSWORD },
];

for (const { email, name, role, password } of ADMINS) {
  if (!email || !password) {
    console.warn(`[seed] no credentials for ${name} — skipping`);
  } else if (await Admin.exists({ email: email.toLowerCase() })) {
    console.log(`[seed] admin ${email} already exists`);
  } else {
    await Admin.create({ email, name, role, passwordHash: await bcrypt.hash(password, 12) });
    console.log(`[seed] created ${role} ${email}`);
  }
}

if (await Category.exists({})) {
  console.log('[seed] categories exist — skipping sample menu');
} else {
  for (const [i, { category, products }] of MENU.entries()) {
    const cat = await Category.create({ ...category, sortOrder: i });
    await Product.insertMany(products.map((p, j) => ({ ...p, category: cat._id, sortOrder: j })));
  }
  console.log('[seed] created sample menu');
}

await mongoose.disconnect();
