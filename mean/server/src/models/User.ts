import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  emailVerified: boolean;
  passwordHash?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  passwordHash: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  bio: {
    type: String
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
