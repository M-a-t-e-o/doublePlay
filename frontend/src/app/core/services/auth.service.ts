import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl
  private readonly tokenKey = 'token'
  private readonly userNameKey = 'userName'

  constructor(private http: HttpClient) {}

  register(data: { name: string, email: string, password: string }) {
    return this.http.post(`${this.api}/auth/register`, data)
  }

  login(data: { email: string, password: string }) {
    return this.http.post<{ token: string, name: string }>(`${this.api}/auth/login`, data)
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

  getUserIdFromToken(): string | null {
    const token = this.getToken()
    if (!token) return null

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const payload = JSON.parse(atob(parts[1])) as { id?: string }
      return payload.id || null
    } catch {
      return null
    }
  }
}