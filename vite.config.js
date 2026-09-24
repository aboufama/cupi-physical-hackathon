import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const pages = { main: resolve(__dirname, 'index.html') };
if (existsSync(resolve(__dirname, 'compare.html'))) pages.compare = resolve(__dirname, 'compare.html');

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: pages } },
});
