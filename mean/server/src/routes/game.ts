import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Character, CharacterClass } from '../models/Character.js';
import { Battle } from '../models/Battle.js';
import { LeaderboardSnapshot } from '../models/Leaderboard.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createCharacterSchema = z.object({
  gamertag: z.string().min(3).max(20),
  class: z.enum(['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies'])
});

const allocateStatsSchema = z.object({
  hp: z.number().int().min(0).optional(),
  atk: z.number().int().min(0).optional(),
  def: z.number().int().min(0).optional(),
  mp: z.number().int().min(0).optional(),
  spd: z.number().int().min(0).optional()
});

// Base stats by class
const CLASS_BASE_STATS: Record<CharacterClass, { hp: number; atk: number; def: number; mp: number; spd: number }> = {
  phoenix: { hp: 100, atk: 15, def: 10, mp: 50, spd: 12 },
  dphoenix: { hp: 90, atk: 18, def: 8, mp: 60, spd: 14 },
  dragon: { hp: 120, atk: 20, def: 15, mp: 30, spd: 10 },
  ddragon: { hp: 110, atk: 22, def: 12, mp: 40, spd: 11 },
  kies: { hp: 80, atk: 12, def: 8, mp: 80, spd: 15 }
};

// Get current character
router.get('/character', authMiddleware, async (req: Request, res: Response) => {
  try {
    const character = await Character.findOne({
      userId: req.user!.id,
      slotIndex: 0
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json({ data: character });
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get all character slots
router.get('/characters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const characters = await Character.find({
      userId: req.user!.id
    }).sort({ slotIndex: 1 });

    res.json({ data: characters });
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Initialize character (first-time setup)
router.post('/character/initialize', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = createCharacterSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { gamertag, class: charClass } = validation.data;

    // Check if gamertag is taken
    const existingGamertag = await Character.findOne({ gamertag });
    if (existingGamertag) {
      res.status(409).json({ error: 'Gamertag already in use' });
      return;
    }

    // Find existing character
    const character = await Character.findOne({
      userId: req.user!.id,
      slotIndex: 0
    });

    if (!character) {
      res.status(404).json({ error: 'Character slot not found' });
      return;
    }

    if (character.firstGameAccessCompleted) {
      res.status(400).json({ error: 'Character already initialized' });
      return;
    }

    // Set up character with class stats
    const baseStats = CLASS_BASE_STATS[charClass];

    character.gamertag = gamertag;
    character.class = charClass;
    character.hp = baseStats.hp;
    character.atk = baseStats.atk;
    character.def = baseStats.def;
    character.mp = baseStats.mp;
    character.spd = baseStats.spd;
    character.firstGameAccessCompleted = true;

    await character.save();

    res.json({ data: character });
  } catch (error) {
    console.error('Initialize character error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Allocate stat points
router.post('/character/allocate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = allocateStatsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const character = await Character.findOne({
      userId: req.user!.id,
      slotIndex: 0
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const { hp = 0, atk = 0, def = 0, mp = 0, spd = 0 } = validation.data;
    const totalPoints = hp + atk + def + mp + spd;

    if (totalPoints > character.unspentStatPoints) {
      res.status(400).json({ error: 'Not enough stat points' });
      return;
    }

    character.hp = (character.hp || 0) + hp;
    character.atk = (character.atk || 0) + atk;
    character.def = (character.def || 0) + def;
    character.mp = (character.mp || 0) + mp;
    character.spd = (character.spd || 0) + spd;
    character.unspentStatPoints -= totalPoints;

    await character.save();

    res.json({ data: character });
  } catch (error) {
    console.error('Allocate stats error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get players list
router.get('/players', async (req: Request, res: Response) => {
  try {
    const { limit = '20', cursor, search } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    let query: any = {
      firstGameAccessCompleted: true,
      gamertag: { $exists: true }
    };

    if (search) {
      query.gamertag = { $regex: search, $options: 'i' };
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor as string) };
    }

    const characters = await Character.find(query)
      .sort({ level: -1, createdAt: -1 })
      .limit(limitNum)
      .select('gamertag class level trophies');

    const nextCursor = characters.length === limitNum
      ? characters[characters.length - 1].createdAt.toISOString()
      : null;

    res.json({
      data: characters,
      nextCursor
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Start a battle
router.post('/battle/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { defenderId } = req.body;

    const attacker = await Character.findOne({
      userId: req.user!.id,
      slotIndex: 0
    });

    if (!attacker || !attacker.firstGameAccessCompleted) {
      res.status(400).json({ error: 'You must initialize your character first' });
      return;
    }

    const defender = await Character.findById(defenderId);
    if (!defender || !defender.firstGameAccessCompleted) {
      res.status(404).json({ error: 'Defender not found' });
      return;
    }

    if (attacker._id.equals(defender._id)) {
      res.status(400).json({ error: 'Cannot battle yourself' });
      return;
    }

    // Check for existing active battle
    const existingBattle = await Battle.findOne({
      $or: [
        { attackerCharId: attacker._id },
        { defenderCharId: attacker._id }
      ],
      state: { $in: ['pending', 'active'] }
    });

    if (existingBattle) {
      res.status(400).json({ error: 'You already have an active battle' });
      return;
    }

    const battle = await Battle.create({
      attackerCharId: attacker._id,
      defenderCharId: defender._id,
      mode: 'async',
      state: 'pending',
      seed: crypto.randomUUID()
    });

    res.status(201).json({
      data: {
        id: battle._id,
        attacker: {
          id: attacker._id,
          gamertag: attacker.gamertag,
          class: attacker.class,
          level: attacker.level
        },
        defender: {
          id: defender._id,
          gamertag: defender.gamertag,
          class: defender.class,
          level: defender.level
        }
      }
    });
  } catch (error) {
    console.error('Start battle error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { period = 'alltime', metric = 'wins' } = req.query;

    // Get latest snapshot for the period
    const snapshot = await LeaderboardSnapshot.findOne({
      period: period as string
    }).sort({ createdAt: -1 });

    if (!snapshot) {
      // No snapshot exists, compute from characters
      const characters = await Character.find({
        firstGameAccessCompleted: true
      })
        .sort({ [`trophies.${metric}`]: -1 })
        .limit(100)
        .select('gamertag class level trophies');

      res.json({
        data: characters.map((c, i) => ({
          rank: i + 1,
          character: {
            id: c._id,
            gamertag: c.gamertag,
            class: c.class,
            level: c.level
          },
          value: (c.trophies as any)[metric as string] || 0
        }))
      });
      return;
    }

    const entries = snapshot.entries
      .filter(e => e.metric === metric)
      .sort((a, b) => a.rank - b.rank);

    // Get character details
    const characterIds = entries.map(e => e.characterId);
    const characters = await Character.find({ _id: { $in: characterIds } })
      .select('gamertag class level');

    const characterMap = new Map(
      characters.map(c => [c._id.toString(), c])
    );

    res.json({
      data: entries.map(e => ({
        rank: e.rank,
        character: characterMap.get(e.characterId.toString()),
        value: e.value
      }))
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

export default router;
