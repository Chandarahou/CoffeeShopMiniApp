import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    // Allow tunnels (ngrok, cloudflared) so the app can be opened inside Telegram during development
    allowedHosts: true,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
