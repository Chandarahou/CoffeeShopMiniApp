<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Banknote, User } from 'lucide-vue-next';
import { api } from '../lib/api.js';
import { displayName, formatMoney } from '../lib/format.js';
import { hapticSuccess } from '../lib/telegram.js';
import { useAuthStore } from '../stores/auth.js';
import { useCartStore } from '../stores/cart.js';

const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

const quote = ref(null);
const error = ref('');
const note = ref('');
const placing = ref(false);

onMounted(async () => {
  if (!cart.lines.length) return router.replace('/cart');
  try {
    // Server-calculated prices are what the customer will actually pay
    quote.value = await api('/orders/quote', { method: 'POST', body: { items: cart.orderItems } });
  } catch (err) {
    error.value = err.message;
  }
});

async function placeOrder() {
  placing.value = true;
  error.value = '';
  try {
    const order = await api('/orders', {
      method: 'POST',
      body: { clientOrderId: cart.checkoutKey, items: cart.orderItems, note: note.value || undefined },
    });
    hapticSuccess();
    cart.clear();
    router.replace({ path: `/orders/${order._id}`, query: { placed: '1' } });
  } catch (err) {
    error.value = err.message;
  } finally {
    placing.value = false;
  }
}
</script>

<template>
  <h1 class="px-4 pt-5 text-xl font-bold">Checkout</h1>

  <div v-if="error" class="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
    {{ error }}
    <RouterLink to="/cart" class="mt-1 block font-semibold underline">Back to cart</RouterLink>
  </div>

  <template v-if="quote">
    <section class="card mx-4 mt-3 divide-y">
      <div v-for="(item, i) in quote.items" :key="i" class="flex justify-between gap-3 p-3">
        <div>
          <p class="font-medium">{{ item.quantity }} × {{ item.productName }}</p>
          <p v-if="item.options.length" class="text-xs text-muted">{{ item.options.map((o) => o.label).join(' · ') }}</p>
          <p class="text-xs text-muted">{{ formatMoney(item.unitPrice) }} each</p>
        </div>
        <span class="font-medium">{{ formatMoney(item.lineTotal) }}</span>
      </div>
      <div class="space-y-1 p-3 text-sm">
        <div class="flex justify-between text-muted"><span>Subtotal</span><span>{{ formatMoney(quote.subtotal) }}</span></div>
        <div v-if="quote.discount" class="flex justify-between text-matcha">
          <span>Discount</span><span>−{{ formatMoney(quote.discount) }}</span>
        </div>
        <div class="flex justify-between pt-1 text-lg font-bold"><span>Total</span><span>{{ formatMoney(quote.total) }}</span></div>
      </div>
    </section>

    <section class="card mx-4 mt-3 flex items-center gap-3 p-3">
      <User class="size-5 text-muted" />
      <div class="text-sm">
        <p class="font-medium">{{ displayName(auth.user) }}</p>
        <p class="text-muted">Telegram ID {{ auth.user.telegramUserId }}</p>
      </div>
    </section>

    <label class="mx-4 mt-3 block">
      <span class="text-sm font-medium">Note for the barista (optional)</span>
      <textarea v-model="note" maxlength="300" rows="2" class="mt-1 w-full rounded-xl border bg-surface p-3 text-sm" placeholder="e.g. I'll be there in 10 minutes" />
    </label>

    <section class="mx-4 mt-3 flex gap-3 rounded-2xl bg-honey-soft p-4 text-sm text-amber-900">
      <Banknote class="size-6 shrink-0 text-honey" />
      <p>
        <strong>Pay cash at the counter.</strong> No online payment needed — just pay
        <strong>{{ formatMoney(quote.total) }}</strong> when you collect your order.
      </p>
    </section>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button class="btn-primary mx-auto flex w-full max-w-md" :disabled="placing" @click="placeOrder">
        {{ placing ? 'Placing order…' : `Place Order · ${formatMoney(quote.total)}` }}
      </button>
    </div>
  </template>
</template>
