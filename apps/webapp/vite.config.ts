import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    react(),
    tanstackRouter(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
      '@convex': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../packages/convex/convex'),
    },
  },
});