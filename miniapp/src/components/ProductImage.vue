<script setup>
import { Coffee } from 'lucide-vue-next';

defineProps({ src: String, alt: String });
</script>

<template>
  <img v-if="src" :src="src" :alt="alt" class="object-cover" loading="lazy" />
  <div v-else class="flex items-center justify-center bg-matcha-soft text-matcha/60" role="img" :aria-label="alt">
    <Coffee class="size-1/3" />
  </div>
</template>
