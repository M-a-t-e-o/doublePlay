import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';

interface BackendMovie {
  _id: string;
  title: string;
  genres?: string[];
  description?: string;
  posterUrl?: string;
  trailerYoutubeId?: string;
  rating?: {
    avg?: number;
  };
  releaseDate?: string;
  director?: string;
  runtime?: number;
  numberReviews?: number;
}

interface MovieDetail extends BackendMovie {
  views?: number;
}

type InteractionResponse = {
  watched: boolean;
  inWishlist: boolean;
  rating: number | null;
  reviewContent: string | null;
};

type ReviewUser = {
  _id?: string;
  name?: string;
};

type MovieReview = {
  id: string;
  user: ReviewUser | string;
  content: string;
  rating: number | null;
};

type MovieReviewsResponse = {
  data: MovieReview[];
  total: number;
};

type PendingAction = {
  movieId: string;
  type: 'watched' | 'wishlist' | 'rating';
  value: boolean | number;
};

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss'
})
export class MovieDetailComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly fallbackPoster = 'https://placehold.co/600x900?text=No+Image';
  private readonly pendingActionKey = 'movie-detail-pending-action';

  movie: MovieDetail | null = null;
  isLoading = false;
  errorMessage = '';
  showTrailerModal = false;
  trailerUrl: SafeResourceUrl | null = null;
  isWatched = false;
  isInWishlist = false;
  userRating = 0;
  showReviewModal = false;
  selectedRating = 0;
  reviewDraft = '';
  reviewError = '';
  isSubmittingReview = false;
  interactionMessage = '';
  readonly reviewMaxLength = 1000;
  private ownReviewId: string | null = null;
  private ownReviewContent: string | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const movieId = params['id'];
      if (movieId) {
        this.loadMovieDetail(movieId);
      }
    });
  }

  private loadMovieDetail(movieId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .get<BackendMovie>(`${this.api}/movies/${movieId}`)
      .subscribe({
        next: (response) => {
          this.movie = response;
          this.interactionMessage = '';
          if (this.authService.isLoggedIn()) {
            this.loadInteraction(movieId);
          } else {
            this.isWatched = false;
            this.isInWishlist = false;
            this.userRating = 0;
            this.ownReviewId = null;
            this.ownReviewContent = null;
          }
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar la película.';
          this.movie = null;
          this.isLoading = false;
        }
      });
  }

  getPosterUrl(): string {
    return this.movie?.posterUrl?.trim() || this.fallbackPoster;
  }

  openTrailer(): void {
    if (this.movie?.trailerYoutubeId) {
      this.trailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${this.movie.trailerYoutubeId}?autoplay=1&rel=0`
      );
      this.showTrailerModal = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeTrailer(): void {
    this.showTrailerModal = false;
    this.trailerUrl = null;
    document.body.style.overflow = '';
  }

  toggleWatched(): void {
    if (!this.movie) {
      return;
    }

    const nextValue = !this.isWatched;
    if (!this.ensureLoggedIn({ movieId: this.movie._id, type: 'watched', value: nextValue })) {
      return;
    }

    this.http
      .patch<InteractionResponse>(`${this.api}/movies/${this.movie._id}/watched`, { watched: nextValue })
      .subscribe({
        next: (interaction) => {
          this.applyInteraction(interaction);
          this.interactionMessage = '';
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleAuthError(error, { movieId: this.movie!._id, type: 'watched', value: nextValue })) {
            return;
          }
          this.interactionMessage = 'No se pudo actualizar watched.';
        }
      });
  }

  toggleWishlist(): void {
    if (!this.movie) {
      return;
    }

    const nextValue = !this.isInWishlist;
    if (!this.ensureLoggedIn({ movieId: this.movie._id, type: 'wishlist', value: nextValue })) {
      return;
    }

    this.http
      .patch<InteractionResponse>(`${this.api}/movies/${this.movie._id}/wishlist`, { inWishlist: nextValue })
      .subscribe({
        next: (interaction) => {
          this.applyInteraction(interaction);
          this.interactionMessage = '';
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleAuthError(error, { movieId: this.movie!._id, type: 'wishlist', value: nextValue })) {
            return;
          }
          this.interactionMessage = 'No se pudo actualizar wishlist.';
        }
      });
  }

  setRating(rating: number): void {
    if (!this.movie) {
      return;
    }

    if (!this.ensureLoggedIn({ movieId: this.movie._id, type: 'rating', value: rating })) {
      return;
    }

    this.selectedRating = rating;
    this.reviewDraft = this.ownReviewContent || '';
    this.reviewError = '';
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    if (this.isSubmittingReview) {
      return;
    }
    this.showReviewModal = false;
    this.selectedRating = 0;
    this.reviewError = '';
  }

  get reviewLength(): number {
    return this.reviewDraft.length;
  }

  submitReview(): void {
    if (!this.movie || this.selectedRating < 1 || this.selectedRating > 5) {
      return;
    }

    const content = this.reviewDraft.trim();
    if (!content) {
      this.reviewError = 'Escribe un texto para poder guardar tu voto.';
      return;
    }

    this.reviewError = '';
    this.isSubmittingReview = true;

    const payload = {
      rating: this.selectedRating,
      content
    };

    if (this.ownReviewId) {
      this.patchOwnReview(payload);
      return;
    }

    this.http.post(`${this.api}/movies/${this.movie._id}/reviews`, payload).subscribe({
      next: () => {
        this.onReviewSaved(content);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { movieId: this.movie!._id, type: 'rating', value: this.selectedRating })) {
          this.isSubmittingReview = false;
          this.showReviewModal = false;
          return;
        }

        if (error.status === 409) {
          this.resolveOwnReviewIdAndPatch(payload, content);
          return;
        }

        this.reviewError = error.error?.message || 'No se pudo guardar tu review.';
        this.isSubmittingReview = false;
      }
    });
  }

  shareMovie(): void {
    if (navigator.share) {
      navigator.share({
        title: this.movie?.title,
        text: `Check out ${this.movie?.title}`,
        url: window.location.href
      });
    }
  }


  logout(): void {
    this.authService.logout();
    this.isWatched = false;
    this.isInWishlist = false;
    this.userRating = 0;
    this.interactionMessage = '';
  }

  trackByRoute = (_: number, item: NavItem): string => item.route;

  private loadInteraction(movieId: string): void {
    this.http.get<InteractionResponse>(`${this.api}/movies/${movieId}/interaction`).subscribe({
      next: (interaction) => {
        this.applyInteraction(interaction);
        this.loadOwnReviewId(movieId);
        this.consumePendingAction(movieId);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error)) {
          return;
        }
        this.consumePendingAction(movieId);
      }
    });
  }

  private applyInteraction(interaction: InteractionResponse): void {
    this.isWatched = interaction.watched;
    this.isInWishlist = interaction.inWishlist;
    this.userRating = interaction.rating ?? 0;
    this.ownReviewContent = interaction.reviewContent;
  }

  private ensureLoggedIn(action: PendingAction): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }

    sessionStorage.setItem(this.pendingActionKey, JSON.stringify(action));
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: this.router.url,
        reason: 'auth-required'
      }
    });
    return false;
  }

  private consumePendingAction(movieId: string): void {
    const raw = sessionStorage.getItem(this.pendingActionKey);
    if (!raw) {
      return;
    }

    let action: PendingAction;
    try {
      action = JSON.parse(raw) as PendingAction;
    } catch {
      sessionStorage.removeItem(this.pendingActionKey);
      return;
    }

    if (action.movieId !== movieId) {
      return;
    }

    sessionStorage.removeItem(this.pendingActionKey);

    if (action.type === 'watched' && typeof action.value === 'boolean') {
      this.http
        .patch<InteractionResponse>(`${this.api}/movies/${movieId}/watched`, { watched: action.value })
        .subscribe({
          next: (interaction) => {
            this.applyInteraction(interaction);
            this.interactionMessage = '';
          },
          error: (error: HttpErrorResponse) => {
            if (this.handleAuthError(error, action)) {
              return;
            }
            this.interactionMessage = 'No se pudo completar la accion de watched.';
          }
        });
      return;
    }

    if (action.type === 'wishlist' && typeof action.value === 'boolean') {
      this.http
        .patch<InteractionResponse>(`${this.api}/movies/${movieId}/wishlist`, { inWishlist: action.value })
        .subscribe({
          next: (interaction) => {
            this.applyInteraction(interaction);
            this.interactionMessage = '';
          },
          error: (error: HttpErrorResponse) => {
            if (this.handleAuthError(error, action)) {
              return;
            }
            this.interactionMessage = 'No se pudo completar la accion de wishlist.';
          }
        });
      return;
    }

    if (action.type === 'rating' && typeof action.value === 'number') {
      this.selectedRating = action.value;
      this.reviewDraft = this.ownReviewContent || '';
      this.reviewError = '';
      this.showReviewModal = true;
      this.interactionMessage = '';
    }
  }

  private patchOwnReview(payload: { rating: number; content: string }): void {
    if (!this.movie || !this.ownReviewId) {
      this.isSubmittingReview = false;
      return;
    }

    this.http.patch(`${this.api}/movies/${this.movie._id}/reviews/${this.ownReviewId}`, payload).subscribe({
      next: () => {
        this.onReviewSaved(payload.content);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { movieId: this.movie!._id, type: 'rating', value: this.selectedRating })) {
          this.isSubmittingReview = false;
          this.showReviewModal = false;
          return;
        }
        this.reviewError = error.error?.message || 'No se pudo actualizar tu review.';
        this.isSubmittingReview = false;
      }
    });
  }

  private resolveOwnReviewIdAndPatch(payload: { rating: number; content: string }, content: string): void {
    if (!this.movie) {
      this.isSubmittingReview = false;
      return;
    }

    this.http.get<MovieReviewsResponse>(`${this.api}/movies/${this.movie._id}/reviews`).subscribe({
      next: (response) => {
        const userId = this.authService.getUserIdFromToken();
        const ownReview = response.data.find((review) => {
          if (!userId) {
            return false;
          }

          const reviewUser = review.user;
          return typeof reviewUser !== 'string' && reviewUser?._id === userId;
        });

        if (!ownReview) {
          this.reviewError = 'Ya tienes una review creada, pero no se pudo localizar para editar.';
          this.isSubmittingReview = false;
          return;
        }

        this.ownReviewId = ownReview.id;
        this.patchOwnReview({
          rating: payload.rating,
          content
        });
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { movieId: this.movie!._id, type: 'rating', value: this.selectedRating })) {
          this.isSubmittingReview = false;
          this.showReviewModal = false;
          return;
        }

        this.reviewError = 'No se pudo recuperar tu review actual para editarla.';
        this.isSubmittingReview = false;
      }
    });
  }

  private loadOwnReviewId(movieId: string): void {
    if (!this.authService.isLoggedIn()) {
      this.ownReviewId = null;
      return;
    }

    const userId = this.authService.getUserIdFromToken();
    if (!userId) {
      this.ownReviewId = null;
      return;
    }

    this.http.get<MovieReviewsResponse>(`${this.api}/movies/${movieId}/reviews`).subscribe({
      next: (response) => {
        const ownReview = response.data.find((review) => {
          const reviewUser = review.user;
          return typeof reviewUser !== 'string' && reviewUser?._id === userId;
        });
        this.ownReviewId = ownReview?.id || null;
      },
      error: () => {
        this.ownReviewId = null;
      }
    });
  }

  private onReviewSaved(content: string): void {
    if (this.selectedRating) {
      this.userRating = this.selectedRating;
    }
    this.ownReviewContent = content;
    this.interactionMessage = 'Review guardada correctamente.';
    this.isSubmittingReview = false;
    this.showReviewModal = false;
    this.selectedRating = 0;
    this.reviewError = '';

    if (this.movie) {
      this.loadMovieDetail(this.movie._id);
    }
  }

  private handleAuthError(error: HttpErrorResponse, pendingAction?: PendingAction): boolean {
    if (error.status !== 401 && error.status !== 403) {
      return false;
    }

    this.authService.logout();

    if (pendingAction) {
      sessionStorage.setItem(this.pendingActionKey, JSON.stringify(pendingAction));
    }

    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: this.router.url,
        reason: 'auth-required'
      }
    });

    return true;
  }
}
