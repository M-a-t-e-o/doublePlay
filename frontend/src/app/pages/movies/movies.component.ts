import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

interface Movie {
  id: string;
  title: string;
  genre: string[];
  rating: number;
  views: number;
  description: string;
  posterUrl: string;
  releaseDate: Date;
}

interface MoviesApiResponse {
  data: BackendMovie[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface BackendMovie {
  _id: string;
  title: string;
  genres?: string[];
  description?: string;
  posterUrl?: string;
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
  selector: 'app-movies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: './movies.component.html',
  styleUrl: './movies.component.scss'
})
export class MoviesComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly pageSize = 20;

  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  isLoading = false;
  errorMessage = '';
  currentPage = 1;
  totalPages = 1;
  totalMovies = 0;
  
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
    this.loadMovies();
  }

  onGenreFilter(genre: FilterGenre): void {
    this.selectedGenre = genre;
    this.currentPage = 1;
    this.loadMovies();
  }

  onSortChange(sort: SortOption): void {
    this.sortBy = sort;
    this.currentPage = 1;
    this.loadMovies();
  }

  applyFiltersAndSort(): void {
    this.currentPage = 1;
    this.loadMovies();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) {
      return;
    }

    this.currentPage = page;
    this.loadMovies();
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
    this.http.get<string[]>(`${this.api}/movies/genres/list`).subscribe({
      next: (genres) => {
        const safeGenres = (genres ?? []).filter((genre) => !!genre?.trim());
        this.genres = ['All', ...safeGenres];
      },
      error: () => {
        this.genres = ['All'];
      }
    });
  }

  private loadMovies(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .get<MoviesApiResponse>(`${this.api}/movies`, {
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
          this.movies = (response.data ?? []).map((movie) => this.mapMovie(movie));
          this.filteredMovies = [...this.movies];
          this.totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
          this.totalMovies = Math.max(0, response.pagination?.total ?? 0);
          this.currentPage = Math.min(this.currentPage, this.totalPages);
          this.isLoading = false;
        },
        error: () => {
          this.movies = [];
          this.filteredMovies = [];
          this.totalPages = 1;
          this.totalMovies = 0;
          this.errorMessage = 'No se pudieron cargar las peliculas del backend.';
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

  private mapMovie(movie: BackendMovie): Movie {
    return {
      id: movie._id,
      title: movie.title,
      genre: movie.genres ?? [],
      rating: Number(movie.rating?.avg ?? 0),
      views: Number(movie.numberReviews ?? 0),
      description: movie.description ?? 'Sin descripcion disponible.',
      posterUrl: movie.posterUrl ?? 'https://placehold.co/250x400?text=No+Image',
      releaseDate: movie.releaseDate ? new Date(movie.releaseDate) : new Date(0)
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

  trackByMovieId(_: number, movie: Movie): string {
    return movie.id;
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }

  trackByPage(_: number, page: number): number {
    return page;
  }
}
