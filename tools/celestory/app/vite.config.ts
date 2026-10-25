/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode, command }) => {
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
        // Production builds compile through Angular's Compilation API. Without
        // it the SSR bundle ships uncompiled (decorator-only) components — the
        // client and SSR builds run in parallel through one shared compiler
        // instance — and every server-rendered page fails at runtime. Dev and
        // Vitest keep the default compiler (Vitest type-checks with
        // tsconfig.spec.json, which this mode rejects as configured).
        vite: { experimental: { useAngularCompilationAPI: command === 'build' } },
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
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
