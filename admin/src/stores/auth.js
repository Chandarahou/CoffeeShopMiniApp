import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api, getToken, setToken } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const admin = ref(null);
  const isLoggedIn = computed(() => Boolean(admin.value));

  async function login(email, password) {
    const res = await api('/auth/admin/login', { method: 'POST', body: { email, password } });
    setToken(res.token);
    admin.value = res.admin;
  }

  /** Restores the session from a saved token, if it's still valid. */
  async function restore() {
    if (admin.value || !getToken()) return;
    try {
      admin.value = await api('/auth/admin/me');
    } catch {
      setToken(null);
    }
  }

  async function changePassword(currentPassword, newPassword) {
    const res = await api('/auth/admin/change-password', { method: 'POST', body: { currentPassword, newPassword } });
    setToken(res.token);
  }

  function logout() {
    setToken(null);
    admin.value = null;
  }

  return { admin, isLoggedIn, login, restore, changePassword, logout };
});
