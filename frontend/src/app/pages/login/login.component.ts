import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmitLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.loading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: ({ token }) => {
        this.authService.saveToken(token);
        this.router.navigate(['/home']);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
