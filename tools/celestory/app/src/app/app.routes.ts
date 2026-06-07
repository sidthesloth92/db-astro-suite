import { Routes } from '@angular/router';

/** Top-level routes: landing page and the dynamic per-handle portfolio. */
export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/index.page').then((m) => m.IndexPage),
  },
  {
    path: ':handle',
    loadComponent: () =>
      import('./pages/[handle].page').then((m) => m.PortfolioPage),
  },
];
