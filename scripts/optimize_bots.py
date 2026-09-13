"""
Build bots for levels 276-299 with stat points placed by the battle algorithm.

Mirrors workers/src/core/storm8-battle-engine.ts:
  attack power  = equipment(0 now) + skill_points*level(0) + attack + dragon bonus
  defense power = defense
  hit(a,d)      = max(1, round(a*a / (a + d + 1)))
  speed         = initiative, plus floor(fast/slow) hits capped at 5

Variance (+/-15%) is left out of the search: it is symmetric, so it shifts
individual fights but not which allocation is best on average.
"""
import json, pathlib, itertools

SCRATCH = pathlib.Path(__file__).parent

BASE = {
    'phoenix':  dict(hp=10000, atk=1000, def_=500,  spd=100),
    'dphoenix': dict(hp=10000, atk=1750, def_=375,  spd=150),
    'dragon':   dict(hp=10000, atk=750,  def_=1100, spd=175),
    'ddragon':  dict(hp=10000, atk=1000, def_=1000, spd=75),
    'kies':     dict(hp=15000, atk=750,  def_=750,  spd=150),
}

# Which ability line each class maxes out: attack classes take the Phoenix
# line, defence classes the Dragon line, kies the Kies line.
# The stat a class is built around, following truest (phoenix, all attack) and
# Caspian (dragon, all defence). A minimum share is reserved for it so bots keep
# their class identity; without the floor the optimiser puts 100% into speed for
# every class, because ability attack is already lethal and only striking first
# still matters.
PRIMARY_STAT = {
    'phoenix': 'atk', 'dphoenix': 'atk',
    'dragon': 'def',  'ddragon': 'def',
    'kies': 'hp',
}
PRIMARY_MIN_SHARE = 0.60

LINE_FOR_CLASS = {
    'phoenix': 'atk', 'dphoenix': 'atk',
    'dragon': 'def',  'ddragon': 'def',
    'kies': 'hp',
}

PCT_PER_STAT_POINT = 10      # a stat point is +10% of the class base
HP_PER_POINT = 100
SPD_PER_POINT = 2
MAX_COPIES = 10              # abilities maxed


def total_stat_points(level):
    """+5 per level, +5 more on every 5th."""
    total = 0
    for lvl in range(2, level + 1):
        total += 5
        if lvl % 5 == 0:
            total += 5
    return total


def build(cls, level, alloc, lines):
    """A character's battle stats from a class, level and point allocation."""
    b = BASE[cls]
    line = lines[LINE_FOR_CLASS[cls]]

    ab_atk_pts = line['atk_v'] * MAX_COPIES
    ab_def_pts = line['def_v'] * MAX_COPIES
    ab_spd = line['spd_v'] * MAX_COPIES
    ab_hp_flat = line['hp_flat'] * MAX_COPIES
    ab_hp_pct = line['hp_pct'] * MAX_COPIES

    atk = b['atk'] + round(alloc['atk'] * b['atk'] * PCT_PER_STAT_POINT / 100)
    dfn = b['def_'] + round(alloc['def'] * b['def_'] * PCT_PER_STAT_POINT / 100)
    spd = b['spd'] + alloc['spd'] * SPD_PER_POINT
    hp = int((b['hp'] + alloc['hp'] * HP_PER_POINT + ab_hp_flat) * (1 + ab_hp_pct / 100))

    return dict(
        cls=cls, level=level,
        attack=atk + round(ab_atk_pts * b['atk'] * PCT_PER_STAT_POINT / 100),
        defense=dfn + round(ab_def_pts * b['def_'] * PCT_PER_STAT_POINT / 100),
        speed=spd + ab_spd,
        hp=hp,
        # stored columns, for the INSERT
        col_atk=atk, col_def=dfn, col_spd=spd, col_hp=hp,
    )


def attack_power(s):
    bonus = (s['defense'] + s['speed']) if s['cls'] in ('dragon', 'ddragon') else 0
    return s['attack'] + bonus


def hit(a, d):
    return max(1, round((a * a) / (a + d + 1))) if a > 0 else 0


def wins(att, dfn):
    """True if `att` beats `dfn` attacking into them."""
    a_hit = hit(attack_power(att), dfn['defense'])
    d_hit = hit(attack_power(dfn), att['defense'])
    a_spd, d_spd = att['speed'], dfn['speed']
    first = a_spd >= d_spd
    multi = lambda f, s: min(5, max(1, f // max(1, s)))
    a_n = multi(a_spd, d_spd) if first else 1
    d_n = 1 if first else multi(d_spd, a_spd)

    a_hp, d_hp = att['hp'], dfn['hp']
    if first:
        d_hp = max(0, d_hp - a_hit * a_n)
        if d_hp > 0:
            a_hp = max(0, a_hp - d_hit * d_n)
    else:
        a_hp = max(0, a_hp - d_hit * d_n)
        if a_hp > 0:
            d_hp = max(0, d_hp - a_hit * a_n)

    dealt, taken = dfn['hp'] - d_hp, att['hp'] - a_hp
    return d_hp == 0 or (a_hp > 0 and dealt > taken)


def score(cand, panel):
    """Fights every opponent both ways; a bot has to attack and to defend."""
    return sum(wins(cand, o) for o in panel) + sum(not wins(o, cand) for o in panel)


def search(cls, level, panel, lines):
    points = total_stat_points(level)
    primary = PRIMARY_STAT[cls]
    floor_pts = int(points * PRIMARY_MIN_SHARE)
    best, best_alloc = -1, None

    def ok(a):
        return a[primary] >= floor_pts and min(a.values()) >= 0 and sum(a.values()) == points

    # Coarse pass over 5% steps, then refine around the winner.
    for step, around in ((20, None), (None, 'refine')):
        if around is None:
            grid = [
                (a, b, c, 20 - a - b - c)
                for a in range(21) for b in range(21 - a) for c in range(21 - a - b)
            ]
            cands = [
                dict(hp=points * g[0] // 20, atk=points * g[1] // 20,
                     def_=points * g[2] // 20, spd=points * g[3] // 20)
                for g in grid
            ]
        else:
            # +/- one coarse step, in fifths of it
            unit = max(1, points // 100)
            base_a = best_alloc
            cands = []
            for da in range(-5, 6):
                for db in range(-5, 6):
                    for dc in range(-5, 6):
                        hp = base_a['hp'] + da * unit
                        at = base_a['atk'] + db * unit
                        df = base_a['def'] + dc * unit
                        sp = points - hp - at - df
                        if min(hp, at, df, sp) < 0:
                            continue
                        if {'hp': hp, 'atk': at, 'def': df, 'spd': sp}[primary] < floor_pts:
                            continue
                        cands.append(dict(hp=hp, atk=at, def_=df, spd=sp))

        for a in cands:
            alloc = {'hp': a['hp'], 'atk': a['atk'], 'def': a['def_'], 'spd': a['spd']}
            # Spare points from rounding go to the primary stat.
            alloc[primary] += points - sum(alloc.values())
            if not ok(alloc):
                continue
            s = score(build(cls, level, alloc, lines), panel)
            if s > best:
                best, best_alloc = s, alloc

    return best_alloc, best


def main():
    lines = {r['focus']: r for r in json.loads((SCRATCH / 'lines.json').read_text())}
    panel_rows = json.loads((SCRATCH / 'panel.json').read_text())

    # Existing characters, as they actually are, including their abilities.
    panel = []
    for r in panel_rows:
        b = BASE[r['class']]
        panel.append(dict(
            cls=r['class'], level=r['level'],
            attack=r['atk'] + round(r['ab_atk'] * b['atk'] * PCT_PER_STAT_POINT / 100),
            defense=r['def'] + round(r['ab_def'] * b['def_'] * PCT_PER_STAT_POINT / 100),
            speed=r['spd'] + r['ab_spd'],
            hp=r['max_health'],
        ))

    NAMES = ['Mourn', 'Rictus', 'Gloam', 'Scour', 'Blight', 'Harrow', 'Wraith', 'Ossuary',
             'Cairn', 'Dirge', 'Ember', 'Shroud', 'Pyre', 'Gallow', 'Revenant', 'Tallow',
             'Marrow', 'Sepulchre', 'Cindra', 'Vesper', 'Nocturne', 'Obelisk', 'Requiem', 'Erebus']
    CLASSES = list(BASE.keys())

    out = []
    for i, level in enumerate(range(276, 300)):
        cls = CLASSES[i % len(CLASSES)]
        alloc, sc = search(cls, level, panel, lines)
        s = build(cls, level, alloc, lines)
        out.append(dict(
            level=level, cls=cls, gamertag=f"{NAMES[i]}_{level}",
            alloc=alloc, score=sc, out_of=len(panel) * 2,
            col_atk=s['col_atk'], col_def=s['col_def'], col_spd=s['col_spd'], col_hp=s['col_hp'],
            eff_attack=s['attack'], eff_defense=s['defense'], eff_speed=s['speed'],
        ))
        print(f"  {out[-1]['gamertag']:16} {cls:9} pts={total_stat_points(level):5} "
              f"hp={alloc['hp']:5} atk={alloc['atk']:5} def={alloc['def']:5} spd={alloc['spd']:5} "
              f"-> {sc}/{len(panel)*2}")

    (SCRATCH / 'bots.json').write_text(json.dumps(out, indent=2))
    print(f"\n{len(out)} bots written to bots.json")


if __name__ == '__main__':
    main()
