import mongoose, { Schema, Document } from 'mongoose';

export interface IOfflineXP extends Document {
  _id: mongoose.Types.ObjectId;
  characterId: mongoose.Types.ObjectId;
  fromTs: Date;
  toTs: Date;
  xpAwarded: number;
  createdAt: Date;
}

const OfflineXPSchema = new Schema<IOfflineXP>({
  characterId: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  fromTs: {
    type: Date,
    required: true
  },
  toTs: {
    type: Date,
    required: true
  },
  xpAwarded: {
    type: Number,
    required: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for character lookups
OfflineXPSchema.index({ characterId: 1 });

export const OfflineXP = mongoose.model<IOfflineXP>('OfflineXP', OfflineXPSchema);
