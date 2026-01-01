import mongoose, { Schema, Document } from 'mongoose';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime';

export interface ILeaderboardEntry {
  characterId: mongoose.Types.ObjectId;
  rank: number;
  metric: string;
  value: number;
}

export interface ILeaderboardSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  period: LeaderboardPeriod;
  entries: ILeaderboardEntry[];
  createdAt: Date;
}

const LeaderboardEntrySchema = new Schema<ILeaderboardEntry>({
  characterId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  rank: {
    type: Number,
    required: true
  },
  metric: {
    type: String,
    required: true // e.g., 'wins', 'kills', 'level'
  },
  value: {
    type: Number,
    required: true
  }
}, { _id: false });

const LeaderboardSnapshotSchema = new Schema<ILeaderboardSnapshot>({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'alltime'],
    required: true
  },
  entries: [LeaderboardEntrySchema]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for period lookups
LeaderboardSnapshotSchema.index({ period: 1, createdAt: -1 });

export const LeaderboardSnapshot = mongoose.model<ILeaderboardSnapshot>('LeaderboardSnapshot', LeaderboardSnapshotSchema);
