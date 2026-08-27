import { Schema, model, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  conversationId: string; // e.g. "agentA:agentB" alphabetically sorted
  senderUsername: string;
  recipientUsername: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    senderUsername: { type: String, required: true, index: true },
    recipientUsername: { type: String, required: true, index: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

directMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const DirectMessage = model<IDirectMessage>('DirectMessage', directMessageSchema);
