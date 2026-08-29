import React, { useState } from 'react';
import { IAgent, IAgentSourceDraft } from '../types';
import { api } from '../services/api';
import { X, Sparkles, User, AtSign, Briefcase, MapPin, Smile, Bot, Check, Upload, BookOpen, FileText, Link2, Trash2, Globe2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';

interface CreateProfileModalProps {
  onClose: () => void;
  onCreated: (agent: IAgent) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
];

const TEMPLATES = [
  {
    name: 'Tech Enthusiast / Developer',
    profession: 'Senior Software Engineer',
    city: 'Milano, Italia',
    bio: 'Costruisco sistemi distribuiti, AI agents e discuto di architettura software. Open source advocate.',
    prompt: 'Sei uno sviluppatore software senior esperto di AI, TypeScript e sistemi cloud. Scrivi in modo chiaro, tecnico e appassionato con tocchi di ironia tipici del mondo tech.',
    mood: 'focused'
  },
  {
    name: 'Giornalista / Cronista',
    profession: 'Giornalista d\'inchiesta',
    city: 'Roma, Italia',
    bio: 'Notizie in tempo reale, geopolitica, analisi dati ed eventi globali. Sempre a caccia della verità.',
    prompt: 'Sei un giornalista attento e imparziale. Commenti i fatti con rigore analitico, citi fonti e poni domande pungenti per stimolare discussioni informate.',
    mood: 'critical'
  },
  {
    name: 'Startup Founder & Investitore',
    profession: 'Tech Founder & Angel',
    city: 'Bologna, Italia',
    bio: 'Scaling AI startups. Condivido framework di crescita, hiring e venture capital.',
    prompt: 'Sei un founder dinamico e visionario. Condividi pillole su produttività, metriche SaaS e visione sul futuro dell\'intelligenza artificiale.',
    mood: 'enthusiastic'
  },
  {
    name: 'Brand / Azienda Ufficiale',
    profession: 'Brand Ufficiale',
    city: 'Torino, Italia',
    bio: 'Canale ufficiale. Novità, rilasci di prodotto e supporto alla community.',
    prompt: 'Sei il canale ufficiale di un brand tecnologico innovativo. Rispondi con tono professionale, cordiale, propositivo e sempre orientato alla soddisfazione degli utenti.',
    mood: 'focused',
    type: 'business',
    badge: 'gold'
  }
];

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  onClose,
  onCreated
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('Milano, Italia');
  const [profession, setProfession] = useState('Creator Digitale');
  const [age, setAge] = useState<number | ''>(28);
  const [accountType, setAccountType] = useState<'personal' | 'business' | 'software' | 'parody'>('personal');
  const [verificationBadge, setVerificationBadge] = useState<'none' | 'blue' | 'gold'>('blue');
  const [personalityPrompt, setPersonalityPrompt] = useState('');
  const [physicalAppearance, setPhysicalAppearance] = useState('');
  const [mood, setMood] = useState('focused');
  const [activityInterval, setActivityInterval] = useState(20);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [sourceDrafts, setSourceDrafts] = useState<IAgentSourceDraft[]>([]);
  const [sourceMode, setSourceMode] = useState<'text' | 'url' | 'file'>('text');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleApplyTemplate = (t: any) => {
    setDisplayName(t.name);
    setProfession(t.profession);
    setCity(t.city);
    setBio(t.bio);
    setPersonalityPrompt(t.prompt);
    setMood(t.mood || 'focused');
    if (t.type) setAccountType(t.type);
    if (t.badge) setVerificationBadge(t.badge);
    if (!username) {
      setUsername(t.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Immagine troppo grande (max 3MB)');
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

  const addSourceDraft = () => {
    const clientId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    if (sourceMode === 'text') {
      if (!sourceText.trim()) {
        setErrorMsg('Inserisci il testo o Markdown della fonte.');
        return;
      }
      setSourceDrafts((current) => [...current, {
        clientId,
        type: 'text',
        title: sourceTitle.trim() || undefined,
        text: sourceText,
        format: sourceText.includes('# ') || sourceText.includes('## ') ? 'markdown' : 'text'
      }]);
    } else if (sourceMode === 'url') {
      try {
        const parsed = new URL(sourceUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setErrorMsg('Inserisci una URL HTTP o HTTPS valida.');
        return;
      }
      setSourceDrafts((current) => [...current, {
        clientId,
        type: 'url',
        title: sourceTitle.trim() || undefined,
        url: sourceUrl.trim()
      }]);
    } else {
      if (!sourceFile) {
        setErrorMsg('Seleziona un file TXT, Markdown o PDF.');
        return;
      }
      if (sourceFile.size > 10 * 1024 * 1024) {
        setErrorMsg('La fonte supera il limite di 10 MB.');
        return;
      }
      setSourceDrafts((current) => [...current, {
        clientId,
        type: 'file',
        title: sourceTitle.trim() || undefined,
        file: sourceFile
      }]);
    }

    setSourceTitle('');
    setSourceText('');
    setSourceUrl('');
    setSourceFile(null);
    setErrorMsg('');
  };

  const uploadSourceDrafts = async (agentUsername: string) => {
    const failures: string[] = [];
    for (const draft of sourceDrafts) {
      try {
        if (draft.type === 'text' && draft.text) {
          const source = await api.addAgentTextSource(agentUsername, {
            title: draft.title,
            text: draft.text,
            format: draft.format
          });
          if (source.status === 'failed') failures.push(`${source.title}: ${source.error || 'elaborazione fallita'}`);
        } else if (draft.type === 'url' && draft.url) {
          const source = await api.addAgentUrlSource(agentUsername, { title: draft.title, url: draft.url });
          if (source.status === 'failed') failures.push(`${source.title}: ${source.error || 'elaborazione fallita'}`);
        } else if (draft.type === 'file' && draft.file) {
          const source = await api.addAgentFileSource(agentUsername, draft.file, draft.title);
          if (source.status === 'failed') failures.push(`${source.title}: ${source.error || 'elaborazione fallita'}`);
        }
      } catch (err: any) {
        failures.push(`${draft.title || draft.file?.name || draft.url || 'Fonte'}: ${err.message || 'errore upload'}`);
      }
    }
    return failures;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !personalityPrompt.trim()) {
      setErrorMsg('Nome visibile, username (@) e istruzioni di personalità sono obbligatori.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const created = await api.createAgent({
        username: username.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''),
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        city: city.trim(),
        profession: profession.trim(),
        age: age ? Number(age) : undefined,
        accountType,
        verificationBadge,
        personalityPrompt: personalityPrompt.trim(),
        physicalAppearance: physicalAppearance.trim(),
        mood,
        activityInterval: Number(activityInterval) || 20,
        knowledgeConfig: {
          enabled: knowledgeEnabled,
          webSearchEnabled,
          maxSourcesPerPrompt: 4,
          maxContextChars: 5000
        }
      });

      const sourceFailures = await uploadSourceDrafts(created.username);
      onCreated(created);
      if (sourceFailures.length > 0) {
        window.alert(`Profilo creato. Alcune fonti non sono state elaborate e possono essere riprovate dall’editor: ${sourceFailures.join(' · ')}`);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore nella creazione del profilo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-twitter-border flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-twitter-blue" />
            <h3 className="font-bold text-white text-lg">Crea Nuovo Profilo Manuale</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#181818] text-twitter-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Quick Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-twitter-blue" />
              <span>Modelli Rapidi Predefiniti (Opzionale):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className="p-2 bg-[#121418] hover:bg-[#1a1d24] border border-twitter-border/70 rounded-xl text-left transition"
                >
                  <p className="text-xs font-bold text-white truncate">{t.name}</p>
                  <p className="text-[10px] text-twitter-muted truncate">{t.profession}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Identity & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Nome Visibile *</label>
              <input
                type="text"
                required
                placeholder="es. Elena Ferri"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (!username) {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15));
                  }
                }}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Username / Handle (@) *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-twitter-muted text-sm">@</span>
                <input
                  type="text"
                  required
                  placeholder="elena_tech"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>
            </div>
          </div>

          {/* Account Type & Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Tipo di Account</label>
              <select
                value={accountType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setAccountType(val);
                  if (val === 'business' || val === 'software') setVerificationBadge('gold');
                  else if (val === 'personal') setVerificationBadge('blue');
                  else setVerificationBadge('none');
                }}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="personal">Persona / Creator Individuale</option>
                <option value="business">Azienda / Brand Ufficiale</option>
                <option value="software">Software / AI Bot Ufficiale</option>
                <option value="parody">Account Parodia / Satira</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Badge di Verifica</label>
              <select
                value={verificationBadge}
                onChange={(e) => setVerificationBadge(e.target.value as any)}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="blue">Badge Blu (Verificato Personale / Creator)</option>
                <option value="gold">Badge Oro (Azienda / Organizzazione)</option>
                <option value="none">Nessun Badge</option>
              </select>
            </div>
          </div>

          {/* Avatar Selection & Upload */}
          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1.5">Foto Profilo (Avatar)</label>
            <div className="flex items-center gap-3">
              <Avatar src={avatarUrl} alt={displayName || 'Avatar'} className="w-14 h-14 rounded-full border-2 border-twitter-border flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  placeholder="Incolla URL immagine..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2 text-xs text-white focus:outline-none focus:border-twitter-blue"
                />
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-[#181a20] hover:bg-[#22252c] text-white text-xs px-3 py-1.5 rounded-lg border border-twitter-border flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-twitter-blue" />
                    <span>Carica dal Computer</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-twitter-muted">oppure scegli un preset:</span>
                </div>
              </div>
            </div>
            {/* Presets */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {AVATAR_PRESETS.map((p, idx) => (
                <img
                  key={idx}
                  src={p}
                  alt={`Preset ${idx}`}
                  onClick={() => setAvatarUrl(p)}
                  className={`w-8 h-8 rounded-full cursor-pointer object-cover border-2 transition ${avatarUrl === p ? 'border-twitter-blue scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          {/* Bio & Details */}
          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1">Biografia (Bio visibile)</label>
            <textarea
              rows={2}
              placeholder="Presentazione visibile sul profilo..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Città / Località</label>
              <input
                type="text"
                placeholder="es. Milano, Italia"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Professione</label>
              <input
                type="text"
                placeholder="es. Architetto"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Età</label>
              <input
                type="number"
                placeholder="es. 29"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>
          </div>

          {/* Personality & AI Prompt */}
          <div>
            <label className="block text-xs font-semibold text-twitter-muted mb-1 flex items-center justify-between">
              <span>Personalità e Istruzioni AI (System Prompt) *</span>
              <span className="text-[10px] text-twitter-blue font-normal">Istruisce come risponde e pubblica l'agente</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Descrivi dettagliatamente come pensa, che tono di voce usa, cosa ama o odia, opinioni e modo di porsi con gli altri..."
              value={personalityPrompt}
              onChange={(e) => setPersonalityPrompt(e.target.value)}
              className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue leading-relaxed font-mono"
            />
          </div>

          {/* Knowledge Sources */}
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Fonti e ricerca del profilo</h4>
                <p className="text-[10px] text-twitter-muted mt-0.5">Assegna conoscenze che l’agente potrà recuperare quando sono pertinenti.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 rounded-lg bg-[#121418] border border-twitter-border px-3 py-2 text-[11px] text-white">
                <span>Usa fonti assegnate</span>
                <input type="checkbox" checked={knowledgeEnabled} onChange={(e) => setKnowledgeEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-lg bg-[#121418] border border-twitter-border px-3 py-2 text-[11px] text-white">
                <span className="flex items-center gap-1"><Globe2 className="w-3.5 h-3.5 text-twitter-blue" /> Ricerca web</span>
                <input type="checkbox" checked={webSearchEnabled} onChange={(e) => setWebSearchEnabled(e.target.checked)} className="w-4 h-4 accent-twitter-blue" />
              </label>
            </div>

            <div className="flex gap-1 rounded-lg bg-black/30 p-1">
              {([
                ['text', FileText, 'Testo / Markdown'],
                ['url', Link2, 'URL / YouTube'],
                ['file', Upload, 'File']
              ] as const).map(([value, Icon, label]) => (
                <button key={value} type="button" onClick={() => setSourceMode(value)} className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition ${sourceMode === value ? 'bg-[#24282f] text-white' : 'text-twitter-muted hover:text-white'}`}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>

            <input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} placeholder="Titolo fonte (opzionale)" className="w-full bg-[#121418] border border-twitter-border rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500" />
            {sourceMode === 'text' && (
              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={4} placeholder="Incolla testo, appunti o Markdown..." className="w-full bg-[#121418] border border-twitter-border rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500 resize-y" />
            )}
            {sourceMode === 'url' && (
              <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Pagina web, PDF remoto, video o canale YouTube" className="w-full bg-[#121418] border border-twitter-border rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-twitter-blue" />
            )}
            {sourceMode === 'file' && (
              <label className="block rounded-lg border border-dashed border-twitter-border hover:border-emerald-500 p-3 text-center cursor-pointer">
                <span className="text-[11px] text-white">{sourceFile ? sourceFile.name : 'Seleziona TXT, Markdown o PDF'}</span>
                <span className="block text-[9px] text-twitter-muted mt-1">Massimo 10 MB</span>
                <input type="file" accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf" onChange={(e) => setSourceFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            )}
            <button type="button" onClick={addSourceDraft} className="w-full rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold py-2">Aggiungi alla creazione</button>

            {sourceDrafts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-white">Da elaborare dopo la creazione ({sourceDrafts.length})</p>
                {sourceDrafts.map((draft) => (
                  <div key={draft.clientId} className="flex items-center gap-2 rounded-lg bg-[#121418] border border-twitter-border px-2.5 py-2">
                    {draft.type === 'url' ? <Link2 className="w-3.5 h-3.5 text-twitter-blue" /> : draft.type === 'file' ? <Upload className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="flex-1 min-w-0 truncate text-[10px] text-white">{draft.title || draft.file?.name || draft.url || 'Fonte testuale'}</span>
                    <button type="button" onClick={() => setSourceDrafts((current) => current.filter((item) => item.clientId !== draft.clientId))} className="p-1 text-twitter-muted hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mood & Activity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Mood / Umore Iniziale</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="focused">🎯 Focused / Attento</option>
                <option value="enthusiastic">🚀 Entusiasta / Carico</option>
                <option value="sarcastic">😏 Sarcastico / Pungente</option>
                <option value="critical">🧐 Critico / Riflessivo</option>
                <option value="cheerful">✨ Allegro / Solare</option>
                <option value="romantic">💖 Romantico / Dolce</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1">Intervallo Attività (turni)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={activityInterval}
                onChange={(e) => setActivityInterval(Number(e.target.value))}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-twitter-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-twitter-muted hover:text-white transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-white text-black hover:bg-white/90 font-bold px-6 py-2.5 rounded-full text-xs transition shadow flex items-center gap-1.5"
            >
              {isLoading ? 'Creazione in corso...' : 'Crea Profilo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
