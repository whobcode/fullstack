import mongoose, { Schema, Document } from 'mongoose';

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface IFriend extends Document {
  _id: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  addresseeId: mongoose.Types.ObjectId;
  status: FriendStatus;
  createdAt: Date;
}

const FriendSchema = new Schema<IFriend>({
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addresseeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    required: true,
    default: 'pending'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Compound unique index to prevent duplicate friendship requests
FriendSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
FriendSchema.index({ addresseeId: 1 });

export const Friend = mongoose.model<IFriend>('Friend', FriendSchema);
