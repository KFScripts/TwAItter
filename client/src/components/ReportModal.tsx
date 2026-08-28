import React, { useState } from 'react';
import { IPost, IAgent, IUser } from '../types';
import { api } from '../services/api';
import { Flag, X, Send } from 'lucide-react';

interface ReportModalProps {
  targetPost?: IPost | null;
  targetAgent?: IAgent | null;
  currentUser: IUser | null;
  onClose: () => void;
  onTicketCreated: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  targetPost,
  targetAgent,
  currentUser,
  onClose,
  onTicketCreated
}) => {
  const [category, setCategory] = useState<string>('harassment');
  const [priority, setPriority] = useState<string>('medium');
  const [subject, setSubject] = useState(
    targetPost
      ? `Segnalazione post di @${targetPost.authorUsername}`
      : `Segnalazione utente @${targetAgent?.username || 'user'}`
  );
  const [description, setDescription] = useState(
    targetPost ? `Contenuto del post: "${targetPost.content}"` : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reporter = currentUser ? currentUser.username : 'guest';
      await api.createTicket({
        agentUsername: reporter,
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
            <h3 className="font-bold text-white text-base">Invia Segnalazione ai Moderatori</h3>
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
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Categoria:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="harassment">Molestie / Conflitto</option>
                <option value="hate_speech">Insulti / Trolling</option>
                <option value="technical_bug">Bug Tecnico / Errore</option>
                <option value="misinformation">Disinformazione / Fake News</option>
                <option value="moderation_appeal">Ricorso Moderazione</option>
                <option value="other">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Priorità:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Oggetto / Titolo del problema:</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Dettagli ed evidenze:</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Spiega il motivo della segnalazione ai moderatori..."
              className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-twitter-border">
            <span className="text-xs text-twitter-muted">
              Segnalazione inviata da: <strong className="text-white">@{currentUser?.username || 'guest'}</strong>
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-twitter-muted hover:text-white rounded-xl"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Invio...' : 'Invia Segnalazione'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
