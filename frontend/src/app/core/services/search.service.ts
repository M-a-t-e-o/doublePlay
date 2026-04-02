import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
  id: string;
  title: string;
  type: 'movie' | 'game';
  image?: string;
  genre?: string;
}

export interface SearchResponse {
  data: SearchResult[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResult[]> {
    if (!query.trim()) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return new Observable(observer => {
      Promise.all([
        this.searchMovies(query).toPromise(),
        this.searchGames(query).toPromise()
      ]).then(([movies, games]) => {
        const results = [
          ...(movies || []),
          ...(games || [])
        ].slice(0, 10); // Limit to 10 results
        observer.next(results);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  private searchMovies(query: string): Observable<SearchResult[]> {
    return new Observable(observer => {
      this.http.get<any>(`${this.api}/movies`, {
        params: {
          search: query.trim(),
          limit: '5'
        }
      }).subscribe({
        next: (response) => {
          const movies = (response.data || []).map((movie: any) => ({
            id: movie._id,
            title: movie.title,
            type: 'movie' as const,
            image: movie.posterUrl,
            genre: movie.genres?.[0]
          }));
          observer.next(movies);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  private searchGames(query: string): Observable<SearchResult[]> {
    return new Observable(observer => {
      this.http.get<any>(`${this.api}/games`, {
        params: {
          search: query.trim(),
          limit: '5'
        }
      }).subscribe({
        next: (response) => {
          const games = (response.data || []).map((game: any) => ({
            id: game._id,
            title: game.title,
            type: 'game' as const,
            image: game.coverUrl,
            genre: game.genres?.[0]
          }));
          observer.next(games);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }
}
