<script setup>
import { Moon, Sun } from 'lucide-vue-next';
import { isDark, toggleTheme } from '../lib/theme.js';
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-3 rounded-lg p-2 text-sm text-muted hover:bg-cream hover:text-ink"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to night mode'"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <component :is="isDark ? Sun : Moon" class="size-5" />
    <slot />
  </button>
</template>
