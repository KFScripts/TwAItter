import { Schema, model, Document } from 'mongoose';

export type AgentSourceKind = 'text' | 'markdown' | 'pdf' | 'url' | 'youtube' | 'youtube_channel';
export type AgentSourceStatus = 'processing' | 'ready' | 'failed';

export interface IAgentSource extends Document {
  agentUsername: string;
  kind: AgentSourceKind;
  title: string;
  sourceUrl?: string;
  fileName?: string;
  mimeType?: string;
  byteSize: number;
  content: string;
  contentHash: string;
  status: AgentSourceStatus;
  enabled: boolean;
  error?: string;
  wordCount: number;
  lastFetchedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const agentSourceSchema = new Schema<IAgentSource>(
  {
    agentUsername: { type: String, required: true, index: true },
    kind: {
      type: String,
      required: true,
      enum: ['text', 'markdown', 'pdf', 'url', 'youtube', 'youtube_channel']
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    sourceUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    byteSize: { type: Number, default: 0, min: 0 },
    content: { type: String, default: '', select: false },
    contentHash: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true
    },
    enabled: { type: Boolean, default: true, index: true },
    error: { type: String, default: '' },
    wordCount: { type: Number, default: 0, min: 0 },
    lastFetchedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, value: any) => {
        delete value.content;
        delete value.contentHash;
        return value;
      }
    }
  }
);

agentSourceSchema.index({ agentUsername: 1, createdAt: -1 });
agentSourceSchema.index(
  { agentUsername: 1, contentHash: 1 },
  {
    unique: true,
    partialFilterExpression: { contentHash: { $type: 'string', $gt: '' }, status: 'ready' }
  }
);
agentSourceSchema.index({ title: 'text', content: 'text' });

export const AgentSource = model<IAgentSource>('AgentSource', agentSourceSchema);
