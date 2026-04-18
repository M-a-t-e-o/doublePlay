import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environments/environment';

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
  private readonly api = environment.apiUrl;

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

  get currentUserAvatarUrl(): string {
    const userId = this.authService.getUserIdFromToken();
    if (userId) {
      return `${this.api}/auth/profile-picture/${userId}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.avatarSeed)}`;
  }

  get avatarSeed(): string {
    const userId = this.authService.getUserIdFromToken() || 'unknown';
    const userName = this.displayName || 'user';
    return `${userId}-${userName}`;
  }

  handleCurrentUserAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;

    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.avatarSeed)}`;
  }

  logout(): void {
    this.authService.logout();
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
