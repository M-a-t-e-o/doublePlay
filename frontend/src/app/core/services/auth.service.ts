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

  register(data: { name: string, username: string, email: string, password: string }) {
    return this.http.post(`${this.api}/auth/register`, data)
  }

  login(data: { email: string, password: string }) {
    return this.http.post<{ token: string, name: string, role?: 'user' | 'admin' }>(`${this.api}/auth/login`, data)
  }

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token)
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  saveUserName(name: string) {
    localStorage.setItem(this.userNameKey, name)
  }

  getUserName(): string | null {
    return localStorage.getItem(this.userNameKey)
  }

  logout() {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userNameKey)
  }

  isLoggedIn(): boolean {
    return !!this.getToken()
  }

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

  getUserIdFromToken(): string | null {
    return this.getTokenPayload()?.id || null
  }

  getUserRoleFromToken(): 'user' | 'admin' | null {
    return this.getTokenPayload()?.role || null
  }

  isAdmin(): boolean {
    return this.getUserRoleFromToken() === 'admin'
  }

  getAvatarCacheBust() {
    return this.avatarCacheBust$.asObservable()
  }

  getAvatarCacheBustValue(): number {
    return this.avatarCacheBust$.value
  }

  notifyAvatarChanged() {
    this.avatarCacheBust$.next(Date.now())
  }
}
