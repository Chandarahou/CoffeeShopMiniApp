<script setup>
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const form = reactive({ current: '', next: '', confirm: '' });
const error = ref('');
const success = ref(false);
const saving = ref(false);

const mismatch = computed(() => form.confirm && form.next !== form.confirm);

async function submit() {
  error.value = '';
  success.value = false;
  if (form.next !== form.confirm) return (error.value = 'New passwords do not match');
  saving.value = true;
  try {
    await auth.changePassword(form.current, form.next);
    Object.assign(form, { current: '', next: '', confirm: '' });
    success.value = true;
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <h1 class="text-2xl font-bold">Account</h1>
  <p class="mt-1 text-sm text-muted">{{ auth.admin?.name }} · {{ auth.admin?.email }}</p>

  <form class="card mt-4 max-w-md space-y-4 p-5" @submit.prevent="submit">
    <h2 class="font-semibold">Change password</h2>
    <div>
      <label class="label" for="current">Current password</label>
      <input id="current" v-model="form.current" type="password" class="input" autocomplete="current-password" required />
    </div>
    <div>
      <label class="label" for="next">New password</label>
      <input id="next" v-model="form.next" type="password" class="input" autocomplete="new-password" minlength="8" required />
      <p class="mt-1 text-xs text-muted">At least 8 characters.</p>
    </div>
    <div>
      <label class="label" for="confirm">Confirm new password</label>
      <input id="confirm" v-model="form.confirm" type="password" class="input" autocomplete="new-password" required />
      <p v-if="mismatch" class="mt-1 text-xs text-red-700">Passwords do not match.</p>
    </div>
    <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
    <p v-if="success" class="text-sm text-matcha-ink">Password updated. Other devices have been signed out.</p>
    <button class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Update password' }}</button>
  </form>
</template>
