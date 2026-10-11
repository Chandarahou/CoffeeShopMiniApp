<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LiveBackground from '../components/LiveBackground.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    // Only follow in-app paths; "//host" and "https://…" would send staff to another site
    const target = route.query.redirect;
    router.replace(typeof target === 'string' && /^\/(?![\/\\])/.test(target) ? target : '/');
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center p-4">
    <LiveBackground />
    <ThemeToggle class="absolute top-4 right-4 z-10" />
    <form class="login-card relative w-full max-w-sm overflow-hidden rounded-2xl border border-matcha/15 bg-surface/90 p-6 shadow-2xl shadow-matcha/15 backdrop-blur" @submit.prevent="submit">
      <div class="mb-6 flex flex-col items-center gap-2">
        <img src="/logo.svg" alt="" class="size-14" />
        <h1 class="text-xl font-bold text-matcha">Weeee Cafe Staff</h1>
      </div>
      <label class="label" for="email">Email or username</label>
      <input id="email" v-model="email" type="text" class="input" autocomplete="username" required />
      <label class="label mt-4" for="password">Password</label>
      <input id="password" v-model="password" type="password" class="input" autocomplete="current-password" required />
      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>
      <button class="btn-primary mt-6 w-full" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
    </form>
  </div>
</template>

<style scoped>
/* Honey-to-matcha accent line across the top of the card */
.login-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-honey) 28%, var(--color-matcha) 72%, transparent);
}
.login-card > * {
  animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
}
.login-card > :nth-child(2) { animation-delay: 0.1s; }
.login-card > :nth-child(3) { animation-delay: 0.16s; }
.login-card > :nth-child(4) { animation-delay: 0.22s; }
.login-card > :nth-child(5) { animation-delay: 0.28s; }
.login-card > :nth-child(6) { animation-delay: 0.34s; }
.login-card > :nth-child(7) { animation-delay: 0.4s; }
@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .login-card > * { animation: none; }
}
</style>
