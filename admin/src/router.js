import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import AdminLayout from './components/AdminLayout.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
        { path: 'orders', name: 'orders', component: () => import('./views/OrdersView.vue') },
        { path: 'orders/new', name: 'order-new', component: () => import('./views/OrderFormView.vue') },
        { path: 'orders/:id', name: 'order', component: () => import('./views/OrderDetailView.vue') },
        { path: 'products', name: 'products', component: () => import('./views/ProductsView.vue') },
        { path: 'products/new', name: 'product-new', component: () => import('./views/ProductFormView.vue') },
        { path: 'products/:id', name: 'product-edit', component: () => import('./views/ProductFormView.vue') },
        { path: 'images', name: 'images', component: () => import('./views/ImagesView.vue') },
        { path: 'categories', name: 'categories', component: () => import('./views/CategoriesView.vue') },
        { path: 'customers', name: 'customers', component: () => import('./views/CustomersView.vue') },
        { path: 'account', name: 'account', component: () => import('./views/AccountView.vue') },
        { path: 'customers/:id', name: 'customer', component: () => import('./views/CustomerDetailView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.restore();
  if (!to.meta.public && !auth.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'dashboard' };
});
