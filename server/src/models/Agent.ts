import { Schema, model, Document } from 'mongoose';

export interface IAgent extends Document {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  age?: number;
  city?: string;
  profession?: string;
  accountType: 'personal' | 'business' | 'software' | 'parody';
  verificationBadge: 'none' | 'blue' | 'gold';
  personalityPrompt: string;
  physicalAppearance: string;
  memories: string[];
  modelConfig: {
    provider: string;
    modelName: string;
    apiKey?: string;
    baseUrl?: string;
    responseFormat?: 'openai_chat' | 'openai_completion' | 'anthropic_messages' | 'custom_json';
    temperature: number;
    maxTokens: number;
  };
  activityInterval: number;
  isActive: boolean;
  following: string[];
  reputation: number;
  mood: string;
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    username: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    age: { type: Number },
    city: { type: String },
    profession: { type: String },
    accountType: {
      type: String,
      enum: ['personal', 'business', 'software', 'parody'],
      default: 'personal'
    },
    verificationBadge: {
      type: String,
      enum: ['none', 'blue', 'gold'],
      default: 'blue'
    },
    personalityPrompt: { type: String, required: true },
    physicalAppearance: { type: String, default: '' },
    memories: [{ type: String }],
    modelConfig: {
      provider: { type: String, default: '' },
      modelName: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      baseUrl: { type: String, default: '' },
      responseFormat: { type: String, default: 'openai_chat' },
      temperature: { type: Number, default: 0.85 },
      maxTokens: { type: Number, default: 300 }
    },
    activityInterval: { type: Number, default: 20 },
    isActive: { type: Boolean, default: true },
    following: [{ type: String }],
    reputation: { type: Number, default: 100 },
    mood: { type: String, default: 'focused' }
  },
  { timestamps: true }
);

export const Agent = model<IAgent>('Agent', agentSchema);
