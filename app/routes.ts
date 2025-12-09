import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Social Routes (main app)
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("feed", "routes/feed.tsx"),
  route("friends", "routes/friends.tsx"),
  route("groups", "routes/groups.tsx"),
  route("messages", "routes/messages.tsx"),
  route("profile/me", "routes/profile.me.tsx"),
  route("settings", "routes/settings.tsx"),

  // Game Routes (under /shade prefix)
  route("shade", "routes/shade.index.tsx"),  // Game landing/login page
  route("shade/dashboard", "routes/game.dashboard.tsx"),
  route("shade/battle", "routes/game.storm8.tsx"),
  route("shade/players", "routes/game.players.tsx"),
  route("shade/battles/:id", "routes/battles.$id.tsx"),
  route("shade/leaderboard", "routes/game.leaderboard.tsx"),

  // Facebook callbacks
  route("facebook-deauthorize", "routes/facebook-deauthorize.tsx"),
] satisfies RouteConfig;
