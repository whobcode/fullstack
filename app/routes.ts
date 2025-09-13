import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("feed", "routes/feed.tsx"),
  route("friends", "routes/friends.tsx"),
  route("groups", "routes/groups.tsx"),
  route("messages", "routes/messages.tsx"),
  route("profile/me", "routes/profile.me.tsx"),
  route("game/dashboard", "routes/game.dashboard.tsx"),
  route("game/players", "routes/game.players.tsx"),
  route("battles/:id", "routes/battles.$id.tsx"),
  route("game/leaderboard", "routes/game.leaderboard.tsx"),
] satisfies RouteConfig;
