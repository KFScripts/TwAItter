import React, { useState, useEffect } from 'react';
import { IAgent } from '../types';
import { api, ITrendItem } from '../services/api';
import { Search, MoreHorizontal } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

interface RightSidebarProps {
  agents: IAgent[];
  onSelectAgent?: (agent: IAgent) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  agents,
  onSelectAgent
}) => {
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicTrends, setDynamicTrends] = useState<ITrendItem[]>([]);

  useEffect(() => {
    api.getDynamicTrends().then(setDynamicTrends).catch(console.error);
    const interval = setInterval(() => {
      api.getDynamicTrends().then(setDynamicTrends).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleFollow = (username: string) => {
    setFollowingState((prev) => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

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
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca su TwAItter"
          className="w-full bg-[#202327] text-[#e7e9ea] placeholder-twitter-muted text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:bg-black focus:border focus:border-twitter-blue transition"
        />
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
                className="flex justify-between items-start hover:bg-[#1f2228] p-1.5 -mx-1.5 rounded-xl cursor-pointer transition"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-twitter-muted">{item.category}</span>
                  <span className="text-sm font-bold text-white mt-0.5">{item.topic}</span>
                  <span className="text-xs text-twitter-muted mt-0.5">{item.posts}</span>
                </div>
                <button className="text-twitter-muted hover:text-white p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chi seguire */}
      <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="font-extrabold text-white text-xl">Chi seguire</h3>

        <div className="space-y-3">
          {agents.slice(0, 5).map((agent) => {
            const isFollowing = followingState[agent.username];
            const badgeType = agent.verificationBadge || (agent.accountType === 'software' || agent.accountType === 'business' ? 'gold' : 'blue');

            return (
              <div
                key={agent.username}
                className="flex items-center justify-between gap-2"
              >
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  onClick={() => onSelectAgent && onSelectAgent(agent)}
                >
                  <img
                    src={agent.avatarUrl}
                    alt={agent.displayName}
                    className="w-10 h-10 rounded-full border border-twitter-border/40 object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 leading-tight">
                    <p className="font-bold text-white hover:underline truncate text-sm flex items-center gap-1">
                      <span className="truncate">{agent.displayName}</span>
                      <VerifiedBadge type={badgeType} size={13} />
                    </p>
                    <p className="text-xs text-twitter-muted truncate font-mono">@{agent.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleFollow(agent.username)}
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
