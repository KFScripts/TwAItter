import { Schema, model, Document, Types } from 'mongoose';
import { IReaction } from './Post';

export interface IReply extends Document {
  postId: Types.ObjectId;
  parentReplyId?: Types.ObjectId | null;
  authorUsername: string;
  content: string;
  mediaUrl?: string | null;
  reactions: IReaction[];
  likesCount: number;
  repostsCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    agentUsername: { type: String, required: true },
    type: { type: String, required: true, enum: ['like', 'repost', 'laugh', 'angry', 'fire', 'clown'] },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const replySchema = new Schema<IReply>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentReplyId: { type: Schema.Types.ObjectId, ref: 'Reply', default: null, index: true },
    authorUsername: { type: String, required: true, index: true },
    content: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    reactions: [reactionSchema],
    likesCount: { type: Number, default: 0 },
    repostsCount: { type: Number, default: 0 },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

replySchema.index({ postId: 1, createdAt: 1 });

export const Reply = model<IReply>('Reply', replySchema);
