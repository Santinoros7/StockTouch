import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // permite abrirlo desde la tablet en la misma red wifi
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
