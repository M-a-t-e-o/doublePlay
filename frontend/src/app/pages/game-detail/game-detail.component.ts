import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';

interface BackendGame {
  _id: string;
  title: string;
  description?: string;
  genres?: string[];
  coverUrl?: string;
  releaseDate?: string;
  developers?: string[];
  price?: number;
  platforms?: {
    windows?: boolean;
    mac?: boolean;
    linux?: boolean;
  };
  rating?: {
    avg?: number;
  };
  numberReviews?: number;
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

type GameReview = {
  id: string;
  user: ReviewUser | string;
  content: string;
  rating: number | null;
};

type GameReviewsResponse = {
  data: GameReview[];
  total: number;
};

type PendingAction = {
  gameId: string;
  type: 'played' | 'wishlist' | 'rating';
  value: boolean | number;
};

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, SearchDropdownComponent],
  templateUrl: './game-detail.component.html',
  styleUrl: './game-detail.component.scss'
})
export class GameDetailComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly fallbackCover = 'https://placehold.co/1200x675?text=No+Image';
  private readonly pendingActionKey = 'game-detail-pending-action';

  game: BackendGame | null = null;
  isLoading = false;
  errorMessage = '';
  isPlayed = false;
  isInWishlist = false;
  userRating = 0;
  interactionMessage = '';

  showReviewModal = false;
  selectedRating = 0;
  reviewDraft = '';
  reviewError = '';
  isSubmittingReview = false;
  readonly reviewMaxLength = 1000;

  private ownReviewId: string | null = null;
  private ownReviewContent: string | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const gameId = params['id'];
      if (gameId) {
        this.loadGameDetail(gameId);
      }
    });
  }

  private loadGameDetail(gameId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<BackendGame>(`${this.api}/games/${gameId}`).subscribe({
      next: (game) => {
        this.game = game;
        this.interactionMessage = '';
        if (this.authService.isLoggedIn()) {
          this.loadInteraction(gameId);
        } else {
          this.isPlayed = false;
          this.isInWishlist = false;
          this.userRating = 0;
          this.ownReviewId = null;
          this.ownReviewContent = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el juego.';
        this.game = null;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/games']);
  }

  getCoverUrl(): string {
    return this.game?.coverUrl?.trim() || this.fallbackCover;
  }

  togglePlayed(): void {
    if (!this.game) {
      return;
    }

    const nextValue = !this.isPlayed;
    if (!this.ensureLoggedIn({ gameId: this.game._id, type: 'played', value: nextValue })) {
      return;
    }

    this.http.patch<InteractionResponse>(`${this.api}/games/${this.game._id}/watched`, { watched: nextValue }).subscribe({
      next: (interaction) => {
        this.applyInteraction(interaction);
        this.interactionMessage = '';
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { gameId: this.game!._id, type: 'played', value: nextValue })) {
          return;
        }
        this.interactionMessage = 'No se pudo actualizar played.';
      }
    });
  }

  toggleWishlist(): void {
    if (!this.game) {
      return;
    }

    const nextValue = !this.isInWishlist;
    if (!this.ensureLoggedIn({ gameId: this.game._id, type: 'wishlist', value: nextValue })) {
      return;
    }

    this.http.patch<InteractionResponse>(`${this.api}/games/${this.game._id}/wishlist`, { inWishlist: nextValue }).subscribe({
      next: (interaction) => {
        this.applyInteraction(interaction);
        this.interactionMessage = '';
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { gameId: this.game!._id, type: 'wishlist', value: nextValue })) {
          return;
        }
        this.interactionMessage = 'No se pudo actualizar wishlist.';
      }
    });
  }

  setRating(rating: number): void {
    if (!this.game) {
      return;
    }

    if (!this.ensureLoggedIn({ gameId: this.game._id, type: 'rating', value: rating })) {
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
    if (!this.game || this.selectedRating < 1 || this.selectedRating > 5) {
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

    this.http.post(`${this.api}/games/${this.game._id}/reviews`, payload).subscribe({
      next: () => {
        this.onReviewSaved(content);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { gameId: this.game!._id, type: 'rating', value: this.selectedRating })) {
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

  shareGame(): void {
    if (navigator.share) {
      navigator.share({
        title: this.game?.title,
        text: `Check out ${this.game?.title}`,
        url: window.location.href
      });
    }
  }

  private loadInteraction(gameId: string): void {
    this.http.get<InteractionResponse>(`${this.api}/games/${gameId}/interaction`).subscribe({
      next: (interaction) => {
        this.applyInteraction(interaction);
        this.loadOwnReviewId(gameId);
        this.consumePendingAction(gameId);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error)) {
          return;
        }
        this.consumePendingAction(gameId);
      }
    });
  }

  private applyInteraction(interaction: InteractionResponse): void {
    this.isPlayed = interaction.watched;
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

  private consumePendingAction(gameId: string): void {
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

    if (action.gameId !== gameId) {
      return;
    }

    sessionStorage.removeItem(this.pendingActionKey);

    if (action.type === 'played' && typeof action.value === 'boolean') {
      this.http.patch<InteractionResponse>(`${this.api}/games/${gameId}/watched`, { watched: action.value }).subscribe({
        next: (interaction) => {
          this.applyInteraction(interaction);
          this.interactionMessage = '';
        },
        error: (error: HttpErrorResponse) => {
          if (this.handleAuthError(error, action)) {
            return;
          }
          this.interactionMessage = 'No se pudo completar la accion de played.';
        }
      });
      return;
    }

    if (action.type === 'wishlist' && typeof action.value === 'boolean') {
      this.http.patch<InteractionResponse>(`${this.api}/games/${gameId}/wishlist`, { inWishlist: action.value }).subscribe({
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
    if (!this.game || !this.ownReviewId) {
      this.isSubmittingReview = false;
      return;
    }

    this.http.patch(`${this.api}/games/${this.game._id}/reviews/${this.ownReviewId}`, payload).subscribe({
      next: () => {
        this.onReviewSaved(payload.content);
      },
      error: (error: HttpErrorResponse) => {
        if (this.handleAuthError(error, { gameId: this.game!._id, type: 'rating', value: this.selectedRating })) {
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
    if (!this.game) {
      this.isSubmittingReview = false;
      return;
    }

    this.http.get<GameReviewsResponse>(`${this.api}/games/${this.game._id}/reviews`).subscribe({
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
        if (this.handleAuthError(error, { gameId: this.game!._id, type: 'rating', value: this.selectedRating })) {
          this.isSubmittingReview = false;
          this.showReviewModal = false;
          return;
        }

        this.reviewError = 'No se pudo recuperar tu review actual para editarla.';
        this.isSubmittingReview = false;
      }
    });
  }

  private loadOwnReviewId(gameId: string): void {
    if (!this.authService.isLoggedIn()) {
      this.ownReviewId = null;
      return;
    }

    const userId = this.authService.getUserIdFromToken();
    if (!userId) {
      this.ownReviewId = null;
      return;
    }

    this.http.get<GameReviewsResponse>(`${this.api}/games/${gameId}/reviews`).subscribe({
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

    if (this.game) {
      this.loadGameDetail(this.game._id);
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

  get platformsLabel(): string {
    if (!this.game?.platforms) {
      return 'N/A';
    }

    const list: string[] = [];
    if (this.game.platforms.windows) list.push('Windows');
    if (this.game.platforms.mac) list.push('Mac');
    if (this.game.platforms.linux) list.push('Linux');

    return list.length ? list.join(', ') : 'N/A';
  }
}
