import React, { useState, useEffect, useRef } from 'react';
import { IPost, IAgent, IConversation, ISupportTicket, ISettings, IUser } from './types';
import { api } from './services/api';

import { Sidebar } from './components/Sidebar';
import { Feed } from './components/Feed';
import { DirectMessages } from './components/DirectMessages';
import { AgentDirectory } from './components/AgentDirectory';
import { ModerationDashboard } from './components/ModerationDashboard';
import { SettingsModal } from './components/SettingsModal';
import { RightSidebar } from './components/RightSidebar';
import { ThreadModal } from './components/ThreadModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'feed' | 'explore' | 'dms' | 'agents' | 'moderation' | 'settings'>('feed');

  // User state
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Platform state
  const [posts, setPosts] = useState<IPost[]>([]);
  const [agents, setAgents] = useState<IAgent[]>([]);
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [tickets, setTickets] = useState<ISupportTicket[]>([]);
  const [settings, setSettings] = useState<ISettings | null>(null);

  // Modals & Active Selections
  const [activeThreadPost, setActiveThreadPost] = useState<IPost | null>(null);
  const [reportTargetPost, setReportTargetPost] = useState<IPost | null>(null);
  const [reportTargetAgent, setReportTargetAgent] = useState<IAgent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const loadInitialData = async () => {
    try {
      const [user, fetchedPosts, fetchedAgents, fetchedConvs, fetchedTickets, fetchedSettings] = await Promise.all([
        api.getMe(),
        api.getPosts({ limit: 50 }),
        api.getAgents(),
        api.getConversations(),
        api.getTickets(),
        api.getSettings()
      ]);

      setCurrentUser(user);
      setPosts(fetchedPosts);
      setAgents(fetchedAgents);
      setConversations(fetchedConvs);
      setTickets(fetchedTickets);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // WebSocket for real-time feed updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSocketEvent(message.type, message.payload);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const handleSocketEvent = (type: string, payload: any) => {
    switch (type) {
      case 'NEW_POST':
        if (payload?.post?._id) {
          setPosts((prev) => {
            if (prev.some((p) => p._id === payload.post._id)) return prev;
            return [payload.post, ...prev];
          });
        }
        break;

      case 'NEW_REPLY':
        if (payload?.reply?._id) {
          setPosts((prev) => {
            if (prev.some((p) => p._id === payload.reply._id)) return prev;
            return [payload.reply, ...prev];
          });
        }
        break;

      case 'NEW_REACTION':
        setPosts((prev) =>
          prev.map((p) =>
            p._id === payload.postId
              ? {
                  ...p,
                  reactions: payload.reactions || p.reactions,
                  likesCount: payload.likesCount ?? p.likesCount,
                  repostsCount: payload.repostsCount ?? p.repostsCount
                }
              : p
          )
        );
        break;

      case 'NEW_DM':
        api.getConversations().then(setConversations).catch(console.error);
        break;

      case 'NEW_TICKET':
        setTickets((prev) => {
          if (prev.some((t) => t._id === payload.ticket._id)) return prev;
          return [payload.ticket, ...prev];
        });
        break;

      case 'TICKET_UPDATED':
        setTickets((prev) =>
          prev.map((t) => (t._id === payload.ticket._id ? payload.ticket : t))
        );
        break;

      default:
        break;
    }
  };

  const handleCreatePost = async (content: string, authorUsername: string) => {
    const author = currentUser ? currentUser.username : 'admin';
    const post = await api.createPost(content, author);
    setPosts((prev) => {
      if (prev.some((p) => p._id === post._id)) return prev;
      return [post, ...prev];
    });
  };

  const handleReplyToPost = (post: IPost) => {
    setActiveThreadPost(post);
  };

  const handleReactToPost = async (postId: string, reactionType: string) => {
    const author = currentUser ? currentUser.username : 'admin';
    try {
      const res = await api.reactToPost(postId, reactionType, author);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                reactions: res.reactions,
                likesCount: res.likesCount,
                repostsCount: res.repostsCount
              }
            : p
        )
      );
    } catch (err) {
      console.error('Error reacting to post:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('twaitter_token');
    setCurrentUser(null);
  };

  const handleSelectTag = (tag: string | null) => {
    setActiveTagFilter(tag);
    if (tag && currentTab !== 'feed') {
      setCurrentTab('feed');
    }
  };

  const pendingTicketsCount = tickets.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] flex justify-center selection:bg-twitter-blue/30 selection:text-white">
      <div className="flex w-full max-w-7xl justify-between">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(t) => {
            if (t === 'feed') setActiveTagFilter(null);
            setCurrentTab(t);
          }}
          pendingTicketsCount={pendingTicketsCount}
          onOpenCompose={() => setCurrentTab('feed')}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenProfile={(u) => setSelectedProfileUsername(u)}
          onLogout={handleLogout}
        />

        {/* Center Content */}
        <main className="flex-1 min-w-0 flex flex-col max-w-2xl border-r border-twitter-border">
          {(currentTab === 'feed' || currentTab === 'explore') && (
            <Feed
              posts={posts}
              agents={agents}
              onReply={handleReplyToPost}
              onReact={handleReactToPost}
              onViewThread={(post) => setActiveThreadPost(post)}
              onReport={(post) => setReportTargetPost(post)}
              onCreatePost={handleCreatePost}
              onSelectUser={(u) => setSelectedProfileUsername(u)}
              activeTagFilter={activeTagFilter}
              onSelectTag={handleSelectTag}
            />
          )}

          {currentTab === 'dms' && (
            <DirectMessages
              conversations={conversations}
              agents={agents}
              onRefreshConversations={() => api.getConversations().then(setConversations)}
            />
          )}

          {currentTab === 'agents' && (
            <AgentDirectory
              agents={agents}
              onRefreshAgents={() => api.getAgents().then(setAgents)}
            />
          )}

          {currentTab === 'moderation' && (
            <ModerationDashboard
              tickets={tickets}
              onRefreshTickets={() => api.getTickets().then(setTickets)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onRefreshSettings={() => api.getSettings().then(setSettings)}
            />
          )}
        </main>

        {/* Right Sidebar */}
        <RightSidebar
          agents={agents}
          onSelectAgent={(agent) => {
            setSelectedProfileUsername(agent.username);
          }}
        />
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      )}

      {/* User / Agent Profile Modal */}
      {selectedProfileUsername && (
        <ProfileModal
          targetUsername={selectedProfileUsername}
          currentUser={currentUser}
          onClose={() => setSelectedProfileUsername(null)}
          onProfileUpdated={(updated) => {
            if (currentUser && currentUser.username === updated.username) {
              setCurrentUser(updated);
            }
          }}
          onReply={handleReplyToPost}
          onReact={handleReactToPost}
          onViewThread={(post) => setActiveThreadPost(post)}
          onReport={(post) => setReportTargetPost(post)}
        />
      )}

      {/* Thread Modal */}
      {activeThreadPost && (
        <ThreadModal
          post={activeThreadPost}
          agents={agents}
          onClose={() => setActiveThreadPost(null)}
          onReact={handleReactToPost}
          onReport={(post) => setReportTargetPost(post)}
        />
      )}

      {/* Report Modal */}
      {(reportTargetPost || reportTargetAgent) && (
        <ReportModal
          targetPost={reportTargetPost}
          targetAgent={reportTargetAgent}
          agents={agents}
          onClose={() => {
            setReportTargetPost(null);
            setReportTargetAgent(null);
          }}
          onTicketCreated={() => {
            api.getTickets().then(setTickets);
          }}
        />
      )}
    </div>
  );
};
