import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <div class="profile-card card">
        <h1>Your Profile</h1>

        @if (success()) {
          <div class="success-message">{{ success() }}</div>
        }

        @if (error()) {
          <div class="error-message">{{ error() }}</div>
        }

        @if (authService.user()) {
          <form (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                class="input"
                [value]="authService.user()?.email"
                disabled
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
                minlength="3"
                maxlength="20"
                [disabled]="loading()"
              />
            </div>

            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea
                id="bio"
                class="input textarea"
                [(ngModel)]="bio"
                name="bio"
                maxlength="500"
                rows="4"
                [disabled]="loading()"
              ></textarea>
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="loading()">
              {{ loading() ? 'Saving...' : 'Save Changes' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-card {
      max-width: 500px;
      margin: 2rem auto;
    }

    h1 {
      color: var(--primary);
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

    .textarea {
      resize: vertical;
      min-height: 100px;
    }

    .success-message {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: var(--success);
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
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
export class ProfileComponent implements OnInit {
  username = '';
  bio = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    public authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.username = user.username;
      this.bio = user.bio || '';
    }
  }

  onSubmit(): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.http.patch<{ data: User }>('/api/users/me', {
      username: this.username,
      bio: this.bio
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set('Profile updated successfully!');
        this.authService.updateUser(response.data);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error || 'Failed to update profile');
      }
    });
  }
}
