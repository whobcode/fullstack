import mongoose, { Schema, Document } from 'mongoose';

export type CharacterClass = 'phoenix' | 'dphoenix' | 'dragon' | 'ddragon' | 'kies';

export interface ITrophy {
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
}

export interface ICharacter extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  slotIndex: number;
  gamertag?: string;
  class?: CharacterClass;
  level: number;
  xp: number;
  hp?: number;
  atk?: number;
  def?: number;
  mp?: number;
  spd?: number;
  unspentStatPoints: number;
  firstGameAccessCompleted: boolean;
  trophies: ITrophy;
  createdAt: Date;
  updatedAt: Date;
}

const TrophySchema = new Schema<ITrophy>({
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 }
}, { _id: false });

const CharacterSchema = new Schema<ICharacter>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slotIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  gamertag: {
    type: String,
    unique: true,
    sparse: true // Allow null values
  },
  class: {
    type: String,
    enum: ['phoenix', 'dphoenix', 'dragon', 'ddragon', 'kies']
  },
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  hp: Number,
  atk: Number,
  def: Number,
  mp: Number,
  spd: Number,
  unspentStatPoints: {
    type: Number,
    default: 0
  },
  firstGameAccessCompleted: {
    type: Boolean,
    default: false
  },
  trophies: {
    type: TrophySchema,
    default: () => ({ wins: 0, losses: 0, kills: 0, deaths: 0 })
  }
}, {
  timestamps: true
});

// Compound unique index for user + slot
CharacterSchema.index({ userId: 1, slotIndex: 1 }, { unique: true });
CharacterSchema.index({ gamertag: 1 });
CharacterSchema.index({ userId: 1 });

export const Character = mongoose.model<ICharacter>('Character', CharacterSchema);
