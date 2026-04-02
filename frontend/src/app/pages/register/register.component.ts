import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  activeLegalModal: 'terms' | 'privacy' | null = null;
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  acceptedTerms = false;
  loading = false;
  errorMessage = '';
  returnUrl = '/home';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
  }

  onSubmitRegister(): void {
    this.errorMessage = '';

    if (!this.fullName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!this.acceptedTerms) {
      this.errorMessage = 'You must accept the terms to continue.';
      return;
    }

    this.loading = true;

    this.authService.register({
      name: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.returnUrl }
        });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to backend';
        } else {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  openLegalModal(type: 'terms' | 'privacy', event?: Event): void {
    event?.preventDefault();
    this.activeLegalModal = type;
  }

  closeLegalModal(): void {
    this.activeLegalModal = null;
  }
}
