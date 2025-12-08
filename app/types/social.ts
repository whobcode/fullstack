export type ReactionKind = 'like' | 'hype' | 'gg';

export type Post = {
  id: string;
  body: string;
  created_at: string;
  author_username: string;
  author_avatar?: string | null;
  likes?: number;
  hype?: number;
  gg?: number;
  comments?: number;
};

export type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_username: string;
  author_avatar?: string | null;
};

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  owner_username: string;
  members: number;
};
