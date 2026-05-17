/*
  Project: doublePlay (frontend)
  File: src/app/pages/admin/admin.component.ts
  Description: Admin dashboard component that aggregates moderation, analytics and ranking data.
*/

import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';
import { AuthService } from '../../core/services/auth.service';

Chart.register(...registerables);

type AdminStats = {
  computedAt?: string;
  users: {
    total: number;
    growthLast12Months: Array<{
      key: string;
      month: string;
      newUsers: number;
      total: number;
    }>;
  };
  content: {
    totalMovies: number;
    totalGames: number;
    total: number;
    moviesPercentage: number;
    gamesPercentage: number;
  };
  ratings: {
    platformAvg: number;
  };
  views: {
    total: number;
    movies: number;
    games: number;
  };
  genres: {
    movies: Array<{ genre: string; count: number }>;
    games: Array<{ genre: string; count: number }>;
  };
  topContent: Array<{
    id: string;
    type: 'movie' | 'game';
    title: string;
    cover: string | null;
    avgRating: number;
    ratingCount: number;
    views?: number;
  }>;
};

type MetricTone = 'purple' | 'orange' | 'gold' | 'cyan';

type MetricCard = {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: MetricTone;
  trend?: string;
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SidebarComponent, SearchDropdownComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('userGrowthChart') private userGrowthChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('contentSplitChart') private contentSplitChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('genreChart') private genreChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly api = environment.apiUrl;
  private readonly fallbackCover = 'https://placehold.co/96x128?text=No+Image';
  private userGrowthChart: Chart<'line'> | null = null;
  private contentSplitChart: Chart<'doughnut'> | null = null;
  private genreChart: Chart<'bar'> | null = null;
  private isViewReady = false;
  private chartRenderTimer: ReturnType<typeof setTimeout> | null = null;

  stats: AdminStats | null = null;
  isLoading = false;
  errorMessage = '';
  showExportMenu = false;
  avatarCacheBust = Date.now();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats(false);
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    this.scheduleChartRender();
  }

  ngOnDestroy(): void {
    if (this.chartRenderTimer) {
      clearTimeout(this.chartRenderTimer);
    }
    this.destroyCharts();
  }

  get adminName(): string {
    return this.authService.getUserName() || 'Admin';
  }

  get adminAvatarSeed(): string {
    const userId = this.authService.getUserIdFromToken() || 'admin';
    return `${userId}-${this.adminName}`;
  }

  get adminAvatarUrl(): string {
    const userId = this.authService.getUserIdFromToken();
    if (userId) {
      return `${this.api}/auth/profile-picture/${userId}?t=${this.avatarCacheBust}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.adminAvatarSeed)}`;
  }

  get metricCards(): MetricCard[] {
    const stats = this.stats;
    if (!stats) return [];

    return [
      {
        label: 'Total Registered Users',
        value: this.formatCompact(stats.users.total),
        detail: `${this.formatNumber(this.currentMonthNewUsers)} this month`,
        icon: 'groups',
        tone: 'purple',
        trend: this.userGrowthTrend
      },
      {
        label: 'Total Content',
        value: this.formatNumber(stats.content.total),
        detail: `${this.formatNumber(stats.content.totalMovies)} movies - ${this.formatNumber(stats.content.totalGames)} games`,
        icon: 'video_library',
        tone: 'orange'
      },
      {
        label: 'Avg. Platform Rating',
        value: stats.ratings.platformAvg.toFixed(2),
        detail: 'Across all rated content',
        icon: 'star',
        tone: 'gold'
      },
      {
        label: 'Total Views',
        value: this.formatCompact(stats.views.total),
        detail: `${this.formatNumber(stats.views.movies)} movie - ${this.formatNumber(stats.views.games)} game`,
        icon: 'visibility',
        tone: 'cyan'
      }
    ];
  }

  get currentMonthNewUsers(): number {
    const growth = this.stats?.users.growthLast12Months ?? [];
    return growth.length ? growth[growth.length - 1].newUsers : 0;
  }

  get latestContentCount(): number {
    return this.stats?.content.total ?? 0;
  }

  get userGrowthTrend(): string {
    const growth = this.stats?.users.growthLast12Months ?? [];
    const current = growth.length ? growth[growth.length - 1].newUsers : 0;
    const previous = growth.length > 1 ? growth[growth.length - 2].newUsers : 0;

    if (previous <= 0 && current > 0) return '+ new';
    if (previous <= 0) return '0%';

    const diff = ((current - previous) / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  }

  get ratingLabel(): string {
    const rating = this.stats?.ratings.platformAvg ?? 0;
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4) return 'Strong';
    if (rating >= 3) return 'Healthy';
    return 'Needs attention';
  }

  get lastComputedLabel(): string {
    if (!this.stats?.computedAt) return 'Not computed yet';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(this.stats.computedAt));
  }

  get contentLegend(): Array<{ label: string; value: number; percentage: number; color: string }> {
    const content = this.stats?.content;
    if (!content) return [];

    return [
      {
        label: 'Movies',
        value: content.totalMovies,
        percentage: content.moviesPercentage,
        color: '#ff8617'
      },
      {
        label: 'Games',
        value: content.totalGames,
        percentage: content.gamesPercentage,
        color: '#18bdd2'
      }
    ];
  }

  get combinedGenres(): Array<{ genre: string; movies: number; games: number; total: number }> {
    const map = new Map<string, { genre: string; movies: number; games: number; total: number }>();

    for (const item of this.stats?.genres.movies ?? []) {
      const row = map.get(item.genre) ?? { genre: item.genre, movies: 0, games: 0, total: 0 };
      row.movies += item.count;
      row.total += item.count;
      map.set(item.genre, row);
    }

    for (const item of this.stats?.genres.games ?? []) {
      const row = map.get(item.genre) ?? { genre: item.genre, movies: 0, games: 0, total: 0 };
      row.games += item.count;
      row.total += item.count;
      map.set(item.genre, row);
    }

    return Array.from(map.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || a.genre.localeCompare(b.genre));
  }

  refreshStats(): void {
    this.loadStats(true);
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  exportStats(format: 'csv' | 'json' | 'html' = 'csv'): void {
    if (!this.stats) return;

    this.showExportMenu = false;

    switch (format) {
      case 'csv':
        this.downloadCSV();
        break;
      case 'json':
        this.downloadJSON();
        break;
      case 'html':
        this.downloadHTML();
        break;
    }
  }

  private downloadCSV(): void {
    if (!this.stats) return;

    const csv = this.generateStatsCSV(this.stats);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, 'csv');
  }

  private downloadJSON(): void {
    if (!this.stats) return;

    const json = JSON.stringify(this.stats, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, 'json');
  }

  private downloadHTML(): void {
    if (!this.stats) return;

    const html = this.generateStatsHTML(this.stats);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    this.downloadBlob(blob, 'html');
  }

  private downloadBlob(blob: Blob, format: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `doubleplay-admin-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private generateStatsHTML(stats: AdminStats): string {
    const now = new Date().toISOString();
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DoublePlay Admin Statistics</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #7d35ff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; font-size: 18px; background: #f9f9f9; padding: 10px; border-radius: 4px; }
    .header-info { color: #777; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background-color: #7d35ff; color: white; padding: 12px; text-align: left; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f0f0f0; }
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
    .stat-box { background: #f9f9f9; padding: 12px; border-left: 4px solid #7d35ff; border-radius: 4px; }
    .stat-label { color: #777; font-size: 12px; }
    .stat-value { color: #333; font-weight: bold; font-size: 18px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 DoublePlay Admin Statistics Report</h1>
    <div class="header-info">Generated: ${now}</div>

    <h2>User Statistics</h2>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">${this.formatNumber(stats.users.total)}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Month</th><th>New Users</th><th>Total Users</th></tr>
      </thead>
      <tbody>
        ${stats.users.growthLast12Months.map(item => 
          `<tr><td>${item.month}</td><td>${item.newUsers}</td><td>${item.total}</td></tr>`
        ).join('')}
      </tbody>
    </table>

    <h2>Content Statistics</h2>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">Total Movies</div>
        <div class="stat-value">${this.formatNumber(stats.content.totalMovies)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Games</div>
        <div class="stat-value">${this.formatNumber(stats.content.totalGames)}</div>
      </div>
    </div>

    <h2>Platform Rating</h2>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">Average Rating</div>
        <div class="stat-value">⭐ ${stats.ratings.platformAvg.toFixed(2)}</div>
      </div>
    </div>

    <h2>View Statistics</h2>
    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-label">Total Views</div>
        <div class="stat-value">${this.formatNumber(stats.views.total)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Movie Views</div>
        <div class="stat-value">${this.formatNumber(stats.views.movies)}</div>
      </div>
    </div>

    <h2>Movie Genres</h2>
    <table>
      <thead><tr><th>Genre</th><th>Count</th></tr></thead>
      <tbody>
        ${stats.genres.movies.map(item => 
          `<tr><td>${item.genre}</td><td>${item.count}</td></tr>`
        ).join('')}
      </tbody>
    </table>

    <h2>Game Genres</h2>
    <table>
      <thead><tr><th>Genre</th><th>Count</th></tr></thead>
      <tbody>
        ${stats.genres.games.map(item => 
          `<tr><td>${item.genre}</td><td>${item.count}</td></tr>`
        ).join('')}
      </tbody>
    </table>

    <h2>Top Performing Content</h2>
    <table>
      <thead><tr><th>Title</th><th>Type</th><th>Rating</th><th>Ratings Count</th></tr></thead>
      <tbody>
        ${stats.topContent.map(item => 
          `<tr><td>${item.title}</td><td>${item.type}</td><td>⭐ ${item.avgRating}</td><td>${item.ratingCount}</td></tr>`
        ).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  private generateStatsCSV(stats: AdminStats): string {
    const lines: string[] = [];

    // Header
    lines.push('DoublePlay Admin Statistics Export');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // User Stats
    lines.push('USER STATISTICS');
    lines.push(`Total Users,${stats.users.total}`);
    lines.push('');
    lines.push('Month,New Users,Total Users');
    stats.users.growthLast12Months.forEach(item => {
      lines.push(`${item.month},${item.newUsers},${item.total}`);
    });
    lines.push('');

    // Content Stats
    lines.push('CONTENT STATISTICS');
    lines.push(`Total Movies,${stats.content.totalMovies}`);
    lines.push(`Total Games,${stats.content.totalGames}`);
    lines.push(`Total Content,${stats.content.total}`);
    lines.push(`Movies %,${stats.content.moviesPercentage}`);
    lines.push(`Games %,${stats.content.gamesPercentage}`);
    lines.push('');

    // Rating Stats
    lines.push('PLATFORM RATING');
    lines.push(`Average Rating,${stats.ratings.platformAvg}`);
    lines.push('');

    // View Stats
    lines.push('VIEW STATISTICS');
    lines.push(`Total Views,${stats.views.total}`);
    lines.push(`Movie Views,${stats.views.movies}`);
    lines.push(`Game Views,${stats.views.games}`);
    lines.push('');

    // Genre Stats
    lines.push('MOVIE GENRES');
    lines.push('Genre,Count');
    stats.genres.movies.forEach(item => {
      lines.push(`${this.escapeCSV(item.genre)},${item.count}`);
    });
    lines.push('');

    lines.push('GAME GENRES');
    lines.push('Genre,Count');
    stats.genres.games.forEach(item => {
      lines.push(`${this.escapeCSV(item.genre)},${item.count}`);
    });
    lines.push('');

    // Top Content
    lines.push('TOP PERFORMING CONTENT');
    lines.push('Title,Type,Rating,Rating Count');
    stats.topContent.forEach(item => {
      lines.push(`${this.escapeCSV(item.title)},${item.type},${item.avgRating},${item.ratingCount}`);
    });

    return lines.join('\n');
  }

  private escapeCSV(value: string): string {
    // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  handleAdminAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;

    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.adminAvatarSeed)}`;
  }

  navigateToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  getContentRoute(item: AdminStats['topContent'][number]): string[] {
    return item.type === 'movie' ? ['/movies', item.id] : ['/games', item.id];
  }

  getContentCover(item: AdminStats['topContent'][number]): string {
    return item.cover || this.fallbackCover;
  }

  trackMetric(_: number, item: MetricCard): string {
    return item.label;
  }

  trackContent(_: number, item: AdminStats['topContent'][number]): string {
    return `${item.type}-${item.id}`;
  }

  trackLegend(_: number, item: { label: string }): string {
    return item.label;
  }

  trackGenre(_: number, item: { genre: string }): string {
    return item.genre;
  }

  private loadStats(refresh: boolean): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<AdminStats>(`${this.api}/admin/stats`, {
      params: refresh ? { refresh: 'true' } : {}
    }).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
        this.scheduleChartRender();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Could not load admin stats.';
        this.isLoading = false;
      }
    });
  }

  private scheduleChartRender(): void {
    if (!this.isViewReady || !this.stats) {
      return;
    }

    if (this.chartRenderTimer) {
      clearTimeout(this.chartRenderTimer);
    }

    this.chartRenderTimer = setTimeout(() => {
      this.renderCharts();
      this.chartRenderTimer = null;
    });
  }

  private renderCharts(): void {
    this.renderUserGrowthChart();
    this.renderContentSplitChart();
    this.renderGenreChart();
  }

  private destroyCharts(): void {
    this.userGrowthChart?.destroy();
    this.contentSplitChart?.destroy();
    this.genreChart?.destroy();
    this.userGrowthChart = null;
    this.contentSplitChart = null;
    this.genreChart = null;
  }

  private renderUserGrowthChart(): void {
    const canvas = this.userGrowthChartRef?.nativeElement;
    if (!canvas || !this.stats) return;

    this.userGrowthChart?.destroy();

    const growth = this.stats.users.growthLast12Months;
    const visibleGrowth = this.getVisibleUserGrowth(growth);
    const labels = visibleGrowth.map((item) => item.month.split(' ')[0]);
    const values = this.ensureVisibleSeries(visibleGrowth.map((item) => item.total));

    this.userGrowthChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Users',
            data: values,
            borderColor: '#7d35ff',
            backgroundColor: 'rgba(125, 53, 255, 0.22)',
            fill: true,
            tension: 0.38,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            intersect: false,
            mode: 'index',
            backgroundColor: '#171a36',
            titleColor: '#ffffff',
            bodyColor: '#aeb7ed',
            borderColor: 'rgba(126, 101, 255, 0.8)',
            borderWidth: 2,
            padding: 12,
            displayColors: false,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => `Users : ${this.formatNumber(context.parsed.y ?? 0)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(143, 153, 198, 0.08)' },
            ticks: { color: '#9aa5d8' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(143, 153, 198, 0.1)' },
            ticks: {
              color: '#9aa5d8',
              callback: (value) => this.formatCompact(Number(value))
            }
          }
        }
      }
    });
  }

  private renderContentSplitChart(): void {
    const canvas = this.contentSplitChartRef?.nativeElement;
    if (!canvas || !this.stats) return;

    this.contentSplitChart?.destroy();

    this.contentSplitChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Movies', 'Games'],
        datasets: [
          {
            data: this.ensureVisibleSeries([this.stats.content.totalMovies, this.stats.content.totalGames]),
            backgroundColor: ['#ff8617', '#18bdd2'],
            borderColor: '#111426',
            borderWidth: 4,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#171a36',
            titleColor: '#ffffff',
            bodyColor: '#aeb7ed'
          }
        }
      }
    });
  }

  private renderGenreChart(): void {
    const canvas = this.genreChartRef?.nativeElement;
    if (!canvas) return;

    this.genreChart?.destroy();

    const genres = this.combinedGenres;
    const labels = genres.length ? genres.map((item) => item.genre) : ['No data'];
    const movieValues = this.ensureVisibleSeries(genres.length ? genres.map((item) => item.movies) : [1]);
    const gameValues = this.ensureVisibleSeries(genres.length ? genres.map((item) => item.games) : [0]);

    console.log('Genre Chart Data:', { genres, movieValues, gameValues });
    console.log('Stats genres:', this.stats?.genres);

    this.genreChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Movies',
            data: movieValues,
            backgroundColor: '#ff8617',
            borderRadius: 6,
            maxBarThickness: 24
          },
          {
            label: 'Games',
            data: gameValues,
            backgroundColor: '#18bdd2',
            borderRadius: 6,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#aeb7ed',
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: '#171a36',
            titleColor: '#ffffff',
            bodyColor: '#aeb7ed'
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9aa5d8' }
          },
          y: {
            type: 'logarithmic',
            grid: { color: 'rgba(143, 153, 198, 0.1)' },
            ticks: {
              color: '#9aa5d8',
              callback: (value) => {
                const num = Number(value);
                // Solo mostrar potencias de 10 para evitar valores raros
                if ([1, 10, 100, 1000, 10000].includes(num)) {
                  return this.formatCompact(num);
                }
                return '';
              }
            }
          }
        }
      }
    });
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  private getVisibleUserGrowth(growth: AdminStats['users']['growthLast12Months']): AdminStats['users']['growthLast12Months'] {
    return growth.slice(-7);
  }

  private ensureVisibleSeries(values: number[]): number[] {
    if (values.length === 0) {
      return [1];
    }

    const hasVisibleValue = values.some((value) => value > 0);
    return hasVisibleValue ? values : values.map(() => 1);
  }

  private formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: value >= 1000 ? 1 : 0
    }).format(value);
  }
}
