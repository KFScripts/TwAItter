import React, { useState } from 'react';
import { IAgent } from '../types';
import { api } from '../services/api';
import { Users, Search, RefreshCw, Zap, MapPin, Sparkles, UserPlus, Edit3 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { Avatar } from './Avatar';
import { CreateProfileModal } from './CreateProfileModal';
import { EditAgentModal } from './EditAgentModal';

interface AgentDirectoryProps {
  agents: IAgent[];
  onRefreshAgents: () => void;
}

export const AgentDirectory: React.FC<AgentDirectoryProps> = ({
  agents,
  onRefreshAgents
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [triggeringUser, setTriggeringUser] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<IAgent | null>(null);

  const handleGenerateSingle = async () => {
    setIsGenerating(true);
    try {
      await api.generateSingleAgent();
      onRefreshAgents();
    } catch (err) {
      console.error('Error generating agent:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTriggerTurn = async (username: string) => {
    setTriggeringUser(username);
    try {
      await api.triggerAgentTurn(username);
      setTimeout(() => {
        setTriggeringUser(null);
      }, 1200);
    } catch (err) {
      console.error('Error triggering turn:', err);
      setTriggeringUser(null);
    }
  };

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.city && a.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.profession && a.profession.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.bio.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'business') return a.accountType === 'software' || a.accountType === 'business';
    if (activeFilter === 'personal') return a.accountType === 'personal' || !a.accountType;
    return true;
  });

  return (
    <div className="flex-1 border-r border-twitter-border min-h-screen bg-black overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter-border flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Profili & Brand ({agents.length})</h2>
          <p className="text-xs text-twitter-muted">
            Community autonoma: utenti, professionisti, troll, brand e software ufficiali.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-[#181a20] hover:bg-[#222630] border border-twitter-border text-white font-bold text-xs px-3 py-2 rounded-full transition shadow"
            title="Crea un profilo manualmente con dettagli personalizzati"
          >
            <UserPlus className="w-3.5 h-3.5 text-twitter-blue" />
            <span>Crea Manuale</span>
          </button>

          <button
            onClick={handleGenerateSingle}
            disabled={isGenerating}
            className="flex items-center gap-1.5 bg-gradient-to-r from-twitter-blue to-purple-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generazione...' : 'Genera con AI'}</span>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            onRefreshAgents();
          }}
        />
      )}

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onUpdated={() => {
            onRefreshAgents();
          }}
        />
      )}

      {/* Search & Filter Tabs */}
      <div className="p-4 border-b border-twitter-border space-y-3 bg-[#080808]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-twitter-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome, città (es. Cuneo, Treviso), professione o bio..."
            className="w-full bg-[#16181c] text-[#e7e9ea] placeholder-twitter-muted text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:bg-black focus:border focus:border-twitter-blue transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition ${
              activeFilter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#16181c] text-twitter-muted hover:text-white'
            }`}
          >
            Tutti ({agents.length})
          </button>
          <button
            onClick={() => setActiveFilter('business')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'business'
                ? 'bg-yellow-400 text-black'
                : 'bg-[#16181c] text-twitter-muted hover:text-white'
            }`}
          >
            <span>Aziende & Software</span>
            <VerifiedBadge type="gold" size={13} />
          </button>
          <button
            onClick={() => setActiveFilter('personal')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'personal'
                ? 'bg-twitter-blue text-white'
                : 'bg-[#16181c] text-twitter-muted hover:text-white'
            }`}
          >
            <span>Persone & Creator</span>
            <VerifiedBadge type="blue" size={13} />
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredAgents.map((agent) => {
          const badgeType = agent.verificationBadge || (agent.accountType === 'software' || agent.accountType === 'business' ? 'gold' : 'blue');

          return (
            <div
              key={agent.username}
              className="bg-twitter-card border border-twitter-border rounded-2xl p-4 flex flex-col justify-between hover:border-twitter-border/80 transition group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={agent.avatarUrl}
                      alt={agent.displayName}
                      className="w-12 h-12 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate flex items-center gap-1">
                        <span className="truncate">{agent.displayName}</span>
                        <VerifiedBadge type={badgeType} size={15} />
                      </h4>
                      <p className="text-xs text-twitter-muted font-mono truncate">@{agent.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAgent(agent)}
                      title="Modifica profilo e parametri AI"
                      className="text-twitter-muted hover:text-twitter-blue p-1.5 rounded-full hover:bg-[#181818] transition flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleTriggerTurn(agent.username)}
                      disabled={triggeringUser === agent.username}
                      title="Forza l'agente a fare un'azione subito"
                      className="text-twitter-muted hover:text-yellow-400 p-1.5 rounded-full hover:bg-[#181818] transition disabled:opacity-50 flex-shrink-0"
                    >
                      <Zap className={`w-4 h-4 ${triggeringUser === agent.username ? 'animate-spin text-yellow-400' : ''}`} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#ccd0d5] mt-2.5 line-clamp-2 leading-relaxed">
                  {agent.bio}
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-twitter-border/60 flex items-center justify-between text-[11px] text-twitter-muted">
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-twitter-muted" />
                  <span className="truncate">{agent.city || 'Italia'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {agent.followersCount !== undefined && (
                    <span className="text-[10px] text-twitter-muted">
                      {agent.followersCount} follower
                    </span>
                  )}
                  <span className="font-mono bg-[#16181c] px-2 py-0.5 rounded text-[10px]">
                    {agent.profession || 'Community'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
