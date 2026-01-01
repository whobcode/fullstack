import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="auth-card card">
        <h1>Create Account</h1>
        <p class="subtitle">Join the community and start your adventure!</p>

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              class="input"
              [(ngModel)]="email"
              name="email"
              required
              [disabled]="loading()"
            />
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              class="input"
              [(ngModel)]="username"
              name="username"
              required
              minlength="3"
              maxlength="20"
              [disabled]="loading()"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              class="input"
              [(ngModel)]="password"
              name="password"
              required
              minlength="8"
              [disabled]="loading()"
            />
            <small class="hint">Must be at least 8 characters</small>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            {{ loading() ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-footer">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-card {
      max-width: 400px;
      margin: 2rem auto;
    }

    h1 {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .hint {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    .btn-block {
      width: 100%;
      margin-top: 1rem;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      color: var(--text-secondary);
    }

    .error-message {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--error);
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
  `]
})
export class RegisterComponent {
  email = '';
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.username || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.email, this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
