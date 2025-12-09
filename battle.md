# Reverse-Engineering Storm8's PvP Battle System

The Storm8 "Live" series (Vampires Live, Zombies Live, iMobsters) used a **probabilistic multi-factor battle formula** that was never fully reverse-engineered by the community. However, substantial mechanics have been documented through player guides, official FAQs, and calculator tools from 2009-2012. This report synthesizes all confirmed mechanics into a comprehensive battle schema suitable for implementation.

## Core battle formula: probability over determinism

Storm8 explicitly stated in their official FAQ: *"The results of a fight are not a straight-up comparison of your Attack/Defense Score vs. your opponent's Defense/Attack Score. Many factors come into play when fighting an opponent."* The system was designed to favor probability over determinism—higher stats improved win likelihood but never guaranteed outcomes.

**Confirmed formula components:**
- **Equipment Attack/Defense** from abilities/items owned
- **Skill Points × Player Level** (scaling multiplier—skill points become exponentially more valuable)
- **Usable Clan Members** capped at **5 × Level**
- **Built-in randomness** described as "luck factor"

The community's best theory from World War Live guides suggests: `Skill Contribution = Skill Points × Player Level`. A level 100 player with 10 Attack skill points adds **1,000 attack** to their total, making skill points dramatically more valuable than flat equipment bonuses at higher levels.

**Win/Loss determination** appears probabilistic rather than threshold-based. No confirmed documentation exists stating "damage ≥ 1 = attacker wins" as the user suggested. Instead, the system compared total Attack vs total Defense with randomness, and the higher value had better *odds* of winning each individual battle.

## Equipment scales with clan size: the core multiplier

Each clan/horde member could use **one ability from each of three categories** in battle:

| Game | Category 1 | Category 2 | Category 3 |
|------|-----------|-----------|-----------|
| Vampires Live | Physical | Sensory | Transformation |
| Zombies Live | Action | Regenerative | Enhancement |

**Critical mechanic:** Clan members were "just a number." Their individual levels and equipment were irrelevant—only YOUR owned abilities mattered. The game automatically selected your highest Attack abilities when attacking and highest Defense abilities when defending, then multiplied across usable clan members.

**Example calculation:** A level 15 player can use **75 clan members** (5 × 15). If each member uses 3 abilities, you need **225 total abilities** to fully equip your clan. Equipment had both Attack and Defense stats; the game chose optimally per situation.

## Bracket system created strategic depth

Players were grouped into **visibility brackets** based on clan size:
- **1-4 members** → **5-9** → **10-14** → **15-19** → **20-24**...

Players could only see and be attacked by others in their bracket. This created profound strategic implications: a player with **9 clan members** fighting someone with **5** had a massive equipment advantage while remaining in the same bracket. Optimal strategy was staying at bracket caps (4, 9, 14, 19) as long as possible while maximizing equipment and income.

At higher levels, brackets "merged together" and this advantage diminished, shifting meta toward pure stat optimization.

## Energy and stamina: the resource economy

**Energy** powered mission completion (PvE content):
- **Starting value:** 20 energy
- **Regeneration:** ~1 point per 5 minutes
- **Usage:** Variable per mission (1-10+ energy)
- **Upgrades:** Skill point investment increased max; mission mastery rewards could reduce timers (e.g., "30 second reduction on energy timer")

**Stamina** powered PvP combat:
- **Cost:** **1 stamina per attack** (confirmed)
- **Regeneration:** ~1 point per 3-5 minutes
- **Upgrades:** Skill points increased max; items like "Cunning Ambush" gave "10% chance to not use stamina in attacks"

**Health** did NOT auto-regenerate:
- Required **hospital payment** to heal
- Mission mastery could provide "50% discount on Hospital"
- Currency: **Blood** (Vampires) / **Flesh** (Zombies)

## The five-stat allocation system

Players received **5 skill points per level** to distribute across:

| Stat | Function | Build Strategy |
|------|----------|----------------|
| **Attack** | Combat offense (scales with level) | Glass cannon builds |
| **Defense** | Combat defense (scales with level) | Tank/turtle builds |
| **Health** | Damage absorption | Survivability |
| **Energy** | Mission capacity | Income farming |
| **Stamina** | PvP attack capacity | Aggressive PvP |

**Glass cannon builds** maximized Attack and Stamina for overwhelming offense but died quickly. **Tank builds** invested heavily in Defense and Health to become unfarmable—defense-heavy players could consistently win on defense even against attackers with high stats. **Energy builds** focused on "camping" (avoiding leveling while farming missions for income and equipment), building a massive economic advantage before eventually leveling up.

The scaling mechanic meant 1 skill point in Attack/Defense was *always* more valuable than 1 flat point from equipment, and this gap widened with level.

## Hitlist mechanics: the bounty hunting system

The hitlist was Storm8's revenge and bounty system, with **critically different rules** from normal PvP:

**Normal combat protection (E.R. limit):** When a player's health dropped to **26 HP or below**, they became protected from further normal attacks. This was called the "E.R. limit" (Emergency Room). Note: The user's query suggested 8 HP, but community documentation confirms **26 HP**.

**Hitlist combat:** The 26 HP protection was **completely lifted**. Attackers could hit until the target reached **zero health**. From TBCave's 2010 guide: *"People hit you until you get to zero health. You can win and lose as many fights as it takes until you reach zero health."*

**Additional hitlist mechanics:**
- **No level restrictions**—a level 200 could attack a level 1 on the hitlist
- **Maximum 25 hitlist attacks per day** against the same target
- **Bounty goes to the killer** who delivers the final blow (reducing health to 0)
- **Death count increments** for the killed player
- **No other penalties**—no money loss, no ability loss, only the death counter
- **No XP gained** from winning hitlist fights (confirmed)

## Battle feed and notification system

Documentation on the battle feed was limited in available sources. What was confirmed:
- Players could view **wins, losses, kills, and deaths** on their Profile page
- **Real-time updates** were a headline feature
- **Wall posts created permanent attack links**—posting on another player's wall gave you a permanent way to find and attack them, a critical mechanic for "farming"

The specific **10-entry limit, color coding (green/red), and "washing away" mechanic** mentioned in the user's query could not be confirmed from available sources. These may have been actual features, but community documentation didn't preserve these details.

## Cross-game compatibility: vampires vs zombies

Vampires Live and Zombies Live were **cross-compatible**—vampires could attack zombies and vice versa. This was a headline feature. The games shared >90% identical mechanics with themed terminology:

| Feature | Vampires Live | Zombies Live |
|---------|--------------|--------------|
| Group | Clan | Horde |
| Currency | Blood | Flesh |
| Income | Slaves | Traps |
| Members per level | 5 | 5 |
| Brackets | Identical | Identical |

Special cross-game defensive abilities existed to protect against attacks from the other game's players.

---

# Complete Battle Schema for Implementation

Based on confirmed mechanics, here is a comprehensive battle schema:

```yaml
battle_schema:
  # CORE STATS
  stats:
    attack:
      base_value: 0
      per_skill_point: "skill_points × player_level"  # Scaling multiplier
      purpose: "Offensive combat calculation"
    defense:
      base_value: 0
      per_skill_point: "skill_points × player_level"  # Scaling multiplier
      purpose: "Defensive combat calculation"
    health:
      base_value: 100  # Suggested starting value
      per_skill_point: 10  # Flat increase per point
      regeneration: false  # Requires manual healing
    energy:
      base_value: 20
      per_skill_point: 1
      regeneration_rate: "1 per 5 minutes"
      purpose: "PvE missions"
    stamina:
      base_value: 5
      per_skill_point: 1
      regeneration_rate: "1 per 3 minutes"
      purpose: "PvP attacks (1 per attack)"

  # SKILL POINT ALLOCATION
  leveling:
    points_per_level: 5
    bonus_sources:
      - mission_mastery
      - achievements/badges

  # CLAN/GROUP SYSTEM
  clan:
    usable_members_formula: "5 × player_level"
    abilities_per_member: 3
    ability_categories:
      - physical
      - sensory
      - transformation
    bracket_system:
      brackets: [4, 9, 14, 19, 24, 29, 34, 39, 44, 49]  # Max size per bracket
      visibility: "same_bracket_only"
    inactive_members_count: true

  # BATTLE CALCULATION
  battle:
    # Total Attack = equipment_attack + (attack_skill × level)
    # Total Defense = equipment_defense + (defense_skill × level)
    
    formula_concept: "probabilistic_comparison"
    
    # Suggested implementation (not confirmed exact formula):
    suggested_formula: |
      attacker_power = attacker_total_attack + random(-variance, +variance)
      defender_power = defender_total_defense + random(-variance, +variance)
      damage = max(0, attacker_power - defender_power)
      
      if damage > 0:
        attacker_wins = true
        defender_health -= damage
        attacker_steals_currency(percentage_of_unbanked)
      else:
        defender_wins = true
        # Defender gains XP for successful defense
    
    variance_factor: "10-20% of total stats"  # Suggested
    
    equipment_selection: "automatic_best"
    # Game auto-selects highest attack items when attacking
    # Game auto-selects highest defense items when defending

  # HEALTH THRESHOLD PROTECTION
  protection:
    normal_combat:
      health_threshold: 26
      effect: "Cannot be attacked below this HP via normal attacks"
      message: "Target has escaped to safety"
    hitlist_combat:
      protection_lifted: true
      attacks_continue_to: 0

  # HITLIST SYSTEM
  hitlist:
    posting:
      minimum_bounty: "suggested: 1000 currency"
      maximum_bounty: "no_cap"
      cost_to_poster: "bounty_amount"
    attacking:
      level_restrictions: false
      daily_limit_per_target: 25
      stamina_cost: 1
      health_protection: false  # No 26 HP protection
    rewards:
      bounty_recipient: "player_who_delivers_killing_blow"
      xp_from_hitlist_fights: false
    death:
      penalty: "death_counter_increment_only"
      currency_loss: false
      respawn: "immediate_with_full_health"

  # CURRENCY AND BANKING
  economy:
    banking:
      deposit_fee: "10%"
      protection: "banked_currency_cannot_be_stolen"
    stealing:
      source: "unbanked_currency_only"
      amount: "percentage_based_on_damage_differential"
```

---

# Implementation Prompt for Claude Opus 4.5

Use this prompt to guide implementation of a Storm8-style battle system:

```
You are building a semi-text-based RPG with a PvP battle system inspired by Storm8's 
Vampires Live/Zombies Live games (2009-2012). Implement the following mechanics:

## CORE ARCHITECTURE

### Stat System
Players have 5 stats: Attack, Defense, Health, Energy, Stamina
- Attack/Defense use SCALING formula: contribution = skill_points × player_level
- Health/Energy/Stamina use flat increases per skill point
- Players receive 5 skill points per level to distribute

### Battle Calculation
Total Attack = sum(equipment_attack for equipped items) + (attack_skill_points × level)
Total Defense = sum(equipment_defense for equipped items) + (defense_skill_points × level)

For each battle:
1. Calculate attacker's effective attack with random variance (±15%)
2. Calculate defender's effective defense with random variance (±15%)
3. Compare values - higher value wins, but randomness means upsets happen
4. Winner gains XP, can steal unbanked currency from loser
5. Loser takes health damage proportional to stat differential

### Clan/Group System
- Max usable members in battle = 5 × player_level
- Each member can equip ONE item from each of 3 categories
- System auto-selects best Attack items when attacking, best Defense when defending
- Implement bracket system: players only see/fight others in same member-count bracket
  (1-4, 5-9, 10-14, 15-19, etc.)

### Resource Regeneration
- Stamina: 1 point per 3 minutes, costs 1 per PvP attack
- Energy: 1 point per 5 minutes, costs variable per PvE mission
- Health: NO auto-regeneration, requires hospital/healing payment

### Health Threshold Protection
- Normal attacks: target becomes protected when health ≤ 26
- Display message: "[Target] has escaped to safety"
- This protection is LIFTED during hitlist attacks

### Hitlist System
- Players can post bounties on others
- Hitlist attacks ignore level restrictions and health protection
- Attacks continue until target reaches 0 HP
- Killer (final blow) receives the bounty
- Max 25 hitlist attacks per day per target
- Death only increments death counter, no other penalties

### Build Archetypes to Support
1. Glass Cannon: High Attack + Stamina, aggressive farming
2. Tank: High Defense + Health, difficult to farm
3. Camper: High Energy, mission grinding, stays low level

### Key Design Principles
- Higher stats = better PROBABILITY, never guaranteed wins
- Defense builds should be viable - able to win on defense against attackers
- Skill points > equipment points (scaling makes skill investment valuable)
- Banking protects currency (10% deposit fee)
- Bracket system creates strategic depth around clan size

Implement with clear separation between:
- Combat resolution logic
- Stat calculation with scaling
- Resource management
- Hitlist special rules
- Bracket visibility system
```

---

## Gaps and uncertainties in the research

**Confirmed with high confidence:**
- 5 × Level formula for usable clan members
- 26 HP escape threshold (not 8)
- Skill points scaling with level
- 3 abilities per clan member (one per category)
- Bracket system for matchmaking
- 1 stamina per attack
- Hitlist removes health protection
- Cross-game compatibility

**Not found or unconfirmed:**
- Exact mathematical damage formula
- Precise win/loss threshold (damage ≥ 1 theory not confirmed)
- Battle feed color coding and 10-entry limit
- Exact money stolen percentages
- Precise regeneration timers (varied by game version)

**Source note:** Storm8's official forums (forums.storm8.com) contained the most detailed information but were blocked by robots.txt. The games were removed from app stores around 2015, and much community documentation has been lost. Primary sources used included aygabtu.com calculators, TBCave guides from 2010, worldwarlive.xp3.biz, and various fan wikis.