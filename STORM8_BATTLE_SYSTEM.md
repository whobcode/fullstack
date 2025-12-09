# Storm8 Battle System Implementation

This document describes the Storm8-inspired battle system implementation based on Vampires Live / Zombies Live mechanics.

## Overview

The system implements a **probabilistic multi-factor battle formula** with the following core mechanics:

- ✅ **Stat scaling**: Attack/Defense contribution = `skill_points × player_level`
- ✅ **Equipment multiplier**: Abilities multiplied across usable clan members (`5 × level`)
- ✅ **Probabilistic outcomes**: Higher stats = better odds, NOT guaranteed wins
- ✅ **Bracket system**: Players grouped by clan size for matchmaking
- ✅ **Resource regeneration**: Energy (5 min) and Stamina (3 min)
- ✅ **Health protection**: 26 HP threshold for normal attacks
- ✅ **Hitlist system**: Bounty hunting with no level restrictions or health protection
- ✅ **Currency system**: Unbanked (stealable) vs Banked (10% fee, protected)

## Database Schema

### New Tables

**Migration:** `/migrations/0002_storm8_battle_system.sql`

#### Characters (Extended)
New columns added:
- `attack_skill_points`, `defense_skill_points`, `health_skill_points`, `energy_skill_points`, `stamina_skill_points`
- `current_health`, `max_health`, `current_energy`, `max_energy`, `current_stamina`, `max_stamina`
- `last_energy_regen`, `last_stamina_regen`
- `unbanked_currency`, `banked_currency`

#### Clan System
- `clan_members`: Clan roster (just numbers, not other players)
- `abilities`: Equipment/items with attack/defense values
- `character_abilities`: What each character owns

#### Battle System
- `battle_feed`: 10 most recent attacks per character
- `hitlist`: Active bounties
- `hitlist_attacks`: Daily attack tracking (25/day limit)
- `missions`: PvE content for income
- `protection_log`: Tracks ER protection status
- `skill_allocations`: Audit log for stat allocation

## API Endpoints

All endpoints are under `/api/storm8/*` and require authentication.

### Skill Allocation

**POST** `/api/storm8/skills/allocate`
```json
{
  "attack": 5,
  "defense": 3,
  "health": 2,
  "energy": 0,
  "stamina": 0
}
```

- Players get 5 skill points per level
- Attack/Defense use **scaling formula** (more valuable at high levels)
- Health/Energy/Stamina use flat increases

### Clan Management

**GET** `/api/storm8/clan`
Returns:
```json
{
  "data": {
    "total_members": 15,
    "active_members": 15,
    "usable_in_battle": 15,
    "bracket": 19,
    "max_usable": 25
  }
}
```

**POST** `/api/storm8/clan/recruit`
```json
{
  "count": 5
}
```

- Usable members = `min(5 × level, total_members)`
- Brackets: 4, 9, 14, 19, 24, 29... (players only see same bracket)

### Abilities/Equipment

**GET** `/api/storm8/abilities`
Returns purchasable abilities at character's level

**POST** `/api/storm8/abilities/purchase`
```json
{
  "ability_id": "abc123"
}
```

**GET** `/api/storm8/abilities/owned`
Returns owned abilities grouped by category

**Equipment Selection:**
- Each clan member uses **3 abilities** (one per category: physical, sensory, transformation)
- Game auto-selects **best Attack** when attacking, **best Defense** when defending
- Total power = `(sum of top 3 abilities) × usable_clan_members`

### Normal PvP Attacks

**POST** `/api/storm8/attack`
```json
{
  "defender_character_id": "abc123"
}
```

**Mechanics:**
- Costs 1 stamina
- Players must be in same bracket
- Defender protected if health ≤ 26 HP
- Damage formula: `(attacker_power - defender_power) ± variance`
- Variance: ±15% randomness (Storm8's "luck factor")
- Currency stolen: ~10% of unbanked funds (scales with damage)
- Winner gains XP, loser takes damage

**Battle Power Calculation:**
```typescript
Total Attack = (equipment_attack × usable_clan_members) + (attack_skill_points × level)
Total Defense = (equipment_defense × usable_clan_members) + (defense_skill_points × level)
```

### Hitlist System

**POST** `/api/storm8/hitlist/post`
```json
{
  "target_character_id": "abc123",
  "bounty_amount": 10000
}
```

**GET** `/api/storm8/hitlist/active`
Returns all active bounties sorted by amount

**POST** `/api/storm8/hitlist/attack`
```json
{
  "hitlist_id": "abc123"
}
```

**Hitlist Mechanics:**
- **No level restrictions** (level 100 can attack level 1)
- **No health protection** (attacks continue until 0 HP)
- **Max 25 attacks per day** per target per attacker
- **Bounty goes to killer** (final blow)
- **No XP gained** from hitlist fights
- **Only penalty for death**: Death counter increments

### Banking & Currency

**POST** `/api/storm8/bank/deposit`
```json
{
  "amount": 5000
}
```

- 10% deposit fee
- Banked currency **cannot be stolen**
- Strategic decision: keep liquid for purchases vs protect from theft

### Healing

**POST** `/api/storm8/hospital/heal`

- Costs 10 currency per HP
- Health does NOT auto-regenerate
- Must manually pay to heal

### Battle Feed

**GET** `/api/storm8/feed`

Returns last 10 battle results (attacker perspective)

## Core Battle Engine

**File:** `/workers/src/core/storm8-battle-engine.ts`

### Key Functions

```typescript
// Calculate attack power with scaling
calculateAttackPower(stats: CharacterBattleStats): number

// Calculate defense power with scaling
calculateDefensePower(stats: CharacterBattleStats): number

// Main battle resolver
resolveBattle(
  attacker: CharacterBattleStats,
  defender: CharacterBattleStats,
  seed: string,
  config?: BattleConfig,
  isHitlistBattle?: boolean
): BattleResult

// Resource regeneration
calculateRegeneration(
  lastRegenTime: string,
  currentAmount: number,
  maxAmount: number,
  regenRateMinutes: number
): { newAmount: number; newTimestamp: string }

// Bracket system
getClanBracket(totalClanMembers: number): number
areInSameBracket(clanSize1: number, clanSize2: number): boolean
```

### Battle Result Structure

```typescript
{
  attacker_won: boolean,
  damage_dealt: number,
  currency_stolen: number,
  defender_health_after: number,
  defender_killed: boolean,
  variance_applied: number,
  attacker_effective_power: number,
  defender_effective_power: number
}
```

## Resource Regeneration

Handled automatically on API calls via `applyResourceRegeneration()`

- **Energy**: 1 point per 5 minutes
- **Stamina**: 1 point per 3 minutes
- Tracks `last_energy_regen` and `last_stamina_regen` timestamps

## Strategic Build Archetypes

### Glass Cannon
- **Stats**: High Attack + Stamina
- **Strategy**: Aggressive farming, maximize damage output
- **Weakness**: Low defense, easy to kill

### Tank/Turtle
- **Stats**: High Defense + Health
- **Strategy**: Difficult to farm, wins on defense
- **Strength**: Can defeat higher-attack opponents via defense

### Camper
- **Stats**: High Energy
- **Strategy**: Farm missions for income, stay low level
- **Advantage**: Build economic lead, buy top equipment before leveling

### Balanced
- **Stats**: Moderate across all
- **Strategy**: Flexible, no major weaknesses

## Key Design Decisions

### Why Probabilistic?
Storm8 explicitly designed battles to favor probability over determinism:
> "The results of a fight are not a straight-up comparison... Many factors come into play"

Higher stats improve **odds** but don't guarantee victory. This creates:
- Comeback potential for underdogs
- Excitement and unpredictability
- Reduced "solved meta" where one build dominates

### Why Skill Point Scaling?
The `skill_points × level` formula means:
- At level 100: 1 Attack skill point = 100 attack
- At level 10: 1 Attack skill point = 10 attack

This makes **skill investment exponentially more valuable** than flat equipment bonuses at high levels.

### Why Brackets?
Strategic depth around clan size:
- Stay at bracket cap (4, 9, 14, 19) for equipment advantage
- Player with 9 members vs 5 members = massive power edge in same bracket
- At high levels, brackets merge, shifting meta to pure stat optimization

## Testing the System

### 1. Apply Migration
```bash
# Apply to your D1 database
wrangler d1 execute DB --file=./migrations/0002_storm8_battle_system.sql
```

### 2. Create Test Characters
```bash
# Register users via /api/auth/register
# Complete first-time setup via /api/game/first-access
```

### 3. Allocate Skills
```bash
POST /api/storm8/skills/allocate
{
  "attack": 5,
  "defense": 0,
  "health": 0,
  "energy": 0,
  "stamina": 0
}
```

### 4. Recruit Clan
```bash
POST /api/storm8/clan/recruit
{
  "count": 5
}
```

### 5. Buy Abilities
```bash
# Give yourself starting currency
UPDATE characters SET unbanked_currency = 50000 WHERE id = 'your-char-id';

POST /api/storm8/abilities/purchase
{
  "ability_id": "..." # Get from /api/storm8/abilities
}
```

### 6. Attack Another Player
```bash
POST /api/storm8/attack
{
  "defender_character_id": "other-char-id"
}
```

## Differences from Original Storm8

### Implemented:
✅ 5-stat allocation system
✅ Scaling formula (skill × level)
✅ Clan member system (5 × level)
✅ 3-ability equipment categories
✅ Bracket visibility system
✅ Probabilistic battle outcomes
✅ 26 HP protection threshold
✅ Hitlist with unlimited attacks to 0 HP
✅ Banking with 10% fee
✅ Energy/Stamina regeneration
✅ Health requiring manual healing

### Simplified:
- **Mission system**: Structure exists but not fully implemented
- **Cross-game compatibility**: Single game only (no Vampires vs Zombies)
- **Friend system**: Uses existing friends table, not Storm8-specific

### Not Implemented:
- Passive income from "slaves/traps"
- Mission mastery bonuses
- Level-up XP thresholds (using existing leveling system)
- Wall post permanent attack links
- Real-time battle feed color coding

## Future Enhancements

1. **Mission System**: Full PvE content with mastery rewards
2. **Income Properties**: Passive currency generation
3. **Build Guides**: In-game tooltips for archetypes
4. **Leaderboards**: Rankings by kills, wins, level, etc.
5. **Achievement Badges**: Special rewards for milestones
6. **Cross-faction**: Multiple game themes with themed abilities

## Performance Considerations

- **Regeneration**: Only calculated on-demand (not cron jobs)
- **Battle Feed**: Limited to 10 entries per character
- **Hitlist**: Daily limit prevents spam
- **Bracket Queries**: Indexed for fast matchmaking
- **Ability Selection**: `DISTINCT ON` for optimal equipment picks

## Security Notes

- All currency transactions use database transactions
- Stamina cost enforced server-side
- Bracket visibility prevents out-of-range attacks
- Daily hitlist limits prevent griefing
- Health protection prevents farming below 26 HP

## References

- Original documentation in system message
- Storm8 forums: forums.storm8.com (archived)
- Community guides: TBCave, worldwarlive.xp3.biz
- Calculator tools: aygabtu.com

---

**Implementation Status:** ✅ Complete and ready for testing

**Last Updated:** 2025-12-08
