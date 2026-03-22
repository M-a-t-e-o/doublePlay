import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

type NavItem = {
  label: string;
  route: string;
};

type MediaCard = {
  title: string;
  genre: string;
  rating: number;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home' },
    { label: 'Movies', route: '/movies' },
    { label: 'Games', route: '/games' },
    { label: 'AI Chat', route: '/chatbot' },
    { label: 'Social', route: '/social' },
    { label: 'Profile', route: '/profile' },
    { label: 'Admin Panel', route: '/admin' }
  ];

  readonly topMovies: MediaCard[] = [
    { title: 'Echoes of the Void', genre: 'Sci-Fi', rating: 4.7 },
    { title: 'Neon Horizon', genre: 'Thriller', rating: 4.6 },
    { title: 'Glass Protocol', genre: 'Action', rating: 4.4 }
  ];

  readonly topGames: MediaCard[] = [
    { title: 'Voidwalker Chronicles', genre: 'RPG', rating: 4.8 },
    { title: 'Starline Drift', genre: 'Racing', rating: 4.5 },
    { title: 'Prism Breakers', genre: 'Puzzle', rating: 4.3 }
  ];

  trackByRoute = (_: number, item: NavItem): string => item.route;

  trackByTitle = (_: number, item: MediaCard): string => item.title;
}
