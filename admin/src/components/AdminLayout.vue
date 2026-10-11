<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, Receipt, Package, Tags, Users, LogOut, Menu, X, KeyRound } from 'lucide-vue-next';
import ThemeToggle from './ThemeToggle.vue';
import { isDark } from '../lib/theme.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const open = ref(false);

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/orders', label: 'Orders', icon: Receipt },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/customers', label: 'Customers', icon: Users },
];

const isActive = (item) => (item.exact ? route.path === item.to : route.path.startsWith(item.to));

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-dvh lg:flex">
    <header class="flex items-center justify-between border-b bg-surface px-4 py-3 lg:hidden">
      <div class="flex items-center gap-2 font-bold text-matcha"><img src="/logo.svg" class="size-7" alt="" /> Weeee Cafe</div>
      <div class="flex items-center gap-1">
        <ThemeToggle />
        <button class="p-1" aria-label="Toggle menu" @click="open = !open"><component :is="open ? X : Menu" class="size-6" /></button>
      </div>
    </header>

    <aside
      class="border-r bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:flex-col"
      :class="open ? 'block' : 'hidden'"
    >
      <div class="hidden items-center gap-2 px-5 py-5 text-lg font-bold text-matcha lg:flex">
        <img src="/logo.svg" class="size-8" alt="" /> Weeee Cafe
      </div>
      <nav class="flex flex-col gap-1 p-3">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
          :class="isActive(item) ? 'bg-matcha-soft text-matcha-ink' : 'text-muted hover:bg-cream'"
          @click="open = false"
        >
          <component :is="item.icon" class="size-5" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-auto border-t p-3">
        <p class="px-3 text-sm font-medium">{{ auth.admin?.name }}</p>
        <p class="px-3 text-xs text-muted capitalize">{{ auth.admin?.role }}</p>
        <ThemeToggle class="hidden w-full px-3 lg:flex">{{ isDark ? 'Light mode' : 'Night mode' }}</ThemeToggle>
        <RouterLink to="/account" class="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream" @click="open = false">
          <KeyRound class="size-5" /> Change password
        </RouterLink>
        <button class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-cream" @click="logout">
          <LogOut class="size-5" /> Log out
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 p-4 lg:p-8">
      <RouterView />
    </main>
  </div>
</template>
