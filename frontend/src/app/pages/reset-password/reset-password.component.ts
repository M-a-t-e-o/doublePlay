/*
  Project: doublePlay (frontend)
  File: src/app/pages/reset-password/reset-password.component.ts
  Description: Password reset form that validates the token, compares the new passwords and submits the update.
*/

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage = 'This password reset link is missing a token or has already expired.';
    }
  }

  /** Validates the reset form and sends the new password to the backend. */
  onSubmitResetPassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'This password reset link is invalid or has expired.';
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in both password fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.authService.resetPassword({ token: this.token, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.successMessage = 'Password updated successfully. You can now sign in with your new password.';
        this.newPassword = '';
        this.confirmPassword = '';
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend';
        } else {
          this.errorMessage = error.error?.message || 'Failed to reset password. Please try again.';
        }
        this.loading = false;
      }
    });
  }

  /** Toggles visibility for the new password field. */
  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  /** Toggles visibility for the confirmation password field. */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /** Returns the user to the login page after a successful reset. */
  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}