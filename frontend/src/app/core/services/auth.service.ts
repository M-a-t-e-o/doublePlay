import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  register(data: { username: string, email: string, password: string, birthDate: string }) {
    return this.http.post(`${this.api}/auth/register`, data)
  }

  login(data: { email: string, password: string }) {
    return this.http.post<{ token: string, user: any }>(`${this.api}/auth/login`, data)
  }

  saveToken(token: string) {
    localStorage.setItem('token', token)
  }

  getToken(): string | null {
    return localStorage.getItem('token')
  }

  logout() {
    localStorage.removeItem('token')
  }

  isLoggedIn(): boolean {
    return !!this.getToken()
  }
}