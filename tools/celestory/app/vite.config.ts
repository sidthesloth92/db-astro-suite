/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Bridge .env.local into process.env so the Nitro server routes (which read
  // process.env.DATABASE_URL) can see it in local dev. On Vercel, process.env
  // is populated by the platform and .env.local is absent — this is a no-op
  // there. Loaded with the '' prefix so non-VITE_ vars like DATABASE_URL load;
  // they go to process.env only (server side), never to import.meta.env.
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };

  return {
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
  };
});
