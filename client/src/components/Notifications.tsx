import React, { useState } from 'react';
import { INotification, IUser } from '../types';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { Bell, Heart, MessageSquare, AtSign, Mail, CheckCheck, Sparkles } from 'lucide-react';

interface NotificationsProps {
  notifications: INotification[];
  currentUser: IUser | null;
  onOpenPost: (postId: string) => void;
  onOpenDM: (conversationId: string) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  currentUser,
  onOpenPost,
  onOpenDM,
  onMarkAllRead,
  onMarkRead
}) => {
  const [filter, setFilter] = useState<'all' | 'mentions'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="w-5 h-5 text-sky-400 fill-sky-400/20" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-purple-400" />;
      case 'dm':
        return <Mail className="w-5 h-5 text-emerald-400" />;
      case 'reaction':
        return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
      default:
        return <Bell className="w-5 h-5 text-twitter-blue" />;
    }
  };

  const getNotificationTitle = (n: INotification) => {
    const name = n.sender?.displayName || n.senderUsername;
    switch (n.type) {
      case 'reply':
        return <span className="font-semibold text-white">@{n.senderUsername} ha risposto al tuo post</span>;
      case 'mention':
        return <span className="font-semibold text-white">@{n.senderUsername} ti ha menzionato</span>;
      case 'dm':
        return <span className="font-semibold text-white">@{n.senderUsername} ti ha inviato un messaggio privato</span>;
      case 'reaction':
        return <span className="font-semibold text-white">@{n.senderUsername} ha reagito al tuo post</span>;
      default:
        return <span className="font-semibold text-white">Nuova notifica da @{n.senderUsername}</span>;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const handleClickNotification = (n: INotification) => {
    if (!n.isRead) {
      onMarkRead(n._id);
    }
    if (n.postId) {
      onOpenPost(n.postId);
    } else if (n.conversationId) {
      onOpenDM(n.conversationId);
    }
  };

  return (
    <div className="flex flex-col min-h-screen border-r border-twitter-border pb-20 select-none">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-black/80 border-b border-twitter-border px-4 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Notifiche</span>
            <Sparkles className="w-4 h-4 text-twitter-blue" />
          </h1>
          <p className="text-xs text-twitter-muted">Rimani aggiornato su risposte, menzioni e messaggi</p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-twitter-blue hover:text-white bg-twitter-blue/10 hover:bg-twitter-blue/20 px-3 py-1.5 rounded-full border border-twitter-blue/30 transition"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Segna tutte come lette</span>
          </button>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-twitter-border bg-black">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-3 text-sm font-bold text-center transition relative ${
            filter === 'all' ? 'text-white' : 'text-twitter-muted hover:text-gray-300'
          }`}
        >
          Tutte ({notifications.length})
          {filter === 'all' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-twitter-blue rounded-full" />
          )}
        </button>
        <button
          onClick={() => setFilter('mentions')}
          className={`flex-1 py-3 text-sm font-bold text-center transition relative ${
            filter === 'mentions' ? 'text-white' : 'text-twitter-muted hover:text-gray-300'
          }`}
        >
          Menzioni (@) ({notifications.filter((n) => n.type === 'mention').length})
          {filter === 'mentions' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-twitter-blue rounded-full" />
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-twitter-border">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-twitter-muted">
            <div className="w-16 h-16 rounded-full bg-[#16181c] flex items-center justify-center mb-4 text-twitter-muted">
              <Bell className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nessuna notifica</h3>
            <p className="text-sm max-w-sm">
              {filter === 'mentions'
                ? 'Nessuno ti ha ancora taggato nei post. Quando qualcuno scrive @' + (currentUser?.username || 'tuonome') + ', lo troverai qui.'
                : 'Quando riceverai risposte, reazioni, menzioni o messaggi privati, appariranno qui.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClickNotification(n)}
              className={`p-4 flex items-start gap-3.5 hover:bg-[#16181c]/70 cursor-pointer transition relative ${
                !n.isRead ? 'bg-twitter-blue/[0.04]' : ''
              }`}
            >
              {/* Unread indicator dot */}
              {!n.isRead && (
                <div className="absolute left-2 top-6 w-2 h-2 rounded-full bg-twitter-blue shadow-lg shadow-twitter-blue/50" />
              )}

              {/* Type Icon */}
              <div className="flex-shrink-0 mt-0.5 pl-2">{getNotificationIcon(n.type)}</div>

              {/* Content Box */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar
                    src={n.sender?.avatarUrl || ''}
                    alt={n.sender?.displayName || n.senderUsername}
                    className="w-8 h-8 flex-shrink-0"
                  />
                  <div className="flex flex-col leading-tight min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-white truncate hover:underline">
                        {n.sender?.displayName || n.senderUsername}
                      </span>
                      <VerifiedBadge type={n.sender?.verificationBadge || 'none'} size={13} />
                      <span className="text-xs text-twitter-muted font-mono">@{n.senderUsername}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-1">{getNotificationTitle(n)}</div>

                {n.content && (
                  <p className="text-sm text-gray-200 bg-[#16181c] p-2.5 rounded-xl border border-twitter-border/50 break-words mt-1">
                    "{n.content}"
                  </p>
                )}

                <div className="text-[11px] text-twitter-muted mt-2 font-mono">{formatTimestamp(n.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
