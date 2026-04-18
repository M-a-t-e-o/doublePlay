import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import {
  FriendListItem,
  FriendRequestReceived,
  FriendRequestSent,
  SocialFeedEvent,
  SocialPagination,
  SocialService
} from '../../core/services/social.service';
import { AuthService } from '../../core/services/auth.service';

type ActiveTab = 'feed' | 'friends';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent, SearchDropdownComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss'
})
export class SocialComponent implements OnInit {
  private readonly api = environment.apiUrl;
  readonly ratingStars = [1, 2, 3, 4, 5];

  activeTab: ActiveTab = 'feed';

  isLoadingFeed = false;
  feedError = '';
  feed: SocialFeedEvent[] = [];
  pagination: SocialPagination = {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  };

  isLoadingFriends = false;
  friendsError = '';
  friends: FriendListItem[] = [];
  receivedRequests: FriendRequestReceived[] = [];
  sentRequests: FriendRequestSent[] = [];

  friendSearchQuery = '';
  isAddFriendOpen = false;
  requestUserId = '';
  requestActionMessage = '';

  constructor(
    private socialService: SocialService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFeed(1, true);
    this.loadFriendData();
  }

  get profileInitial(): string {
    const userName = this.authService.getUserName() ?? 'U';
    return userName.trim().charAt(0).toUpperCase() || 'U';
  }

  get currentUserAvatarUrl(): string {
    const userId = this.authService.getUserIdFromToken();
    if (userId) {
      return `${this.api}/auth/profile-picture/${userId}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.currentUserAvatarSeed)}`;
  }

  get currentUserAvatarSeed(): string {
    return this.buildAvatarSeed(this.authService.getUserName() || 'user', this.authService.getUserIdFromToken() || 'unknown');
  }

  handleCurrentUserAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;

    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.currentUserAvatarSeed)}`;
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;

    // Refresh feed on tab switch so recently accepted friendships appear immediately.
    if (tab === 'feed') {
      this.loadFeed(1, true);
    }
  }

  get filteredFriends(): FriendListItem[] {
    const search = this.friendSearchQuery.trim().toLowerCase();
    if (!search) return this.friends;

    return this.friends.filter((friend) =>
      friend.user.name.toLowerCase().includes(search)
    );
  }

  toggleAddFriend(): void {
    this.isAddFriendOpen = !this.isAddFriendOpen;
  }

  loadMoreFeed(): void {
    if (!this.pagination.hasNext || this.isLoadingFeed) {
      return;
    }
    this.loadFeed(this.pagination.page + 1, false);
  }

  getActionLabel(type: SocialFeedEvent['type']): string {
    if (type === 'watched') return 'watched';
    if (type === 'wishlisted') return 'wishlisted';
    return 'rated';
  }

  getActionIcon(type: SocialFeedEvent['type']): string {
    if (type === 'watched') return 'visibility';
    if (type === 'wishlisted') return 'bookmark';
    return 'star';
  }

  getContentLabel(type: SocialFeedEvent['content'] extends infer C ? C : never): string {
    if (!type) return 'Content';
    return type.type === 'movie' ? 'Movie' : 'Game';
  }

  getFilledStars(rating: number | undefined): number {
    if (!rating) return 0;
    return Math.max(0, Math.min(5, Math.round(rating)));
  }

  trackFeedEvent(index: number, event: SocialFeedEvent): string {
    return `${event.user?._id ?? 'unknown'}-${event.content?._id ?? 'unknown'}-${event.type}-${event.date}-${index}`;
  }

  trackFriend(_: number, friend: FriendListItem): string {
    return friend.friendshipId;
  }

  trackRequest(_: number, request: FriendRequestReceived | FriendRequestSent): string {
    return request._id;
  }

  getFriendAvatarSeed(friend: FriendListItem): string {
    return this.buildAvatarSeed(friend.user.name, friend.user._id);
  }

  getFeedAvatarUrl(event: SocialFeedEvent): string {
    const user = event.user;
    const seed = this.buildAvatarSeed(user?.name, user?._id);

    if (user?._id && user.hasProfilePicture) {
      // Cache-buster avoids stale browser cache after updating picture.
      return `${this.api}/auth/profile-picture/${user._id}?t=${encodeURIComponent(event.date)}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  }

  handleFeedAvatarError(event: Event, userName: string | undefined, userId: string | undefined): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;

    const fallbackSeed = encodeURIComponent(this.buildAvatarSeed(userName, userId));
    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${fallbackSeed}`;
  }

  private buildAvatarSeed(name: string | undefined, id: string | undefined): string {
    const safeId = (id || 'unknown').trim();
    const safeName = (name || 'user').trim();
    return `${safeId}-${safeName}`;
  }

  formatRelativeDate(dateInput: string): string {
    const date = new Date(dateInput).getTime();
    if (Number.isNaN(date)) return 'just now';

    const diffMs = Date.now() - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return new Date(dateInput).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  sendFriendRequest(): void {
    const userId = this.requestUserId.trim();
    if (!userId) {
      this.requestActionMessage = 'Introduce un userId válido.';
      return;
    }

    this.socialService.sendRequest(userId).subscribe({
      next: (response) => {
        this.requestActionMessage = response.message;
        this.requestUserId = '';
        this.isAddFriendOpen = false;
        this.loadFriendData();
      },
      error: (error) => {
        this.requestActionMessage = error?.error?.message || 'No se pudo enviar la solicitud.';
      }
    });
  }


  acceptRequest(requestId: string): void {
    this.socialService.acceptRequest(requestId).subscribe({
      next: () => {
        this.requestActionMessage = 'Solicitud aceptada.';
        this.loadFriendData();
        this.loadFeed(1, true);
      },
      error: (error) => {
        this.requestActionMessage = error?.error?.message || 'No se pudo aceptar la solicitud.';
      }
    });
  }

  rejectOrCancelRequest(requestId: string): void {
    this.socialService.rejectOrCancelRequest(requestId).subscribe({
      next: (response) => {
        this.requestActionMessage = response.message;
        this.loadFriendData();
      },
      error: (error) => {
        this.requestActionMessage = error?.error?.message || 'No se pudo procesar la solicitud.';
      }
    });
  }

  removeFriend(userId: string): void {
    this.socialService.removeFriend(userId).subscribe({
      next: () => {
        this.requestActionMessage = 'Amigo eliminado.';
        this.loadFriendData();
        this.loadFeed(1, true);
      },
      error: (error) => {
        this.requestActionMessage = error?.error?.message || 'No se pudo eliminar la amistad.';
      }
    });
  }

  private loadFeed(page: number, reset: boolean): void {
    this.isLoadingFeed = true;
    this.feedError = '';

    this.socialService.getFeed(page, this.pagination.limit).subscribe({
      next: (response) => {
        const nextFeed = response.data ?? [];
        this.feed = reset ? nextFeed : [...this.feed, ...nextFeed];
        this.pagination = response.pagination ?? this.pagination;
        this.isLoadingFeed = false;
      },
      error: (error) => {
        this.feedError = error?.error?.message || 'No se pudo cargar la actividad social.';
        this.isLoadingFeed = false;
      }
    });
  }

  private loadFriendData(): void {
    if (!this.authService.isLoggedIn()) {
      this.friendsError = 'Inicia sesión para gestionar amistades y ver actividad social.';
      this.friends = [];
      this.receivedRequests = [];
      this.sentRequests = [];
      return;
    }

    this.isLoadingFriends = true;
    this.friendsError = '';

    forkJoin({
      friends: this.socialService.getFriends(),
      received: this.socialService.getReceivedRequests(),
      sent: this.socialService.getSentRequests()
    }).subscribe({
      next: ({ friends, received, sent }) => {
        this.friends = friends ?? [];
        this.receivedRequests = received ?? [];
        this.sentRequests = sent ?? [];
        this.isLoadingFriends = false;
      },
      error: (error) => {
        this.friends = [];
        this.receivedRequests = [];
        this.sentRequests = [];
        this.friendsError = error?.error?.message || 'No se pudo cargar la información de amistades.';
        this.isLoadingFriends = false;
      }
    });
  }
}
