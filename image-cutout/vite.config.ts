import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5178,
    host: true,
    open: true,
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  },
  preview: {
    port: 5178,
    host: true
  }
});
