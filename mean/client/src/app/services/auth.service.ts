import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  characterId?: string;
}

interface AuthResponse {
  data: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true);

  user = computed(() => this.userSignal());
  isAuthenticated = computed(() => this.userSignal() !== null);
  isLoading = computed(() => this.loadingSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkAuth();
  }

  checkAuth(): void {
    this.http.get<AuthResponse>('/api/auth/me').pipe(
      tap(response => {
        this.userSignal.set(response.data);
        this.loadingSignal.set(false);
      }),
      catchError(() => {
        this.userSignal.set(null);
        this.loadingSignal.set(false);
        return of(null);
      })
    ).subscribe();
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(response => {
        this.userSignal.set(response.data);
      })
    );
  }

  register(email: string, username: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/register', { email, username, password }).pipe(
      tap(() => {
        // Auto-login after registration
        this.login(email, password).subscribe();
      })
    );
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this.userSignal.set(null);
        this.router.navigate(['/']);
      },
      error: () => {
        this.userSignal.set(null);
        this.router.navigate(['/']);
      }
    });
  }

  updateUser(user: User): void {
    this.userSignal.set(user);
  }
}
