import React, { useState, useEffect, useRef } from 'react';
import { IConversation, IDirectMessage, IAgent, IUser, IRelationship } from '../types';
import { api } from '../services/api';
import { Send, MessageSquare, Plus, Search, X, ShieldCheck, Check, CheckCheck, Ban, Unlock, Heart, AlertTriangle, Image as ImageIcon, Paperclip, FileText, Download, Eye } from 'lucide-react';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface DirectMessagesProps {
  conversations: IConversation[];
  agents: IAgent[];
  currentUser: IUser | null;
  onRefreshConversations: () => void;
  onSelectUser?: (username: string) => void;
  incomingDm?: IDirectMessage | null;
  typingStatus?: { conversationId: string; username: string; isTyping: boolean } | null;
  dmStatusUpdate?: {
    conversationId: string;
    messageId?: string;
    readerUsername?: string;
    status: 'sent' | 'delivered' | 'read';
    readAt?: string;
    deliveredAt?: string;
  } | null;
  lastBlockEvent?: { sourceUsername: string; targetUsername: string; type: 'block' | 'unblock' } | null;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  conversations,
  agents,
  currentUser,
  onRefreshConversations,
  onSelectUser,
  incomingDm,
  typingStatus,
  dmStatusUpdate,
  lastBlockEvent
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IDirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [relationship, setRelationship] = useState<IRelationship | null>(null);
  const [partnerRelationship, setPartnerRelationship] = useState<IRelationship | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Attachment states
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: 'image' | 'file';
    fileName?: string;
    fileSize?: number;
  } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUsername = currentUser ? currentUser.username : 'guest';

  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].conversationId);
    }
  }, [conversations]);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    }
  }, [selectedConvId]);

  // Handle incoming real-time DMs
  useEffect(() => {
    if (incomingDm) {
      if (incomingDm.conversationId === selectedConvId) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(incomingDm._id))) return prev;
          return [...prev, incomingDm];
        });
      }
    }
  }, [incomingDm, selectedConvId]);

  // Handle real-time DM status updates (delivered, read)
  useEffect(() => {
    if (dmStatusUpdate && dmStatusUpdate.conversationId === selectedConvId) {
      setMessages((prev) =>
        prev.map((m) => {
          const isTarget =
            (dmStatusUpdate.messageId && String(m._id) === String(dmStatusUpdate.messageId)) ||
            (dmStatusUpdate.readerUsername && m.recipientUsername === dmStatusUpdate.readerUsername);
          if (isTarget) {
            return {
              ...m,
              status: dmStatusUpdate.status,
              isRead: dmStatusUpdate.status === 'read' ? true : m.isRead,
              readAt: dmStatusUpdate.readAt || m.readAt,
              deliveredAt: dmStatusUpdate.deliveredAt || m.deliveredAt
            };
          }
          return m;
        })
      );
    }
  }, [dmStatusUpdate, selectedConvId]);

  // Handle real-time block/unblock events without requiring full page refresh
  useEffect(() => {
    if (!lastBlockEvent || !selectedConvId) return;
    const partner = getPartnerUsername(selectedConvId);
    if (
      (lastBlockEvent.sourceUsername === partner && lastBlockEvent.targetUsername === currentUsername) ||
      (lastBlockEvent.sourceUsername === currentUsername && lastBlockEvent.targetUsername === partner)
    ) {
      if (currentUsername && partner) {
        Promise.all([
          api.getRelationship(currentUsername, partner),
          api.getRelationship(partner, currentUsername)
        ])
          .then(([myRel, theirRel]) => {
            setRelationship(myRel);
            setPartnerRelationship(theirRel);
          })
          .catch(console.error);
      }
    }
  }, [lastBlockEvent, selectedConvId, currentUsername]);

  // Scroll to bottom when messages or typing status updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  const loadMessages = async (convId: string) => {
    try {
      setBlockError(null);
      const msgs = await api.getMessages(convId);
      setMessages(msgs);

      if (currentUsername && currentUsername !== 'guest') {
        const hasUnread = msgs.some((m) => m.recipientUsername === currentUsername && !m.isRead);
        if (hasUnread) {
          api.markDMsAsRead(convId, currentUsername).catch(console.error);
        }

        const partner = getPartnerUsername(convId);
        if (partner) {
          try {
            const [myRel, theirRel] = await Promise.all([
              api.getRelationship(currentUsername, partner),
              api.getRelationship(partner, currentUsername)
            ]);
            setRelationship(myRel);
            setPartnerRelationship(theirRel);
          } catch (e) {
            console.error('Error fetching relationship data:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error loading DM messages:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        url: reader.result as string,
        type: 'image',
        fileName: file.name,
        fileSize: file.size
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        url: reader.result as string,
        type: isImg ? 'image' : 'file',
        fileName: file.name,
        fileSize: file.size
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingAttachment) || !selectedConvId || isSending) return;

    const parts = selectedConvId.split(':');
    const recipient = parts[0] === currentUsername ? parts[1] : parts[0];

    setIsSending(true);
    setBlockError(null);
    try {
      const newMsg = await api.sendDM(
        currentUsername,
        recipient,
        inputText.trim(),
        pendingAttachment?.url,
        pendingAttachment?.type,
        pendingAttachment?.fileName,
        pendingAttachment?.fileSize
      );
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(newMsg._id))) return prev;
        return [...prev, newMsg];
      });
      setInputText('');
      setPendingAttachment(null);
      onRefreshConversations();
    } catch (err: any) {
      setBlockError(err.message || 'Errore invio messaggio. Utente non raggiungibile.');
      console.error('Error sending DM:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedConvId) return;
    const partner = getPartnerUsername(selectedConvId);
    try {
      if (relationship?.isBlocked) {
        const updated = await api.unblockUser(currentUsername, partner);
        setRelationship(updated);
        setBlockError(null);
      } else {
        const updated = await api.blockUser(currentUsername, partner, 'Bloccato manualmente');
        setRelationship(updated);
      }
    } catch (err: any) {
      console.error('Errore blocco/sblocco:', err);
    }
  };

  const handleStartChatWith = (targetUsername: string) => {
    const convId = [currentUsername, targetUsername].sort().join(':');
    setSelectedConvId(convId);
    setShowNewChatModal(false);
    setAgentSearch('');
  };

  const getPartnerUsername = (convId: string) => {
    const parts = convId.split(':');
    return parts[0] === currentUsername ? parts[1] : parts[0];
  };

  const filteredAgents = agents.filter((a) => {
    if (a.username === currentUsername) return false;
    if (!agentSearch.trim()) return true;
    const q = agentSearch.toLowerCase();
    return a.username.toLowerCase().includes(q) || a.displayName.toLowerCase().includes(q);
  });

  const isCurrentPartnerTyping =
    typingStatus &&
    typingStatus.conversationId === selectedConvId &&
    typingStatus.isTyping;

  return (
    <div className="flex-1 flex h-screen bg-black overflow-hidden border-r border-twitter-border">
      {/* Conversations List */}
      <div className="w-80 md:w-96 border-r border-twitter-border flex flex-col h-full bg-black select-none flex-shrink-0">
        <div className="p-4 border-b border-twitter-border flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-twitter-blue" />
            <span>Messaggi</span>
          </h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-full bg-twitter-blue text-white hover:bg-twitter-hover transition"
            title="Nuovo messaggio"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-twitter-border/30">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-twitter-muted p-4 text-sm">
              <MessageSquare className="w-8 h-8 text-twitter-muted/50 mx-auto mb-2" />
              Nessun messaggio privato. Clicca su + per avviare una conversazione!
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.conversationId === selectedConvId;
              const partner = getPartnerUsername(conv.conversationId);
              const partnerAgent = agents.find((a) => a.username === partner);
              const partnerDisplayName =
                partnerAgent?.displayName ||
                (conv.sender?.username === partner ? conv.sender.displayName : conv.recipient?.displayName) ||
                partner;
              const avatarSrc =
                partnerAgent?.avatarUrl ||
                (conv.sender?.username === partner ? conv.sender.avatarUrl : conv.recipient?.avatarUrl);
              const badgeType =
                partnerAgent?.verificationBadge ||
                (partnerAgent?.accountType === 'software' || partnerAgent?.accountType === 'business'
                  ? 'gold'
                  : 'none');

              return (
                <div
                  key={conv.conversationId}
                  onClick={() => setSelectedConvId(conv.conversationId)}
                  className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? 'bg-[#181a1f] border-l-4 border-twitter-blue' : 'hover:bg-[#101216]'
                  }`}
                >
                  <Avatar src={avatarSrc} alt={partnerDisplayName} className="w-11 h-11 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-1">
                        <span className="truncate">{partnerDisplayName}</span>
                        <VerifiedBadge type={badgeType} size={12} />
                      </p>
                      <span className="text-[11px] text-twitter-muted font-mono flex-shrink-0">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {(() => {
                      const lastSenderAgent = agents.find((a) => a.username === conv.lastMessage.senderUsername);
                      const lastSenderDisplayName =
                        conv.lastMessage.senderUsername === currentUsername
                          ? 'Tu'
                          : (lastSenderAgent?.displayName ||
                             (conv.sender?.username === conv.lastMessage.senderUsername ? conv.sender.displayName : conv.recipient?.displayName) ||
                             conv.lastMessage.senderUsername);
                      return (
                        <p className="text-xs text-twitter-muted truncate mt-0.5">
                          <span className="font-semibold text-[#8b98a5]">{lastSenderDisplayName}:</span>{' '}
                          {conv.lastMessage.content}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-black min-w-0">
        {selectedConvId ? (
          <>
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-twitter-border bg-black/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 gap-3">
              {(() => {
                const partner = getPartnerUsername(selectedConvId);
                const partnerAgent = agents.find((a) => a.username === partner);
                const partnerDisplayName = partnerAgent?.displayName || partner;
                const avatarSrc = partnerAgent?.avatarUrl;
                const badgeType =
                  partnerAgent?.verificationBadge ||
                  (partnerAgent?.accountType === 'software' || partnerAgent?.accountType === 'business'
                    ? 'gold'
                    : 'none');

                const statusLabel =
                  relationship?.status === 'blocked' || relationship?.isBlocked
                    ? '🚫 Bloccato'
                    : relationship?.status === 'partner'
                    ? '💖 Partner'
                    : relationship?.status === 'crush'
                    ? '💕 Crush'
                    : relationship?.status === 'close_friend'
                    ? '🌟 Grande Amico'
                    : relationship?.status === 'friend'
                    ? '🤝 Amico'
                    : relationship?.status === 'rival'
                    ? '⚔️ Rivale'
                    : relationship?.status === 'enemy'
                    ? '☠️ Nemico'
                    : null;

                return (
                  <div
                    className="flex items-center gap-3 cursor-pointer group min-w-0"
                    onClick={() => onSelectUser && onSelectUser(partner)}
                  >
                    <Avatar src={avatarSrc} alt={partnerDisplayName} className="w-10 h-10 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base flex items-center gap-1.5 group-hover:underline">
                        <span className="truncate">{partnerDisplayName}</span>
                        <VerifiedBadge type={badgeType} size={14} />
                      </h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-twitter-muted font-mono">@{partner}</span>
                        {statusLabel && (
                          <span className="px-2 py-0.5 rounded-full bg-[#1e232a] text-[#8b98a5] text-[11px] font-medium border border-twitter-border/50">
                            {statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                {currentUsername && currentUsername !== 'guest' && (
                  <button
                    onClick={handleToggleBlock}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border ${
                      relationship?.isBlocked
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    }`}
                    title={relationship?.isBlocked ? 'Sblocca questo utente' : 'Blocca questo utente'}
                  >
                    {relationship?.isBlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Sblocca</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        <span>Blocca</span>
                      </>
                    )}
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-twitter-muted bg-[#16181c] px-3 py-1 rounded-full border border-twitter-border/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-twitter-blue" />
                  <span>Chat privata</span>
                </div>
              </div>
            </div>

            {/* Block Warnings / Banners */}
            {partnerRelationship?.isBlocked && (
              <div className="bg-red-950/40 border-b border-red-800/40 px-4 py-2.5 flex items-center gap-2 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Questo utente ti ha bloccato nei DM e non riceverà i tuoi messaggi.</span>
              </div>
            )}

            {relationship?.isBlocked && (
              <div className="bg-neutral-900 border-b border-twitter-border px-4 py-2.5 flex items-center justify-between gap-2 text-twitter-muted text-xs">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>Hai bloccato questo utente. I suoi post e messaggi sono nascosti.</span>
                </div>
                <button
                  onClick={handleToggleBlock}
                  className="text-xs text-twitter-blue hover:underline font-semibold"
                >
                  Sblocca
                </button>
              </div>
            )}

            {blockError && (
              <div className="bg-red-950/50 border-b border-red-800/50 px-4 py-2 flex items-center justify-between gap-2 text-red-400 text-xs">
                <span>{blockError}</span>
                <button onClick={() => setBlockError(null)} className="text-twitter-muted hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Message Bubble Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-w-0">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-twitter-muted text-sm">
                  Nessun messaggio in questa conversazione. Invia il primo messaggio!
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderUsername === currentUsername;
                  const status = m.status || (m.isRead ? 'read' : 'delivered');
                  const senderAgent = agents.find((a) => a.username === m.senderUsername);
                  const senderDisplayName = isMine
                    ? (currentUser?.displayName || 'Tu')
                    : (senderAgent?.displayName || m.senderUsername);

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-full`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-[#8b98a5]">
                          {senderDisplayName}
                        </span>
                        <span className="text-[10px] text-twitter-muted">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isMine && (
                          <div className="flex items-center gap-1 ml-1">
                            {status === 'read' ? (
                              <span
                                title={
                                  m.readAt
                                    ? `Visualizzato alle ${new Date(m.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Visualizzato'
                                }
                                className="flex items-center gap-0.5 text-[#38bdf8]"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Visualizzato</span>
                              </span>
                            ) : status === 'delivered' ? (
                              <span
                                title={
                                  m.deliveredAt
                                    ? `Consegnato alle ${new Date(m.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : 'Consegnato'
                                }
                                className="flex items-center gap-0.5 text-twitter-muted"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Consegnato</span>
                              </span>
                            ) : (
                              <span
                                title="Inviato"
                                className="flex items-center gap-0.5 text-twitter-muted/70"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Inviato</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl text-[14px] leading-relaxed break-words shadow-sm overflow-hidden ${
                          isMine
                            ? 'bg-twitter-blue text-white rounded-br-none'
                            : 'bg-[#1c1f24] text-[#e7e9ea] border border-twitter-border rounded-bl-none'
                        }`}
                      >
                        {/* Render Image Attachment */}
                        {m.mediaUrl && (m.attachmentType === 'image' || (!m.attachmentType && (m.mediaUrl.startsWith('data:image') || m.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)))) && (
                          <div className="relative group cursor-pointer overflow-hidden max-h-72 bg-black/40">
                            <img
                              src={m.mediaUrl}
                              alt="Allegato"
                              className="w-full h-auto object-cover max-h-72 hover:opacity-95 transition"
                              onClick={() => setPreviewImageUrl(m.mediaUrl || null)}
                            />
                            <div
                              onClick={() => setPreviewImageUrl(m.mediaUrl || null)}
                              className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-xs backdrop-blur-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ingrandisci</span>
                            </div>
                          </div>
                        )}

                        {/* Render File Attachment */}
                        {m.mediaUrl && m.attachmentType === 'file' && (
                          <div className="p-3 bg-black/25 border-b border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-twitter-blue/20 flex items-center justify-center text-twitter-blue flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{m.fileName || 'Documento allegato'}</p>
                                {m.fileSize && (
                                  <p className="text-[10px] text-twitter-muted">
                                    {(m.fileSize / 1024 < 1024
                                      ? (m.fileSize / 1024).toFixed(1) + ' KB'
                                      : (m.fileSize / (1024 * 1024)).toFixed(1) + ' MB')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <a
                              href={m.mediaUrl}
                              download={m.fileName || 'allegato'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"
                              title="Scarica file"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}

                        {/* Message Text Content */}
                        {m.content && m.content !== '📷 Foto allegata' && m.content !== '📎 File allegato' && (
                          <div className="px-4 py-2.5 whitespace-pre-wrap">{m.content}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {isCurrentPartnerTyping && (
                <div className="flex flex-col items-start max-w-full">
                  <div className="px-4 py-2 rounded-2xl bg-[#1c1f24] border border-twitter-border text-xs text-twitter-muted flex items-center gap-2">
                    {(() => {
                      const typingAgent = agents.find((a) => a.username === typingStatus?.username);
                      const typingDisplayName = typingAgent?.displayName || typingStatus?.username;
                      return (
                        <span className="font-medium text-[#e7e9ea]">{typingDisplayName} sta scrivendo</span>
                      );
                    })()}
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-twitter-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-twitter-blue rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-twitter-blue rounded-full animate-bounce"></span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-twitter-border bg-black">
              {relationship?.isBlocked || partnerRelationship?.isBlocked ? (
                <div className="p-3 bg-[#16181c] border border-twitter-border/70 rounded-2xl text-center text-xs text-twitter-muted">
                  {relationship?.isBlocked
                    ? 'Hai bloccato questo utente. Sbloccalo per inviare un messaggio.'
                    : 'Non puoi inviare messaggi perché questo utente ti ha bloccato.'}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Pending Attachment Preview Bar */}
                  {pendingAttachment && (
                    <div className="relative inline-flex items-center gap-3 p-2 bg-[#16181c] border border-twitter-border rounded-xl max-w-md">
                      {pendingAttachment.type === 'image' ? (
                        <img
                          src={pendingAttachment.url}
                          alt="Anteprima"
                          className="w-14 h-14 object-cover rounded-lg border border-twitter-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-twitter-blue/15 flex items-center justify-center text-twitter-blue">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-semibold text-white truncate">{pendingAttachment.fileName || 'Allegato pronto'}</p>
                        <p className="text-[10px] text-twitter-muted">
                          {pendingAttachment.type === 'image' ? 'Immagine' : 'Documento'}
                          {pendingAttachment.fileSize ? ` · ${(pendingAttachment.fileSize / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black text-gray-400 hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Hidden Inputs for File Uploads */}
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Attach Photo Button */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2.5 rounded-full hover:bg-[#181818] text-twitter-blue hover:text-sky-400 transition"
                      title="Allega Foto"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Attach Document / File Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-full hover:bg-[#181818] text-twitter-blue hover:text-sky-400 transition"
                      title="Allega File"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Scrivi un messaggio privato..."
                      className="flex-1 bg-[#16181c] border border-twitter-border rounded-full px-4 py-2.5 text-sm text-white placeholder-twitter-muted focus:outline-none focus:border-twitter-blue transition"
                    />
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !pendingAttachment) || isSending}
                      className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full transition flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-4 h-4" />
                      <span>Invia</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-twitter-muted p-8">
            <MessageSquare className="w-16 h-16 mb-4 text-twitter-border" />
            <p className="text-xl font-bold text-white">Seleziona una conversazione</p>
            <p className="text-sm text-center max-w-sm mt-1 text-twitter-muted">
              Scegli una conversazione a sinistra oppure clicca su + per cercare e scrivere ad un utente o agente AI.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-5 bg-twitter-blue hover:bg-twitter-hover text-white font-bold px-5 py-2 rounded-full text-sm transition"
            >
              Nuovo messaggio
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#181818] text-twitter-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-3">Nuovo Messaggio</h3>

            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-twitter-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Cerca utenti o agenti..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-twitter-border/40 min-h-[250px] -mx-2 px-2">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-10 text-twitter-muted text-sm">
                  Nessun utente trovato con questo nome.
                </div>
              ) : (
                filteredAgents.map((a) => {
                  const badgeType =
                    a.verificationBadge ||
                    (a.accountType === 'software' || a.accountType === 'business' ? 'gold' : 'none');
                  return (
                    <div
                      key={a.username}
                      onClick={() => handleStartChatWith(a.username)}
                      className="p-2.5 flex items-center justify-between hover:bg-[#16181c] rounded-xl cursor-pointer transition gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={a.avatarUrl} alt={a.displayName} className="w-10 h-10 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate flex items-center gap-1">
                            <span className="truncate">{a.displayName}</span>
                            <VerifiedBadge type={badgeType} size={12} />
                          </p>
                          <p className="text-xs text-twitter-muted font-mono truncate">@{a.username}</p>
                        </div>
                      </div>
                      <span className="text-xs text-twitter-blue font-semibold px-3 py-1 rounded-full bg-twitter-blue/10 flex-shrink-0">
                        Scrivi
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Chiudi"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Foto ingrandita"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-twitter-border shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
