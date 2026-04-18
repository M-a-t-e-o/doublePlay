import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FeedEventType = 'watched' | 'wishlisted' | 'reviewed';
export type FeedContentType = 'movie' | 'game';

export interface SocialFeedUser {
  _id: string;
  name: string;
  hasProfilePicture?: boolean;
}

export interface SocialFeedContent {
  _id: string;
  type: FeedContentType;
  title: string;
  cover?: string;
  genres?: string[];
}

export interface SocialFeedEvent {
  type: FeedEventType;
  date: string;
  user: SocialFeedUser | null;
  content: SocialFeedContent | null;
  rating?: number;
  reviewContent?: string;
}

export interface SocialPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SocialFeedResponse {
  data: SocialFeedEvent[];
  pagination: SocialPagination;
}

export interface FriendListItem {
  friendshipId: string;
  since: string;
  user: {
    _id: string;
    name: string;
  };
}

export interface FriendRequestReceived {
  _id: string;
  sender: {
    _id: string;
    name: string;
  };
  receiver: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface FriendRequestSent {
  _id: string;
  sender: string;
  receiver: {
    _id: string;
    name: string;
    email?: string;
    profilePicture?: string;
  };
  status: 'pending' | 'accepted';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getFeed(page = 1, limit = 12): Observable<SocialFeedResponse> {
    return this.http.get<SocialFeedResponse>(`${this.api}/social/feed`, {
      params: {
        page: String(page),
        limit: String(limit)
      }
    });
  }

  getFriends(): Observable<FriendListItem[]> {
    return this.http.get<FriendListItem[]>(`${this.api}/friends`);
  }

  getReceivedRequests(): Observable<FriendRequestReceived[]> {
    return this.http.get<FriendRequestReceived[]>(`${this.api}/friends/requests/received`);
  }

  getSentRequests(): Observable<FriendRequestSent[]> {
    return this.http.get<FriendRequestSent[]>(`${this.api}/friends/requests/sent`);
  }

  sendRequest(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/friends/request/${userId}`, {});
  }

  acceptRequest(requestId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/friends/accept/${requestId}`, {});
  }

  rejectOrCancelRequest(requestId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/friends/request/${requestId}`);
  }

  removeFriend(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/friends/${userId}`);
  }
}
