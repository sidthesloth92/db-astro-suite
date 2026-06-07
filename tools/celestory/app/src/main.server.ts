import 'zone.js/node';
import '@angular/platform-server/init';

import { enableProdMode } from '@angular/core';
import { renderApplication } from '@angular/platform-server';
import {
  bootstrapApplication,
  type BootstrapContext,
} from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

if (import.meta.env.PROD) {
  enableProdMode();
}

/** Bootstrap forwarding the SSR BootstrapContext (required in Angular 21). */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

/** SSR entry: AnalogJS's Nitro dev/prod server calls this per request. */
export default async function render(url: string, document: string) {
  const html = await renderApplication(bootstrap, {
    document,
    url,
  });
  return html;
}
