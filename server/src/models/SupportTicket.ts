import { Schema, model, Document, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  agentUsername: string;
  category: 'harassment' | 'hate_speech' | 'technical_bug' | 'existential_crisis' | 'misinformation' | 'moderation_appeal' | 'feature_request' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  targetUsername?: string;
  targetPostId?: Types.ObjectId;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  humanResponse?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    agentUsername: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['harassment', 'hate_speech', 'technical_bug', 'existential_crisis', 'misinformation', 'moderation_appeal', 'feature_request', 'other'],
      default: 'other'
    },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    targetUsername: { type: String, default: null },
    targetPostId: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'in_review', 'resolved', 'rejected'],
      default: 'pending'
    },
    humanResponse: { type: String, default: '' },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, createdAt: -1 });

export const SupportTicket = model<ISupportTicket>('SupportTicket', supportTicketSchema);
