import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import { setUnauthorizedHandler } from './lib/api.js';
import { useAuthStore } from './stores/auth.js';
import './style.css';

const app = createApp(App).use(createPinia()).use(router);

setUnauthorizedHandler(() => {
  useAuthStore().logout();
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
});

app.mount('#app');
