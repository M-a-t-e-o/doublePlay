import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Movies', route: '/movies', icon: 'movie' },
    { label: 'Games', route: '/games', icon: 'stadia_controller' },
    { label: 'AI Chat', route: '/chatbot', icon: 'smart_toy' },
    { label: 'Social', route: '/social', icon: 'groups' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Admin Panel', route: '/admin', icon: 'shield' }
  ];

  constructor(private authService: AuthService) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get displayName(): string {
    return this.authService.getUserName() || 'User';
  }

  logout(): void {
    this.authService.logout();
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
