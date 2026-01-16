import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, LeaderboardEntry } from '../../services/api.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <h1>Leaderboard</h1>

      <div class="filters">
        <select class="input select" [(ngModel)]="period" (change)="loadLeaderboard()">
          <option value="alltime">All Time</option>
          <option value="weekly">This Week</option>
          <option value="daily">Today</option>
        </select>

        <select class="input select" [(ngModel)]="metric" (change)="loadLeaderboard()">
          <option value="wins">Wins</option>
          <option value="kills">Kills</option>
          <option value="level">Level</option>
        </select>
      </div>

      @if (loading()) {
        <div class="loading">Loading leaderboard...</div>
      }

      <div class="leaderboard">
        @for (entry of entries(); track entry.rank) {
          <div class="card leaderboard-entry" [class.top-3]="entry.rank <= 3">
            <span class="rank" [class.gold]="entry.rank === 1" [class.silver]="entry.rank === 2" [class.bronze]="entry.rank === 3">
              #{{ entry.rank }}
            </span>
            <div class="player-info">
              <span class="gamertag">{{ entry.character.gamertag }}</span>
              <span class="class">{{ entry.character.class }} - Level {{ entry.character.level }}</span>
            </div>
            <span class="value">{{ entry.value }}</span>
          </div>
        } @empty {
          @if (!loading()) {
            <p class="empty">No data available yet.</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    h1 {
      color: var(--primary);
      margin-bottom: 1.5rem;
    }

    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .select {
      width: auto;
      min-width: 150px;
    }

    .leaderboard {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .leaderboard-entry {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }

    .leaderboard-entry.top-3 {
      background-color: #fefce8;
    }

    .rank {
      font-size: 1.25rem;
      font-weight: 700;
      min-width: 50px;
      color: var(--text-secondary);
    }

    .rank.gold {
      color: #ca8a04;
    }

    .rank.silver {
      color: #6b7280;
    }

    .rank.bronze {
      color: #b45309;
    }

    .player-info {
      flex: 1;
    }

    .gamertag {
      display: block;
      font-weight: 600;
      color: var(--primary);
    }

    .class {
      font-size: 0.875rem;
      color: var(--text-secondary);
      text-transform: capitalize;
    }

    .value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .loading, .empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(false);
  period = 'alltime';
  metric = 'wins';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading.set(true);
    this.apiService.getLeaderboard(this.period, this.metric).subscribe({
      next: (response) => {
        this.entries.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
