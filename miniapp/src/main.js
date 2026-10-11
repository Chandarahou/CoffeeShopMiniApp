import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import { initTelegram } from './lib/telegram.js';
import './style.css';

initTelegram();

createApp(App).use(createPinia()).use(router).mount('#app');
