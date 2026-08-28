import React, { useState, useRef } from 'react';
import { IPost, IAgent, IUser } from '../types';
import { PostCard } from './PostCard';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { Image, Smile, Calendar, MapPin, ListOrdered, X, Hash, Search, UserPlus } from 'lucide-react';

interface FeedProps {
  posts: IPost[];
  agents: IAgent[];
  currentUser: IUser | null;
  onReply: (post: IPost) => void;
  onReact: (postId: string, reactionType: string) => void;
  onViewThread: (post: IPost) => void;
  onReport: (post: IPost) => void;
  onCreatePost: (content: string, authorUsername: string, mediaUrl?: string) => Promise<void>;
  onSelectUser?: (username: string) => void;
  activeTagFilter?: string | null;
  onSelectTag?: (tag: string | null) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onToggleFollow?: (username: string) => void;
  onOpenAuth?: () => void;
  isExploreView?: boolean;
}

export const Feed: React.FC<FeedProps> = ({
  posts,
  agents,
  currentUser,
  onReply,
  onReact,
  onViewThread,
  onReport,
  onCreatePost,
  onSelectUser,
  activeTagFilter,
  onSelectTag,
  searchQuery = '',
  onSearchChange,
  onToggleFollow,
  onOpenAuth,
  isExploreView = false
}) => {
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [composerText, setComposerText] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const popularEmojis = ['😂', '🔥', '🚀', '❤️', '🤖', '👏', '💡', '💎', '🇮🇹', '⚡', '🎉', '🧠', '💬', '📈', '👀', '☕', '🍕', '🎯', '✨', '💯'];
  const popularCities = ['Roma, Italia', 'Milano, Italia', 'Napoli, Italia', 'Torino, Italia', 'Firenze, Italia', 'Bologna, Italia', 'Palermo, Italia', 'Venezia, Italia'];

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Immagine troppo grande. Seleziona un file inferiore a 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!composerText.trim() && !mediaUrl) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const author = currentUser ? currentUser.username : 'guest';
      await onCreatePost(composerText.trim(), author, mediaUrl || undefined);
      setComposerText('');
      setMediaUrl(null);
      setShowEmojiPicker(false);
      setShowLocationPicker(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const followingList = currentUser?.following || [];

  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'following') {
      if (!currentUser || followingList.length === 0) return false;
      if (!followingList.includes(post.authorUsername)) return false;
    }

    if (activeTagFilter) {
      const cleanTag = activeTagFilter.toLowerCase().trim();
      const matchInTags = post.tags?.some(
        (t) => t.toLowerCase() === cleanTag || t.toLowerCase().includes(cleanTag)
      );
      const matchInContent =
        post.content.toLowerCase().includes(`#${cleanTag}`) ||
        post.content.toLowerCase().includes(cleanTag);
      if (!matchInTags && !matchInContent) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inContent = post.content.toLowerCase().includes(q);
      const inAuthor =
        post.authorUsername.toLowerCase().includes(q) ||
        (post.author?.displayName && post.author.displayName.toLowerCase().includes(q));
      const inTags = post.tags?.some((t) => t.toLowerCase().includes(q));
      if (!inContent && !inAuthor && !inTags) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 border-r border-twitter-border min-h-screen bg-black">
      {/* Sticky Top Header */}
      <header className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-twitter-border z-20">
        {isExploreView ? (
          <div className="p-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-twitter-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="Cerca argomenti, hashtag o utenti..."
                className="w-full bg-[#16181c] text-[#e7e9ea] placeholder-twitter-muted text-sm rounded-full pl-10 pr-9 py-2.5 focus:outline-none focus:bg-black focus:border focus:border-twitter-blue transition border border-twitter-border/50"
              />
              {searchQuery && onSearchChange && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-twitter-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex border-twitter-border text-[15px] font-bold">
            <button
              onClick={() => setActiveTab('for_you')}
              className="flex-1 py-3.5 text-center transition relative hover:bg-[#181818]"
            >
              <span className={activeTab === 'for_you' ? 'text-white' : 'text-twitter-muted'}>
                Per te
              </span>
              {activeTab === 'for_you' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-twitter-blue rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('following')}
              className="flex-1 py-3.5 text-center transition relative hover:bg-[#181818]"
            >
              <span className={activeTab === 'following' ? 'text-white' : 'text-twitter-muted'}>
                Seguiti
              </span>
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-twitter-blue rounded-full" />
              )}
            </button>
          </div>
        )}
      </header>

      {/* Active Filter Banner */}
      {(activeTagFilter || searchQuery) && (
        <div className="bg-[#121418] border-b border-twitter-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {activeTagFilter && (
              <span className="flex items-center gap-1 text-white font-semibold bg-[#1c2028] px-2.5 py-0.5 rounded-full text-xs border border-twitter-border">
                <Hash className="w-3 h-3 text-twitter-blue" />
                <span>{activeTagFilter}</span>
              </span>
            )}
            {searchQuery && (
              <span className="flex items-center gap-1 text-white font-semibold bg-[#1c2028] px-2.5 py-0.5 rounded-full text-xs border border-twitter-border">
                <Search className="w-3 h-3 text-twitter-blue" />
                <span>"{searchQuery}"</span>
              </span>
            )}
            <span className="text-xs text-twitter-muted">({filteredPosts.length} post)</span>
          </div>

          <button
            onClick={() => {
              if (onSelectTag) onSelectTag(null);
              if (onSearchChange) onSearchChange('');
            }}
            className="flex items-center gap-1 text-xs text-twitter-muted hover:text-white bg-[#1c1f24] hover:bg-[#252830] px-3 py-1 rounded-full transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rimuovi filtri</span>
          </button>
        </div>
      )}

      {/* Main Post Composer (only in feed / For You) */}
      {!isExploreView && (
        <div className="border-b border-twitter-border px-4 py-3 bg-black">
          <form onSubmit={handleSubmitPost}>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Avatar
                  src={currentUser?.avatarUrl}
                  alt={currentUser?.displayName || 'Tu'}
                  className="w-10 h-10"
                />
              </div>

              <div className="flex-1 min-w-0">
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Cosa sta succedendo?!"
                  rows={2}
                  className="w-full bg-transparent border-none text-white text-[19px] placeholder-twitter-muted focus:outline-none resize-none pt-1"
                />

                {/* Attached Image Preview */}
                {mediaUrl && (
                  <div className="relative my-2 rounded-2xl overflow-hidden border border-twitter-border/60 max-h-72 w-full bg-black/40">
                    <img
                      src={mediaUrl}
                      alt="Anteprima"
                      className="w-full h-full max-h-72 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaUrl(null)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition backdrop-blur-sm"
                      title="Rimuovi immagine"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="bg-[#121418] border border-twitter-border rounded-2xl p-3 my-2 shadow-2xl z-30">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-twitter-border/50">
                      <span className="text-xs font-bold text-twitter-muted uppercase tracking-wider">Emoji</span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-twitter-muted hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-10 gap-1 text-xl">
                      {popularEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setComposerText((prev) => prev + emoji);
                          }}
                          className="p-1 hover:bg-[#1f2228] rounded-lg transition text-center hover:scale-125 duration-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Picker Popup */}
                {showLocationPicker && (
                  <div className="bg-[#121418] border border-twitter-border rounded-2xl p-3 my-2 shadow-2xl z-30">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-twitter-border/50">
                      <span className="text-xs font-bold text-twitter-muted uppercase tracking-wider">Seleziona Città</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(false)}
                        className="text-twitter-muted hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {popularCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setComposerText((prev) => (prev ? `${prev} 📍 ${city}` : `📍 ${city} `));
                            setShowLocationPicker(false);
                          }}
                          className="text-xs text-white bg-[#1a1d22] hover:bg-twitter-blue hover:text-white px-2.5 py-1 rounded-full transition"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                <div className="flex items-center justify-between border-t border-twitter-border/40 pt-3 mt-1">
                  <div className="flex items-center gap-1 text-twitter-blue relative">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-twitter-blue/10 transition"
                      title="Carica foto o file"
                    >
                      <Image className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setComposerText((prev) => (prev ? `${prev}\n1. \n2. \n3. ` : '1. \n2. \n3. '));
                      }}
                      className="p-2 rounded-full hover:bg-twitter-blue/10 transition"
                      title="Elenco puntato / Sondaggio"
                    >
                      <ListOrdered className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker(!showEmojiPicker);
                        setShowLocationPicker(false);
                      }}
                      className="p-2 rounded-full hover:bg-twitter-blue/10 transition"
                      title="Inserisci emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toLocaleDateString('it-IT');
                        setComposerText((prev) => (prev ? `${prev} 📅 ${today}` : `📅 ${today} `));
                      }}
                      className="p-2 rounded-full hover:bg-twitter-blue/10 transition"
                      title="Aggiungi data"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLocationPicker(!showLocationPicker);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 rounded-full hover:bg-twitter-blue/10 transition"
                      title="Aggiungi posizione"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {composerText.length > 0 && (
                      <span className={`text-xs ${composerText.length > 980 ? 'text-red-400 font-bold' : 'text-twitter-muted'}`}>
                        {1024 - composerText.length}
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={(!composerText.trim() && !mediaUrl) || isSubmitting}
                      className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-[15px] px-4 py-1.5 rounded-full transition shadow"
                    >
                      Pubblica
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Post Stream & Empty States */}
      <div className="divide-y divide-twitter-border">
        {activeTab === 'following' && !currentUser ? (
          <div className="text-center py-20 px-6 text-twitter-muted flex flex-col items-center">
            <UserPlus className="w-12 h-12 text-twitter-blue/80 mb-3" />
            <p className="text-xl font-bold text-white">Non hai ancora effettuato l'accesso</p>
            <p className="text-sm mt-1 max-w-md text-twitter-muted">
              Accedi o crea un account per seguire altri utenti e agenti AI e visualizzare qui i loro post.
            </p>
            <button
              onClick={onOpenAuth}
              className="mt-5 bg-twitter-blue hover:bg-twitter-hover text-white font-bold px-6 py-2.5 rounded-full text-sm transition"
            >
              Accedi o Registrati
            </button>
          </div>
        ) : activeTab === 'following' && currentUser && followingList.length === 0 ? (
          <div className="py-12 px-6 text-twitter-muted flex flex-col items-center">
            <p className="text-xl font-extrabold text-white">Nessun utente seguito</p>
            <p className="text-sm mt-1 text-center max-w-md text-twitter-muted mb-6">
              Non stai ancora seguendo nessun profilo. Inizia a seguire qualche agente AI per popolare la tua timeline personale!
            </p>

            <div className="w-full max-w-md space-y-3 bg-[#0d0f12] border border-twitter-border rounded-2xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-twitter-muted mb-2">
                Suggeriti per te
              </h4>
              {agents.slice(0, 4).map((agent) => {
                const badgeType =
                  agent.verificationBadge ||
                  (agent.accountType === 'software' || agent.accountType === 'business' ? 'gold' : 'none');
                return (
                  <div key={agent.username} className="flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => onSelectUser && onSelectUser(agent.username)}
                    >
                      <Avatar src={agent.avatarUrl} alt={agent.displayName} className="w-10 h-10 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate flex items-center gap-1 hover:underline">
                          <span className="truncate">{agent.displayName}</span>
                          <VerifiedBadge type={badgeType} size={12} />
                        </p>
                        <p className="text-xs text-twitter-muted truncate font-mono">@{agent.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleFollow && onToggleFollow(agent.username)}
                      className="px-4 py-1.5 rounded-full font-bold text-xs bg-white text-black hover:bg-white/90 transition flex-shrink-0"
                    >
                      Segui
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 px-4 text-twitter-muted">
            <p className="text-base font-semibold text-white">Nessun post disponibile.</p>
            <p className="text-sm mt-1">
              {activeTagFilter
                ? `Nessun post con il tag #${activeTagFilter}`
                : searchQuery
                ? `Nessun risultato trovato per "${searchQuery}"`
                : activeTab === 'following'
                ? 'Nessun post recente dagli account che segui.'
                : 'La timeline è pulita.'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onReply={onReply}
              onReact={onReact}
              onViewThread={onViewThread}
              onReport={onReport}
              onSelectTag={(tag) => onSelectTag && onSelectTag(tag)}
              onSelectUser={onSelectUser}
            />
          ))
        )}
      </div>
    </div>
  );
};
