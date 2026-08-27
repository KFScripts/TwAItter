import React, { useState } from 'react';
import { IPost } from '../types';
import { Heart, Repeat, MessageCircle, MoreHorizontal, Share, Flag } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

interface PostCardProps {
  post: IPost;
  onReply: (post: IPost) => void;
  onReact: (postId: string, reactionType: string) => void;
  onViewThread: (post: IPost) => void;
  onReport: (post: IPost) => void;
  onSelectTag?: (tag: string) => void;
  onSelectUser?: (username: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onReply,
  onReact,
  onViewThread,
  onReport,
  onSelectTag,
  onSelectUser
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const author = post.author || {
    username: post.authorUsername,
    displayName: post.authorUsername,
    avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    verificationBadge: 'blue'
  };

  const badgeType = author.verificationBadge || (author.accountType === 'software' || author.accountType === 'business' ? 'gold' : 'blue');

  const formattedDate = new Date(post.createdAt).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const reactions = [
    { type: 'like', icon: '❤️', label: 'Mi piace' },
    { type: 'fire', icon: '🔥', label: 'Top' },
    { type: 'laugh', icon: '😂', label: 'Divertente' },
    { type: 'angry', icon: '😡', label: 'Arrabbiato' },
    { type: 'clown', icon: '🤡', label: 'Clown' }
  ];

  // Helper to format text with clickable hashtags, mentions, and URLs
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const tokenRegex = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+|https?:\/\/[^\s]+)/g;
    const parts = content.split(tokenRegex);

    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onSelectTag && onSelectTag(tag);
            }}
            className="text-twitter-blue hover:underline cursor-pointer font-medium inline-block"
          >
            {part}
          </span>
        );
      }

      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser && onSelectUser(username);
            }}
            className="text-twitter-blue hover:underline cursor-pointer font-medium inline-block"
          >
            {part}
          </span>
        );
      }

      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-twitter-blue hover:underline font-medium"
          >
            {part}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <article className="border-b border-twitter-border hover:bg-[#080808] transition duration-150 p-4 relative group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={author.avatarUrl}
            alt={author.displayName}
            className="w-10 h-10 rounded-full object-cover border border-twitter-border/40 hover:opacity-90 cursor-pointer"
            onClick={() => {
              if (onSelectUser) onSelectUser(author.username);
              else onViewThread(post);
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className="font-bold text-white hover:underline cursor-pointer truncate text-sm flex items-center gap-1"
                onClick={() => {
                  if (onSelectUser) onSelectUser(author.username);
                  else onViewThread(post);
                }}
              >
                {author.displayName}
                <VerifiedBadge type={badgeType} size={15} />
              </span>

              <span
                className="text-twitter-muted text-xs font-mono cursor-pointer hover:underline"
                onClick={() => onSelectUser && onSelectUser(author.username)}
              >
                @{author.username}
              </span>
              <span className="text-twitter-muted text-xs">·</span>
              <span className="text-twitter-muted text-xs hover:underline cursor-pointer" onClick={() => onViewThread(post)}>
                {formattedDate}
              </span>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="text-twitter-muted hover:text-white p-1 rounded-full hover:bg-[#181818] transition"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-1 w-44 bg-black border border-twitter-border rounded-xl shadow-xl py-1 z-20">
                  <button
                    onClick={() => {
                      onReport(post);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-[#181818] flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Segnala post</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Post Text with Interactive Hashtags & Mentions */}
          <p
            className="text-sm text-[#e7e9ea] mt-1.5 leading-relaxed whitespace-pre-wrap cursor-pointer"
            onClick={() => onViewThread(post)}
          >
            {renderFormattedContent(post.content)}
          </p>

          {/* Attached Media / Image */}
          {post.mediaUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-twitter-border max-h-96 bg-[#111]">
              <img
                src={post.mediaUrl}
                alt="Allegato"
                className="w-full h-auto object-cover max-h-96 hover:scale-[1.01] transition duration-200 cursor-pointer"
                onClick={() => onViewThread(post)}
                loading="lazy"
              />
            </div>
          )}

          {/* Tag Chips */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {post.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag && onSelectTag(tag);
                  }}
                  className="text-xs text-twitter-blue hover:underline bg-twitter-blue/10 hover:bg-twitter-blue/20 px-2 py-0.5 rounded-full transition"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Engagement Bar */}
          <div className="flex items-center justify-between text-twitter-muted mt-3 max-w-md text-xs select-none">
            {/* Reply */}
            <button
              onClick={() => onReply(post)}
              className="flex items-center gap-1.5 hover:text-twitter-blue transition group/btn"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-twitter-blue/10">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>{post.repliesCount || 0}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => onReact(post._id, 'repost')}
              className="flex items-center gap-1.5 hover:text-green-400 transition group/btn"
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-green-500/10">
                <Repeat className="w-4 h-4" />
              </div>
              <span>{post.repostsCount || 0}</span>
            </button>

            {/* Like */}
            <div className="relative">
              <button
                onClick={() => onReact(post._id, 'like')}
                onMouseEnter={() => setShowReactionPicker(true)}
                className="flex items-center gap-1.5 hover:text-pink-500 transition group/btn"
              >
                <div className="p-1.5 rounded-full group-hover/btn:bg-pink-500/10">
                  <Heart className="w-4 h-4" />
                </div>
                <span>{post.likesCount || 0}</span>
              </button>

              {/* Quick Reactions Popup */}
              {showReactionPicker && (
                <div
                  onMouseLeave={() => setShowReactionPicker(false)}
                  className="absolute bottom-8 left-0 bg-[#16181c] border border-twitter-border rounded-full py-1 px-2 flex gap-2 shadow-2xl z-30 animate-in fade-in"
                >
                  {reactions.map((r) => (
                    <button
                      key={r.type}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact(post._id, r.type);
                        setShowReactionPicker(false);
                      }}
                      className="hover:scale-125 transition text-base p-0.5"
                      title={r.label}
                    >
                      {r.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Share */}
            <button className="flex items-center gap-1.5 hover:text-twitter-blue transition group/btn">
              <div className="p-1.5 rounded-full group-hover/btn:bg-twitter-blue/10">
                <Share className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
