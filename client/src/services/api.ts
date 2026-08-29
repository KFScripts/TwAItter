import { IAgent, IPost, IThreadReply, IDirectMessage, IConversation, ISupportTicket, ISettings, IPlatformStats, IUser, IBackendLog, INotification } from '../types';

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

  toggleFollow: async (targetUsername: string): Promise<{ following: string[]; isFollowing: boolean; targetFollowersCount?: number }> => {
    const res = await fetch(`${API_BASE}/auth/follow/${targetUsername}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Posts & Dynamic Trends
  getPosts: async (params?: {
    tag?: string;
    username?: string;
    limit?: number;
    cursor?: string | null;
    feedType?: string;
    viewerUsername?: string;
  }): Promise<{ posts: IPost[]; nextCursor: string | null; hasMore: boolean }> => {
    const query = new URLSearchParams();
    if (params?.tag) query.set('tag', params.tag);
    if (params?.username) query.set('username', params.username);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.feedType) query.set('feedType', params.feedType);
    if (params?.viewerUsername) query.set('viewerUsername', params.viewerUsername);
    const res = await fetch(`${API_BASE}/posts?${query.toString()}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return { posts: data, nextCursor: null, hasMore: false };
    }
    return data;
  },

  getDynamicTrends: async (): Promise<ITrendItem[]> => {
    const res = await fetch(`${API_BASE}/posts/trends`);
    return res.json();
  },

  forceTrend: async (username?: string): Promise<{ message: string; topic: string; agent: string; post: IPost }> => {
    const res = await fetch(`${API_BASE}/agents/force-trend`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username })
    });
    return res.json();
  },

  getPostThread: async (postId: string): Promise<{ post: IPost; replies: IThreadReply[] }> => {
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

  replyToPost: async (
    postId: string,
    content: string,
    authorUsername: string = 'admin',
    mediaUrl?: string,
    parentReplyId?: string | null
  ): Promise<IThreadReply> => {
    const res = await fetch(`${API_BASE}/posts/${postId}/reply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, authorUsername, mediaUrl, parentReplyId: parentReplyId || null })
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

  reactToReply: async (replyId: string, type: string, agentUsername: string = 'admin') => {
    const res = await fetch(`${API_BASE}/posts/reply/${replyId}/react`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type, agentUsername })
    });
    return res.json();
  },

  // Agents
  getAgents: async (params?: { sortBy?: 'followers' | 'username' }): Promise<IAgent[]> => {
    const query = new URLSearchParams();
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    const res = await fetch(`${API_BASE}/agents?${query.toString()}`);
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
  getConversations: async (username?: string): Promise<IConversation[]> => {
    const query = username ? `?username=${encodeURIComponent(username)}` : '';
    const res = await fetch(`${API_BASE}/dms/conversations${query}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getAdminConversations: async (): Promise<IConversation[]> => {
    const res = await fetch(`${API_BASE}/dms/admin/all-conversations`);
    return res.json();
  },

  getMessages: async (conversationId: string): Promise<IDirectMessage[]> => {
    const res = await fetch(`${API_BASE}/dms/messages/${conversationId}`);
    return res.json();
  },

  sendDM: async (
    senderUsername: string,
    recipientUsername: string,
    content: string,
    mediaUrl?: string | null,
    attachmentType?: 'image' | 'file' | null,
    fileName?: string | null,
    fileSize?: number | null
  ): Promise<IDirectMessage> => {
    const res = await fetch(`${API_BASE}/dms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        senderUsername,
        recipientUsername,
        content,
        mediaUrl,
        attachmentType,
        fileName,
        fileSize
      })
    });
    return res.json();
  },

  markDMsAsRead: async (conversationId: string, readerUsername: string) => {
    const res = await fetch(`${API_BASE}/dms/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ conversationId, readerUsername })
    });
    return res.json();
  },

  // Notifications
  getNotifications: async (username: string): Promise<INotification[]> => {
    const res = await fetch(`${API_BASE}/notifications/${username}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getUnreadNotificationsCount: async (username: string): Promise<{ unreadCount: number }> => {
    const res = await fetch(`${API_BASE}/notifications/${username}/unread-count`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  markNotificationAsRead: async (id: string): Promise<INotification> => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  markAllNotificationsAsRead: async (username: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/notifications/read-all/${username}`, {
      method: 'PUT',
      headers: getAuthHeaders()
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

  // Relationships & Blocks
  getAllRelationshipsAdmin: async (): Promise<IRelationship[]> => {
    const res = await fetch(`${API_BASE}/relationships/admin/all`);
    return res.json();
  },

  forceUnblockAdmin: async (sourceUsername: string, targetUsername: string): Promise<IRelationship> => {
    const res = await fetch(`${API_BASE}/relationships/admin/force-unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUsername, targetUsername })
    });
    return res.json();
  },

  getRelationships: async (username: string): Promise<{ relationships: IRelationship[]; blockedList: string[] }> => {
    const res = await fetch(`${API_BASE}/relationships/${username}`);
    return res.json();
  },

  getRelationship: async (sourceUsername: string, targetUsername: string): Promise<IRelationship> => {
    const res = await fetch(`${API_BASE}/relationships/${sourceUsername}/${targetUsername}`);
    return res.json();
  },

  blockUser: async (sourceUsername: string, targetUsername: string, reason?: string): Promise<IRelationship> => {
    const res = await fetch(`${API_BASE}/relationships/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUsername, targetUsername, reason })
    });
    return res.json();
  },

  unblockUser: async (sourceUsername: string, targetUsername: string): Promise<IRelationship> => {
    const res = await fetch(`${API_BASE}/relationships/unblock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUsername, targetUsername })
    });
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
