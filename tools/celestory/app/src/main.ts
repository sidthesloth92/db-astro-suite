import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app/pages/index.page').then(m => m.IndexPage),
  },
  {
    path: ':handle',
    loadComponent: () => import('./app/pages/[handle].page').then(m => m.PortfolioPage),
  },
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ],
}).catch(err => console.error(err));
