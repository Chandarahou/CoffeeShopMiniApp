<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-vue-next';
import ConfirmModal from '../components/ConfirmModal.vue';
import { api } from '../lib/api.js';

const categories = ref([]);
const error = ref('');
const draft = reactive({ _id: null, name: '', slug: '', description: '' });

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function load() {
  categories.value = await api('/admin/categories');
}

onMounted(() => load().catch((err) => (error.value = err.message)));

function edit(category) {
  Object.assign(draft, { _id: category._id, name: category.name, slug: category.slug, description: category.description ?? '' });
}

function reset() {
  Object.assign(draft, { _id: null, name: '', slug: '', description: '' });
}

async function run(fn) {
  error.value = '';
  try {
    await fn();
  } catch (err) {
    error.value = err.message;
  }
}

const save = () =>
  run(async () => {
    const body = { name: draft.name, slug: draft.slug || slugify(draft.name), description: draft.description };
    if (draft._id) await api(`/admin/categories/${draft._id}`, { method: 'PUT', body });
    else await api('/admin/categories', { method: 'POST', body });
    reset();
    await load();
  });

const toggleActive = (c) =>
  run(async () => {
    await api(`/admin/categories/${c._id}`, { method: 'PUT', body: { isActive: !c.isActive } });
    await load();
  });

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
  deleting.value = true;
  await run(async () => {
    await api(`/admin/categories/${toDelete.value._id}`, { method: 'DELETE' });
    if (draft._id === toDelete.value._id) reset();
    await load();
  });
  deleting.value = false;
  toDelete.value = null;
}

const move = (index, delta) =>
  run(async () => {
    const ids = categories.value.map((c) => c._id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    categories.value = await api('/admin/categories/reorder', { method: 'PUT', body: { ids } });
  });
</script>

<template>
  <h1 class="text-2xl font-bold">Categories</h1>
  <p v-if="error" class="mt-4 text-red-700">{{ error }}</p>

  <div class="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
    <ul class="card divide-y self-start">
      <li v-for="(c, i) in categories" :key="c._id" class="flex items-center gap-3 p-3" :class="{ 'text-muted': !c.isActive }">
        <div class="flex flex-col">
          <button class="text-muted hover:text-ink disabled:opacity-30" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)"><ChevronUp class="size-4" /></button>
          <button class="text-muted hover:text-ink disabled:opacity-30" :disabled="i === categories.length - 1" aria-label="Move down" @click="move(i, 1)"><ChevronDown class="size-4" /></button>
        </div>
        <div class="flex-1">
          <p class="font-medium">{{ c.name }}</p>
          <p class="text-xs text-muted">/{{ c.slug }}</p>
        </div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="accent-matcha" :checked="c.isActive" @change="toggleActive(c)" /> Active</label>
        <button class="btn" :aria-label="`Edit ${c.name}`" @click="edit(c)"><Pencil class="size-4" /></button>
        <button class="p-1.5 text-muted hover:text-red-700" :aria-label="`Delete ${c.name}`" @click="toDelete = c"><Trash2 class="size-4" /></button>
      </li>
    </ul>

    <form class="card space-y-3 self-start p-5" @submit.prevent="save">
      <h2 class="font-semibold">{{ draft._id ? 'Edit category' : 'New category' }}</h2>
      <div>
        <label class="label">Name</label>
        <input v-model="draft.name" class="input" required maxlength="60" />
      </div>
      <div>
        <label class="label">Slug</label>
        <input v-model="draft.slug" class="input" :placeholder="slugify(draft.name)" pattern="[a-z0-9-]+" />
      </div>
      <div>
        <label class="label">Description</label>
        <input v-model="draft.description" class="input" maxlength="300" />
      </div>
      <div class="flex gap-2">
        <button class="btn-primary">{{ draft._id ? 'Save' : 'Create' }}</button>
        <button v-if="draft._id" type="button" class="btn" @click="reset">Cancel</button>
      </div>
    </form>
  </div>

  <ConfirmModal
    :open="Boolean(toDelete)"
    title="Delete category?"
    :message="`“${toDelete?.name}” will be permanently deleted. A category that still has products can't be deleted. To hide it from the menu instead, untick Active.`"
    confirm-label="Delete"
    :busy="deleting"
    @confirm="confirmDelete"
    @cancel="toDelete = null"
  />
</template>
