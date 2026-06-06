/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  base: '/',
  build: {
    target: ['es2022'],
  },
  resolve: {
    mainFields: ['module'],
  },
  plugins: [
    analog({
      ssr: true,
      prerender: {
        routes: [],
      },
      nitro: {
        preset: 'vercel',
      },
    }),
  ],
  ssr: {
    noExternal: ['@db-astro-suite/**', '@angular/**'],
  },
}));
