import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/bg/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        options: resolve(__dirname, 'src/options/index.html')
      },
      output: {
        entryFileNames: ({ name }) => {
          if (name === 'background') return 'bg.js';
          if (name === 'content') return 'content.js';
          if (name === 'options') return 'options.js';
          return 'chunks/[name]-[hash].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
