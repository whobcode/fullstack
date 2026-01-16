import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
  readAt?: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for conversation lookups
MessageSchema.index({ senderId: 1, recipientId: 1 });
MessageSchema.index({ recipientId: 1, senderId: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
