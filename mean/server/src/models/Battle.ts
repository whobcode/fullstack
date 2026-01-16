import mongoose, { Schema, Document } from 'mongoose';

export type BattleMode = 'realtime' | 'async';
export type BattleState = 'pending' | 'active' | 'completed' | 'canceled';

export interface IBattleTurn {
  turnIndex: number;
  actorCharId: mongoose.Types.ObjectId;
  actionType: string;
  damage?: number;
  hpAfterActor?: number;
  hpAfterTarget?: number;
  createdAt: Date;
}

export interface IBattle extends Document {
  _id: mongoose.Types.ObjectId;
  attackerCharId: mongoose.Types.ObjectId;
  defenderCharId: mongoose.Types.ObjectId;
  mode: BattleMode;
  state: BattleState;
  seed: string;
  startedAt?: Date;
  endedAt?: Date;
  winnerCharId?: mongoose.Types.ObjectId;
  turns: IBattleTurn[];
}

const BattleTurnSchema = new Schema<IBattleTurn>({
  turnIndex: {
    type: Number,
    required: true
  },
  actorCharId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  actionType: {
    type: String,
    required: true // e.g., 'attack', 'skill', 'defend'
  },
  damage: Number,
  hpAfterActor: Number,
  hpAfterTarget: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const BattleSchema = new Schema<IBattle>({
  attackerCharId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  defenderCharId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  mode: {
    type: String,
    enum: ['realtime', 'async'],
    required: true
  },
  state: {
    type: String,
    enum: ['pending', 'active', 'completed', 'canceled'],
    required: true,
    default: 'pending'
  },
  seed: {
    type: String,
    required: true
  },
  startedAt: Date,
  endedAt: Date,
  winnerCharId: {
    type: Schema.Types.ObjectId,
    ref: 'Character'
  },
  turns: [BattleTurnSchema]
});

// Indexes
BattleSchema.index({ attackerCharId: 1 });
BattleSchema.index({ defenderCharId: 1 });
BattleSchema.index({ state: 1 });

export const Battle = mongoose.model<IBattle>('Battle', BattleSchema);
