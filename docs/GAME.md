# .shade — Game Systems

The `.shade` RPG is the game section of the platform (routes under `/shade`).
Every account is linked to characters that fight other players (and bots) in an
asynchronous, instantly-resolved battle system. This document describes the
current systems and the source of truth for each.

> Battles run through the **storm8** system (`workers/src/core/storm8-battle-engine.ts`
> + `workers/src/api/storm8-battles.ts`). The older turn-based `/game/battles`
> flow (`workers/src/core/battle-engine.ts`, `app/routes/battles.$id.tsx`) is
> legacy and not used by the main attack flows.

## Characters & classes

A user can own multiple characters (slots). Each character has a class with base
stats — `HP / ATK / DEF / SPD` (source: `workers/src/core/classes.ts`):

| Class | HP | ATK | DEF | SPD | Identity |
|---|---|---|---|---|---|
| Phoenix | 10000 | 1000 | 500 | 100 | Balanced, attack-leaning |
| Dark Phoenix (`dphoenix`) | 10000 | 1750 | 375 | 150 | Highest base attack (glass cannon) |
| Dragon | 10000 | 750 | 1100 | 175 | Tanky; also gains attack from DEF + SPD |
| Dark Dragon (`ddragon`) | 10000 | 1000 | 1000 | 75 | Balanced bruiser (also gets the dragon bonus) |
| Kies | 15000 | 750 | 750 | 225 | Highest base HP and speed |

`MP` exists as a column but is unused (not allocatable).

## Stat-point allocation

Characters earn stat points by leveling — **+5 per level, +5 extra every 5th
level** (`getTotalStatPointsForLevel`). Spend them on the dashboard. Per point
(source: `POST /api/game/character/allocate-points` in `workers/src/api/game.ts`):

| Stat | Per point |
|---|---|
| **HP** | **+100** max health (the battle health pool) |
| **SPD** | **+2** speed |
| **ATK** | **+1% of the class BASE attack** (100 points = +100% = double base) |
| **DEF** | **+1% of the class BASE defense** |

Because ATK/DEF scale off **base**, your starting class shapes which stats are
efficient. **Respec** (`POST /api/game/character/respec`) refunds the full
lifetime budget and resets to base stats.

## Battle system (storm8)

`resolveBattle()` (`workers/src/core/storm8-battle-engine.ts`):

- **Effective power**: `attack_skill_points × level + equipment×clan + ATK (+ dragon DEF+SPD bonus)`, defense analogously. Equipment is floored at ×1 so abilities count even for solo players.
- **Mitigation damage**: roughly `attack² / (attack + defense)`, with ±15% variance and a minimum of 1 — defense reduces damage but never blocks it entirely, so every landed hit chips health.
- **Speed = initiative + multi-hit**: the faster fighter strikes first and lands about `floor(faster_speed / slower_speed)` hits (capped at 5) before the slower one gets a single counterattack — *if still alive*. A big speed lead can kill before the opponent swings.
- **Kills**: bringing a target to 0 HP gives the winner +1 kill / +1 win and the loser +1 death / +1 loss (`bumpTrophies`, upsert). A defeated character stays at 0 HP (unattackable) until healed.
- **Currency steal**: the winner steals a share of the loser's unbanked currency.

### Active vs defense character
- **Active ("playing as")** — `users.active_character_id`; the character that acts when *you* attack/build. Set via `POST /api/game/active-character`; the server defaults all game actions to it.
- **Defense character** — `users.defense_character_id`; when someone attacks you, this character answers regardless of which of yours was targeted. Set via `POST /api/game/defense-character`.

### Recovery
- **Passive regen** (`workers/src/core/regen.ts`): HP **2%/min**, stamina **1/3 min**, energy **1/5 min**. Applied on read and by the cron.
- **Hospital** (dashboard): instant full heal for currency (10 per HP) via `POST /api/storm8/hospital/heal`.
- Attacks cost **1 stamina**.

## Profiles, social, and discovery

- **Gamer profile** — `/shade/u/:name` (resolves a username *or* gamertag). Public, shows **trophies only** (W/L/K/D); combat stats stay private to the owner. Has an **Attack** button and a link to the social profile. Own profile: `/shade/profile`.
- **Public social profile** — `/u/:id` (cover, avatar, bio), links back to the gamer profile.
- **Comments** — every profile has a comment wall (`profile_comments`): `GET/POST /api/game/profile/:name/comments`, `DELETE /api/game/comments/:id`.
- **Leaderboard** — `/shade/leaderboard`, top 25 by level → wins → kills.
- **Hitlist** — players post bounties; killing the target claims it. See **Globalling** below.
- **Clan** — members multiply equipment power in battle.
- **Ability shop** — buy equipment that adds ATK/DEF (level-gated).
- **Bank** (`workers/src/core/bank.ts`) — currency on hand is spendable but
  stealable; banked currency is safe but must be withdrawn to spend. Deposits
  cost 10%, withdrawals are free, and both are **per character**.
  Balances live in `bank_accounts` with an append-only `bank_ledger`, kept in
  `social_rpg_db` rather than their own database *on purpose*: D1 has no
  cross-database transactions, so a separate bank DB would make every transfer
  a non-atomic debit-here/credit-there pair that can destroy or mint currency
  if it fails in between. Here a transfer is one `db.batch()`.
  Two database-level guards back that up, because a guarded `UPDATE` matching
  no rows is *not* an error in SQLite and would let a batch commit one half of
  a transfer: the `characters_no_overdraft` trigger aborts on negative
  holdings, and `bank_accounts.balance CHECK (>= 0)` aborts on an overdraw.
  Endpoints: `GET /storm8/bank`, `POST /storm8/bank/deposit`, `/withdraw`.

## Globalling (hitlist saturation)

*Globalling* is the term for maxing out how many times a character can be put
on the hitlist in a day. Rules live in `workers/src/core/hitlist.ts`:

| Limit | Value |
|---|---|
| Listings one character can receive per rolling 24h | **200** |
| Bounties one poster can place on the same target per 24h | **25** |
| Cooldown once globalled | **24h** |
| Minimum players needed to global someone | **8** (200 ÷ 25) |

- The two caps are what make it a group act: no single player can global
  anyone, it takes at least **eight different characters banding together**.
- Hitting 200 records a row in `character_globals` (with how many listings and
  how many distinct posters it took), starts the cooldown on
  `characters.globalled_until`, and awards the target a **global trophy**
  (`trophies.globals`). Being globalled is notoriety earned, not a penalty.
- While the cooldown runs the character **cannot be listed again**; `POST
  /storm8/hitlist/post` returns 429 with the current `global_status`.
- **You cannot collect on a bounty you posted with the character that posted
  it** — post on one character, hunt with another.
- **Attacking a bounty is limited only by stamina.** There is no per-day attack
  cap; each attack costs 1 stamina (regen 1 per 3 min), so your stamina pool is
  the whole limiter. `hitlist_attacks` rows are still written, as history.
- Both counts use a rolling 24h window computed by SQLite (`datetime('now',
  '-24 hours')`). Don't bind a JS `toISOString()` value against `posted_at`:
  it defaults to `CURRENT_TIMESTAMP`, whose `"YYYY-MM-DD HH:MM:SS"` format
  compares `' '` against `'T'` once the date halves match, silently dropping
  every row that shares a calendar date with the cutoff.

`GET /storm8/hitlist/status/:gamertag` returns a target's saturation (listings
so far, distinct posters, listings remaining, cooldown) plus their globalling
history — it backs the meter on the hitlist screen.

## Per-character walls

Every character keeps its **own** comment wall and its **own** battle feed; a
player with several characters no longer shares one wall across all of them.

- `GET/POST /api/game/character/:gamertag/comments` — that character's wall.
  Rows carry `profile_comments.profile_character_id`; the older
  `profile_user_id` is still written so the owner keeps delete rights.
- `GET /api/game/character/:gamertag/feed` — that character's battle feed.
  Public, but `currency_stolen` is only filled in for the owner. Hitlist
  ambushes now write to both combatants' feeds (they previously left no trace).
- **Mentions** — comment bodies linkify `@handle`, resolving a gamertag first
  and then a username, matching what `/shade/u/:name` resolves. The client
  batches candidates through `POST /api/game/mentions/resolve` so unknown
  handles render as plain text instead of dead links.

## Bots (the world runs 24/7)

275 bot accounts span **levels 1–275** with all points allocated, seeded with the
real per-point rules and class-biased splits. They are flagged with
`users.is_bot = 1` (their account username equals their gamertag — no "bot" shown
publicly).

The scheduled (cron) job (`workers/src/core/cron.ts`, every 15 min) does three
things:
1. **Offline XP** for real players (bots excluded, so they hold their seeded level).
2. **Resource regen** for everyone.
3. **`runBotAttacks`** (`workers/src/core/bots.ts`): a batch of bots attack a
   random living target **at their level or higher** (punching up/sideways,
   honoring defense characters), resolving full battles. Keeps the leaderboard
   and feeds alive while players are offline.

## Key game API endpoints

All under `/api`. Game/battle routes require auth.

| Method | Path | Purpose |
|---|---|---|
| POST | `/storm8/attack` | Attack a target (`defender_gamertag` or `defender_character_id`); `?character_id=` overrides the acting character |
| POST | `/storm8/skills/allocate` | Allocate storm8 skill points |
| POST | `/storm8/hospital/heal` | Full heal for currency |
| GET/POST | `/storm8/hitlist/active`, `/hitlist/post`, `/hitlist/attack` | Bounty system (200/day per target, 25 per poster) |
| GET | `/storm8/hitlist/status/:gamertag` | Globalling saturation + history for a target |
| GET/POST | `/game/character/:gamertag/comments` | That character's comment wall |
| GET | `/game/character/:gamertag/feed` | That character's battle feed |
| POST | `/game/mentions/resolve` | Which `@handles` in a block of text are real |
| GET/POST | `/storm8/clan`, `/clan/recruit`, `/storm8/abilities*` | Clan & equipment |
| POST | `/game/character/allocate-points` | Spend stat points (HP×100, SPD×2, ATK/DEF +1% base) |
| POST | `/game/character/respec` | Refund all points, reset to base |
| POST | `/game/active-character`, `/game/defense-character` | Set playing-as / defender |
| GET | `/game/profile/:name`, `/game/profile/:name/comments` | Public profile + comments |
| GET | `/game/leaderboard` | Rankings |
| GET | `/users/:id/profile` | Public social profile |
