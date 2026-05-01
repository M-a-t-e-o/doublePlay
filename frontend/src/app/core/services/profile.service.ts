import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProfileData {
  user: {
    id: string;
    name: string;
    createdAt: string;
    hasProfilePicture: boolean;
  };
  counts: {
    watchedMovies: number;
    gamesPlayed: number;
    totalWishlisted: number;
  };
  monthlyDistribution: Array<{
    key: string;
    month: string;
    movies: number;
    games: number;
  }>;
  movieGenreDistribution: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  gameGenreDistribution: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
}

export interface ContentListResponse {
  data: Array<{
    id: string;
    title: string;
    cover: string | null;
    genres: string[];
    avgRating: number | null;
    interactedAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfileData(): Observable<ProfileData> {
    return this.http.get<ProfileData>(`${this.api}/profile/me`);
  }

  getWatchedMovies(page: number = 1, limit: number = 20): Observable<ContentListResponse> {
    return this.http.get<ContentListResponse>(`${this.api}/profile/me/movies/watched`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getPlayedGames(page: number = 1, limit: number = 20): Observable<ContentListResponse> {
    return this.http.get<ContentListResponse>(`${this.api}/profile/me/games/played`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getWishlistedMovies(page: number = 1, limit: number = 20): Observable<ContentListResponse> {
    return this.http.get<ContentListResponse>(`${this.api}/profile/me/movies/wishlisted`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getWishlistedGames(page: number = 1, limit: number = 20): Observable<ContentListResponse> {
    return this.http.get<ContentListResponse>(`${this.api}/profile/me/games/wishlisted`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  uploadProfilePicture(formData: FormData): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/profile-picture`, formData);
  }
}
