import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

interface Game {
  id: string;
  title: string;
  genre: string[];
  rating: number;
  views: number;
  description: string;
  posterUrl: string;
  releaseDate: Date;
}

interface GamesApiResponse {
  data: BackendGame[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface BackendGame {
  _id: string;
  title: string;
  genres?: string[];
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  rating?: {
    avg?: number;
  };
  numberReviews?: number;
}

type SortOption = 'stars' | 'views' | 'title' | 'releaseDate';
type FilterGenre = 'All' | string;

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: './games.component.html',
  styleUrl: './games.component.scss'
})
export class GamesComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly pageSize = 20;

  games: Game[] = [];
  filteredGames: Game[] = [];
  isLoading = false;
  errorMessage = '';
  currentPage = 1;
  totalPages = 1;
  totalGames = 0;

  searchQuery: string = '';
  selectedGenre: FilterGenre = 'All';
  sortBy: SortOption = 'stars';

  genres: FilterGenre[] = ['All'];

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Movies', route: '/movies', icon: 'movie' },
    { label: 'Games', route: '/games', icon: 'stadia_controller' },
    { label: 'AI Chat', route: '/chatbot', icon: 'smart_toy' },
    { label: 'Social', route: '/social', icon: 'groups' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Admin Panel', route: '/admin', icon: 'shield' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadGenres();
    this.loadGames();
  }

  onGenreFilter(genre: FilterGenre): void {
    this.selectedGenre = genre;
    this.currentPage = 1;
    this.loadGames();
  }

  onSortChange(sort: SortOption): void {
    this.sortBy = sort;
    this.currentPage = 1;
    this.loadGames();
  }

  applyFiltersAndSort(): void {
    this.currentPage = 1;
    this.loadGames();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) {
      return;
    }

    this.currentPage = page;
    this.loadGames();
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  get visiblePages(): number[] {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  private loadGenres(): void {
    this.http.get<string[]>(`${this.api}/games/genres/list`).subscribe({
      next: (genres) => {
        const safeGenres = (genres ?? []).filter((genre) => !!genre?.trim());
        this.genres = ['All', ...safeGenres];
      },
      error: () => {
        this.genres = ['All'];
      }
    });
  }

  private loadGames(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .get<GamesApiResponse>(`${this.api}/games`, {
        params: {
          limit: String(this.pageSize),
          page: String(this.currentPage),
          sort: this.mapSortOption(this.sortBy),
          ...(this.searchQuery.trim() ? { search: this.searchQuery.trim() } : {}),
          ...(this.selectedGenre !== 'All' ? { genre: this.selectedGenre } : {})
        }
      })
      .subscribe({
        next: (response) => {
          this.games = (response.data ?? []).map((game) => this.mapGame(game));
          this.filteredGames = [...this.games];
          this.totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          this.totalGames = Math.max(0, response.pagination?.total ?? 0);
          this.currentPage = Math.min(this.currentPage, this.totalPages);
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.games = [];
          this.filteredGames = [];
          this.totalPages = 1;
          this.totalGames = 0;
          if (err.status === 0) {
            this.errorMessage = 'No se pudo conectar con el backend (CORS/red/backend apagado).';
          } else {
            this.errorMessage = `Error cargando juegos: ${err.status} ${err.statusText || ''}`.trim();
          }
          this.isLoading = false;
        }
      });
  }

  private mapSortOption(sortBy: SortOption): string {
    switch (sortBy) {
      case 'views':
        return 'reviews_desc';
      case 'title':
        return 'title_asc';
      case 'releaseDate':
        return 'date_desc';
      case 'stars':
      default:
        return 'rating_desc';
    }
  }

  private mapGame(game: BackendGame): Game {
    return {
      id: game._id,
      title: game.title,
      genre: game.genres ?? [],
      rating: Number(game.rating?.avg ?? 0),
      views: Number(game.numberReviews ?? 0),
      description: game.description ?? 'Sin descripcion disponible.',
      posterUrl: game.coverUrl ?? 'https://placehold.co/250x400?text=No+Image',
      releaseDate: game.releaseDate ? new Date(game.releaseDate) : new Date(0)
    };
  }

  getStarArray(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }

  formatViews(views: number): string {
    if (views >= 1000) {
      return (views / 1000).toFixed(0) + 'k';
    }
    return views.toString();
  }

  trackByGameId(_: number, game: Game): string {
    return game.id;
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }

  trackByPage(_: number, page: number): number {
    return page;
  }
}