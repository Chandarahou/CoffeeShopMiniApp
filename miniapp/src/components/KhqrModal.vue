<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { CircleCheck, RefreshCw, X } from 'lucide-vue-next';
import { api } from '../lib/api.js';
import { formatMoney } from '../lib/format.js';
import { hapticSuccess } from '../lib/telegram.js';

// Shows the order's KHQR code. The server creates the code when this popup asks for it
// (valid for 120 seconds) and checks with Bakong whether it was paid. This popup only has
// to watch the order and switch to "Payment received" once the server marks it paid.
const props = defineProps({ open: Boolean, orderId: { type: String, required: true } });
const emit = defineEmits(['close', 'paid']);

const STATUS_POLL_MS = 3000;

const khqr = ref(null);
const loading = ref(false);
const error = ref('');
const paid = ref(false);
const now = ref(Date.now());
const closeButton = ref(null);

let countdownTimer = null;
let statusTimer = null;

const secondsLeft = computed(() => {
  if (!khqr.value) {
    return 0;
  }
  const millisecondsLeft = new Date(khqr.value.expiresAt).getTime() - now.value;
  return Math.max(0, Math.floor(millisecondsLeft / 1000));
});

const expired = computed(() => Boolean(khqr.value) && secondsLeft.value === 0 && !paid.value);

const countdown = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = String(secondsLeft.value % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
});

async function loadCode() {
  loading.value = true;
  error.value = '';
  try {
    khqr.value = await api(`/orders/${props.orderId}/khqr`, { method: 'POST' });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Asks our own server (not Bakong) whether the order has been marked paid
async function checkOrderStatus() {
  try {
    const order = await api(`/orders/${props.orderId}`);
    if (order.paymentStatus === 'paid') {
      paid.value = true;
      stopTimers();
      hapticSuccess();
      emit('paid');
    }
  } catch {
    // A missed poll doesn't matter; the next one will try again
  }
}

function startTimers() {
  countdownTimer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  statusTimer = setInterval(checkOrderStatus, STATUS_POLL_MS);
}

function stopTimers() {
  clearInterval(countdownTimer);
  clearInterval(statusTimer);
  countdownTimer = null;
  statusTimer = null;
}

function onKeyDown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

watch(
  () => props.open,
  async (open) => {
    stopTimers();
    document.removeEventListener('keydown', onKeyDown);
    if (!open) {
      return;
    }

    paid.value = false;
    document.addEventListener('keydown', onKeyDown);
    startTimers();
    loadCode();

    await nextTick();
    if (closeButton.value) {
      closeButton.value.focus();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  stopTimers();
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" @click.self="emit('close')">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="khqr-title"
        class="max-h-[95dvh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <!-- KHQR card -->
        <div class="mx-4 mt-4 overflow-hidden rounded-2xl border shadow-sm">
          <div class="relative flex h-12 items-center justify-center bg-[#E1232E]">
            <h2 id="khqr-title" class="text-xl font-black tracking-widest text-white">KHQR</h2>
            <button
              ref="closeButton"
              type="button"
              class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-white/90 hover:bg-white/15"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="size-5" />
            </button>
          </div>

          <!-- Paid -->
          <div v-if="paid" class="flex flex-col items-center gap-2 px-6 py-10 text-center" role="status">
            <CircleCheck class="size-16 text-matcha" />
            <p class="text-xl font-bold">Payment received</p>
            <p class="text-sm text-muted">
              {{ khqr ? formatMoney(khqr.amount) : '' }} for order #{{ khqr ? khqr.orderNumber : '' }}. Thank you!
            </p>
          </div>

          <div v-else-if="loading && !khqr" class="flex aspect-square items-center justify-center text-sm text-muted">Creating your code…</div>

          <div v-else-if="error" class="space-y-3 p-6 text-center text-sm">
            <p class="text-red-700">{{ error }}</p>
            <button type="button" class="btn-primary w-full" @click="loadCode">Try again</button>
          </div>

          <template v-else-if="khqr">
            <div class="px-5 pt-4">
              <p class="text-sm text-muted">{{ khqr.merchantName }}</p>
              <p class="text-3xl font-bold tabular-nums">
                {{ formatMoney(khqr.amount) }} <span class="text-base font-semibold text-muted">{{ khqr.currency }}</span>
              </p>
            </div>
            <div class="mx-5 mt-3 border-t border-dashed" />
            <div class="relative p-5">
              <img
                :src="khqr.qrImage"
                :alt="`KHQR code to pay ${formatMoney(khqr.amount)} for order #${khqr.orderNumber}`"
                class="mx-auto aspect-square w-full max-w-64"
                :class="{ 'opacity-15': expired }"
              />
              <div v-if="expired" class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <p class="font-semibold">This code has expired</p>
                <p class="text-xs text-muted">If you already paid, wait a moment — it will show as paid.</p>
                <button type="button" class="btn-primary" :disabled="loading" @click="loadCode">
                  <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" /> Get a new code
                </button>
              </div>
            </div>
          </template>
        </div>

        <div v-if="paid" class="px-5 pt-4">
          <button type="button" class="btn-primary w-full" @click="emit('close')">Done</button>
        </div>

        <div v-else-if="khqr && !error" class="space-y-3 px-5 pt-4 text-sm">
          <p class="text-center" :class="expired ? 'text-red-700' : 'text-muted'" aria-live="polite">
            <template v-if="!expired">Expires in <strong class="tabular-nums text-ink">{{ countdown }}</strong> · Order #{{ khqr.orderNumber }}</template>
            <template v-else>Expired · Order #{{ khqr.orderNumber }}</template>
          </p>
          <ol class="list-decimal space-y-1 pl-5 text-ink">
            <li>Open any Cambodian bank app (ABA, ACLEDA, Wing and others) and scan this code.</li>
            <li><strong>Paying on this phone?</strong> Take a screenshot, then choose <em>scan from gallery</em> in your bank app.</li>
            <li v-if="khqr.automaticVerification">Keep this screen open. It changes to <em>Payment received</em> by itself once your payment arrives.</li>
            <li v-else>Keep your bank receipt. Staff will confirm your payment and it will show as <em>Paid</em> here.</li>
          </ol>
          <button type="button" class="w-full rounded-xl border py-3 font-semibold" @click="emit('close')">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
