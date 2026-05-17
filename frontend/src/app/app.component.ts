/*
  Project: doublePlay (frontend)
  File: src/app/app.component.ts
  Description: Root shell component for the Angular application layout.
*/

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
