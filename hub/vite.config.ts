/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/db-astro-suite/',
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
  },
  plugins: [
    analog({
      ssr: true,
      static: true,
      prerender: {
        routes: ['/', '/about', '/file-grouper'],
      },
      nitro: {
        preset: 'static',
        prerender: {
          crawlLinks: false,
        },
      },
    }),
  ],
  server: {
    proxy: {
      '/db-astro-suite/starwizz': {
        target: 'http://localhost:4200',
        changeOrigin: true,
      },
      '/db-astro-suite/astrocard': {
        target: 'http://localhost:4201',
        changeOrigin: true,
      },
    },
  },
  ssr: {
    noExternal: ['@db-astro-suite/**', '@angular/**'],
  },
}));
