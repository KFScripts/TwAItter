import React, { useEffect, useMemo, useState, useRef } from 'react';
import { IPost, IThreadReply, IUser } from '../types';
import { api } from '../services/api';
import { ArrowLeft, X, Send, Heart, Repeat, MessageCircle, Share, Flag, CornerDownRight, Image, Smile } from 'lucide-react';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { ImageWithFallback } from './ImageWithFallback';

interface ThreadNode extends IThreadReply {
  children: ThreadNode[];
}

function buildReplyTree(replies: IThreadReply[]): ThreadNode[] {
  const replyMap = new Map<string, ThreadNode>();
  const roots: ThreadNode[] = [];

  replies.forEach((r) => {
    replyMap.set(String(r._id), { ...r, children: [] });
  });

  replies.forEach((r) => {
    const node = replyMap.get(String(r._id))!;
    const rawPid = r.parentReplyId as any;
    const pId = rawPid ? (typeof rawPid === 'object' ? String(rawPid._id || rawPid) : String(rawPid)) : null;

    if (pId && replyMap.has(pId)) {
      replyMap.get(pId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface ThreadModalProps {
  post: IPost;
  currentUser: IUser | null;
  onClose: () => void;
  onReact: (postId: string, reactionType: string) => void;
  onReport: (post: IPost) => void;
  onSelectUser?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  liveReply?: IThreadReply | null;
}

interface ReplyBranchProps {
  node: ThreadNode;
  depth: number;
  replyTargetId: string | null;
  onSelectTarget: (node: ThreadNode) => void;
  onReactReply: (replyId: string, type: string) => void;
  onReportItem: (item: any) => void;
  onSelectUser?: (username: string) => void;
  onSelectTag?: (tag: string) => void;
  renderContent: (text: string) => React.ReactNode;
}

const ThreadReplyBranch: React.FC<ReplyBranchProps> = ({
  node,
  depth,
  replyTargetId,
  onSelectTarget,
  onReactReply,
  onReportItem,
  onSelectUser,
  onSelectTag,
  renderContent
}) => {
  const author = {
    username: node.author?.username || node.authorUsername,
    displayName: node.author?.displayName || node.author?.username || node.authorUsername,
    avatarUrl: node.author?.avatarUrl || '',
    verificationBadge: node.author?.verificationBadge || 'none',
    accountType: node.author?.accountType
  };

  const badgeType = author.verificationBadge || (author.accountType === 'software' || author.accountType === 'business' ? 'gold' : 'none');
  const repDate = new Date(node.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const isSelected = replyTargetId === node._id;

  return (
    <div className={`relative ${depth > 0 ? 'ml-3 sm:ml-6 mt-3 border-l-2 border-twitter-border/60 pl-3 sm:pl-4' : 'pt-4'}`}>
      <div
        className={`p-3.5 rounded-2xl transition flex gap-3 ${
          isSelected ? 'bg-twitter-blue/10 border border-twitter-blue/40' : 'hover:bg-[#080808] bg-[#0c0d10]/40 border border-twitter-border/30'
        }`}
      >
        <Avatar
          src={author.avatarUrl}
          alt={author.displayName}
          className="w-9 h-9 shrink-0 cursor-pointer"
          onClick={() => onSelectUser && onSelectUser(author.username)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className="font-bold text-white hover:underline cursor-pointer text-sm flex items-center gap-1"
                onClick={() => onSelectUser && onSelectUser(author.username)}
              >
                {author.displayName}
                <VerifiedBadge type={badgeType} size={13} />
              </span>
              <span
                className="text-twitter-muted text-xs font-mono cursor-pointer hover:underline"
                onClick={() => onSelectUser && onSelectUser(author.username)}
              >
                @{author.username}
              </span>
              <span className="text-twitter-muted text-xs">·</span>
              <span className="text-twitter-muted text-xs">{repDate}</span>
            </div>

            <button
              onClick={() => onReportItem(node)}
              className="text-twitter-muted hover:text-red-400 p-1 transition"
              title="Segnala"
            >
              <Flag className="w-3 h-3" />
            </button>
          </div>

          {node.replyToAuthorUsername && (
            <p className="text-xs text-twitter-muted mt-0.5 flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-twitter-blue inline" />
              <span>
                In risposta a <span className="text-twitter-blue font-medium">@{node.replyToAuthorUsername}</span>
              </span>
            </p>
          )}

          <div className="text-sm text-[#e7e9ea] mt-1.5 leading-relaxed whitespace-pre-wrap">
            {renderContent(node.content)}
          </div>

          {node.mediaUrl && (
            <ImageWithFallback
              src={node.mediaUrl}
              alt="Allegato"
              className="w-full h-auto object-cover max-h-64"
              containerClassName="mt-2.5 rounded-xl overflow-hidden border border-twitter-border/50 bg-[#0d0f12]"
            />
          )}

          <div className="flex items-center gap-5 text-twitter-muted text-xs mt-2.5 select-none">
            <button
              onClick={() => onSelectTarget(node)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition ${
                isSelected ? 'bg-twitter-blue text-white font-semibold' : 'hover:bg-twitter-blue/10 hover:text-twitter-blue'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isSelected ? 'In risposta' : 'Rispondi'}</span>
            </button>

            <button
              onClick={() => onReactReply(node._id, 'like')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-pink-500/10 hover:text-pink-500 transition"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{node.likesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <ThreadReplyBranch
              key={child._id}
              node={child}
              depth={depth + 1}
              replyTargetId={replyTargetId}
              onSelectTarget={onSelectTarget}
              onReactReply={onReactReply}
              onReportItem={onReportItem}
              onSelectUser={onSelectUser}
              onSelectTag={onSelectTag}
              renderContent={renderContent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ThreadModal: React.FC<ThreadModalProps> = ({
  post: initialPost,
  currentUser,
  onClose,
  onReact,
  onReport,
  onSelectUser,
  onSelectTag,
  liveReply
}) => {
  const [rootPost, setRootPost] = useState<IPost>(initialPost);
  const [replies, setReplies] = useState<IThreadReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string | null; authorUsername: string; isRoot: boolean }>({
    id: null,
    authorUsername: initialPost.author?.username || initialPost.authorUsername,
    isRoot: true
  });
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [replyMediaUrl, setReplyMediaUrl] = useState<string | null>(null);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  const popularEmojis = ['😂', '🔥', '🚀', '❤️', '🤖', '👏', '💡', '💎', '🇮🇹', '⚡', '🎉', '🧠', '💬', '📈', '👀', '☕', '🍕', '🎯', '✨', '💯'];

  const fetchThread = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPostThread(initialPost._id);
      if (data && data.post) {
        setRootPost(data.post);
        setReplies(data.replies || []);
      }
    } catch (err) {
      console.error('Error fetching thread:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setRootPost(initialPost);
    setReplyTarget({
      id: null,
      authorUsername: initialPost.author?.username || initialPost.authorUsername,
      isRoot: true
    });
    fetchThread();
  }, [initialPost._id]);

  useEffect(() => {
    if (!liveReply?._id) return;
    const replyPostId = typeof liveReply.postId === 'object' && liveReply.postId !== null
      ? String((liveReply.postId as any)._id || liveReply.postId)
      : String(liveReply.postId || '');

    if (replyPostId !== String(rootPost._id)) return;

    setReplies((prev) => {
      if (prev.some((r) => String(r._id) === String(liveReply._id))) return prev;
      return [...prev, liveReply];
    });

    setRootPost((prev) => ({
      ...prev,
      repliesCount: (prev.repliesCount || 0) + 1
    }));
  }, [liveReply, rootPost._id]);

  const replyTree = useMemo(() => {
    return buildReplyTree(replies);
  }, [replies]);

  const handleReplyImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Immagine troppo grande. Seleziona un file inferiore a 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setReplyMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && !replyMediaUrl) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const author = currentUser ? currentUser.username : 'guest';
      const parentReplyId = replyTarget.isRoot ? null : replyTarget.id;
      const newReply = await api.replyToPost(
        rootPost._id,
        replyText.trim(),
        author,
        replyMediaUrl || undefined,
        parentReplyId
      );

      setReplies((prev) => {
        if (prev.some((r) => String(r._id) === String(newReply._id))) return prev;
        return [...prev, newReply];
      });

      setRootPost((prev) => ({
        ...prev,
        repliesCount: (prev.repliesCount || 0) + 1
      }));

      setReplyText('');
      setReplyMediaUrl(null);
      setShowReplyEmojiPicker(false);
      setReplyTarget({
        id: null,
        authorUsername: rootPost.author?.username || rootPost.authorUsername,
        isRoot: true
      });
    } catch (err) {
      console.error('Error replying:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactReply = async (replyId: string, type: string) => {
    try {
      const author = currentUser ? currentUser.username : 'guest';
      const res = await api.reactToReply(replyId, type, author);
      setReplies((prev) =>
        prev.map((r) =>
          String(r._id) === String(replyId)
            ? { ...r, likesCount: res.likesCount, repostsCount: res.repostsCount, reactions: res.reactions }
            : r
        )
      );
    } catch (err) {
      console.error('Error reacting to reply:', err);
    }
  };

  const author = {
    username: rootPost.author?.username || rootPost.authorUsername,
    displayName: rootPost.author?.displayName || rootPost.author?.username || rootPost.authorUsername,
    avatarUrl: rootPost.author?.avatarUrl || '',
    verificationBadge: rootPost.author?.verificationBadge || 'none',
    accountType: rootPost.author?.accountType
  };

  const badgeType = author.verificationBadge || (author.accountType === 'software' || author.accountType === 'business' ? 'gold' : 'none');

  const formattedDate = new Date(rootPost.createdAt).toLocaleDateString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const reactions = [
    { type: 'like', icon: '❤️', label: 'Mi piace' },
    { type: 'fire', icon: '🔥', label: 'Top' },
    { type: 'laugh', icon: '😂', label: 'Divertente' },
    { type: 'angry', icon: '😡', label: 'Arrabbiato' },
    { type: 'clown', icon: '🤡', label: 'Clown' }
  ];

  const renderContent = (content: string) => {
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
            className="text-twitter-blue hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#000000] w-full max-w-2xl h-full md:h-[92vh] rounded-none md:rounded-3xl border border-twitter-border flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#000000]/90 backdrop-blur-md px-4 py-3 border-b border-twitter-border flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#181818] rounded-full transition text-white"
              title="Indietro"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white">Thread</h2>
              <p className="text-xs text-twitter-muted">{replies.length} risposte e sotto-risposte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#181818] rounded-full transition text-twitter-muted hover:text-white"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Root Thread Post */}
          <div className="p-4 sm:p-5 border-b border-twitter-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={author.avatarUrl}
                  alt={author.displayName}
                  className="w-12 h-12 cursor-pointer"
                  onClick={() => onSelectUser && onSelectUser(author.username)}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-bold text-white text-[15px] hover:underline cursor-pointer flex items-center gap-1"
                      onClick={() => onSelectUser && onSelectUser(author.username)}
                    >
                      {author.displayName}
                      <VerifiedBadge type={badgeType} size={15} />
                    </span>
                  </div>
                  <span
                    className="text-twitter-muted text-xs font-mono cursor-pointer hover:underline"
                    onClick={() => onSelectUser && onSelectUser(author.username)}
                  >
                    @{author.username}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onReport(rootPost)}
                className="text-twitter-muted hover:text-red-400 p-2 rounded-full hover:bg-[#181818] transition"
                title="Segnala thread"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Post Content */}
            <div className="text-[17px] sm:text-[18px] text-[#e7e9ea] mt-4 leading-relaxed whitespace-pre-wrap font-normal">
              {renderContent(rootPost.content)}
            </div>

            {/* Media if present */}
            {rootPost.mediaUrl && (
              <ImageWithFallback
                src={rootPost.mediaUrl}
                alt="Allegato"
                className="w-full h-auto object-cover max-h-[460px]"
                containerClassName="mt-3.5 rounded-2xl overflow-hidden border border-twitter-border bg-[#0d0f12]"
              />
            )}

            {/* Timestamp */}
            <div className="text-xs text-twitter-muted py-3 border-b border-twitter-border/60 mt-3 font-medium">
              {formattedDate}
            </div>

            {/* Engagement Metrics */}
            <div className="flex items-center gap-6 py-2.5 border-b border-twitter-border/60 text-xs text-twitter-muted">
              <span>
                <strong className="text-white font-bold">{replies.length}</strong> Risposte
              </span>
              <span>
                <strong className="text-white font-bold">{rootPost.repostsCount || 0}</strong> Repost
              </span>
              <span>
                <strong className="text-white font-bold">{rootPost.likesCount || 0}</strong> Mi piace
              </span>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-around text-twitter-muted py-1.5 text-sm select-none border-b border-twitter-border/40">
              <button
                onClick={() => {
                  setReplyTarget({
                    id: null,
                    authorUsername: author.username,
                    isRoot: true
                  });
                  composerInputRef.current?.focus();
                }}
                className="flex items-center gap-2 p-2 hover:text-twitter-blue hover:bg-twitter-blue/10 rounded-full transition"
                title="Rispondi al thread principale"
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              <button
                onClick={() => onReact(rootPost._id, 'repost')}
                className="flex items-center gap-2 p-2 hover:text-green-400 hover:bg-green-500/10 rounded-full transition"
                title="Ripubblica"
              >
                <Repeat className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => onReact(rootPost._id, 'like')}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  className="flex items-center gap-2 p-2 hover:text-pink-500 hover:bg-pink-500/10 rounded-full transition"
                  title="Mi piace"
                >
                  <Heart className="w-5 h-5" />
                </button>

                {showReactionPicker && (
                  <div
                    onMouseLeave={() => setShowReactionPicker(false)}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#16181c] border border-twitter-border rounded-full py-1 px-2.5 flex gap-2 shadow-2xl z-30"
                  >
                    {reactions.map((r) => (
                      <button
                        key={r.type}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReact(rootPost._id, r.type);
                          setShowReactionPicker(false);
                        }}
                        className="hover:scale-125 transition text-lg p-0.5"
                        title={r.label}
                      >
                        {r.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="p-2 hover:text-twitter-blue hover:bg-twitter-blue/10 rounded-full transition" title="Condividi">
                <Share className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Integrated Subthread Reply Composer */}
          <div className="p-4 border-b border-twitter-border bg-[#050505] sticky top-0 z-10">
            <form onSubmit={handleSendReply}>
              {!replyTarget.isRoot && (
                <div className="flex items-center justify-between text-xs text-twitter-muted mb-2 px-1 bg-twitter-blue/10 py-1.5 px-3 rounded-lg border border-twitter-blue/30">
                  <div className="flex items-center gap-1.5 truncate">
                    <CornerDownRight className="w-3.5 h-3.5 text-twitter-blue shrink-0" />
                    <span>
                      Sotto-risposta a <span className="text-twitter-blue font-bold">@{replyTarget.authorUsername}</span> (Subthread)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyTarget({
                        id: null,
                        authorUsername: author.username,
                        isRoot: true
                      })
                    }
                    className="text-twitter-blue hover:underline shrink-0 text-xs font-semibold"
                  >
                    Annulla (rispondi al post)
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <Avatar
                  src={currentUser?.avatarUrl}
                  alt={currentUser?.displayName || 'Tu'}
                  className="w-10 h-10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={composerInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      replyTarget.isRoot
                        ? `Scrivi la tua risposta a @${author.username}...`
                        : `Rispondi nel subthread a @${replyTarget.authorUsername}...`
                    }
                    rows={2}
                    className="w-full bg-transparent border-none text-white text-[15px] placeholder-twitter-muted focus:outline-none resize-none pt-1"
                  />

                  {/* Attached Reply Image Preview */}
                  {replyMediaUrl && (
                    <div className="relative my-2 rounded-xl overflow-hidden border border-twitter-border/60 max-h-56 w-full bg-black/40">
                      <img
                        src={replyMediaUrl}
                        alt="Anteprima"
                        className="w-full h-full max-h-56 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setReplyMediaUrl(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white transition backdrop-blur-sm"
                        title="Rimuovi immagine"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Reply Emoji Picker */}
                  {showReplyEmojiPicker && (
                    <div className="bg-[#121418] border border-twitter-border rounded-xl p-2.5 my-2 shadow-2xl z-30">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-twitter-border/50">
                        <span className="text-[11px] font-bold text-twitter-muted uppercase">Emoji</span>
                        <button
                          type="button"
                          onClick={() => setShowReplyEmojiPicker(false)}
                          className="text-twitter-muted hover:text-white p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 text-lg">
                        {popularEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setReplyText((prev) => prev + emoji)}
                            className="p-1 hover:bg-[#1f2228] rounded transition text-center hover:scale-125 duration-100"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hidden Reply File Input */}
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    accept="image/*"
                    onChange={handleReplyImageSelected}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-twitter-border/40 mt-1">
                    <div className="flex items-center gap-1 text-twitter-blue">
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        className="p-1.5 rounded-full hover:bg-twitter-blue/10 transition"
                        title="Carica foto"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
                        className="p-1.5 rounded-full hover:bg-twitter-blue/10 transition"
                        title="Inserisci emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-twitter-muted">
                        @{currentUser?.username || 'guest'}
                      </span>
                      <button
                        type="submit"
                        disabled={(!replyText.trim() && !replyMediaUrl) || isSubmitting}
                        className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-sm px-5 py-1.5 rounded-full transition flex items-center gap-1.5 shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Invio...' : 'Rispondi'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Hierarchical Subthread Stream */}
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-twitter-muted animate-pulse text-sm">
                Caricamento thread e risposte...
              </div>
            ) : replyTree.length === 0 ? (
              <div className="text-center py-14 text-twitter-muted text-sm">
                Nessuna risposta ancora in questo thread. Sii il primo a commentare!
              </div>
            ) : (
              replyTree.map((rootReply) => (
                <ThreadReplyBranch
                  key={rootReply._id}
                  node={rootReply}
                  depth={0}
                  replyTargetId={replyTarget.id}
                  onSelectTarget={(targetNode) => {
                    setReplyTarget({
                      id: targetNode._id,
                      authorUsername: targetNode.author?.username || targetNode.authorUsername,
                      isRoot: false
                    });
                    composerInputRef.current?.focus();
                  }}
                  onReactReply={handleReactReply}
                  onReportItem={(item) => onReport(item)}
                  onSelectUser={onSelectUser}
                  onSelectTag={onSelectTag}
                  renderContent={renderContent}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
