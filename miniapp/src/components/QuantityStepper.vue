<script setup>
import { Minus, Plus } from 'lucide-vue-next';
import { haptic } from '../lib/telegram.js';

const props = defineProps({ min: { type: Number, default: 1 }, max: { type: Number, default: 50 } });
const quantity = defineModel({ type: Number, required: true });

function change(delta) {
  const next = quantity.value + delta;
  if (next < props.min || next > props.max) return;
  haptic();
  quantity.value = next;
}
</script>

<template>
  <div class="inline-flex items-center rounded-full border bg-surface">
    <button type="button" class="p-2 text-matcha disabled:text-line" :disabled="quantity <= min" aria-label="Decrease" @click="change(-1)">
      <Minus class="size-4" />
    </button>
    <span class="w-7 text-center font-semibold tabular-nums">{{ quantity }}</span>
    <button type="button" class="p-2 text-matcha disabled:text-line" :disabled="quantity >= max" aria-label="Increase" @click="change(1)">
      <Plus class="size-4" />
    </button>
  </div>
</template>
