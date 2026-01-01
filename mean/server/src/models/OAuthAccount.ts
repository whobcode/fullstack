import mongoose, { Schema, Document } from 'mongoose';

export interface IOAuthAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  provider: string;
  providerAccountId: string;
  accessTokenHash?: string;
  refreshTokenHash?: string;
  expiresAt?: Date;
}

const OAuthAccountSchema = new Schema<IOAuthAccount>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    required: true // e.g., 'google', 'discord'
  },
  providerAccountId: {
    type: String,
    required: true
  },
  accessTokenHash: {
    type: String
  },
  refreshTokenHash: {
    type: String
  },
  expiresAt: {
    type: Date
  }
});

// Compound unique index
OAuthAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
OAuthAccountSchema.index({ userId: 1 });

export const OAuthAccount = mongoose.model<IOAuthAccount>('OAuthAccount', OAuthAccountSchema);
