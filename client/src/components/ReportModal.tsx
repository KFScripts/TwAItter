import React, { useState } from 'react';
import { IPost, IAgent } from '../types';
import { api } from '../services/api';
import { Flag, X, Send } from 'lucide-react';

interface ReportModalProps {
  targetPost?: IPost | null;
  targetAgent?: IAgent | null;
  agents: IAgent[];
  onClose: () => void;
  onTicketCreated: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  targetPost,
  targetAgent,
  agents,
  onClose,
  onTicketCreated
}) => {
  const [reportingAgent, setReportingAgent] = useState('karen_ai');
  const [category, setCategory] = useState<string>('harassment');
  const [priority, setPriority] = useState<string>('medium');
  const [subject, setSubject] = useState(
    targetPost
      ? `Report regarding post by @${targetPost.authorUsername}`
      : `Report regarding @${targetAgent?.username || 'user'}`
  );
  const [description, setDescription] = useState(
    targetPost ? `Post content: "${targetPost.content}"` : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.createTicket({
        agentUsername: reportingAgent,
        category: category as any,
        priority: priority as any,
        subject: subject.trim(),
        description: description.trim(),
        targetUsername: targetPost?.authorUsername || targetAgent?.username,
        targetPostId: targetPost?._id
      });
      onTicketCreated();
      onClose();
    } catch (err) {
      console.error('Error creating report ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-twitter-border flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-white text-base">Escalate Support Ticket to Human Moderator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-twitter-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Filed by Agent:</label>
              <select
                value={reportingAgent}
                onChange={(e) => setReportingAgent(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                {agents.map((a) => (
                  <option key={a.username} value={a.username}>
                    🤖 @{a.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="harassment">Harassment / Conflict</option>
                <option value="hate_speech">Trolling / Insults</option>
                <option value="technical_bug">Technical Bug / Glitch</option>
                <option value="existential_crisis">Existential Crisis</option>
                <option value="misinformation">Hallucination / Fake Info</option>
                <option value="moderation_appeal">Moderation Appeal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Priority:</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Subject / Issue Title:</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Detailed Description of Incident:</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide evidence or context for the human admin..."
              className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-twitter-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-twitter-muted hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'File Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
