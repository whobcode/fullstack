import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="container nav-content">
        <a routerLink="/" class="logo">me</a>

        <div class="nav-links">
          <a routerLink="/feed" routerLinkActive="active">Feed</a>
          <a routerLink="/players" routerLinkActive="active">Players</a>
          <a routerLink="/leaderboard" routerLinkActive="active">Leaderboard</a>

          @if (authService.isAuthenticated()) {
            <a routerLink="/game" routerLinkActive="active">Game</a>
            <a routerLink="/profile" routerLinkActive="active">Profile</a>
            <button class="btn btn-secondary" (click)="authService.logout()">Logout</button>
          } @else {
            <a routerLink="/login" class="btn btn-secondary">Login</a>
            <a routerLink="/register" class="btn btn-primary">Sign Up</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
      height: 64px;
      display: flex;
      align-items: center;
    }

    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .logo:hover {
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-links a:not(.btn) {
      color: var(--text-secondary);
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:not(.btn):hover,
    .nav-links a:not(.btn).active {
      color: var(--primary);
      text-decoration: none;
    }
  `]
})
export class NavbarComponent {
  constructor(public authService: AuthService) {}
}
