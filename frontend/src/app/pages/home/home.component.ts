import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly fallbackPoster = 'https://placehold.co/600x900?text=No+Image';
  private readonly homeLimit = 8;

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

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.loadTopMovies();
    this.loadTopGames();
  }

  private loadTopMovies(): void {
    this.isLoadingMovies = true;
    this.moviesError = '';

    this.http
      .get<MoviesApiResponse>(`${this.api}/movies`, {
        params: {
          limit: String(this.homeLimit),
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
        },
        error: () => {
          this.moviesError = 'No se pudieron cargar las peliculas.';
          this.featuredMovie = null;
          this.topMovies = [];
          this.isLoadingMovies = false;
        }
      });
  }

  private loadTopGames(): void {
    this.isLoadingGames = true;
    this.gamesError = '';

    this.http
      .get<GamesApiResponse>(`${this.api}/games`, {
        params: {
          limit: String(this.homeLimit),
          sort: 'rating_desc'
        }
      })
      .subscribe({
        next: (response) => {
          const games = (response.data ?? []).map((game) => this.mapGame(game));
          this.topGames = this.pickTopOrFirst(games);
          this.isLoadingGames = false;
        },
        error: () => {
          this.gamesError = 'No se pudieron cargar los juegos.';
          this.topGames = [];
          this.isLoadingGames = false;
        }
      });
  }

  private pickTopOrFirst(items: MediaCard[]): MediaCard[] {
    const ratedItems = items.filter((item) => item.rating > 0);
    return ratedItems.length > 0 ? ratedItems.slice(0, this.homeLimit) : items.slice(0, this.homeLimit);
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
