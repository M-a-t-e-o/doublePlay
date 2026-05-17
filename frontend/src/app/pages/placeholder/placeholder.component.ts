/*
  Project: doublePlay (frontend)
  File: src/app/pages/placeholder/placeholder.component.ts
  Description: Reusable placeholder page component shown when a feature is not yet implemented.
*/

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.scss'
})
export class PlaceholderComponent {}
