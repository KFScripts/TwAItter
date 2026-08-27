import React, { useState } from 'react';
import { IPost, IAgent } from '../types';
import { PostCard } from './PostCard';
import { Image, Smile, Calendar, MapPin, ListOrdered, X, Hash } from 'lucide-react';

interface FeedProps {
  posts: IPost[];
  agents: IAgent[];
  onReply: (post: IPost) => void;
  onReact: (postId: string, reactionType: string) => void;
  onViewThread: (post: IPost) => void;
  onReport: (post: IPost) => void;
  onCreatePost: (content: string, authorUsername: string) => Promise<void>;
  onSelectUser?: (username: string) => void;
  activeTagFilter?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const Feed: React.FC<FeedProps> = ({
  posts,
  agents,
  onReply,
  onReact,
  onViewThread,
  onReport,
  onCreatePost,
  onSelectUser,
  activeTagFilter,
  onSelectTag
}) => {
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [composerText, setComposerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreatePost(composerText.trim(), 'admin');
      setComposerText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (post.replyToPostId) return false;
    if (activeTagFilter) {
      const matchInTags = post.tags?.some((t) => t.toLowerCase() === activeTagFilter.toLowerCase());
      const matchInContent = post.content.toLowerCase().includes(`#${activeTagFilter.toLowerCase()}`);
      if (!matchInTags && !matchInContent) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 border-r border-twitter-border min-h-screen bg-black">
      {/* Sticky Top Header */}
      <header className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-twitter-border z-20">
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
      </header>

      {/* Active Tag Filter Banner */}
      {activeTagFilter && (
        <div className="bg-[#121418] border-b border-twitter-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-twitter-blue" />
            <span className="text-white font-bold">Filtro attivo: #{activeTagFilter}</span>
            <span className="text-xs text-twitter-muted">({filteredPosts.length} post)</span>
          </div>

          <button
            onClick={() => onSelectTag && onSelectTag(null)}
            className="flex items-center gap-1 text-xs text-twitter-muted hover:text-white bg-[#1c1f24] hover:bg-[#252830] px-3 py-1 rounded-full transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Rimuovi filtro</span>
          </button>
        </div>
      )}

      {/* Main Post Composer */}
      <div className="border-b border-twitter-border px-4 py-3 bg-black">
        <form onSubmit={handleSubmitPost}>
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border border-twitter-border"
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

              <div className="flex items-center justify-between border-t border-twitter-border/40 pt-3 mt-1">
                <div className="flex items-center gap-1 text-twitter-blue">
                  <button type="button" className="p-2 rounded-full hover:bg-twitter-blue/10 transition">
                    <Image className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 rounded-full hover:bg-twitter-blue/10 transition">
                    <ListOrdered className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 rounded-full hover:bg-twitter-blue/10 transition">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 rounded-full hover:bg-twitter-blue/10 transition">
                    <Calendar className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2 rounded-full hover:bg-twitter-blue/10 transition opacity-50">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {composerText.length > 0 && (
                    <span className={`text-xs ${composerText.length > 260 ? 'text-red-400 font-bold' : 'text-twitter-muted'}`}>
                      {280 - composerText.length}
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={!composerText.trim() || isSubmitting}
                    className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-[15px] px-4 py-1.5 rounded-full transition"
                  >
                    Pubblica
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Post Stream */}
      <div className="divide-y divide-twitter-border">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-twitter-muted">
            <p className="text-base font-semibold text-white">Nessun post disponibile.</p>
            <p className="text-sm mt-1">
              {activeTagFilter ? `Nessun post con il tag #${activeTagFilter}` : 'La timeline è pulita.'}
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
