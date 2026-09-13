import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { HpBar } from '../components/BattleArena';
import { useBattleResult } from '../lib/BattleResultContext';
import { useActiveCharacter } from '../lib/ActiveCharacterContext';
import { HitlistButton } from '../components/HitlistButton';
import { ClanPanel } from '../components/ClanPanel';

// Every game action defaults to the active character; passing character_id
// lets a page act as a specific one instead.
function withChar(path: string, characterId?: string | null) {
  if (!characterId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}character_id=${encodeURIComponent(characterId)}`;
}


// Ability Shop UI
function BattleStats({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const cur = character.current_health ?? 0;
  const max = character.max_health ?? 1;

  const handleRespec = async () => {
    if (!confirm('Reset all stat points? Your character returns to base stats and every point is refunded.')) return;
    try {
      await apiClient.post('/game/character/respec', { characterId: character.id });
      onUpdate();
    } catch {
      // ignore — onUpdate refresh will reflect actual state
    }
  };
  return (
    <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50 shadow-[0_0_20px_rgba(255,42,42,0.10)]">
      <h2 className="text-2xl font-bold mb-2 neon-text">Your Battle Stats</h2>
      <p className="text-xs text-shade-red-300 mb-3">These drive your damage and survivability. Allocate on the Dashboard.</p>
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        {[
          { label: 'ATK', val: character.atk, accent: 'from-rose-600/30 to-rose-900/10 text-rose-300' },
          { label: 'DEF', val: character.def, accent: 'from-sky-600/30 to-sky-900/10 text-sky-300' },
          { label: 'SPD', val: character.spd, accent: 'from-amber-600/30 to-amber-900/10 text-amber-300' },
          { label: 'Class', val: character.class, accent: 'from-fuchsia-600/30 to-fuchsia-900/10 text-fuchsia-300' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-2 bg-gradient-to-br ${s.accent} border border-white/10`}>
            <div className="text-[10px] uppercase tracking-wider opacity-80">{s.label}</div>
            <div className="font-bold truncate">{s.val ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-sm text-shade-red-200 mb-1">
        <span>Health</span>
        <span>{cur.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <HpBar current={cur} max={max} />
      {cur <= 0 && (
        <p className="text-xs text-shade-red-600 mt-2">💀 Defeated — heal at the hospital to fight again.</p>
      )}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span className="text-shade-red-300">Unspent points: <span className="text-shade-red-100 font-bold">{character.unspent_stat_points ?? 0}</span></span>
        <button
          onClick={handleRespec}
          className="bg-shade-black-900 neon-border text-shade-red-400 hover:neon-glow transition-all px-3 py-1.5 rounded text-xs font-bold"
        >
          ↺ Reset Points
        </button>
      </div>
    </div>
  );
}

// Attack interface — the resolved battle pops up in the global arena overlay.

/**
 * The battle tab: who you can hit, right now.
 *
 * Hitlisted targets sit at the top, marked with a skull and the bounty on
 * their head, then everyone else worth attacking. Defeated characters are
 * filtered out server-side and the slot is backfilled, so the list is always
 * actionable rather than half full of targets that would refuse the attack.
 */
function TargetList({ character, onUpdate }: { character: any; onUpdate: () => void }) {
  const { showBattle } = useBattleResult();
  const [bounties, setBounties] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([
        apiClient.get<{ data: any[] }>('/storm8/hitlist/active'),
        apiClient.get<{ data: any[] }>('/game/characters'),
      ]);
      setBounties(h.data || []);
      setPlayers((p.data || []).filter((x) => x.id !== character?.id));
    } catch (e: any) {
      setError(e?.message || 'Could not load targets');
    } finally {
      setLoading(false);
    }
  }, [character?.id]);

  useEffect(() => { load(); }, [load]);

  const strike = async (path: string, body: any, key: string) => {
    setBusy(key); setError(null);
    try {
      const res = await apiClient.post<{ data: any }>(withChar(path, character?.id), body);
      showBattle(res.data);
      await Promise.all([load(), Promise.resolve(onUpdate())]);
    } catch (e: any) {
      setError(e?.message || 'Attack failed');
    } finally {
      setBusy(null);
    }
  };

  const noStamina = (character?.current_stamina ?? 0) < 1;

  return (
    <div className="rounded-xl p-5 bg-gradient-to-br from-shade-black-800 via-shade-black-900 to-black border border-shade-red-800/50">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h2 className="text-xl font-bold neon-text">Targets</h2>
        <span className="text-[11px] text-shade-ash">
          {noStamina ? 'Out of stamina — regenerates 1 per 3 min' : `${character?.current_stamina ?? 0} stamina`}
        </span>
      </div>

      {error && <p className="text-shade-red-500 text-sm mb-2">{error}</p>}
      {loading && <p className="text-shade-red-400 text-sm">Loading…</p>}

      {/* Bounties first — the skull and the number are the whole point. */}
      {bounties.length > 0 && (
        <div className="space-y-2 mb-4">
          {bounties.map((b) => {
            const own = b.posted_by_character_id === character?.id;
            return (
              <div key={b.id} className="rounded-lg p-3 bg-amber-950/25 border border-amber-700/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-shade-red-100 truncate">
                      <span className="mr-1" aria-hidden="true">💀</span>
                      {b.target_gamertag}
                      {b.target_level ? <span className="text-shade-ash font-normal"> · Lv.{b.target_level}</span> : null}
                    </p>
                    <p className="text-[11px] text-shade-ash">posted by {b.poster_gamertag ?? 'unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-amber-300 font-bold">{Number(b.bounty_amount).toLocaleString()}</span>
                    <button
                      onClick={() => strike('/storm8/hitlist/attack', { hitlist_id: b.id }, b.id)}
                      disabled={busy === b.id || noStamina || own}
                      title={own ? 'You posted this bounty — hunt it with a different character' : undefined}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-700 to-amber-500 text-white disabled:opacity-40"
                    >
                      {own ? 'Yours' : 'Claim'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Then everyone else. */}
      <div className="space-y-2">
        {!loading && players.length === 0 && (
          <p className="text-shade-red-300 text-sm">No one is attackable right now.</p>
        )}
        {players.map((p) => (
          <div key={p.id} className="rounded-lg p-3 bg-shade-black-950/60 border border-white/10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link to={`/shade/u/${encodeURIComponent(p.gamertag)}`} className="min-w-0 group">
                <p className="font-bold text-shade-red-100 truncate group-hover:underline">{p.gamertag}</p>
                <p className="text-[11px] text-shade-ash capitalize">{p.class} · Lv.{p.level}</p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <HitlistButton gamertag={p.gamertag} onPosted={load} compact />
                <button
                  onClick={() => strike('/storm8/attack', { defender_character_id: p.id }, p.id)}
                  disabled={busy === p.id || noStamina}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-shade-red-700 to-shade-red-500 text-white disabled:opacity-40"
                >
                  Attack
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Storm8Page() {
  const { characters, activeId, activeCharacter, setActive, refresh, loading } = useActiveCharacter();

  if (loading) return <div className="p-4 text-shade-red-200">Loading...</div>;
  if (!activeCharacter) return <div className="p-4 text-shade-red-300">No character found. Create one on the Dashboard.</div>;

  const character = activeCharacter;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-shade-red-400 via-fuchsia-400 to-shade-red-600 bg-clip-text text-transparent tracking-wide">⚔ Battle</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-shade-red-300">Playing as:</span>
          <select
            value={activeId ?? ''}
            onChange={(e) => setActive(e.target.value)}
            className="p-2 rounded bg-shade-black-600 neon-border text-shade-red-100"
          >
            {characters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.gamertag} — Slot {ch.slot_number} (Lv.{ch.level} {ch.class})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skill points and the store moved to the dashboard; this tab is targets. */}
      <div className="space-y-6" key={activeId}>
        <BattleStats character={character} onUpdate={refresh} />
        <TargetList character={character} onUpdate={refresh} />
      </div>
    </div>
  );
}
