import mongoose, { Schema, Document } from 'mongoose';

export type GroupRole = 'admin' | 'member';

export interface IGroupMember {
  userId: mongoose.Types.ObjectId;
  role: GroupRole;
  joinedAt: Date;
}

export interface IGroup extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  description?: string;
  members: IGroupMember[];
  createdAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const GroupSchema = new Schema<IGroup>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String
  },
  members: [GroupMemberSchema]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Indexes
GroupSchema.index({ name: 1 });
GroupSchema.index({ ownerId: 1 });
GroupSchema.index({ 'members.userId': 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
