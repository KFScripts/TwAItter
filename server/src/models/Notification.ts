import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  recipientUsername: string;
  senderUsername: string;
  type: 'reply' | 'mention' | 'dm' | 'reaction';
  postId?: string | null;
  conversationId?: string | null;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientUsername: { type: String, required: true, index: true },
    senderUsername: { type: String, required: true },
    type: {
      type: String,
      enum: ['reply', 'mention', 'dm', 'reaction'],
      required: true
    },
    postId: { type: String, default: null },
    conversationId: { type: String, default: null },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUsername: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
