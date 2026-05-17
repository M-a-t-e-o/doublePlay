/*
  Project: doublePlay (frontend)
  File: src/main.ts
  Description: Angular bootstrap entry point that starts the application.
*/

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
