<script setup>
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import ProductImage from './ProductImage.vue';
import { formatMoney } from '../lib/format.js';
import { haptic } from '../lib/telegram.js';
import { useCartStore } from '../stores/cart.js';

const props = defineProps({ product: { type: Object, required: true } });
const router = useRouter();
const cart = useCartStore();

const openDetails = () => router.push(`/products/${props.product._id}`);

function quickAdd() {
  // Customisable products go to the detail page so options can be chosen
  if (props.product.optionGroups?.length) return openDetails();
  haptic('medium');
  cart.add(props.product);
}
</script>

<template>
  <article class="card flex flex-col overflow-hidden" :class="{ 'opacity-60': product.isSoldOut }" @click="openDetails">
    <div class="relative">
      <ProductImage :src="product.imageUrl" :alt="product.name" class="aspect-square w-full" />
      <span v-if="product.isPopular" class="absolute top-2 left-2 rounded-full bg-honey px-2 py-0.5 text-[11px] font-bold text-white">
        Popular
      </span>
      <span v-if="product.isSoldOut" class="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-xs font-semibold text-white">
        Sold out
      </span>
    </div>
    <div class="flex flex-1 flex-col p-3">
      <h3 class="leading-tight font-semibold">{{ product.name }}</h3>
      <p class="mt-1 line-clamp-2 text-xs text-muted">{{ product.description }}</p>
      <div class="mt-auto flex items-center justify-between pt-2">
        <span class="font-semibold text-matcha">{{ formatMoney(product.price) }}</span>
        <button
          type="button"
          class="rounded-full bg-matcha p-1.5 text-white active:bg-matcha-dark disabled:bg-line"
          :disabled="product.isSoldOut"
          :aria-label="`Add ${product.name}`"
          @click.stop="quickAdd"
        >
          <Plus class="size-4" />
        </button>
      </div>
    </div>
  </article>
</template>
