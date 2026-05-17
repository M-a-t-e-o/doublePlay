/*
  Project: doublePlay (frontend)
  File: src/app/pages/profile/profile.component.ts
  Description: Profile page component that shows user stats, settings and recent activity.
*/

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService, ProfileData, ContentListResponse } from '../../core/services/profile.service';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';
import { environment } from '../../../environments/environment';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
  interactedAt: string;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, SearchDropdownComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('activityChart') private activityChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('genreChart') private genreChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  private readonly api = environment.apiUrl;
  private avatarCacheBust = Date.now();
  isUploadingProfilePicture: boolean = false;
  showUploadModal: boolean = false;
  showSettingsModal: boolean = false;
  isSavingSettings: boolean = false;
  isDragOver: boolean = false;
  private activityChartInstance: Chart<'bar'> | null = null;
  private genreChartInstance: Chart<'doughnut'> | null = null;
  private isViewReady = false;

  monthlyActivity: ActivityMonth[] = [];
  genres: GenreItem[] = [];
  libraryItems: LibraryItem[] = [];
  
  profileData: ProfileData | null = null;
  movieCount: number = 0;
  gamesCount: number = 0;
  wishlistCount: number = 0;
  profileName: string = '';
  profileUsername: string = '';
  profileRole: 'user' | 'admin' | undefined = undefined;
  memberSinceLabel: string = 'Member since';
  settingsForm = {
    name: '',
    username: '',
    currentPassword: '',
    newPassword: ''
  };
  
  activeLibraryTab: 'history' | 'wishlist' = 'history';
  activeLibraryType: 'all' | 'movies' | 'games' = 'all';
  libraryPage: number = 1;
  readonly libraryPageSize: number = 5;
  libraryTotalItems: number = 0;
  libraryTotalPages: number = 1;
  genreFilter: 'all' | 'movies' | 'games' = 'all';
  
  toastMessage: string = '';
  toastType: 'error' | 'success' = 'error';
  showToast: boolean = false;
  
  private movieGenreData: Array<{ genre: string; count: number }> = [];
  private gameGenreData: Array<{ genre: string; count: number }> = [];
  
  // Color palette for genres (expanded to 30+ colors for no repeats)
  private readonly genreColors = [
    '#6f53ff', '#65b4d4', '#e38a3f', '#61bf8c', 
    '#de5d5d', '#667191', '#5ca3d4', '#d4635c',
    '#ff6b9d', '#c06c84', '#6c567b', '#d5573b',
    '#ff6b6b', '#4ecdc4', '#45b7aa', '#96ceb4',
    '#ffeaa7', '#dfe6e9', '#a29bfe', '#74b9ff',
    '#81ecec', '#55efc4', '#fab1a0', '#fd79a8',
    '#fdcb6e', '#6c5ce7', '#00b894', '#e84393',
    '#0984e3', '#f368e0', '#30336b', '#f7b731'
  ];

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  goToAdminPanel(): void {
    this.router.navigate(['/admin']);
  }

  openSettingsModal(): void {
    this.settingsForm = {
      name: this.profileName,
      username: this.profileUsername,
      currentPassword: '',
      newPassword: ''
    };
    this.showSettingsModal = true;
  }

  closeSettingsModal(): void {
    this.showSettingsModal = false;
    this.isSavingSettings = false;
    this.settingsForm.currentPassword = '';
    this.settingsForm.newPassword = '';
  }

  ngOnInit(): void {
    this.profileName = this.getSessionNameFallback();
    this.loadProfileData();
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    this.refreshCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private getSessionNameFallback(): string {
    const sessionName = (this.authService.getUserName() || '').trim();
    return sessionName || 'user';
  }

  private loadProfileData(): void {
    this.profileService.getProfileData().subscribe({
      next: (data) => {
        this.profileData = data;
        this.avatarCacheBust = Date.now();
        this.movieCount = data.counts.watchedMovies;
        this.gamesCount = data.counts.gamesPlayed;
        this.wishlistCount = data.counts.totalWishlisted;
        const backendName = (data.user.name || '').trim();
        const backendUsername = (data.user.username || '').trim();
        this.profileName = backendName || this.getSessionNameFallback();
        this.profileUsername = backendUsername;
        this.profileRole = this.authService.getUserRoleFromToken() || undefined;
        this.memberSinceLabel = this.formatMemberSince(data.user.createdAt);
        if (this.showSettingsModal) {
          this.settingsForm.name = this.profileName;
          this.settingsForm.username = this.profileUsername;
        }
        
        // Process monthly activity
        this.monthlyActivity = data.monthlyDistribution.map(item => ({
          month: item.month.split(' ')[0],
          movies: item.movies,
          games: item.games
        }));
        
        // Process and combine genres
        this.processGenres(data.movieGenreDistribution, data.gameGenreDistribution);
        
        // Render charts with updated data
        this.refreshCharts();
        
        // Load library items (history by default)
        this.loadLibraryItems();
      },
      error: (err) => {
        console.error('Error loading profile data:', err);
      }
    });
  }

  private processGenres(
    movieGenres: Array<{ genre: string; count: number }>,
    gameGenres: Array<{ genre: string; count: number }>
  ): void {
    this.movieGenreData = movieGenres;
    this.gameGenreData = gameGenres;
    this.applyGenreFilter();
  }

  private applyGenreFilter(): void {
    let sourcedGenres: Array<{ genre: string; count: number }> = [];

    if (this.genreFilter === 'movies') {
      sourcedGenres = this.movieGenreData;
    } else if (this.genreFilter === 'games') {
      sourcedGenres = this.gameGenreData;
    } else {
      const genreCountMap = new Map<string, number>();
      this.movieGenreData.forEach(g => {
        genreCountMap.set(g.genre, (genreCountMap.get(g.genre) || 0) + g.count);
      });
      this.gameGenreData.forEach(g => {
        genreCountMap.set(g.genre, (genreCountMap.get(g.genre) || 0) + g.count);
      });
      sourcedGenres = Array.from(genreCountMap.entries()).map(([genre, count]) => ({
        genre,
        count
      }));
    }

    const totalCount = sourcedGenres.reduce((sum, item) => sum + item.count, 0);

    if (totalCount === 0) {
      this.genres = [];
      return;
    }

    this.genres = sourcedGenres
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({
        label: item.genre,
        value: Number(((item.count / totalCount) * 100).toFixed(1)),
        color: this.genreColors[index % this.genreColors.length]
      }));

    this.refreshCharts();
  }

  switchGenreFilter(filter: 'all' | 'movies' | 'games'): void {
    this.genreFilter = filter;
    this.applyGenreFilter();
  }

  private refreshCharts(): void {
    if (!this.isViewReady) {
      return;
    }

    this.renderActivityChart();
    this.renderGenreChart();
  }

  private destroyCharts(): void {
    this.activityChartInstance?.destroy();
    this.genreChartInstance?.destroy();
    this.activityChartInstance = null;
    this.genreChartInstance = null;
  }

  private renderActivityChart(): void {
    const canvas = this.activityChartRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.activityChartInstance?.destroy();

    const labels = this.monthlyActivity.map(item => item.month);
    const movieValues = this.monthlyActivity.map(item => item.movies);
    const gameValues = this.monthlyActivity.map(item => item.games);

    this.activityChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Movies',
            data: movieValues,
            backgroundColor: '#e38a3f',
            borderRadius: 6,
            maxBarThickness: 28
          },
          {
            label: 'Games',
            data: gameValues,
            backgroundColor: '#65b4d4',
            borderRadius: 6,
            maxBarThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8f99c6' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#8f99c6'
            },
            grid: {
              color: 'rgba(143, 153, 198, 0.14)'
            }
          }
        }
      }
    });
  }

  private renderGenreChart(): void {
    const canvas = this.genreChartRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.genreChartInstance?.destroy();

    const hasGenreData = this.genres.length > 0;
    const labels = hasGenreData ? this.genres.map(item => item.label) : ['No data'];
    const values = hasGenreData ? this.genres.map(item => item.value) : [100];
    const colors = hasGenreData ? this.genres.map(item => item.color) : ['#667191'];

    this.genreChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#0d1024',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false }
        }
      }
    });
  }



  private loadLibraryItems(): void {
    const isHistory = this.activeLibraryTab === 'history';

    if (this.activeLibraryType === 'movies') {
      const movieRequest = isHistory
        ? this.profileService.getWatchedMovies(this.libraryPage, this.libraryPageSize).toPromise()
        : this.profileService.getWishlistedMovies(this.libraryPage, this.libraryPageSize).toPromise();

      movieRequest
        .then((movies) => {
          this.libraryItems = this.combineAndSortItems(movies, undefined);
          this.libraryTotalItems = movies?.pagination.total ?? 0;
          this.libraryTotalPages = Math.max(1, Math.ceil(this.libraryTotalItems / this.libraryPageSize));
        })
        .catch(err => {
          const section = isHistory ? 'history' : 'wishlist';
          console.error(`Error loading ${section}:`, err);
        });
      return;
    }

    if (this.activeLibraryType === 'games') {
      const gameRequest = isHistory
        ? this.profileService.getPlayedGames(this.libraryPage, this.libraryPageSize).toPromise()
        : this.profileService.getWishlistedGames(this.libraryPage, this.libraryPageSize).toPromise();

      gameRequest
        .then((games) => {
          this.libraryItems = this.combineAndSortItems(undefined, games);
          this.libraryTotalItems = games?.pagination.total ?? 0;
          this.libraryTotalPages = Math.max(1, Math.ceil(this.libraryTotalItems / this.libraryPageSize));
        })
        .catch(err => {
          const section = isHistory ? 'history' : 'wishlist';
          console.error(`Error loading ${section}:`, err);
        });
      return;
    }

    const neededItems = this.libraryPage * this.libraryPageSize;
    const moviesPromise = isHistory
      ? this.profileService.getWatchedMovies(1, neededItems).toPromise()
      : this.profileService.getWishlistedMovies(1, neededItems).toPromise();
    const gamesPromise = isHistory
      ? this.profileService.getPlayedGames(1, neededItems).toPromise()
      : this.profileService.getWishlistedGames(1, neededItems).toPromise();

    Promise.all([moviesPromise, gamesPromise])
      .then(([movies, games]) => {
        const combinedItems = this.combineAndSortItems(movies, games);
        const start = (this.libraryPage - 1) * this.libraryPageSize;
        const end = start + this.libraryPageSize;

        this.libraryItems = combinedItems.slice(start, end);
        this.libraryTotalItems = (movies?.pagination.total ?? 0) + (games?.pagination.total ?? 0);
        this.libraryTotalPages = Math.max(1, Math.ceil(this.libraryTotalItems / this.libraryPageSize));
      })
      .catch(err => {
        const section = isHistory ? 'history' : 'wishlist';
        console.error(`Error loading ${section}:`, err);
      });
  }

  private combineAndSortItems(
    moviesResponse: ContentListResponse | undefined,
    gamesResponse: ContentListResponse | undefined
  ): LibraryItem[] {
    const items: LibraryItem[] = [];
    
    if (moviesResponse?.data) {
      moviesResponse.data.forEach(item => {
        items.push({
          title: item.title,
          type: 'Movie',
          genre: item.genres[0] || 'N/A',
          rating: item.avgRating || 0,
          image: item.cover || 'https://via.placeholder.com/120x180?text=No+Image',
          interactedAt: item.interactedAt
        });
      });
    }
    
    if (gamesResponse?.data) {
      gamesResponse.data.forEach(item => {
        items.push({
          title: item.title,
          type: 'Game',
          genre: item.genres[0] || 'N/A',
          rating: item.avgRating || 0,
          image: item.cover || 'https://via.placeholder.com/120x180?text=No+Image',
          interactedAt: item.interactedAt
        });
      });
    }
    
    return items
      .sort((a, b) => new Date(b.interactedAt).getTime() - new Date(a.interactedAt).getTime());
  }

  switchLibraryTab(tab: 'history' | 'wishlist'): void {
    this.activeLibraryTab = tab;
    this.libraryPage = 1;
    this.loadLibraryItems();
  }

  switchLibraryType(type: 'all' | 'movies' | 'games'): void {
    this.activeLibraryType = type;
    this.libraryPage = 1;
    this.loadLibraryItems();
  }

  goToPreviousLibraryPage(): void {
    if (this.libraryPage <= 1) {
      return;
    }

    this.libraryPage -= 1;
    this.loadLibraryItems();
  }

  goToNextLibraryPage(): void {
    if (this.libraryPage >= this.libraryTotalPages) {
      return;
    }

    this.libraryPage += 1;
    this.loadLibraryItems();
  }

  get profileHandle(): string {
    if (this.profileUsername) {
      return this.profileUsername;
    }

    return this.profileName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_.-]/g, '') || 'user';
  }

  get profileAvatarSeed(): string {
    const id = this.profileData?.user.id || this.authService.getUserIdFromToken() || 'unknown';
    const name = this.profileName || 'user';
    return `${id}-${name}`;
  }

  get profileAvatarUrl(): string {
    const userId = this.profileData?.user.id || this.authService.getUserIdFromToken();

    if (userId) {
      return `${this.api}/auth/profile-picture/${userId}?t=${this.avatarCacheBust}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.profileAvatarSeed)}`;
  }

  private formatMemberSince(createdAt: string | undefined): string {
    const fallbackId = this.profileData?.user.id || this.authService.getUserIdFromToken();
    const createdDate = createdAt ? new Date(createdAt) : fallbackId ? this.objectIdToDate(fallbackId) : null;

    if (!createdDate) {
      return 'Member since';
    }

    if (Number.isNaN(createdDate.getTime())) {
      return 'Member since';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    });

    return `Member since ${formatter.format(createdDate)}`;
  }

  private objectIdToDate(objectId: string): Date | null {
    if (!/^[a-fA-F0-9]{24}$/.test(objectId)) {
      return null;
    }

    const timestamp = parseInt(objectId.substring(0, 8), 16);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return new Date(timestamp * 1000);
  }

  handleProfileAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.profileAvatarSeed)}`;
  }

  triggerFileUpload(): void {
    this.showUploadModal = true;
  }

  async saveSettings(): Promise<void> {
    const nextName = this.settingsForm.name.trim();
    const nextUsername = this.settingsForm.username.trim();
    const currentPassword = this.settingsForm.currentPassword;
    const newPassword = this.settingsForm.newPassword;

    const hasNameChange = nextName !== '' && nextName !== this.profileName.trim();
    const hasUsernameChange = nextUsername !== '' && nextUsername !== this.profileUsername.trim();
    const hasPasswordChange = currentPassword.length > 0 || newPassword.length > 0;

    if (!hasNameChange && !hasUsernameChange && !hasPasswordChange) {
      this.showErrorToast('No changes to save.');
      return;
    }

    if (hasPasswordChange && (!currentPassword || !newPassword)) {
      this.showErrorToast('Provide both current password and new password.');
      return;
    }

    this.isSavingSettings = true;

    try {
      if (hasNameChange) {
        const response = await firstValueFrom(this.profileService.updateProfileName(nextName));
        this.profileName = response.user?.name || nextName;
        if (this.profileData) {
          this.profileData.user.name = this.profileName;
        }
        this.authService.saveUserName(this.profileName);
      }

      if (hasUsernameChange) {
        const response = await firstValueFrom(this.profileService.updateUsername(nextUsername));
        this.profileUsername = response.user?.username || nextUsername;
        if (this.profileData) {
          this.profileData.user.username = this.profileUsername;
        }
      }

      if (hasPasswordChange) {
        await firstValueFrom(this.profileService.updatePassword(currentPassword, newPassword));
        this.settingsForm.currentPassword = '';
        this.settingsForm.newPassword = '';
      }

      this.closeSettingsModal();
      this.showSuccessToast('Profile settings updated successfully.');
    } catch (err) {
      console.error('Error updating profile settings:', err);
      this.showErrorToast(this.extractErrorMessage(err, 'Could not update profile settings.'));
    } finally {
      this.isSavingSettings = false;
    }
  }

  onProfilePictureSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return;
    }
    this.handleSelectedFile(file);
  }

  handleSelectedFile(file: File): void {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      this.showErrorToast('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showErrorToast('File size must be less than 5MB');
      return;
    }

    this.uploadProfilePicture(file);
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.isDragOver = false;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleSelectedFile(file);
    }
  }

  openFileSelector(): void {
    // Called from template to open the hidden file input
    this.fileInput?.nativeElement?.click();
  }

  private uploadProfilePicture(file: File): void {
    this.isUploadingProfilePicture = true;
    const formData = new FormData();
    formData.append('profilePicture', file);

    this.profileService.uploadProfilePicture(formData).subscribe({
      next: () => {
        this.avatarCacheBust = Date.now();
        this.authService.notifyAvatarChanged();
        this.isUploadingProfilePicture = false;
        this.closeUploadModal();
      },
      error: (err) => {
        console.error('Error uploading profile picture:', err);
        this.isUploadingProfilePicture = false;
        this.showErrorToast('Error uploading profile picture. Please try again.');
      }
    });
  }

  private showErrorToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'error';
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  private showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.toastType = 'success';
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const error = (err as { error?: { message?: string } }).error;
      if (error?.message) {
        return error.message;
      }
    }

    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message?: string }).message;
      if (message) {
        return message;
      }
    }

    return fallback;
  }
}
