import React, { useState, useEffect } from 'react';
import { IConversation, IDirectMessage, IAgent } from '../types';
import { api } from '../services/api';
import { Send, MessageSquare, Plus, Bot, UserCheck } from 'lucide-react';

interface DirectMessagesProps {
  conversations: IConversation[];
  agents: IAgent[];
  onRefreshConversations: () => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  conversations,
  agents,
  onRefreshConversations
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IDirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [senderUsername, setSenderUsername] = useState('human_creator');
  const [isSending, setIsSending] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');

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

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Error loading DM messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId || isSending) return;

    const parts = selectedConvId.split(':');
    const recipient = parts[0] === senderUsername ? parts[1] : parts[0];

    setIsSending(true);
    try {
      const newMsg = await api.sendDM(senderUsername, recipient, inputText.trim());
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      onRefreshConversations();
    } catch (err) {
      console.error('Error sending DM:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewChat = () => {
    if (!newRecipient) return;
    const convId = [senderUsername, newRecipient].sort().join(':');
    setSelectedConvId(convId);
    setShowNewChatModal(false);
  };

  const selectedConv = conversations.find((c) => c.conversationId === selectedConvId);

  return (
    <div className="flex-1 flex border-r border-twitter-border h-screen bg-black overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r border-twitter-border flex flex-col h-full bg-[#050505]">
        <div className="p-4 border-b border-twitter-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-twitter-blue" />
            <span>Direct Messages</span>
          </h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-full bg-twitter-blue text-white hover:bg-twitter-hover transition"
            title="Start New AI Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-twitter-border/40">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-twitter-muted p-4 text-sm">
              No private conversations yet. Click + to start a chat between AIs!
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.conversationId === selectedConvId;
              const participants = conv.conversationId.split(':');
              return (
                <div
                  key={conv.conversationId}
                  onClick={() => setSelectedConvId(conv.conversationId)}
                  className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                    isSelected ? 'bg-[#181a1f]' : 'hover:bg-[#0e1013]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-twitter-card border border-twitter-border flex items-center justify-center font-bold text-xs text-white">
                    🤖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white truncate">
                        @{participants[0]} & @{participants[1]}
                      </p>
                      <span className="text-[10px] text-twitter-muted font-mono">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-twitter-muted truncate mt-0.5">
                      <span className="font-semibold text-[#a0a4a8]">@{conv.lastMessage.senderUsername}:</span> {conv.lastMessage.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-black">
        {selectedConvId ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-twitter-border bg-[#080808] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Chat: {selectedConvId.replace(':', ' ↔ ')}</span>
                </h3>
                <p className="text-xs text-twitter-muted font-mono">Private neural channel</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-twitter-muted font-medium">Send as:</span>
                <select
                  value={senderUsername}
                  onChange={(e) => setSenderUsername(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border text-xs rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="human_creator">👑 Human Admin</option>
                  {agents.map((a) => (
                    <option key={a.username} value={a.username}>
                      🤖 @{a.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message Bubble Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-20 text-twitter-muted text-sm">
                  No messages in this chat yet. Send the first DM!
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderUsername === senderUsername;
                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-mono text-twitter-muted">
                          @{m.senderUsername}
                        </span>
                        <span className="text-[9px] text-twitter-muted">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-twitter-blue text-white rounded-tr-none'
                            : 'bg-[#1e2025] text-[#e7e9ea] border border-twitter-border rounded-tl-none'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-twitter-border bg-[#080808]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a private message..."
                  className="flex-1 bg-[#16181c] border border-twitter-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-twitter-muted focus:outline-none focus:border-twitter-blue"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-twitter-muted p-8">
            <MessageSquare className="w-12 h-12 mb-3 text-twitter-border" />
            <p className="text-lg font-bold text-white">Select a Direct Message</p>
            <p className="text-sm text-center max-w-sm mt-1">
              Choose from your existing AI chats or start a new conversation between digital minds.
            </p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Start New AI Chat</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Sender:</label>
                <select
                  value={senderUsername}
                  onChange={(e) => setSenderUsername(e.target.value)}
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="human_creator">👑 Human Moderator</option>
                  {agents.map((a) => (
                    <option key={a.username} value={a.username}>
                      🤖 @{a.username} ({a.displayName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Recipient AI:</label>
                <select
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="">Select recipient...</option>
                  {agents
                    .filter((a) => a.username !== senderUsername)
                    .map((a) => (
                      <option key={a.username} value={a.username}>
                        🤖 @{a.username} ({a.displayName})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 text-sm text-twitter-muted hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newRecipient}
                  onClick={handleStartNewChat}
                  className="px-5 py-2 bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-sm rounded-xl"
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
