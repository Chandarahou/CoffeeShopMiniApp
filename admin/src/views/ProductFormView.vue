<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-vue-next';
import { api } from '../lib/api.js';

const route = useRoute();
const router = useRouter();
const isNew = computed(() => !route.params.id);

// Prices are edited in dollars and stored in cents
const toDollars = (cents) => (cents / 100).toFixed(2);
const toCents = (dollars) => Math.round(Number(dollars || 0) * 100);

const form = reactive({
  name: '',
  description: '',
  imageUrl: '',
  category: '',
  price: '0.00',
  isActive: true,
  isSoldOut: false,
  isFeatured: false,
  isPopular: false,
  sortOrder: 0,
  optionGroups: [],
});
const categories = ref([]);
const error = ref('');
const saving = ref(false);

const PRESETS = {
  size: { key: 'size', name: 'Size', type: 'single', required: true, choices: [['Small', 0, true], ['Medium', 0.5], ['Large', 1]] },
  ice: { key: 'ice', name: 'Ice level', type: 'single', required: true, choices: [['Normal Ice', 0, true], ['Less Ice'], ['No Ice']] },
  sugar: { key: 'sugar', name: 'Sugar level', type: 'single', required: true, choices: [['0%'], ['25%'], ['50%', 0, true], ['75%'], ['100%']] },
  addons: { key: 'addons', name: 'Add-ons', type: 'multiple', required: false, choices: [['Extra shot', 0.5], ['Syrup', 0.3], ['Whipped cream', 0.25]] },
};

function addGroup(presetKey) {
  const preset = PRESETS[presetKey];
  form.optionGroups.push(
    preset
      ? { ...preset, choices: preset.choices.map(([label, price = 0, isDefault = false]) => ({ label, priceDelta: price.toFixed(2), isDefault })) }
      : { key: '', name: '', type: 'single', required: false, choices: [{ label: '', priceDelta: '0.00', isDefault: false }] },
  );
}

function setDefault(group, choice) {
  if (group.type === 'single') group.choices.forEach((c) => (c.isDefault = c === choice && !choice.isDefault));
  else choice.isDefault = !choice.isDefault;
}

onMounted(async () => {
  try {
    categories.value = await api('/admin/categories');
    if (isNew.value) {
      form.category = categories.value[0]?._id ?? '';
      return;
    }
    const p = await api(`/admin/products/${route.params.id}`);
    Object.assign(form, {
      ...p,
      imageUrl: p.imageUrl ?? '',
      price: toDollars(p.price),
      optionGroups: p.optionGroups.map((g) => ({ ...g, choices: g.choices.map((c) => ({ ...c, priceDelta: toDollars(c.priceDelta) })) })),
    });
  } catch (err) {
    error.value = err.message;
  }
});

async function save() {
  saving.value = true;
  error.value = '';
  const body = {
    name: form.name,
    description: form.description,
    imageUrl: form.imageUrl,
    category: form.category,
    price: toCents(form.price),
    isActive: form.isActive,
    isSoldOut: form.isSoldOut,
    isFeatured: form.isFeatured,
    isPopular: form.isPopular,
    sortOrder: Number(form.sortOrder) || 0,
    // Existing _ids are kept so choices in customers' carts stay valid after edits
    optionGroups: form.optionGroups.map(({ _id, key, name, type, required, choices }) => ({
      _id,
      key,
      name,
      type,
      required,
      choices: choices.map(({ _id, label, priceDelta, isDefault }) => ({ _id, label, priceDelta: toCents(priceDelta), isDefault })),
    })),
  };
  try {
    if (isNew.value) await api('/admin/products', { method: 'POST', body });
    else await api(`/admin/products/${route.params.id}`, { method: 'PUT', body });
    router.push('/products');
  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <RouterLink to="/products" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft class="size-4" /> Products</RouterLink>
  <h1 class="mt-2 text-2xl font-bold">{{ isNew ? 'New product' : 'Edit product' }}</h1>

  <form class="mt-4 max-w-3xl space-y-4" @submit.prevent="save">
    <section class="card grid gap-4 p-5 md:grid-cols-2">
      <div class="md:col-span-2">
        <label class="label">Name</label>
        <input v-model="form.name" class="input" required maxlength="100" />
      </div>
      <div class="md:col-span-2">
        <label class="label">Description</label>
        <textarea v-model="form.description" class="input" rows="2" maxlength="1000" />
      </div>
      <div class="md:col-span-2">
        <label class="label" for="image-url">Image URL</label>
        <input id="image-url" v-model="form.imageUrl" type="url" class="input" placeholder="https://…" />
        <p class="mt-1 text-xs text-muted">Upload a photo on the <RouterLink to="/images" class="font-medium text-matcha">Images</RouterLink> page, then paste its URL here.</p>
      </div>
      <div>
        <label class="label">Category</label>
        <select v-model="form.category" class="input" required>
          <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}{{ c.isActive ? '' : ' (inactive)' }}</option>
        </select>
      </div>
      <div>
        <label class="label">Base price ($)</label>
        <input v-model="form.price" type="number" min="0" step="0.01" class="input" required />
      </div>
      <div>
        <label class="label">Sort order</label>
        <input v-model.number="form.sortOrder" type="number" class="input" />
      </div>
      <div class="flex flex-wrap items-end gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="form.isActive" type="checkbox" class="accent-matcha" /> Active</label>
        <label class="flex items-center gap-2"><input v-model="form.isSoldOut" type="checkbox" class="accent-honey" /> Sold out</label>
        <label class="flex items-center gap-2"><input v-model="form.isPopular" type="checkbox" class="accent-honey" /> Popular</label>
        <label class="flex items-center gap-2"><input v-model="form.isFeatured" type="checkbox" class="accent-matcha" /> Featured</label>
      </div>
    </section>

    <section class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold">Customisation options</h2>
        <div class="flex flex-wrap gap-2">
          <button v-for="(_, key) in PRESETS" :key="key" type="button" class="btn" :disabled="form.optionGroups.some((g) => g.key === key)" @click="addGroup(key)">
            + {{ PRESETS[key].name }}
          </button>
          <button type="button" class="btn" @click="addGroup()">+ Custom</button>
        </div>
      </div>
      <p v-if="!form.optionGroups.length" class="mt-3 text-sm text-muted">No options — customers add this product as-is.</p>

      <div v-for="(group, gi) in form.optionGroups" :key="gi" class="mt-4 rounded-lg border p-4">
        <div class="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto]">
          <input v-model="group.name" class="input" placeholder="Name (e.g. Ice level)" required />
          <input v-model="group.key" class="input" placeholder="key (e.g. ice)" pattern="[a-z0-9_]+" required />
          <select v-model="group.type" class="input">
            <option value="single">Pick one</option>
            <option value="multiple">Pick any</option>
          </select>
          <label class="flex items-center gap-2 text-sm"><input v-model="group.required" type="checkbox" class="accent-matcha" /> Required</label>
          <button type="button" class="btn-danger" aria-label="Remove group" @click="form.optionGroups.splice(gi, 1)"><Trash2 class="size-4" /></button>
        </div>
        <div v-for="(choice, ci) in group.choices" :key="ci" class="mt-2 grid grid-cols-[1fr_7rem_auto_auto] items-center gap-2 pl-4">
          <input v-model="choice.label" class="input" placeholder="Choice label" required />
          <input v-model="choice.priceDelta" type="number" min="0" step="0.01" class="input" title="Extra price ($)" />
          <label class="flex items-center gap-1 text-xs text-muted"><input type="checkbox" :checked="choice.isDefault" class="accent-matcha" @change="setDefault(group, choice)" /> Default</label>
          <button type="button" class="p-2 text-muted hover:text-red-700" :disabled="group.choices.length === 1" aria-label="Remove choice" @click="group.choices.splice(ci, 1)">
            <Trash2 class="size-4" />
          </button>
        </div>
        <button type="button" class="mt-2 ml-4 inline-flex items-center gap-1 text-sm font-medium text-matcha" @click="group.choices.push({ label: '', priceDelta: '0.00', isDefault: false })">
          <Plus class="size-4" /> Add choice
        </button>
      </div>
    </section>

    <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
    <div class="flex gap-2">
      <button class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save product' }}</button>
      <RouterLink to="/products" class="btn">Cancel</RouterLink>
    </div>
  </form>
</template>
