import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

type MediaCard = {
  id: string;
  title: string;
  genre: string;
  rating: number;
  description: string;
  posterUrl: string;
  trailerYoutubeId?: string;
};

type MoviesApiResponse = {
  data: BackendMovie[];
};

type GamesApiResponse = {
  data: BackendGame[];
};

type BackendMovie = {
  _id: string;
  title: string;
  genres?: string[];
  description?: string;
  posterUrl?: string;
  trailerYoutubeId?: string;
  rating?: {
    avg?: number;
  };
};

type BackendGame = {
  _id: string;
  title: string;
  genres?: string[];
  description?: string;
  coverUrl?: string;
  rating?: {
    avg?: number;
  };
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = environment.apiUrl;
  private readonly fallbackPoster = 'https://placehold.co/600x900?text=No+Image';
  private readonly fetchLimit = 30;
  private readonly cardWidthPx = 150;
  private readonly gapPx = 11.2;
  private resizeObserver: ResizeObserver | null = null;
  visibleMoviesCount = 6;
  visibleGamesCount = 6;

  @ViewChild('moviesContainer') moviesContainer!: ElementRef;
  @ViewChild('gamesContainer') gamesContainer!: ElementRef;

  readonly ratingStars = [1, 2, 3, 4, 5];

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Movies', route: '/movies', icon: 'movie' },
    { label: 'Games', route: '/games', icon: 'stadia_controller' },
    { label: 'AI Chat', route: '/chatbot', icon: 'smart_toy' },
    { label: 'Social', route: '/social', icon: 'groups' },
    { label: 'Profile', route: '/profile', icon: 'person' },
    { label: 'Admin Panel', route: '/admin', icon: 'shield' }
  ];

  topMovies: MediaCard[] = [];
  featuredMovie: MediaCard | null = null;
  isLoadingMovies = false;
  moviesError = '';
  topGames: MediaCard[] = [];
  isLoadingGames = false;
  gamesError = '';
  
  showTrailerModal = false;
  trailerVideoId: string | null = null;
  trailerUrl: SafeResourceUrl | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadTopMovies();
    this.loadTopGames();
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateVisibleCounts();
      });

      if (this.moviesContainer?.nativeElement) {
        this.resizeObserver.observe(this.moviesContainer.nativeElement);
      }
      if (this.gamesContainer?.nativeElement) {
        this.resizeObserver.observe(this.gamesContainer.nativeElement);
      }

      this.updateVisibleCounts();
    } catch (error) {
      console.warn('ResizeObserver not supported, using static limits');
    }
  }

  private updateVisibleCounts(): void {
    if (this.moviesContainer?.nativeElement) {
      const width = this.moviesContainer.nativeElement.offsetWidth;
      this.visibleMoviesCount = this.calculateFitCount(width, this.topMovies.length);
    }
    if (this.gamesContainer?.nativeElement) {
      const width = this.gamesContainer.nativeElement.offsetWidth;
      this.visibleGamesCount = this.calculateFitCount(width, this.topGames.length);
    }
  }

  private calculateFitCount(containerWidth: number, totalItems: number): number {
    if (containerWidth <= 0) return Math.min(3, totalItems);
    const fitsCount = Math.floor(containerWidth / (this.cardWidthPx + this.gapPx));
    return Math.min(Math.max(fitsCount, 1), totalItems);
  }

  get filteredTopMovies(): MediaCard[] {
    const safeCount = this.visibleMoviesCount > 0 ? this.visibleMoviesCount : Math.min(6, this.topMovies.length);
    return this.topMovies.slice(0, safeCount);
  }

  get filteredTopGames(): MediaCard[] {
    const safeCount = this.visibleGamesCount > 0 ? this.visibleGamesCount : Math.min(6, this.topGames.length);
    return this.topGames.slice(0, safeCount);
  }

  private loadTopMovies(): void {
    this.isLoadingMovies = true;
    this.moviesError = '';

    this.http
      .get<MoviesApiResponse>(`${this.api}/movies`, {
        params: {
          limit: String(this.fetchLimit),
          sort: 'rating_desc'
        }
      })
      .subscribe({
        next: (response) => {
          const movies = (response.data ?? []).map((movie) => this.mapMovie(movie));
          const sourceMovies = this.pickTopOrFirst(movies);

          this.featuredMovie = sourceMovies[0] ?? null;
          this.topMovies = sourceMovies;
          this.isLoadingMovies = false;
          this.updateVisibleCounts();
        },
        error: () => {
          this.moviesError = 'No se pudieron cargar las peliculas.';
          this.featuredMovie = null;
          this.topMovies = [];
          this.isLoadingMovies = false;
          this.updateVisibleCounts();
        }
      });
  }

  private loadTopGames(): void {
    this.isLoadingGames = true;
    this.gamesError = '';

    this.http
      .get<GamesApiResponse>(`${this.api}/games`, {
        params: {
          limit: String(this.fetchLimit),
          sort: 'rating_desc'
        }
      })
      .subscribe({
        next: (response) => {
          const games = (response.data ?? []).map((game) => this.mapGame(game));
          this.topGames = this.pickTopOrFirst(games);
          this.isLoadingGames = false;
          this.updateVisibleCounts();
        },
        error: () => {
          this.gamesError = 'No se pudieron cargar los juegos.';
          this.topGames = [];
          this.isLoadingGames = false;
          this.updateVisibleCounts();
        }
      });
  }

  private pickTopOrFirst(items: MediaCard[]): MediaCard[] {
    const ratedItems = items.filter((item) => item.rating > 0);
    const unratedItems = items.filter((item) => item.rating === 0);

    // Keep rated content first, then fill with unrated; visual cap is handled by container width.
    return [...ratedItems, ...unratedItems];
  }

  private mapMovie(movie: BackendMovie): MediaCard {
    return {
      id: movie._id,
      title: movie.title,
      genre: movie.genres?.[0] ?? 'Sin genero',
      rating: Number(movie.rating?.avg ?? 0),
      description: movie.description ?? 'Sin descripcion disponible.',
      posterUrl: movie.posterUrl ?? this.fallbackPoster,
      trailerYoutubeId: movie.trailerYoutubeId
    };
  }

  private mapGame(game: BackendGame): MediaCard {
    return {
      id: game._id,
      title: game.title,
      genre: game.genres?.[0] ?? 'Sin genero',
      rating: Number(game.rating?.avg ?? 0),
      description: game.description ?? 'Sin descripcion disponible.',
      posterUrl: game.coverUrl ?? this.fallbackPoster
    };
  }

  getPosterUrl(media: MediaCard): string {
    return media.posterUrl?.trim() || this.fallbackPoster;
  }

  getFilledStars(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }

  formatRating(rating: number): string {
    return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  }

openTrailer(media: MediaCard): void {
    this.trailerVideoId = media.trailerYoutubeId || null;
    if (this.trailerVideoId) {
      this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${this.trailerVideoId}?autoplay=1&rel=0`
      );
    } else {
      this.trailerUrl = null;
    }
    this.showTrailerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeTrailer(): void {
    this.showTrailerModal = false;
    this.trailerVideoId = null;
    this.trailerUrl = null;
    document.body.style.overflow = '';
  }

  trackByRoute = (_: number, item: NavItem): string => item.route;

  trackByTitle = (_: number, item: MediaCard): string => item.title;
}
