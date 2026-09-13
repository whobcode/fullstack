- Build and deploy are Cloudflare's job, not GitHub's. Cloudflare Workers
  Builds builds and deploys this worker straight from the repo on every push to
  main. Do not add a deploy step to Actions — that was a second pipeline doing
  the same work, and it silently failed while Workers Builds did the real
  releases.

- `.github/workflows/migrate.yml` applies pending D1 migrations on push. It is
  the one piece Workers Builds does not do. Both run on the same push and
  therefore race, which is fine while migrations stay additive; a destructive
  one (dropping or renaming something live code reads) needs the deploy held
  until migrations finish.

- To ship by hand instead — migrations first, and always with an explicit
  `--config`:

      npx wrangler d1 migrations apply social_rpg_db --remote --config wrangler.toml
      npm run build
      npx wrangler deploy

  The `--config wrangler.toml` is required, not cosmetic: `npm run build`
  writes `.wrangler/deploy/config.json`, which redirects wrangler to
  `build/server/wrangler.json`, where `migrations_dir` resolves to a directory
  with no migration files. Wrangler then reports "No migrations to apply!" and
  exits 0, having applied nothing.

  `wrangler deploy` intermittently fails route assignment with code 10020
  ("route with the same pattern already exists") even though hwmnbn.me/* is
  already this worker's route. The upload itself succeeded — retry.

- The `.shade` game and the social side are separate domains; keep changes to
  one out of the other. Both themes are scoped behind wrapper classes in
  `app/app.css` (`.shade-dark-bg` / `.social-dark-bg`), so retuning one side
  means redefining tokens on its wrapper, not in `@theme`.
