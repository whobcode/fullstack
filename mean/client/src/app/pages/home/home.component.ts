import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="hero">
        <h1 class="hero-title">Welcome to MEAN Stack App</h1>
        <p class="hero-subtitle">
          A full-stack social gaming platform built with MongoDB, Express, Angular, and Node.js
        </p>

        @if (!authService.isAuthenticated()) {
          <div class="hero-actions">
            <a routerLink="/register" class="btn btn-primary btn-lg">Get Started</a>
            <a routerLink="/login" class="btn btn-secondary btn-lg">Sign In</a>
          </div>
        } @else {
          <div class="hero-actions">
            <a routerLink="/game" class="btn btn-primary btn-lg">Play Game</a>
            <a routerLink="/feed" class="btn btn-secondary btn-lg">View Feed</a>
          </div>
        }
      </div>

      <div class="features">
        <div class="card feature-card">
          <h3>Social Feed</h3>
          <p>Share updates and connect with other players in the community.</p>
        </div>
        <div class="card feature-card">
          <h3>RPG Game</h3>
          <p>Create your character, level up, and battle other players.</p>
        </div>
        <div class="card feature-card">
          <h3>Leaderboards</h3>
          <p>Compete for top rankings and earn bragging rights.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 4rem 0;
    }

    .hero-title {
      font-size: 3rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 1rem;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto 2rem;
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-lg {
      padding: 1rem 2rem;
      font-size: 1rem;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 3rem;
    }

    .feature-card {
      text-align: center;
    }

    .feature-card h3 {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .feature-card p {
      color: var(--text-secondary);
    }
  `]
})
export class HomeComponent {
  constructor(public authService: AuthService) {}
}
