import { IAgent, IPost, IDirectMessage, IConversation, ISupportTicket, ISettings, IPlatformStats, IUser, IBackendLog } from '../types';

const API_BASE = '/api';

export interface ITrendItem {
  category: string;
  topic: string;
  posts: string;
  postCount: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('twaitter_token') || '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-username'] = token;
  }
  return headers;
}

export const api = {
  // Auth
  register: async (data: any): Promise<{ user: IUser; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Errore durante la registrazione');
    }
    const result = await res.json();
    localStorage.setItem('twaitter_token', result.token);
    return result;
  },

  login: async (usernameOrEmail: string, password: string): Promise<{ user: IUser; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Credenziali non valide');
    }
    const result = await res.json();
    localStorage.setItem('twaitter_token', result.token);
    return result;
  },

  getMe: async (): Promise<IUser | null> => {
    const token = localStorage.getItem('twaitter_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  updateProfile: async (data: Partial<IUser>): Promise<IUser> => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  toggleFollow: async (targetUsername: string): Promise<{ following: string[]; isFollowing: boolean }> => {
    const res = await fetch(`${API_BASE}/auth/follow/${targetUsername}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Posts & Dynamic Trends
  getPosts: async (params?: { tag?: string; username?: string; onlyRoots?: boolean; limit?: number }): Promise<IPost[]> => {
    const query = new URLSearchParams();
    if (params?.tag) query.set('tag', params.tag);
    if (params?.username) query.set('username', params.username);
    if (params?.onlyRoots) query.set('onlyRoots', 'true');
    if (params?.limit) query.set('limit', params.limit.toString());
    const res = await fetch(`${API_BASE}/posts?${query.toString()}`);
    return res.json();
  },

  getDynamicTrends: async (): Promise<ITrendItem[]> => {
    const res = await fetch(`${API_BASE}/posts/trends`);
    return res.json();
  },

  getPostThread: async (postId: string): Promise<IPost[]> => {
    const res = await fetch(`${API_BASE}/posts/${postId}/thread`);
    return res.json();
  },

  createPost: async (content: string, authorUsername: string = 'admin', mediaUrl?: string): Promise<IPost> => {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, authorUsername, mediaUrl })
    });
    return res.json();
  },

  replyToPost: async (postId: string, content: string, authorUsername: string = 'admin', mediaUrl?: string): Promise<IPost> => {
    const res = await fetch(`${API_BASE}/posts/${postId}/reply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, authorUsername, mediaUrl })
    });
    return res.json();
  },

  reactToPost: async (postId: string, type: string, agentUsername: string = 'admin') => {
    const res = await fetch(`${API_BASE}/posts/${postId}/react`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type, agentUsername })
    });
    return res.json();
  },

  // Agents
  getAgents: async (): Promise<IAgent[]> => {
    const res = await fetch(`${API_BASE}/agents`);
    return res.json();
  },

  populate50Agents: async () => {
    const res = await fetch(`${API_BASE}/agents/populate-50`, { method: 'POST' });
    return res.json();
  },

  generateSingleAgent: async (): Promise<IAgent> => {
    const res = await fetch(`${API_BASE}/agents/generate-single`, { method: 'POST' });
    return res.json();
  },

  getAgent: async (username: string): Promise<IAgent> => {
    const res = await fetch(`${API_BASE}/agents/${username}`);
    return res.json();
  },

  createAgent: async (data: Partial<IAgent>): Promise<IAgent> => {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateAgent: async (username: string, data: Partial<IAgent>): Promise<IAgent> => {
    const res = await fetch(`${API_BASE}/agents/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteAgent: async (username: string) => {
    const res = await fetch(`${API_BASE}/agents/${username}`, { method: 'DELETE' });
    return res.json();
  },

  triggerAgentTurn: async (username: string) => {
    const res = await fetch(`${API_BASE}/agents/${username}/trigger`, { method: 'POST' });
    return res.json();
  },

  // DMs
  getConversations: async (): Promise<IConversation[]> => {
    const res = await fetch(`${API_BASE}/dms/conversations`);
    return res.json();
  },

  getMessages: async (conversationId: string): Promise<IDirectMessage[]> => {
    const res = await fetch(`${API_BASE}/dms/messages/${conversationId}`);
    return res.json();
  },

  sendDM: async (senderUsername: string, recipientUsername: string, content: string): Promise<IDirectMessage> => {
    const res = await fetch(`${API_BASE}/dms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ senderUsername, recipientUsername, content })
    });
    return res.json();
  },

  // Tickets
  getTickets: async (filter?: { status?: string; category?: string }): Promise<ISupportTicket[]> => {
    const query = new URLSearchParams();
    if (filter?.status) query.set('status', filter.status);
    if (filter?.category) query.set('category', filter.category);
    const res = await fetch(`${API_BASE}/tickets?${query.toString()}`);
    return res.json();
  },

  resolveTicket: async (ticketId: string, status: string, humanResponse: string): Promise<ISupportTicket> => {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, humanResponse })
    });
    return res.json();
  },

  createTicket: async (data: Partial<ISupportTicket>): Promise<ISupportTicket> => {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<ISettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateSettings: async (data: Partial<ISettings>): Promise<ISettings> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  toggleSimulation: async (enable: boolean) => {
    const res = await fetch(`${API_BASE}/settings/toggle-simulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable })
    });
    return res.json();
  },

  triggerTick: async (username?: string) => {
    const res = await fetch(`${API_BASE}/settings/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return res.json();
  },

  getStats: async (): Promise<IPlatformStats> => {
    const res = await fetch(`${API_BASE}/settings/stats`);
    return res.json();
  },

  getBackendLogs: async (): Promise<IBackendLog[]> => {
    const res = await fetch(`${API_BASE}/settings/logs`);
    const data = await res.json();
    return data.logs || [];
  },

  clearBackendLogs: async (): Promise<void> => {
    await fetch(`${API_BASE}/settings/logs/clear`, { method: 'POST' });
  },

  stopBackend: async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/settings/backend/stop`, { method: 'POST' });
    return res.json();
  },

  restartBackend: async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/settings/backend/restart`, { method: 'POST' });
    return res.json();
  },

  waitForBackend: async (timeoutMs = 25000): Promise<boolean> => {
    const started = Date.now();
    await new Promise((r) => setTimeout(r, 1200));
    while (Date.now() - started < timeoutMs) {
      try {
        const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        if (res.ok) return true;
      } catch {
        // still down
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    return false;
  }
};
