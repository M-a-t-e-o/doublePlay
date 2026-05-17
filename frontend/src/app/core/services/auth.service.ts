/*
  Project: doublePlay (frontend)
  File: src/app/core/services/auth.service.ts
  Description: Auth API wrapper that handles login, registration, password recovery and local token state.
*/

import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject } from 'rxjs'
import { environment } from '../../../environments/environment'

type AuthTokenPayload = {
  id?: string
  role?: 'user' | 'admin'
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl
  private readonly tokenKey = 'token'
  private readonly userNameKey = 'userName'
  
  private avatarCacheBust$ = new BehaviorSubject<number>(Date.now())

  constructor(private http: HttpClient) {}

  /** Creates a new user account through the backend auth endpoint. */
  register(data: { name: string, username: string, email: string, password: string }) {
    return this.http.post(`${this.api}/auth/register`, data)
  }

  /** Logs the user in and returns the auth token plus the display name. */
  login(data: { email: string, password: string }) {
    return this.http.post<{ token: string, name: string, role?: 'user' | 'admin' }>(`${this.api}/auth/login`, data)
  }

  /** Requests a password recovery email for the provided address. */
  forgotPassword(data: { email: string }) {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot-password`, data)
  }

  /** Sends a reset token and a new password to complete the password change. */
  resetPassword(data: { token: string, newPassword: string }) {
    return this.http.post<{ message: string }>(`${this.api}/auth/reset-password`, data)
  }

  /** Persists the auth token in local storage. */
  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token)
  }

  /** Reads the current auth token from local storage. */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  /** Persists the user name used in the app shell. */
  saveUserName(name: string) {
    localStorage.setItem(this.userNameKey, name)
  }

  /** Reads the stored user name from local storage. */
  getUserName(): string | null {
    return localStorage.getItem(this.userNameKey)
  }

  /** Clears local session data. */
  logout() {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userNameKey)
  }

  /** Checks whether a token is currently stored. */
  isLoggedIn(): boolean {
    return !!this.getToken()
  }

  /** Decodes the JWT payload to obtain the user id and role. */
  getTokenPayload(): AuthTokenPayload | null {
    const token = this.getToken()
    if (!token) return null

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
      return JSON.parse(atob(padded)) as AuthTokenPayload
    } catch {
      return null
    }
  }

  /** Returns the user id encoded in the JWT. */
  getUserIdFromToken(): string | null {
    return this.getTokenPayload()?.id || null
  }

  /** Returns the role encoded in the JWT. */
  getUserRoleFromToken(): 'user' | 'admin' | null {
    return this.getTokenPayload()?.role || null
  }

  /** Checks whether the current user has the admin role. */
  isAdmin(): boolean {
    return this.getUserRoleFromToken() === 'admin'
  }

  /** Exposes the avatar refresh stream used by components to reload profile images. */
  getAvatarCacheBust() {
    return this.avatarCacheBust$.asObservable()
  }

  /** Returns the latest avatar refresh timestamp. */
  getAvatarCacheBustValue(): number {
    return this.avatarCacheBust$.value
  }

  /** Emits a new avatar refresh timestamp after the image changes. */
  notifyAvatarChanged() {
    this.avatarCacheBust$.next(Date.now())
  }
}
