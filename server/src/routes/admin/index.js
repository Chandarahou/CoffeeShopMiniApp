import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { adminProductsRouter } from './products.js';
import { adminCategoriesRouter } from './categories.js';
import { adminOrdersRouter } from './orders.js';
import { adminCustomersRouter } from './customers.js';
import { adminDashboardRouter } from './dashboard.js';
import { adminUploadsRouter } from './uploads.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin());

adminRouter.use('/products', adminProductsRouter);
adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/orders', adminOrdersRouter);
adminRouter.use('/customers', adminCustomersRouter);
adminRouter.use('/dashboard', adminDashboardRouter);
adminRouter.use('/uploads', adminUploadsRouter);
