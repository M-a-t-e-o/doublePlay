import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptedTerms = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
