import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Social Routes (main app)
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("feed", "routes/feed.tsx"),
  route("friends", "routes/friends.tsx"),
  route("groups", "routes/groups.tsx"),
  route("messages", "routes/messages.tsx"),
  route("profile/me", "routes/profile.me.tsx"),
  route("settings", "routes/settings.tsx"),

  // Game Routes (under /shade prefix)
  route("shade", "routes/shade.index.tsx"),  // Game landing/login page
  route("shade/dashboard", "routes/game.dashboard.tsx"),
  route("shade/profile", "routes/shade.profile.tsx"),
  route("shade/u/:username", "routes/shade.u.$username.tsx"),  // Public profile (trophies only)
  route("shade/battle", "routes/game.storm8.tsx"),
  route("shade/players", "routes/game.players.tsx"),
  route("shade/battles/:id", "routes/battles.$id.tsx"),
  route("shade/leaderboard", "routes/game.leaderboard.tsx"),

  // Legacy game URLs -> redirect to /shade/* (the game section was renamed)
  route("game", "routes/game-redirect.tsx", { id: "game-redirect-root" }),
  route("game/*", "routes/game-redirect.tsx", { id: "game-redirect-splat" }),

  // Auth callbacks
  route("auth/magic-link", "routes/auth.magic-link.tsx"),

  // Legal pages
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
] satisfies RouteConfig;
