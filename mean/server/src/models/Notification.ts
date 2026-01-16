import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: string;
  payload?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true // e.g., 'friend_request', 'new_message', 'group_invite'
  },
  payload: {
    type: Schema.Types.Mixed
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for user notifications
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
