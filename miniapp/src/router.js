import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/menu', name: 'menu', component: () => import('./views/MenuView.vue') },
    { path: '/products/:id', name: 'product', component: () => import('./views/ProductView.vue'), meta: { back: true } },
    { path: '/cart', name: 'cart', component: () => import('./views/CartView.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('./views/CheckoutView.vue'), meta: { back: true } },
    { path: '/orders', name: 'orders', component: () => import('./views/OrdersView.vue') },
    { path: '/orders/:id', name: 'order', component: () => import('./views/OrderView.vue'), meta: { back: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
