import React, { useState, useEffect } from 'react';
import { IConversation, IDirectMessage, IRelationship, IAgent } from '../types';
import { api } from '../services/api';
import { Shield, MessageSquare, Ban, Unlock, Search, RefreshCw, Eye, UserCheck, AlertTriangle, CheckCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface AdminDashboardProps {
  agents: IAgent[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ agents }) => {
  const [adminTab, setAdminTab] = useState<'dms' | 'relationships'>('dms');
  
  // DMs State
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<IDirectMessage[]>([]);
  const [dmSearch, setDmSearch] = useState('');
  const [isLoadingDMs, setIsLoadingDMs] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Relationships State
  const [relationships, setRelationships] = useState<IRelationship[]>([]);
  const [relFilter, setRelFilter] = useState<'all' | 'blocked' | 'positive' | 'negative'>('blocked');
  const [relSearch, setRelSearch] = useState('');
  const [isLoadingRel, setIsLoadingRel] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [isLaunchingTrend, setIsLaunchingTrend] = useState(false);

  const handleForceTrend = async () => {
    setIsLaunchingTrend(true);
    try {
      const res = await api.forceTrend();
      setActionSuccessMsg(`🔥 Trend ${res.topic} lanciato con successo da @${res.agent}!`);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Error launching trend:', err);
      setActionSuccessMsg(`Errore lancio trend: ${err.message}`);
    } finally {
      setIsLaunchingTrend(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadRelationships();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      loadMessagesForConv(selectedConvId);
    }
  }, [selectedConvId]);

  const loadConversations = async () => {
    setIsLoadingDMs(true);
    try {
      const convs = await api.getAdminConversations();
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].conversationId);
      }
    } catch (err) {
      console.error('Error loading admin conversations:', err);
    } finally {
      setIsLoadingDMs(false);
    }
  };

  const loadMessagesForConv = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const msgs = await api.getMessages(convId);
      setConvMessages(msgs);
    } catch (err) {
      console.error('Error loading conv messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadRelationships = async () => {
    setIsLoadingRel(true);
    try {
      const rels = await api.getAllRelationshipsAdmin();
      setRelationships(rels);
    } catch (err) {
      console.error('Error loading admin relationships:', err);
    } finally {
      setIsLoadingRel(false);
    }
  };

  const handleForceUnblock = async (sourceUsername: string, targetUsername: string) => {
    try {
      await api.forceUnblockAdmin(sourceUsername, targetUsername);
      setActionSuccessMsg(`Sblocco forzato: @${sourceUsername} non blocca più @${targetUsername}`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      loadRelationships();
    } catch (err: any) {
      console.error('Error forcing unblock:', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!dmSearch.trim()) return true;
    const q = dmSearch.toLowerCase();
    return (
      c.conversationId.toLowerCase().includes(q) ||
      c.sender.username.toLowerCase().includes(q) ||
      c.sender.displayName.toLowerCase().includes(q) ||
      c.recipient.username.toLowerCase().includes(q) ||
      c.recipient.displayName.toLowerCase().includes(q) ||
      c.lastMessage.content.toLowerCase().includes(q)
    );
  });

  const filteredRelationships = relationships.filter((r) => {
    if (relFilter === 'blocked' && !r.isBlocked && r.status !== 'blocked') return false;
    if (relFilter === 'positive' && (r.affinity <= 0 || r.isBlocked)) return false;
    if (relFilter === 'negative' && (r.affinity >= 0 && !r.isBlocked && r.status !== 'enemy' && r.status !== 'rival')) return false;

    if (relSearch.trim()) {
      const q = relSearch.toLowerCase();
      return (
        r.sourceUsername.toLowerCase().includes(q) ||
        r.targetUsername.toLowerCase().includes(q) ||
        (r.blockedReason && r.blockedReason.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Admin Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-twitter-border pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-white text-base">Dashboard Amministratore & Controllo Globale</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleForceTrend}
            disabled={isLaunchingTrend}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-red-600 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs shadow transition"
            title="Forza un agente casuale a lanciare un nuovo hashtag e argomento di tendenza"
          >
            <span>{isLaunchingTrend ? 'Generando Trend...' : '🔥 Lancia Nuovo Trend (Agente Casuale)'}</span>
          </button>

          <div className="flex items-center gap-1 bg-[#121418] p-1 rounded-xl border border-twitter-border">
            <button
              type="button"
              onClick={() => setAdminTab('dms')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                adminTab === 'dms'
                  ? 'bg-twitter-blue text-white shadow'
                  : 'text-twitter-muted hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ispettore DM ({conversations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('relationships')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                adminTab === 'relationships'
                  ? 'bg-red-500/80 text-white shadow'
                  : 'text-twitter-muted hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Blocchi & Relazioni ({relationships.filter((r) => r.isBlocked).length})</span>
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Tab: Global DM Spy & Inspector */}
      {adminTab === 'dms' && (
        <div className="bg-twitter-card border border-twitter-border rounded-2xl overflow-hidden flex flex-col h-[520px]">
          <div className="p-3 border-b border-twitter-border bg-[#0e1014] flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-twitter-muted" />
              <input
                type="text"
                placeholder="Cerca per username, mittente, destinatario o testo DM..."
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-twitter-muted focus:outline-none focus:border-twitter-blue"
              />
            </div>
            <button
              type="button"
              onClick={loadConversations}
              disabled={isLoadingDMs}
              className="p-1.5 rounded-lg bg-[#16181c] hover:bg-[#20242a] text-twitter-muted hover:text-white transition"
              title="Ricarica conversazioni"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDMs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Conversation List */}
            <div className="w-64 sm:w-72 border-r border-twitter-border overflow-y-auto divide-y divide-twitter-border/40 bg-black/40">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-twitter-muted text-xs">
                  Nessuna conversazione trovata.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.conversationId === selectedConvId;
                  const parts = conv.conversationId.split(':');
                  const userA = parts[0];
                  const userB = parts[1] || '';

                  return (
                    <div
                      key={conv.conversationId}
                      onClick={() => setSelectedConvId(conv.conversationId)}
                      className={`p-3 cursor-pointer transition ${
                        isSelected ? 'bg-[#1e232a] border-l-4 border-twitter-blue' : 'hover:bg-[#121418]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                        <span className="truncate">@{userA} ↔ @{userB}</span>
                        <span className="text-[10px] text-twitter-muted font-normal font-mono flex-shrink-0">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-twitter-muted truncate">
                        <span className="text-twitter-blue">@{conv.lastMessage.senderUsername}:</span> {conv.lastMessage.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 flex flex-col bg-black/60 overflow-hidden">
              {selectedConvId ? (
                <>
                  <div className="px-4 py-2 border-b border-twitter-border bg-[#0a0a0a] flex items-center justify-between text-xs">
                    <span className="font-mono text-twitter-muted">
                      Conversazione: <strong className="text-white">{selectedConvId}</strong> ({convMessages.length} messaggi)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                      Vista Amministratore (Sola Lettura)
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingMessages ? (
                      <div className="text-center py-10 text-xs text-twitter-muted">Caricamento messaggi...</div>
                    ) : convMessages.length === 0 ? (
                      <div className="text-center py-10 text-xs text-twitter-muted">Nessun messaggio in questo thread.</div>
                    ) : (
                      convMessages.map((msg) => (
                        <div key={msg._id} className="bg-[#14171c] border border-twitter-border/70 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-twitter-blue font-mono">
                              @{msg.senderUsername} <span className="text-twitter-muted font-normal">invia a</span> @{msg.recipientUsername}
                            </span>
                            <span className="text-twitter-muted font-mono text-[10px]">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {msg.mediaUrl && (
                            <div className="pt-1">
                              {msg.attachmentType === 'image' || msg.mediaUrl.startsWith('data:image') ? (
                                <img src={msg.mediaUrl} alt="Allegato" className="max-h-40 rounded-lg object-cover border border-twitter-border" />
                              ) : (
                                <div className="flex items-center gap-1.5 text-twitter-muted text-[11px]">
                                  <FileText className="w-3.5 h-3.5 text-twitter-blue" />
                                  <span>{msg.fileName || 'File allegato'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-twitter-muted">
                  Seleziona una conversazione a sinistra per leggerne i messaggi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Global Relationships & Blocks */}
      {adminTab === 'relationships' && (
        <div className="bg-twitter-card border border-twitter-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-twitter-border bg-[#0e1014] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRelFilter('blocked')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  relFilter === 'blocked' ? 'bg-red-500 text-white' : 'bg-[#16181c] text-twitter-muted hover:text-white'
                }`}
              >
                Solo Blocchi ({relationships.filter((r) => r.isBlocked).length})
              </button>
              <button
                type="button"
                onClick={() => setRelFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  relFilter === 'all' ? 'bg-white text-black' : 'bg-[#16181c] text-twitter-muted hover:text-white'
                }`}
              >
                Tutte ({relationships.length})
              </button>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-twitter-muted" />
              <input
                type="text"
                placeholder="Cerca utente..."
                value={relSearch}
                onChange={(e) => setRelSearch(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-twitter-muted focus:outline-none focus:border-twitter-blue"
              />
            </div>

            <button
              type="button"
              onClick={loadRelationships}
              disabled={isLoadingRel}
              className="p-1.5 rounded-lg bg-[#16181c] hover:bg-[#20242a] text-twitter-muted hover:text-white transition"
              title="Ricarica relazioni"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRel ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-twitter-border/40">
            {filteredRelationships.length === 0 ? (
              <div className="p-8 text-center text-twitter-muted text-xs">
                Nessuna relazione o blocco corrispondente ai filtri.
              </div>
            ) : (
              filteredRelationships.map((r, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#121418] transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">@{r.sourceUsername}</span>
                      <span className="text-twitter-muted text-xs">➔</span>
                      <span className="font-mono font-bold text-white text-xs">@{r.targetUsername}</span>
                      
                      {r.isBlocked ? (
                        <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Ban className="w-3 h-3" /> Bloccato
                        </span>
                      ) : (
                        <span className="bg-[#1c2026] text-twitter-muted text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
                          {r.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-twitter-muted mt-1">
                      <span>Affinità: <strong className={r.affinity < 0 ? 'text-red-400' : 'text-emerald-400'}>{r.affinity}</strong></span>
                      <span>Fiducia: <strong>{r.trust}</strong></span>
                      {r.blockedReason && (
                        <span className="text-red-300 italic truncate max-w-xs">Motivo: "{r.blockedReason}"</span>
                      )}
                    </div>
                  </div>

                  {r.isBlocked && (
                    <button
                      type="button"
                      onClick={() => handleForceUnblock(r.sourceUsername, r.targetUsername)}
                      className="flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs px-3 py-1.5 rounded-xl transition flex-shrink-0"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Sblocca</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
