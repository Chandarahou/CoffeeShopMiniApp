import { ref } from 'vue';
import { defineStore } from 'pinia';
import { api, setAuthToken } from '../lib/api.js';
import { getInitData, isInTelegram } from '../lib/telegram.js';

// Used only when running outside Telegram in development (requires ALLOW_DEV_AUTH on the server)
const DEV_USER = {
  id: Number(import.meta.env.VITE_DEV_TELEGRAM_USER_ID ?? 100000001),
  username: 'dev_customer',
  first_name: 'Dev',
  last_name: 'Customer',
};

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const status = ref('idle'); // idle | loading | ready | error
  const error = ref('');

  async function login() {
    status.value = 'loading';
    error.value = '';
    try {
      let body;
      if (isInTelegram) body = { initData: getInitData() };
      else if (import.meta.env.DEV) body = { devUser: DEV_USER };
      else throw new Error('Please open Weeee Cafe from our Telegram bot.');

      const res = await api('/auth/telegram', { method: 'POST', body });
      setAuthToken(res.token);
      user.value = res.user;
      status.value = 'ready';
    } catch (err) {
      error.value = err.message;
      status.value = 'error';
    }
  }

  return { user, status, error, login };
});
