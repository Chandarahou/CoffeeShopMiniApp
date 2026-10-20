<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Banknote, QrCode, User } from 'lucide-vue-next';
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
const methods = ref(['cash_at_counter']);
const paymentMethod = ref('cash_at_counter');

// A retry with a different payment method is a different order, so it needs a fresh idempotency key
watch(paymentMethod, () => (cart.checkoutKey = crypto.randomUUID()));

onMounted(async () => {
  if (!cart.lines.length) return router.replace('/cart');
  try {
    // Server-calculated prices are what the customer will actually pay
    const [priced, available] = await Promise.all([
      api('/orders/quote', { method: 'POST', body: { items: cart.orderItems } }),
      api('/payment-methods').catch(() => ({ methods: ['cash_at_counter'] })),
    ]);
    quote.value = priced;
    methods.value = available.methods;
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
      body: {
        clientOrderId: cart.checkoutKey,
        items: cart.orderItems,
        note: note.value || undefined,
        paymentMethod: paymentMethod.value,
      },
    });
    hapticSuccess();
    cart.clear();
    // KHQR orders open straight into the payment popup
    router.replace({ path: `/orders/${order._id}`, query: { placed: '1', ...(order.paymentMethod === 'khqr' && { pay: '1' }) } });
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

    <fieldset class="mx-4 mt-3">
      <legend class="text-sm font-medium">Payment method</legend>
      <div class="mt-1 grid gap-2" :class="methods.includes('khqr') ? 'grid-cols-2' : 'grid-cols-1'">
        <label
          class="card flex cursor-pointer flex-col gap-1 p-3 has-[:checked]:border-matcha has-[:checked]:bg-matcha-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-matcha"
        >
          <span class="flex items-center gap-2 font-semibold">
            <input v-model="paymentMethod" type="radio" name="payment" value="cash_at_counter" class="accent-matcha" />
            <Banknote class="size-5 text-honey" /> Cash
          </span>
          <span class="text-xs text-muted">Pay at the counter when you collect</span>
        </label>
        <label
          v-if="methods.includes('khqr')"
          class="card flex cursor-pointer flex-col gap-1 p-3 has-[:checked]:border-matcha has-[:checked]:bg-matcha-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-matcha"
        >
          <span class="flex items-center gap-2 font-semibold">
            <input v-model="paymentMethod" type="radio" name="payment" value="khqr" class="accent-matcha" />
            <QrCode class="size-5 text-[#E1232E]" /> KHQR
          </span>
          <span class="text-xs text-muted">Scan with any Cambodian bank app</span>
        </label>
      </div>
    </fieldset>

    <section class="mx-4 mt-3 flex gap-3 rounded-2xl bg-honey-soft p-4 text-sm text-amber-900">
      <component :is="paymentMethod === 'khqr' ? QrCode : Banknote" class="size-6 shrink-0 text-honey" />
      <p v-if="paymentMethod === 'khqr'">
        <strong>Pay with KHQR.</strong> After you place the order, a QR code for
        <strong>{{ formatMoney(quote.total) }}</strong> appears. Scan it with your bank app.
      </p>
      <p v-else>
        <strong>Pay cash at the counter.</strong> Just pay <strong>{{ formatMoney(quote.total) }}</strong> when you
        collect your order.
      </p>
    </section>

    <div class="fixed inset-x-0 bottom-0 z-20 border-t bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button class="btn-primary mx-auto flex w-full max-w-md" :disabled="placing" @click="placeOrder">
        {{ placing ? 'Placing order…' : `Place Order · ${formatMoney(quote.total)}` }}
      </button>
    </div>
  </template>
</template>
