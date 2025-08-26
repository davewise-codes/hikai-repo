import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import tanStackRouterVite from '@tanstack/router-vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    // tanStackRouterVite(), // Temporalmente deshabilitado - las rutas ya están generadas
  ],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
});