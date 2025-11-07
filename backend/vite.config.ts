import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'server.ts'),
      name: 'backend',
      fileName: 'server',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'express',
        'cors',
        'openai',
        'axios',
        'ethers',
        '@prisma/client',
        'fs',
        'path',
        'http',
        'https',
      ],
      output: {
        entryFileNames: 'server.js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5001,
    host: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '..'),
    },
  },
});

