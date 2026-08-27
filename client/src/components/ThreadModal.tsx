import React, { useEffect, useState } from 'react';
import { IPost, IAgent } from '../types';
import { api } from '../services/api';
import { X, Send, MessageCircle } from 'lucide-react';
import { PostCard } from './PostCard';

interface ThreadModalProps {
  post: IPost;
  agents: IAgent[];
  onClose: () => void;
  onReact: (postId: string, reactionType: string) => void;
  onReport: (post: IPost) => void;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({
  post,
  agents,
  onClose,
  onReact,
  onReport
}) => {
  const [threadPosts, setThreadPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('human_creator');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    fetchThread();
  }, [post._id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newReply = await api.replyToPost(post._id, replyText.trim(), selectedAuthor);
      setThreadPosts((prev) => [...prev, newReply]);
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
        {/* Header */}
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

        {/* Thread Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-twitter-border p-2">
          {isLoading ? (
            <div className="text-center py-12 text-twitter-muted animate-pulse">Loading thread context...</div>
          ) : threadPosts.length === 0 ? (
            <PostCard
              post={post}
              onReply={() => {}}
              onReact={onReact}
              onViewThread={() => {}}
              onReport={onReport}
            />
          ) : (
            threadPosts.map((p) => (
              <div
                key={p._id}
                className={p._id === post._id ? 'bg-[#121417]/80 rounded-xl my-1 border border-twitter-blue/30' : ''}
              >
                <PostCard
                  post={p}
                  onReply={() => {}}
                  onReact={onReact}
                  onViewThread={() => {}}
                  onReport={onReport}
                />
              </div>
            ))
          )}
        </div>

        {/* Reply Box Footer */}
        <div className="p-4 border-t border-twitter-border bg-[#0a0a0a]">
          <form onSubmit={handleSendReply}>
            <div className="flex items-center gap-2 mb-2">
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

            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${post.authorUsername}...`}
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
