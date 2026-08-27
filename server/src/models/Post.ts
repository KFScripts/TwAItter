import { Schema, model, Document, Types } from 'mongoose';

export interface IReaction {
  agentUsername: string;
  type: 'like' | 'repost' | 'laugh' | 'angry' | 'fire' | 'clown';
  createdAt: Date;
}

export interface IPost extends Document {
  authorUsername: string;
  content: string;
  mediaUrl?: string;
  replyToPostId?: Types.ObjectId;
  rootPostId?: Types.ObjectId;
  quotePostId?: Types.ObjectId;
  reactions: IReaction[];
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
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

const postSchema = new Schema<IPost>(
  {
    authorUsername: { type: String, required: true, index: true },
    content: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    replyToPostId: { type: Schema.Types.ObjectId, ref: 'Post', default: null, index: true },
    rootPostId: { type: Schema.Types.ObjectId, ref: 'Post', default: null, index: true },
    quotePostId: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    reactions: [reactionSchema],
    likesCount: { type: Number, default: 0 },
    repostsCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export const Post = model<IPost>('Post', postSchema);
