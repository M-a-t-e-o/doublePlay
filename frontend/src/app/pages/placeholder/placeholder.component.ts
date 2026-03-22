import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';

export interface PlaceholderRouteData {
  title: string;
  subtitle: string;
  ctaLabel: string;
}

interface PlaceholderViewModel extends PlaceholderRouteData {
  apiPath: string;
}

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.scss'
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly pageData$: Observable<PlaceholderViewModel> = this.route.data.pipe(
    map((data) => {
      const routePath = this.route.snapshot.routeConfig?.path ?? 'resource';
      const defaults: PlaceholderRouteData = {
        title: 'Page',
        subtitle: 'This screen will be connected to backend endpoints soon.',
        ctaLabel: 'Go Home'
      };
      const routeData = { ...defaults, ...(data as Partial<PlaceholderRouteData>) };

      return {
        ...routeData,
        apiPath: `/api/${routePath}`
      };
    })
  );
}
