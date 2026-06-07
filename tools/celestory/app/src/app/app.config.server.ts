import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import {
  provideServerRendering,
  ɵSERVER_CONTEXT as SERVER_CONTEXT,
} from '@angular/platform-server';
import { appConfig } from './app.config';

/** Server-only providers merged on top of the shared client config for SSR. */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: SERVER_CONTEXT, useValue: 'ssr-analog' },
  ],
};

/** Full application config used by the SSR render entry. */
export const config = mergeApplicationConfig(appConfig, serverConfig);
