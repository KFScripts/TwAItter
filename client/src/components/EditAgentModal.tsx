import React, { useState } from 'react';
import { IAgent } from '../types';
import { api } from '../services/api';
import { X, Save, Sparkles, User, Cpu } from 'lucide-react';
import { Avatar } from './Avatar';

interface EditAgentModalProps {
  agent: IAgent;
  onClose: () => void;
  onUpdated: (updatedAgent: IAgent) => void;
}

export const EditAgentModal: React.FC<EditAgentModalProps> = ({
  agent,
  onClose,
  onUpdated
}) => {
  const [displayName, setDisplayName] = useState(agent.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(agent.avatarUrl || '');
  const [bio, setBio] = useState(agent.bio || '');
  const [city, setCity] = useState(agent.city || '');
  const [profession, setProfession] = useState(agent.profession || '');
  const [accountType, setAccountType] = useState<'personal' | 'business' | 'software' | 'parody'>(agent.accountType || 'personal');
  const [verificationBadge, setVerificationBadge] = useState<'none' | 'blue' | 'gold'>(agent.verificationBadge || 'blue');
  const [personalityPrompt, setPersonalityPrompt] = useState(agent.personalityPrompt || '');
  const [physicalAppearance, setPhysicalAppearance] = useState(agent.physicalAppearance || '');
  const [mood, setMood] = useState(agent.mood || 'focused');
  const [activityInterval, setActivityInterval] = useState(agent.activityInterval || 20);
  const [isActive, setIsActive] = useState(agent.isActive !== false);

  const [provider, setProvider] = useState(agent.modelConfig?.provider || '');
  const [modelName, setModelName] = useState(agent.modelConfig?.modelName || '');
  const [temperature, setTemperature] = useState(agent.modelConfig?.temperature ?? 0.85);
  const [maxTokens, setMaxTokens] = useState(agent.modelConfig?.maxTokens ?? 300);

  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'model'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Immagine troppo grande. Seleziona un file inferiore a 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload: Partial<IAgent> = {
        displayName,
        avatarUrl,
        bio,
        city,
        profession,
        accountType,
        verificationBadge,
        personalityPrompt,
        physicalAppearance,
        mood,
        activityInterval: Number(activityInterval) || 20,
        isActive,
        modelConfig: {
          provider,
          modelName,
          temperature: Number(temperature) || 0.85,
          maxTokens: Number(maxTokens) || 300
        }
      };

      const updated = await api.updateAgent(agent.username, payload);
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f1115] border border-twitter-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-[#e7e9ea]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-twitter-border flex items-center justify-between bg-[#16181c]">
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl || agent.avatarUrl} alt={displayName} className="w-9 h-9" />
            <div>
              <h3 className="font-bold text-white text-base">Modifica Agente: @{agent.username}</h3>
              <p className="text-xs text-twitter-muted">Personalizza personalità, credenziali e comportamento AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#202327] text-twitter-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-twitter-border bg-[#121418] text-xs font-semibold px-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-twitter-blue text-white'
                : 'border-transparent text-twitter-muted hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profilo & Aspetto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-twitter-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Personalità & Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('model')}
            className={`py-3 px-4 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'model'
                ? 'border-yellow-500 text-yellow-400'
                : 'border-transparent text-twitter-muted hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Configurazione Modello AI</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Nome Visualizzato:</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Città / Località:</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-twitter-muted mb-1">Professione / Ruolo:</label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-twitter-muted mb-1">Biografia:</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-twitter-muted mb-1">Foto Profilo (File o URL):</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="text-xs text-twitter-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-twitter-blue file:text-white hover:file:bg-twitter-hover cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Oppure incolla URL immagine..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Tipo Account:</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  >
                    <option value="personal">Personale (Utente/Creator)</option>
                    <option value="business">Azienda (Business Brand)</option>
                    <option value="software">Software / Bot Ufficiale</option>
                    <option value="parody">Parodia / Ironico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Badge di Verifica:</label>
                  <select
                    value={verificationBadge}
                    onChange={(e) => setVerificationBadge(e.target.value as any)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  >
                    <option value="blue">Badge Blu (Verificato)</option>
                    <option value="gold">Badge Oro (Organizzazione/Brand)</option>
                    <option value="none">Nessun Badge</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-twitter-muted mb-1">Prompt Personalità (System Instruction):</label>
                <textarea
                  rows={4}
                  required
                  value={personalityPrompt}
                  onChange={(e) => setPersonalityPrompt(e.target.value)}
                  placeholder="Descrivi tono, opinioni, stile di scrittura e reazioni..."
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-twitter-muted mb-1">Aspetto Fisico / Stile Immagini:</label>
                <input
                  type="text"
                  value={physicalAppearance}
                  onChange={(e) => setPhysicalAppearance(e.target.value)}
                  placeholder="Es. Ragazza con capelli corti e giacca di pelle nera..."
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Umore / Mood:</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="focused">Concentrato / Professionale</option>
                    <option value="happy">Allegro / Positivo</option>
                    <option value="creative">Creativo / Ispirato</option>
                    <option value="sarcastic">Sarcastico / Provocatorio</option>
                    <option value="tired">Stanco / Disilluso</option>
                    <option value="curious">Curioso / Esploratore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Intervallo Attività (sec):</label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={activityInterval}
                    onChange={(e) => setActivityInterval(Number(e.target.value))}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="agentIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-twitter-blue focus:ring-0 cursor-pointer"
                />
                <label htmlFor="agentIsActive" className="text-sm font-medium text-white cursor-pointer">
                  Agente Attivo nella simulazione autonoma
                </label>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Modello LLM Dedicato (Opzionale):</label>
                  <input
                    type="text"
                    placeholder="Es. gpt-4o, claude-3-5-sonnet..."
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Provider:</label>
                  <input
                    type="text"
                    placeholder="Es. openai, openrouter, custom..."
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Temperatura: {temperature}</label>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-twitter-muted mb-1">Max Tokens:</label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-twitter-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-twitter-muted hover:text-white transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-xs rounded-full shadow transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvataggio...' : 'Salva Modifiche'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
