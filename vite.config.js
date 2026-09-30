import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const pages = { main: resolve(__dirname, 'index.html') };
if (existsSync(resolve(__dirname, 'compare.html'))) pages.compare = resolve(__dirname, 'compare.html');
if (existsSync(resolve(__dirname, 'variation.html'))) pages.variation = resolve(__dirname, 'variation.html');

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  build: { rollupOptions: { input: pages } },
});
