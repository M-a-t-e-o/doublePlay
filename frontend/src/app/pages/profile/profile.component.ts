import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';

type ActivityMonth = {
  month: string;
  movies: number;
  games: number;
};

type GenreItem = {
  label: string;
  value: number;
  color: string;
};

type LibraryItem = {
  title: string;
  type: 'Movie' | 'Game';
  genre: string;
  rating: number;
  image: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, SidebarComponent, SearchDropdownComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  readonly monthlyActivity: ActivityMonth[] = [
    { month: 'Aug', movies: 4, games: 3 },
    { month: 'Sep', movies: 6, games: 5 },
    { month: 'Oct', movies: 5, games: 8 },
    { month: 'Nov', movies: 9, games: 6 },
    { month: 'Dec', movies: 7, games: 10 },
    { month: 'Jan', movies: 11, games: 9 },
    { month: 'Feb', movies: 8, games: 12 }
  ];

  readonly genres: GenreItem[] = [
    { label: 'Sci-Fi', value: 28, color: '#6f53ff' },
    { label: 'Action', value: 22, color: '#65b4d4' },
    { label: 'Fantasy', value: 18, color: '#e38a3f' },
    { label: 'RPG', value: 15, color: '#61bf8c' },
    { label: 'Horror', value: 10, color: '#de5d5d' },
    { label: 'Other', value: 7, color: '#667191' }
  ];

  readonly libraryItems: LibraryItem[] = [
    {
      title: 'Echoes of the Void',
      type: 'Movie',
      genre: 'Sci-Fi',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=120&h=120&fit=crop'
    },
    {
      title: 'Neon Horizon',
      type: 'Game',
      genre: 'Action',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=120&h=120&fit=crop'
    }
  ];

  constructor(private authService: AuthService) {}

  get profileName(): string {
    return this.authService.getUserName() || 'Taylor Brooks';
  }

  get chartMax(): number {
    return Math.max(...this.monthlyActivity.map((item) => Math.max(item.movies, item.games)));
  }

  get donutGradient(): string {
    let current = 0;
    const slices = this.genres
      .map((item) => {
        const start = current;
        const end = current + item.value;
        current = end;
        return `${item.color} ${start}% ${end}%`;
      })
      .join(', ');

    return `conic-gradient(${slices})`;
  }
}
