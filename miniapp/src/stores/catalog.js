import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../lib/api.js';

export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref([]);
  const products = ref([]);
  const loaded = ref(false);
  const error = ref('');

  async function load() {
    error.value = '';
    try {
      [categories.value, products.value] = await Promise.all([api('/categories'), api('/products')]);
      loaded.value = true;
    } catch (err) {
      error.value = err.message;
    }
  }

  const byId = computed(() => new Map(products.value.map((p) => [p._id, p])));
  const popular = computed(() => products.value.filter((p) => p.isPopular));
  const featured = computed(() => products.value.filter((p) => p.isFeatured));
  const inCategory = (categoryId) => products.value.filter((p) => p.category === categoryId);

  return { categories, products, loaded, error, load, byId, popular, featured, inCategory };
});
