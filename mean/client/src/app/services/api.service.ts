import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface Character {
  id: string;
  gamertag?: string;
  class?: string;
  level: number;
  xp: number;
  hp?: number;
  atk?: number;
  def?: number;
  mp?: number;
  spd?: number;
  unspentStatPoints: number;
  firstGameAccessCompleted: boolean;
  trophies: {
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
  };
}

export interface Player {
  id: string;
  gamertag: string;
  class: string;
  level: number;
  trophies: {
    wins: number;
    losses: number;
    kills: number;
    deaths: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  character: {
    id: string;
    gamertag: string;
    class: string;
    level: number;
  };
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Social/Feed
  getFeed(cursor?: string): Observable<{ data: Post[]; nextCursor: string | null }> {
    const params = cursor ? `?cursor=${cursor}` : '';
    return this.http.get<{ data: Post[]; nextCursor: string | null }>(`/api/social/feed${params}`);
  }

  createPost(body: string): Observable<{ data: Post }> {
    return this.http.post<{ data: Post }>('/api/social/posts', { body });
  }

  // Game
  getCharacter(): Observable<{ data: Character }> {
    return this.http.get<{ data: Character }>('/api/game/character');
  }

  initializeCharacter(gamertag: string, charClass: string): Observable<{ data: Character }> {
    return this.http.post<{ data: Character }>('/api/game/character/initialize', {
      gamertag,
      class: charClass
    });
  }

  allocateStats(stats: Partial<{ hp: number; atk: number; def: number; mp: number; spd: number }>): Observable<{ data: Character }> {
    return this.http.post<{ data: Character }>('/api/game/character/allocate', stats);
  }

  getPlayers(search?: string, cursor?: string): Observable<{ data: Player[]; nextCursor: string | null }> {
    let params = '';
    if (search) params += `search=${search}&`;
    if (cursor) params += `cursor=${cursor}`;
    if (params) params = '?' + params;
    return this.http.get<{ data: Player[]; nextCursor: string | null }>(`/api/game/players${params}`);
  }

  getLeaderboard(period: string = 'alltime', metric: string = 'wins'): Observable<{ data: LeaderboardEntry[] }> {
    return this.http.get<{ data: LeaderboardEntry[] }>(`/api/game/leaderboard?period=${period}&metric=${metric}`);
  }

  startBattle(defenderId: string): Observable<any> {
    return this.http.post('/api/game/battle/start', { defenderId });
  }
}
