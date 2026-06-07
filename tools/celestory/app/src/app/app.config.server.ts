import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';

import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
};

/** Server-side (SSR) application config — merges in platform-server rendering. */
export const config = mergeApplicationConfig(appConfig, serverConfig);
