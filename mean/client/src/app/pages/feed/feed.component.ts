import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, Post } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="container">
      <h1>Feed</h1>

      @if (authService.isAuthenticated()) {
        <div class="card create-post">
          <form (ngSubmit)="createPost()">
            <textarea
              class="input textarea"
              [(ngModel)]="newPostBody"
              name="body"
              placeholder="What's on your mind?"
              rows="3"
              maxlength="2000"
              [disabled]="creating()"
            ></textarea>
            <button type="submit" class="btn btn-primary" [disabled]="creating() || !newPostBody.trim()">
              {{ creating() ? 'Posting...' : 'Post' }}
            </button>
          </form>
        </div>
      }

      @if (loading() && posts().length === 0) {
        <div class="loading">Loading posts...</div>
      }

      <div class="posts">
        @for (post of posts(); track post.id) {
          <div class="card post">
            <div class="post-header">
              <span class="author">{{ post.author.username }}</span>
              <span class="date">{{ post.createdAt | date:'short' }}</span>
            </div>
            <p class="post-body">{{ post.body }}</p>
          </div>
        } @empty {
          @if (!loading()) {
            <p class="empty">No posts yet. Be the first to share something!</p>
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

    .create-post {
      margin-bottom: 1.5rem;
    }

    .create-post form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .create-post .btn {
      align-self: flex-end;
    }

    .textarea {
      resize: vertical;
      min-height: 80px;
    }

    .posts {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .author {
      font-weight: 600;
      color: var(--primary);
    }

    .date {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .post-body {
      white-space: pre-wrap;
    }

    .loading, .empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
    }

    .load-more {
      display: block;
      margin: 1.5rem auto;
    }
  `]
})
export class FeedComponent implements OnInit {
  posts = signal<Post[]>([]);
  nextCursor = signal<string | null>(null);
  loading = signal(false);
  creating = signal(false);
  newPostBody = '';

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading.set(true);
    this.apiService.getFeed().subscribe({
      next: (response) => {
        this.posts.set(response.data);
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
    this.apiService.getFeed(cursor).subscribe({
      next: (response) => {
        this.posts.update(posts => [...posts, ...response.data]);
        this.nextCursor.set(response.nextCursor);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  createPost(): void {
    if (!this.newPostBody.trim()) return;

    this.creating.set(true);
    this.apiService.createPost(this.newPostBody).subscribe({
      next: (response) => {
        this.posts.update(posts => [response.data, ...posts]);
        this.newPostBody = '';
        this.creating.set(false);
      },
      error: () => {
        this.creating.set(false);
      }
    });
  }
}
