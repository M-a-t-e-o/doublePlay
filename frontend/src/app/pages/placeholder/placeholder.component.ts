import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map, Observable } from 'rxjs';

export interface PlaceholderRouteData {
  title: string;
  subtitle: string;
  ctaLabel: string;
}

interface PlaceholderViewModel extends PlaceholderRouteData {
  apiPath: string;
}

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.scss'
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Movies', route: '/movies', icon: 'movie' },
    { label: 'Games', route: '/games', icon: 'stadia_controller' },
    { label: 'AI Chat', route: '/chatbot', icon: 'smart_toy' },
    { label: 'Social', route: '/social', icon: 'groups' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Admin Panel', route: '/admin', icon: 'shield' }
  ];

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

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
