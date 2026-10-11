<script setup>
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Coffee } from 'lucide-vue-next';
import BottomNav from './components/BottomNav.vue';
import { setBackButton } from './lib/telegram.js';
import { useAuthStore } from './stores/auth.js';
import { useCatalogStore } from './stores/catalog.js';

const auth = useAuthStore();
const catalog = useCatalogStore();
const route = useRoute();
const router = useRouter();

onMounted(() => Promise.all([auth.login(), catalog.load()]));

// Use Telegram's native back button on detail screens
watch(
  () => route.meta.back,
  (back) => setBackButton(Boolean(back), () => (window.history.state?.back ? router.back() : router.replace('/'))),
  { immediate: true },
);
</script>

<template>
  <div v-if="auth.status === 'error'" class="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
    <img src="/logo.svg" alt="" class="size-16" />
    <p class="text-muted">{{ auth.error }}</p>
    <button class="btn-primary" @click="auth.login()">Try again</button>
  </div>

  <div v-else-if="auth.status !== 'ready' || !catalog.loaded" class="flex min-h-dvh flex-col items-center justify-center gap-3 text-matcha">
    <template v-if="catalog.error">
      <p class="px-8 text-center text-muted">{{ catalog.error }}</p>
      <button class="btn-primary" @click="catalog.load()">Try again</button>
    </template>
    <Coffee v-else class="size-10 animate-pulse" />
  </div>

  <template v-else>
    <main class="mx-auto min-h-dvh max-w-md" :class="route.meta.back ? 'pb-28' : 'pb-24'">
      <RouterView />
    </main>
    <BottomNav v-if="!route.meta.back" />
  </template>
</template>
