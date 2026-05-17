/*
  Project: doublePlay (frontend)
  File: src/app/pages/login/login.component.ts
  Description: Login form component that validates credentials, requests password recovery and redirects after sign-in.
*/

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  showPassword = false;
  loading = false;
  forgotLoading = false;
  errorMessage = '';
  infoMessage = '';
  returnUrl = '/home';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'auth-required') {
      this.infoMessage = 'Necesitas iniciar sesion o registrarte para guardar watched, wishlist y reviews.';
    }
  }

  /** Submits the login form, stores the session token and redirects to the return URL. */
  onSubmitLogin(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.loading = true;

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: ({ token, name }) => {
        this.authService.saveToken(token);
        this.authService.saveUserName(name);
        this.router.navigateByUrl(this.returnUrl);
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

  /** Requests a password recovery email after checking that an email address has been entered. */
  onForgotPassword(): void {
    this.errorMessage = '';
    this.infoMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email before requesting a recovery link.';
      return;
    }

    this.forgotLoading = true;

    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        this.infoMessage = 'If an account with that email exists, a recovery link has been sent.';
        this.forgotLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend';
        } else {
          this.errorMessage = error.error?.message || 'Failed to send recovery email. Please try again.';
        }
        this.forgotLoading = false;
      }
    });
  }

  /** Toggles the visibility of the password field. */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
