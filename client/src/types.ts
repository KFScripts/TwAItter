export interface IUser {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  city: string;
  following: string[];
  verificationBadge?: 'none' | 'blue' | 'gold';
  isAdmin: boolean;
  createdAt: string;
}

export interface IAgent {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  age?: number;
  city?: string;
  profession?: string;
  accountType?: 'personal' | 'business' | 'software' | 'parody';
  verificationBadge?: 'none' | 'blue' | 'gold';
  personalityPrompt: string;
  physicalAppearance: string;
  memories: string[];
  modelConfig: {
    provider: string;
    modelName: string;
    apiKey?: string;
    baseUrl?: string;
    responseFormat?: string;
    temperature: number;
    maxTokens: number;
  };
  activityInterval: number;
  isActive: boolean;
  following: string[];
  reputation: number;
  mood: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReaction {
  agentUsername: string;
  type: 'like' | 'repost' | 'laugh' | 'angry' | 'fire' | 'clown';
  createdAt: string;
}

export interface IPost {
  _id: string;
  authorUsername: string;
  author?: {
    username: string;
    displayName: string;
    avatarUrl: string;
    bio?: string;
    mood?: string;
    city?: string;
    profession?: string;
    accountType?: 'personal' | 'business' | 'software' | 'parody';
    verificationBadge?: 'none' | 'blue' | 'gold';
  };
  content: string;
  mediaUrl?: string | null;
  replyToPostId?: string | null;
  rootPostId?: string | null;
  quotePostId?: string | null;
  reactions: IReaction[];
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IDirectMessage {
  _id: string;
  conversationId: string;
  senderUsername: string;
  recipientUsername: string;
  content: string;
  isRead: boolean;
  sender?: {
    username: string;
    displayName: string;
    avatarUrl: string;
    verificationBadge?: 'none' | 'blue' | 'gold';
  };
  recipient?: {
    username: string;
    displayName: string;
    avatarUrl: string;
    verificationBadge?: 'none' | 'blue' | 'gold';
  };
  createdAt: string;
  updatedAt: string;
}

export interface IConversation {
  conversationId: string;
  lastMessage: IDirectMessage;
  sender: {
    username: string;
    displayName: string;
    avatarUrl: string;
    verificationBadge?: 'none' | 'blue' | 'gold';
  };
  recipient: {
    username: string;
    displayName: string;
    avatarUrl: string;
    verificationBadge?: 'none' | 'blue' | 'gold';
  };
}

export interface ISupportTicket {
  _id: string;
  agentUsername: string;
  category: 'harassment' | 'hate_speech' | 'technical_bug' | 'existential_crisis' | 'misinformation' | 'moderation_appeal' | 'feature_request' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  targetUsername?: string;
  targetPostId?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  humanResponse?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  agent?: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  targetPost?: IPost;
}

export interface IModelConfigItem {
  provider: string;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  responseFormat?: string;
}

export interface ISettings {
  _id?: string;
  language: string;
  isSimulationActive: boolean;
  simulationTickMs: number;
  defaultProvider: string;
  defaultModel: string;
  defaultApiKey: string;
  defaultBaseUrl: string;
  defaultResponseFormat: string;
  textModelPool: IModelConfigItem[];
  visionProvider: string;
  visionModel: string;
  visionApiKey: string;
  visionBaseUrl: string;
  visionResponseFormat: string;
  imageProvider: string;
  imageModel: string;
  imageApiKey: string;
  imageBaseUrl: string;
  imageResponseFormat: string;
  autoTicketChance: number;
}

export interface IPlatformStats {
  activeAgents: number;
  totalPosts: number;
  totalDMs: number;
  pendingTickets: number;
  totalTickets: number;
}
