import React, { useState, useEffect } from 'react';
import { IAgent, IUser } from '../types';
import { api, ITrendItem } from '../services/api';
import { Search, MoreHorizontal, X } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { Avatar } from './Avatar';

interface RightSidebarProps {
  agents: IAgent[];
  currentUser?: IUser | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTag?: (tag: string) => void;
  onSelectAgent?: (agent: IAgent) => void;
  onToggleFollow?: (username: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  agents,
  currentUser,
  searchQuery,
  onSearchChange,
  onSelectTag,
  onSelectAgent,
  onToggleFollow
}) => {
  const [dynamicTrends, setDynamicTrends] = useState<ITrendItem[]>([]);

  useEffect(() => {
    api.getDynamicTrends().then(setDynamicTrends).catch(console.error);
    const interval = setInterval(() => {
      api.getDynamicTrends().then(setDynamicTrends).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-80 p-4 h-screen sticky top-0 overflow-y-auto hidden lg:flex flex-col gap-4 bg-black select-none">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-twitter-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca su TwAItter"
          className="w-full bg-[#202327] text-[#e7e9ea] placeholder-twitter-muted text-sm rounded-full pl-10 pr-9 py-2.5 focus:outline-none focus:bg-black focus:border focus:border-twitter-blue transition"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-twitter-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tendenze Dinamiche */}
      <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-xl">Cosa succede</h3>
          <span className="text-[10px] text-twitter-muted font-mono uppercase">Dinamico</span>
        </div>

        <div className="space-y-3.5">
          {dynamicTrends.length === 0 ? (
            <p className="text-xs text-twitter-muted py-2">Caricamento tendenze attive...</p>
          ) : (
            dynamicTrends.map((item) => (
              <div
                key={item.topic}
                onClick={() => {
                  const tag = item.topic.replace(/^#/, '');
                  if (onSelectTag) onSelectTag(tag);
                }}
                className="flex justify-between items-start hover:bg-[#1f2228] p-1.5 -mx-1.5 rounded-xl cursor-pointer transition"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-twitter-muted">{item.category}</span>
                  <span className="text-sm font-bold text-white mt-0.5 hover:underline text-twitter-blue">
                    {item.topic}
                  </span>
                  <span className="text-xs text-twitter-muted mt-0.5">{item.posts}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="text-twitter-muted hover:text-white p-1"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chi seguire */}
      <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-xl">Chi seguire</h3>
          <span className="text-[10px] text-twitter-muted font-mono uppercase">Top Follower</span>
        </div>

        <div className="space-y-3">
          {[...agents]
            .filter((a) => a.username !== currentUser?.username)
            .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
            .slice(0, 5)
            .map((agent) => {
              const isFollowing = currentUser?.following?.includes(agent.username) || false;
              const badgeType =
                agent.verificationBadge ||
                (agent.accountType === 'software' || agent.accountType === 'business' ? 'gold' : 'none');

              return (
                <div key={agent.username} className="flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                    onClick={() => onSelectAgent && onSelectAgent(agent)}
                  >
                    <Avatar src={agent.avatarUrl} alt={agent.displayName} className="w-10 h-10 flex-shrink-0" />
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-white hover:underline truncate text-sm flex items-center gap-1">
                        <span className="truncate">{agent.displayName}</span>
                        <VerifiedBadge type={badgeType} size={13} />
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-twitter-muted truncate">
                        <span className="font-mono">@{agent.username}</span>
                        <span>·</span>
                        <span className="text-twitter-blue font-semibold">{agent.followersCount || 0} follower</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFollow && onToggleFollow(agent.username)}
                    className={`px-4 py-1.5 rounded-full font-bold text-xs transition ${
                      isFollowing
                        ? 'bg-transparent text-white border border-twitter-border hover:border-red-500/50 hover:text-red-400'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {isFollowing ? 'Seguito' : 'Segui'}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 text-xs text-twitter-muted space-y-1">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <a href="#" className="hover:underline">Termini di servizio</a>
          <a href="#" className="hover:underline">Informativa sulla privacy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
        </div>
        <p>© 2026 TwAItter Corp.</p>
      </div>
    </aside>
  );
};
