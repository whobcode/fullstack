import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Character } from '../../services/api.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="container">
      <h1>Game Dashboard</h1>

      @if (loading()) {
        <div class="loading">Loading character...</div>
      } @else if (character() && character()!.firstGameAccessCompleted) {
        <div class="character-view">
          <div class="card character-card">
            <h2>{{ character()!.gamertag }}</h2>
            <p class="class-badge {{ character()!.class }}">{{ character()!.class }}</p>

            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Level</span>
                <span class="stat-value">{{ character()!.level }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">XP</span>
                <span class="stat-value">{{ character()!.xp }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">HP</span>
                <span class="stat-value">{{ character()!.hp }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">ATK</span>
                <span class="stat-value">{{ character()!.atk }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">DEF</span>
                <span class="stat-value">{{ character()!.def }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">MP</span>
                <span class="stat-value">{{ character()!.mp }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">SPD</span>
                <span class="stat-value">{{ character()!.spd }}</span>
              </div>
            </div>

            @if (character()!.unspentStatPoints > 0) {
              <div class="stat-points">
                <p>Unspent Points: {{ character()!.unspentStatPoints }}</p>
              </div>
            }
          </div>

          <div class="card trophies-card">
            <h3>Trophies</h3>
            <div class="trophies-grid">
              <div class="trophy">
                <span class="trophy-value">{{ character()!.trophies.wins }}</span>
                <span class="trophy-label">Wins</span>
              </div>
              <div class="trophy">
                <span class="trophy-value">{{ character()!.trophies.losses }}</span>
                <span class="trophy-label">Losses</span>
              </div>
              <div class="trophy">
                <span class="trophy-value">{{ character()!.trophies.kills }}</span>
                <span class="trophy-label">Kills</span>
              </div>
              <div class="trophy">
                <span class="trophy-value">{{ character()!.trophies.deaths }}</span>
                <span class="trophy-label">Deaths</span>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="card setup-card">
          <h2>Create Your Character</h2>
          <p>Choose your gamertag and class to begin your adventure!</p>

          @if (error()) {
            <div class="error-message">{{ error() }}</div>
          }

          <form (ngSubmit)="initializeCharacter()">
            <div class="form-group">
              <label for="gamertag">Gamertag</label>
              <input
                type="text"
                id="gamertag"
                class="input"
                [(ngModel)]="gamertag"
                name="gamertag"
                minlength="3"
                maxlength="20"
                required
                [disabled]="creating()"
              />
            </div>

            <div class="form-group">
              <label>Choose Your Class</label>
              <div class="class-selection">
                @for (cls of classes; track cls.id) {
                  <button
                    type="button"
                    class="class-option"
                    [class.selected]="selectedClass === cls.id"
                    (click)="selectedClass = cls.id"
                    [disabled]="creating()"
                  >
                    <span class="class-name">{{ cls.name }}</span>
                    <span class="class-desc">{{ cls.description }}</span>
                  </button>
                }
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block" [disabled]="creating() || !gamertag || !selectedClass">
              {{ creating() ? 'Creating...' : 'Create Character' }}
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    h1 {
      color: var(--primary);
      margin-bottom: 1.5rem;
    }

    .loading {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
    }

    .character-view {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: 1fr 300px;
    }

    @media (max-width: 768px) {
      .character-view {
        grid-template-columns: 1fr;
      }
    }

    .character-card h2 {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .class-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: capitalize;
      background-color: var(--primary-light);
      color: white;
      margin-bottom: 1.5rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 1rem;
    }

    .stat {
      text-align: center;
      padding: 0.75rem;
      background-color: var(--background);
      border-radius: 0.5rem;
    }

    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-points {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: #fef3c7;
      border-radius: 0.5rem;
      text-align: center;
      color: #92400e;
    }

    .trophies-card h3 {
      margin-bottom: 1rem;
    }

    .trophies-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .trophy {
      text-align: center;
      padding: 0.75rem;
      background-color: var(--background);
      border-radius: 0.5rem;
    }

    .trophy-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .trophy-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .setup-card {
      max-width: 500px;
      margin: 0 auto;
    }

    .setup-card h2 {
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .setup-card > p {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .class-selection {
      display: grid;
      gap: 0.75rem;
    }

    .class-option {
      display: block;
      width: 100%;
      padding: 1rem;
      text-align: left;
      border: 2px solid var(--border);
      border-radius: 0.5rem;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .class-option:hover {
      border-color: var(--primary-light);
    }

    .class-option.selected {
      border-color: var(--primary);
      background-color: #f0fdf4;
    }

    .class-name {
      display: block;
      font-weight: 600;
      text-transform: capitalize;
    }

    .class-desc {
      display: block;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .btn-block {
      width: 100%;
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
export class GameComponent implements OnInit {
  character = signal<Character | null>(null);
  loading = signal(true);
  creating = signal(false);
  error = signal('');

  gamertag = '';
  selectedClass = '';

  classes = [
    { id: 'phoenix', name: 'Phoenix', description: 'Balanced fighter with fire abilities' },
    { id: 'dphoenix', name: 'Dark Phoenix', description: 'Fast attacker with dark magic' },
    { id: 'dragon', name: 'Dragon', description: 'High HP tank with powerful attacks' },
    { id: 'ddragon', name: 'Dark Dragon', description: 'Aggressive fighter with strong offense' },
    { id: 'kies', name: 'Kies', description: 'Magic specialist with high MP' }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadCharacter();
  }

  loadCharacter(): void {
    this.apiService.getCharacter().subscribe({
      next: (response) => {
        this.character.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  initializeCharacter(): void {
    if (!this.gamertag || !this.selectedClass) return;

    this.creating.set(true);
    this.error.set('');

    this.apiService.initializeCharacter(this.gamertag, this.selectedClass).subscribe({
      next: (response) => {
        this.character.set(response.data);
        this.creating.set(false);
      },
      error: (err) => {
        this.creating.set(false);
        this.error.set(err.error?.error || 'Failed to create character');
      }
    });
  }
}
