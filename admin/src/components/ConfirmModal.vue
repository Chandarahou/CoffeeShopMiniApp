<script setup>
import { nextTick, ref, watch } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  message: String,
  confirmLabel: { type: String, default: 'Confirm' },
  busy: Boolean,
});
const emit = defineEmits(['confirm', 'cancel']);

const cancelButton = ref(null);

// Focus "Cancel" first so an accidental Enter never deletes anything
watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      cancelButton.value?.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="!busy && emit('cancel')"
      @keydown.esc="!busy && emit('cancel')"
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" class="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
        <div class="flex items-start gap-3">
          <span class="rounded-full bg-red-50 p-2 text-red-700"><TriangleAlert class="size-5" /></span>
          <div>
            <h2 id="confirm-title" class="font-semibold">{{ title }}</h2>
            <p v-if="message" class="mt-1 text-sm text-muted">{{ message }}</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button ref="cancelButton" type="button" class="btn" :disabled="busy" @click="emit('cancel')">Cancel</button>
          <button type="button" class="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50" :disabled="busy" @click="emit('confirm')">
            {{ busy ? 'Deleting…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
