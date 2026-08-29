import React, { useState, useEffect, useRef } from 'react';
import { IPost, IThreadReply, IAgent, IConversation, ISupportTicket, ISettings, IUser, IBackendLog, INotification, IDirectMessage } from './types';
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
import { Notifications } from './components/Notifications';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'feed' | 'explore' | 'notifications' | 'dms' | 'agents' | 'moderation' | 'settings'>('feed');

  // User state
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<IUser[]>(() => {
    try {
      const saved = localStorage.getItem('twaitter_saved_accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Platform state
  const [posts, setPosts] = useState<IPost[]>([]);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following'>('for_you');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [agents, setAgents] = useState<IAgent[]>([]);
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [tickets, setTickets] = useState<ISupportTicket[]>([]);
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [backendLogs, setBackendLogs] = useState<IBackendLog[]>([]);

  // Real-time DM states
  const [incomingDm, setIncomingDm] = useState<IDirectMessage | null>(null);
  const [typingStatus, setTypingStatus] = useState<{ conversationId: string; username: string; isTyping: boolean } | null>(null);
  const [dmStatusUpdate, setDmStatusUpdate] = useState<{ conversationId: string; messageId?: string; readerUsername?: string; status: 'sent' | 'delivered' | 'read'; readAt?: string; deliveredAt?: string } | null>(null);
  const [lastBlockEvent, setLastBlockEvent] = useState<{ sourceUsername: string; targetUsername: string; type: 'block' | 'unblock' } | null>(null);

  // Modals & Active Selections
  const [activeThreadPost, setActiveThreadPost] = useState<IPost | null>(null);
  const [liveThreadReply, setLiveThreadReply] = useState<IThreadReply | null>(null);
  const [reportTargetPost, setReportTargetPost] = useState<IPost | null>(null);
  const [reportTargetAgent, setReportTargetAgent] = useState<IAgent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const backendLogsRef = useRef<IBackendLog[]>([]);
  const logBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPostsFeed = async (cursor: string | null = null, reset: boolean = true, tabOverride?: 'for_you' | 'following') => {
    try {
      const activeFeed = tabOverride || feedTab;
      const res = await api.getPosts({
        limit: 20,
        cursor,
        feedType: activeFeed,
        viewerUsername: currentUser?.username,
        tag: activeTagFilter || undefined,
        search: searchQuery || undefined
      });

      if (reset) {
        setPosts(res.posts || []);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p._id)));
          const uniqueNew = (res.posts || []).filter((p) => !existingIds.has(String(p._id)));
          return [...prev, ...uniqueNew];
        });
      }
      setNextCursor(res.nextCursor || null);
      setHasMore(res.hasMore || false);
    } catch (err) {
      console.error('Error fetching posts chunk:', err);
    }
  };

  const handleLoadMorePosts = async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      await fetchPostsFeed(nextCursor, false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFeedTabChange = (newTab: 'for_you' | 'following') => {
    setFeedTab(newTab);
    fetchPostsFeed(null, true, newTab);
  };

  const loadInitialData = async () => {
    try {
      const user = await api.getMe();
      const [fetchedFeed, fetchedAgents, fetchedConvs, fetchedTickets, fetchedSettings, fetchedLogs] = await Promise.all([
        api.getPosts({ limit: 20, feedType: 'for_you', viewerUsername: user?.username }),
        api.getAgents({ sortBy: 'followers' }),
        api.getConversations(user?.username),
        api.getTickets(),
        api.getSettings(),
        api.getBackendLogs().catch(() => [] as IBackendLog[])
      ]);

      setCurrentUser(user);
      if (user) {
        setSavedAccounts((prev) => {
          const filtered = prev.filter((a) => a.username !== user.username);
          const updated = [user, ...filtered];
          localStorage.setItem('twaitter_saved_accounts', JSON.stringify(updated));
          return updated;
        });
      }
      setPosts(fetchedFeed.posts || []);
      setNextCursor(fetchedFeed.nextCursor || null);
      setHasMore(fetchedFeed.hasMore || false);

      setAgents(fetchedAgents);
      setConversations(fetchedConvs);
      setTickets(fetchedTickets);
      setSettings(fetchedSettings);
      backendLogsRef.current = fetchedLogs;
      setBackendLogs(fetchedLogs);

      if (user?.username) {
        api.getNotifications(user.username)
          .then(setNotifications)
          .catch(console.error);
        api.getUnreadNotificationsCount(user.username)
          .then((res) => setUnreadNotificationsCount(res.unreadCount))
          .catch(console.error);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Sync logs when switching to settings tab
  useEffect(() => {
    if (currentTab === 'settings') {
      setBackendLogs([...backendLogsRef.current]);
    }
  }, [currentTab]);

  const handleSocketEventRef = useRef<(type: string, payload: any) => void>(() => {});

  // WebSocket for real-time feed updates (persistent across tab changes)
  useEffect(() => {
    let isUnmounted = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      if (isUnmounted) return;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSocketEventRef.current(message.type, message.payload);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          setTimeout(connectWs, 2000);
        }
      };
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (logBatchTimerRef.current) {
        clearTimeout(logBatchTimerRef.current);
      }
    };
  }, []);

  const handleSocketEvent = (type: string, payload: any) => {
    switch (type) {
      case 'NEW_POST':
        if (payload?.post?._id) {
          setPosts((prev) => {
            if (prev.some((p) => String(p._id) === String(payload.post._id))) return prev;
            return [payload.post, ...prev];
          });
        }
        break;

      case 'NEW_REPLY':
        if (payload?.reply?._id) {
          const rawPostId = payload.postId || payload.reply?.postId;
          const postId = typeof rawPostId === 'object' && rawPostId !== null
            ? String(rawPostId._id || rawPostId)
            : String(rawPostId || '');

          setPosts((prev) =>
            prev.map((p) =>
              String(p._id) === postId
                ? { ...p, repliesCount: (p.repliesCount || 0) + 1 }
                : p
            )
          );
          setLiveThreadReply(payload.reply);
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
        if (payload?.message) {
          if (currentUser && (payload.message.senderUsername === currentUser.username || payload.message.recipientUsername === currentUser.username)) {
            setIncomingDm(payload.message);
            api.getConversations(currentUser.username).then(setConversations).catch(console.error);
          }
        }
        break;

      case 'NEW_NOTIFICATION':
        if (payload?.notification) {
          if (currentUser && payload.recipientUsername === currentUser.username) {
            setNotifications((prev) => [payload.notification, ...prev]);
            setUnreadNotificationsCount((c) => c + 1);
          }
        }
        break;

      case 'AGENT_TYPING':
        if (payload) {
          setTypingStatus(payload);
        }
        break;

      case 'DM_STATUS_UPDATED':
        if (payload) {
          setDmStatusUpdate(payload);
        }
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

      case 'BACKEND_LOG':
        if (payload?.id) {
          if (!backendLogsRef.current.some((l) => l.id === payload.id)) {
            backendLogsRef.current = [...backendLogsRef.current, payload as IBackendLog];
            if (backendLogsRef.current.length > 500) {
              backendLogsRef.current = backendLogsRef.current.slice(backendLogsRef.current.length - 500);
            }
          }
          if (currentTab === 'settings' && !logBatchTimerRef.current) {
            logBatchTimerRef.current = setTimeout(() => {
              setBackendLogs([...backendLogsRef.current]);
              logBatchTimerRef.current = null;
            }, 500);
          }
        }
        break;

      case 'USER_BLOCKED':
      case 'USER_UNBLOCKED':
        setLastBlockEvent({
          sourceUsername: payload?.sourceUsername,
          targetUsername: payload?.targetUsername,
          type: type === 'USER_BLOCKED' ? 'block' : 'unblock'
        });
        if (currentUser && (payload?.sourceUsername === currentUser.username || payload?.targetUsername === currentUser.username)) {
          api.getPosts({ limit: 50, onlyRoots: true, viewerUsername: currentUser.username })
            .then((result) => setPosts(result.posts || []))
            .catch(console.error);
        }
        api.getConversations().then(setConversations).catch(console.error);
        break;

      default:
        break;
    }
  };

  handleSocketEventRef.current = handleSocketEvent;

  const handleCreatePost = async (content: string, authorUsername: string, mediaUrl?: string) => {
    const author = currentUser ? currentUser.username : (authorUsername || 'guest');
    const post = await api.createPost(content, author, mediaUrl);
    setPosts((prev) => {
      if (prev.some((p) => p._id === post._id)) return prev;
      return [post, ...prev];
    });
  };

  const handleReplyToPost = (post: IPost) => {
    setActiveThreadPost(post);
  };

  const handleReactToPost = async (postId: string, reactionType: string) => {
    const author = currentUser ? currentUser.username : 'guest';
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

  const handleSwitchAccount = async (targetUser: IUser) => {
    localStorage.setItem('twaitter_token', targetUser.username);
    setCurrentUser(targetUser);
    try {
      const [fetchedConvs, fetchedFeed, fetchedAgents] = await Promise.all([
        api.getConversations(targetUser.username),
        api.getPosts({ limit: 20, feedType: feedTab, viewerUsername: targetUser.username }),
        api.getAgents({ sortBy: 'followers' })
      ]);
      setConversations(fetchedConvs);
      setPosts(fetchedFeed.posts || []);
      setNextCursor(fetchedFeed.nextCursor || null);
      setHasMore(fetchedFeed.hasMore || false);
      setAgents(fetchedAgents);
      api.getNotifications(targetUser.username).then(setNotifications).catch(console.error);
      api.getUnreadNotificationsCount(targetUser.username).then((res) => setUnreadNotificationsCount(res.unreadCount)).catch(console.error);
    } catch (e) {
      console.error('Error switching account:', e);
    }
  };

  const handleLoginSuccess = async (user: IUser) => {
    setSavedAccounts((prev) => {
      const filtered = prev.filter((a) => a.username !== user.username);
      const updated = [user, ...filtered];
      localStorage.setItem('twaitter_saved_accounts', JSON.stringify(updated));
      return updated;
    });
    await handleSwitchAccount(user);
  };

  const handleLogout = async () => {
    const updated = savedAccounts.filter((a) => a.username !== currentUser?.username);
    setSavedAccounts(updated);
    localStorage.setItem('twaitter_saved_accounts', JSON.stringify(updated));

    if (updated.length > 0) {
      await handleSwitchAccount(updated[0]);
    } else {
      localStorage.removeItem('twaitter_token');
      setCurrentUser(null);
      setConversations([]);
      setNotifications([]);
      setUnreadNotificationsCount(0);
      const fetchedFeed = await api.getPosts({ limit: 20, feedType: 'for_you' });
      setPosts(fetchedFeed.posts || []);
      setNextCursor(fetchedFeed.nextCursor || null);
      setHasMore(fetchedFeed.hasMore || false);
    }
  };

  const handleSelectTag = (tag: string | null) => {
    setActiveTagFilter(tag);
    if (tag && currentTab !== 'feed' && currentTab !== 'explore') {
      setCurrentTab('feed');
    }
  };

  const handleToggleFollow = async (targetUsername: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.toggleFollow(targetUsername);
      setCurrentUser((prev) => (prev ? { ...prev, following: res.following } : null));
      setAgents((prev) =>
        prev.map((a) =>
          a.username === targetUsername && res.targetFollowersCount !== undefined
            ? { ...a, followersCount: res.targetFollowersCount }
            : a
        )
      );
      if (feedTab === 'following') {
        fetchPostsFeed(null, true, 'following');
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  useEffect(() => {
    if (currentTab === 'feed' || currentTab === 'explore') {
      const timer = setTimeout(() => {
        fetchPostsFeed(null, true);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeTagFilter, searchQuery]);

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser?.username) return;
    try {
      await api.markAllNotificationsAsRead(currentUser.username);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleOpenPostFromNotification = async (postId: string) => {
    try {
      const thread = await api.getPostThread(postId);
      if (thread && thread.post) {
        setActiveThreadPost(thread.post);
      }
    } catch (err) {
      console.error('Error opening post from notification:', err);
    }
  };

  const handleOpenDMFromNotification = (conversationId: string) => {
    setCurrentTab('dms');
    api.getConversations(currentUser?.username).then(setConversations).catch(console.error);
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
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenCompose={() => setCurrentTab('feed')}
          currentUser={currentUser}
          savedAccounts={savedAccounts}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenProfile={(u) => setSelectedProfileUsername(u)}
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
        />

        {/* Center Content */}
        <main
          className={`flex-1 min-w-0 flex flex-col ${
            currentTab === 'dms' ? 'max-w-5xl' : 'max-w-2xl'
          } border-r border-twitter-border`}
        >
          {(currentTab === 'feed' || currentTab === 'explore') && (
            <Feed
              posts={posts}
              agents={agents}
              currentUser={currentUser}
              onReply={handleReplyToPost}
              onReact={handleReactToPost}
              onViewThread={(post) => setActiveThreadPost(post)}
              onReport={(post) => setReportTargetPost(post)}
              onCreatePost={handleCreatePost}
              onSelectUser={(u) => setSelectedProfileUsername(u)}
              activeTagFilter={activeTagFilter}
              onSelectTag={handleSelectTag}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleFollow={handleToggleFollow}
              onOpenAuth={() => setShowAuthModal(true)}
              isExploreView={currentTab === 'explore'}
              activeTab={feedTab}
              onTabChange={handleFeedTabChange}
              onLoadMore={handleLoadMorePosts}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
          )}

          {currentTab === 'notifications' && (
            <Notifications
              notifications={notifications}
              currentUser={currentUser}
              onOpenPost={handleOpenPostFromNotification}
              onOpenDM={handleOpenDMFromNotification}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onMarkRead={handleMarkNotificationRead}
            />
          )}

          {currentTab === 'dms' && (
            <DirectMessages
              conversations={conversations}
              agents={agents}
              currentUser={currentUser}
              onRefreshConversations={() => api.getConversations(currentUser?.username).then(setConversations)}
              onSelectUser={(u) => setSelectedProfileUsername(u)}
              incomingDm={incomingDm}
              typingStatus={typingStatus}
              dmStatusUpdate={dmStatusUpdate}
              lastBlockEvent={lastBlockEvent}
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
              backendLogs={backendLogs}
              onClearBackendLogs={() => {
                setBackendLogs([]);
                backendLogsRef.current = [];
                api.clearBackendLogs().catch(console.error);
              }}
            />
          )}
        </main>

        {/* Right Sidebar (Hidden in DMs for standard Twitter full-width layout) */}
        {currentTab !== 'dms' && (
          <RightSidebar
            agents={agents}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectTag={handleSelectTag}
            onSelectAgent={(agent) => {
              setSelectedProfileUsername(agent.username);
            }}
            onToggleFollow={handleToggleFollow}
          />
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
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
          currentUser={currentUser}
          onClose={() => {
            setActiveThreadPost(null);
            setLiveThreadReply(null);
          }}
          onReact={handleReactToPost}
          onReport={(post) => setReportTargetPost(post)}
          onSelectUser={(u) => setSelectedProfileUsername(u)}
          onSelectTag={handleSelectTag}
          liveReply={liveThreadReply}
        />
      )}

      {/* Report Modal */}
      {(reportTargetPost || reportTargetAgent) && (
        <ReportModal
          targetPost={reportTargetPost}
          targetAgent={reportTargetAgent}
          currentUser={currentUser}
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
