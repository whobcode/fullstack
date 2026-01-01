import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Player } from '../../services/api.service';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <h1>Players</h1>

      <div class="search-bar">
        <input
          type="text"
          class="input"
          placeholder="Search by gamertag..."
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
        />
      </div>

      @if (loading() && players().length === 0) {
        <div class="loading">Loading players...</div>
      }

      <div class="players-grid">
        @for (player of players(); track player.id) {
          <div class="card player-card">
            <h3 class="gamertag">{{ player.gamertag }}</h3>
            <p class="class-badge {{ player.class }}">{{ player.class }}</p>
            <div class="player-stats">
              <span class="level">Level {{ player.level }}</span>
              <span class="record">{{ player.trophies.wins }}W / {{ player.trophies.losses }}L</span>
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <p class="empty">No players found.</p>
          }
        }
      </div>

      @if (nextCursor()) {
        <button class="btn btn-secondary load-more" (click)="loadMore()" [disabled]="loading()">
          {{ loading() ? 'Loading...' : 'Load More' }}
        </button>
      }
    </div>
  `,
  styles: [`
    h1 {
      color: var(--primary);
      margin-bottom: 1.5rem;
    }

    .search-bar {
      margin-bottom: 1.5rem;
      max-width: 400px;
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }

    .player-card {
      text-align: center;
    }

    .gamertag {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .class-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      background-color: var(--primary-light);
      color: white;
      margin-bottom: 1rem;
    }

    .player-stats {
      display: flex;
      justify-content: space-between;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .loading, .empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
      grid-column: 1 / -1;
    }

    .load-more {
      display: block;
      margin: 1.5rem auto;
    }
  `]
})
export class PlayersComponent implements OnInit {
  players = signal<Player[]>([]);
  nextCursor = signal<string | null>(null);
  loading = signal(false);
  searchQuery = '';

  private searchTimeout: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadPlayers();
  }

  loadPlayers(): void {
    this.loading.set(true);
    this.apiService.getPlayers(this.searchQuery || undefined).subscribe({
      next: (response) => {
        this.players.set(response.data);
        this.nextCursor.set(response.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor) return;

    this.loading.set(true);
    this.apiService.getPlayers(this.searchQuery || undefined, cursor).subscribe({
      next: (response) => {
        this.players.update(players => [...players, ...response.data]);
        this.nextCursor.set(response.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadPlayers();
    }, 300);
  }
}
