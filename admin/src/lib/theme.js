import { ref } from 'vue';

const KEY = 'weeee-admin-theme';

// index.html applies the saved/system theme before the app loads; this just mirrors it
export const isDark = ref(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  try {
    localStorage.setItem(KEY, isDark.value ? 'dark' : 'light');
  } catch {
    // storage unavailable (private mode) — the theme just won't persist
  }
}
