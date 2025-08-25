import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { tanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // tanStackRouterVite(), // Temporalmente deshabilitado hasta arreglar el export
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});