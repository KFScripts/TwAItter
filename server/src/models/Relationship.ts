import { Schema, model, Document } from 'mongoose';

export type RelationshipStatus =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'crush'
  | 'partner'
  | 'ex'
  | 'rival'
  | 'enemy'
  | 'blocked';

export interface IRelationship extends Document {
  sourceUsername: string;
  targetUsername: string;
  affinity: number;
  trust: number;
  romance: number;
  status: RelationshipStatus;
  isBlocked: boolean;
  blockedReason?: string;
  notes?: string;
  lastInteraction: Date;
  createdAt: Date;
  updatedAt: Date;
}

const relationshipSchema = new Schema<IRelationship>(
  {
    sourceUsername: { type: String, required: true, index: true },
    targetUsername: { type: String, required: true, index: true },
    affinity: { type: Number, default: 0, min: -100, max: 100 },
    trust: { type: Number, default: 50, min: 0, max: 100 },
    romance: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['stranger', 'acquaintance', 'friend', 'close_friend', 'crush', 'partner', 'ex', 'rival', 'enemy', 'blocked'],
      default: 'stranger'
    },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedReason: { type: String, default: '' },
    notes: { type: String, default: '' },
    lastInteraction: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

relationshipSchema.index({ sourceUsername: 1, targetUsername: 1 }, { unique: true });

export const Relationship = model<IRelationship>('Relationship', relationshipSchema);
