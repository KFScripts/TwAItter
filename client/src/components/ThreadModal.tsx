import React, { useEffect, useMemo, useState } from 'react';
import { IPost, IAgent } from '../types';
import { api } from '../services/api';
import { X, Send, MessageCircle, CornerDownRight } from 'lucide-react';
import { PostCard } from './PostCard';

interface ThreadModalProps {
  post: IPost;
  agents: IAgent[];
  onClose: () => void;
  onReact: (postId: string, reactionType: string) => void;
  onReport: (post: IPost) => void;
  liveReply?: IPost | null;
}

interface ThreadNode {
  post: IPost;
  children: ThreadNode[];
}

function buildThreadTree(posts: IPost[]): ThreadNode[] {
  const byId = new Map<string, ThreadNode>();
  for (const p of posts) {
    const id = String(p._id);
    if (!byId.has(id)) byId.set(id, { post: p, children: [] });
  }

  const roots: ThreadNode[] = [];
  for (const p of posts) {
    const node = byId.get(String(p._id))!;
    const parentId = p.replyToPostId ? String(p.replyToPostId) : '';
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: ThreadNode[]) => {
    nodes.sort((a, b) => new Date(a.post.createdAt).getTime() - new Date(b.post.createdAt).getTime());
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

const ThreadBranch: React.FC<{
  node: ThreadNode;
  depth: number;
  highlightId: string;
  replyTargetId: string;
  onReply: (post: IPost) => void;
  onReact: (postId: string, reactionType: string) => void;
  onReport: (post: IPost) => void;
}> = ({ node, depth, highlightId, replyTargetId, onReply, onReact, onReport }) => {
  const isRoot = depth === 0;
  const isTarget = String(node.post._id) === replyTargetId;

  return (
    <div className={isRoot ? '' : depth < 6 ? 'ml-4 pl-3 border-l border-twitter-border/50' : 'pl-3 border-l border-twitter-border/30'}>
      <div className={isTarget ? 'ring-1 ring-twitter-blue/40 rounded-xl' : ''}>
        <PostCard
          post={node.post}
          onReply={onReply}
          onReact={onReact}
          onViewThread={() => {}}
          onReport={onReport}
          compact={!isRoot}
          highlighted={String(node.post._id) === highlightId}
        />
      </div>
      {node.children.map((child) => (
        <ThreadBranch
          key={child.post._id}
          node={child}
          depth={depth + 1}
          highlightId={highlightId}
          replyTargetId={replyTargetId}
          onReply={onReply}
          onReact={onReact}
          onReport={onReport}
        />
      ))}
    </div>
  );
};

export const ThreadModal: React.FC<ThreadModalProps> = ({
  post,
  agents,
  onClose,
  onReact,
  onReport,
  liveReply
}) => {
  const [threadPosts, setThreadPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('human_creator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<IPost>(post);

  const fetchThread = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPostThread(post._id);
      setThreadPosts(data);
    } catch (err) {
      console.error('Error fetching thread:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setReplyTarget(post);
    fetchThread();
  }, [post._id]);

  useEffect(() => {
    if (!liveReply?._id) return;
    const threadRoot = String(post.rootPostId || post._id);
    const replyRoot = String(liveReply.rootPostId || liveReply.replyToPostId || '');
    if (replyRoot !== threadRoot && String(liveReply.replyToPostId) !== String(post._id)) return;

    setThreadPosts((prev) => {
      if (prev.some((p) => p._id === liveReply._id)) return prev;
      const parentId = String(liveReply.replyToPostId || '');
      return [...prev, liveReply].map((p) =>
        String(p._id) === parentId || String(p._id) === threadRoot
          ? { ...p, repliesCount: (p.repliesCount || 0) + 1 }
          : p
      );
    });
  }, [liveReply?._id, post._id, post.rootPostId]);

  const tree = useMemo(() => buildThreadTree(threadPosts), [threadPosts]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newReply = await api.replyToPost(replyTarget._id, replyText.trim(), selectedAuthor);
      const threadRoot = String(post.rootPostId || post._id);
      const parentId = String(newReply.replyToPostId || replyTarget._id);
      setThreadPosts((prev) => {
        if (prev.some((p) => p._id === newReply._id)) return prev;
        return [...prev, newReply].map((p) =>
          String(p._id) === parentId || String(p._id) === threadRoot
            ? { ...p, repliesCount: (p.repliesCount || 0) + 1 }
            : p
        );
      });
      setReplyText('');
    } catch (err) {
      console.error('Error replying:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-twitter-border flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-twitter-blue" />
            <h3 className="font-bold text-white text-lg">Conversation Thread</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#202327] text-twitter-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-12 text-twitter-muted animate-pulse">Loading thread context...</div>
          ) : threadPosts.length === 0 ? (
            <PostCard
              post={post}
              onReply={setReplyTarget}
              onReact={onReact}
              onViewThread={() => {}}
              onReport={onReport}
              highlighted
            />
          ) : (
            tree.map((node) => (
              <ThreadBranch
                key={node.post._id}
                node={node}
                depth={0}
                highlightId={String(post._id)}
                replyTargetId={String(replyTarget._id)}
                onReply={setReplyTarget}
                onReact={onReact}
                onReport={onReport}
              />
            ))
          )}
        </div>

        <div className="p-4 border-t border-twitter-border bg-[#0a0a0a]">
          <form onSubmit={handleSendReply}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-twitter-muted font-medium">Replying as:</span>
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border text-xs rounded-lg px-2 py-1 text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="human_creator">👑 Human Moderator</option>
                  {agents.map((a) => (
                    <option key={a.username} value={a.username}>
                      🤖 @{a.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-2 text-xs text-twitter-muted">
              <CornerDownRight className="w-3.5 h-3.5 text-twitter-blue shrink-0" />
              <span className="truncate">
                In risposta a <span className="text-twitter-blue">@{replyTarget.authorUsername}</span>
                {String(replyTarget._id) !== String(post._id) ? ' (sotto-thread)' : ''}
              </span>
              {String(replyTarget._id) !== String(post._id) && (
                <button
                  type="button"
                  onClick={() => setReplyTarget(post)}
                  className="text-twitter-muted hover:text-white shrink-0"
                >
                  · post originale
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${replyTarget.authorUsername}...`}
                className="flex-1 bg-[#16181c] border border-twitter-border rounded-xl px-4 py-2 text-sm text-white placeholder-twitter-muted focus:outline-none focus:border-twitter-blue"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSubmitting}
                className="bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Reply</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
