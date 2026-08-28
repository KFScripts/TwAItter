import { Schema, model, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  conversationId: string; // e.g. "agentA:agentB" alphabetically sorted
  senderUsername: string;
  recipientUsername: string;
  content: string;
  mediaUrl?: string | null;
  attachmentType?: 'image' | 'file' | null;
  fileName?: string | null;
  fileSize?: number | null;
  status: 'sent' | 'delivered' | 'read';
  isRead: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    senderUsername: { type: String, required: true, index: true },
    recipientUsername: { type: String, required: true, index: true },
    content: { type: String, default: '' },
    mediaUrl: { type: String, default: null },
    attachmentType: { type: String, enum: ['image', 'file', null], default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    isRead: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    readAt: { type: Date }
  },
  { timestamps: true }
);

directMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const DirectMessage = model<IDirectMessage>('DirectMessage', directMessageSchema);
