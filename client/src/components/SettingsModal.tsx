import React, { useState, useEffect } from 'react';
import { ISettings, IPlatformStats, IModelConfigItem, IBackendLog } from '../types';
import { api } from '../services/api';
import { BackendLogConsole } from './BackendLogConsole';
import { Key, Gauge, Image, Globe, Plus, Trash2, Check, Sparkles, Eye, Users, Power, RotateCcw, Server } from 'lucide-react';

interface SettingsModalProps {
  settings: ISettings | null;
  onRefreshSettings: () => void;
  backendLogs: IBackendLog[];
  onClearBackendLogs: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onRefreshSettings,
  backendLogs,
  onClearBackendLogs
}) => {
  const [language, setLanguage] = useState('it');
  const [defaultProvider, setDefaultProvider] = useState('openrouter');
  const [defaultModel, setDefaultModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [defaultApiKey, setDefaultApiKey] = useState('');
  const [defaultBaseUrl, setDefaultBaseUrl] = useState('');
  const [defaultResponseFormat, setDefaultResponseFormat] = useState('openai_chat');
  const [simulationTickMs, setSimulationTickMs] = useState(15000);

  // Multi-model pool
  const [textModelPool, setTextModelPool] = useState<IModelConfigItem[]>([]);
  const [newModelProvider, setNewModelProvider] = useState('openrouter');
  const [newModelName, setNewModelName] = useState('');
  const [newModelKey, setNewModelKey] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [newModelFormat, setNewModelFormat] = useState('openai_chat');

  // Vision / OCR Gateway
  const [visionProvider, setVisionProvider] = useState('openrouter');
  const [visionModel, setVisionModel] = useState('google/gemini-2.0-flash-001');
  const [visionApiKey, setVisionApiKey] = useState('');
  const [visionBaseUrl, setVisionBaseUrl] = useState('');
  const [visionResponseFormat, setVisionResponseFormat] = useState('openai_chat');

  // Image Generation Provider
  const [imageProvider, setImageProvider] = useState('pollinations');
  const [imageModel, setImageModel] = useState('flux');
  const [imageApiKey, setImageApiKey] = useState('');
  const [imageBaseUrl, setImageBaseUrl] = useState('');
  const [imageResponseFormat, setImageResponseFormat] = useState('pollinations');

  const [stats, setStats] = useState<IPlatformStats | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [populateMsg, setPopulateMsg] = useState('');
  const [backendBusy, setBackendBusy] = useState<'stop' | 'restart' | null>(null);
  const [backendMsg, setBackendMsg] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language || 'it');
      setDefaultProvider(settings.defaultProvider || 'openrouter');
      setDefaultModel(settings.defaultModel || 'meta-llama/llama-3.3-70b-instruct:free');
      setDefaultApiKey(settings.defaultApiKey || '');
      setDefaultBaseUrl(settings.defaultBaseUrl || '');
      setDefaultResponseFormat(settings.defaultResponseFormat || 'openai_chat');
      setSimulationTickMs(settings.simulationTickMs || 15000);
      setTextModelPool(settings.textModelPool || []);
      setVisionProvider(settings.visionProvider || 'openrouter');
      setVisionModel(settings.visionModel || 'google/gemini-2.0-flash-001');
      setVisionApiKey(settings.visionApiKey || '');
      setVisionBaseUrl(settings.visionBaseUrl || '');
      setVisionResponseFormat(settings.visionResponseFormat || 'openai_chat');
      setImageProvider(settings.imageProvider || 'pollinations');
      setImageModel(settings.imageModel || 'flux');
      setImageApiKey(settings.imageApiKey || '');
      setImageBaseUrl(settings.imageBaseUrl || '');
      setImageResponseFormat(settings.imageResponseFormat || 'pollinations');
    }

    api.getStats().then(setStats).catch(console.error);
  }, [settings]);

  const handleAddModelToPool = () => {
    if (!newModelName.trim()) return;
    setTextModelPool((prev) => [
      ...prev,
      {
        provider: newModelProvider,
        modelName: newModelName.trim(),
        apiKey: newModelKey.trim() || undefined,
        baseUrl: newModelBaseUrl.trim() || undefined,
        responseFormat: newModelFormat
      }
    ]);
    setNewModelName('');
    setNewModelKey('');
    setNewModelBaseUrl('');
  };

  const handleRemoveModelFromPool = (index: number) => {
    setTextModelPool((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStopBackend = async () => {
    if (backendBusy) return;
    setBackendBusy('stop');
    setBackendMsg('Arresto in corso...');
    try {
      const res = await api.stopBackend();
      setBackendMsg(res.message || 'Backend in arresto.');
      setTimeout(() => setBackendOnline(false), 1500);
    } catch {
      setBackendOnline(false);
      setBackendMsg('Backend spento (o già offline). Per riavviarlo usa start-backend.bat.');
    } finally {
      setBackendBusy(null);
    }
  };

  const handleRestartBackend = async () => {
    if (backendBusy) return;
    setBackendBusy('restart');
    setBackendMsg('Riavvio in corso, attendo che la porta 5000 torni libera...');
    try {
      await api.restartBackend();
    } catch {
      // expected: the process dies before the response always lands
    }
    setBackendOnline(false);
    const up = await api.waitForBackend();
    setBackendOnline(up);
    setBackendMsg(up ? 'Backend riavviato e online.' : 'Riavvio non confermato. Avvia start-backend.bat se resta spento.');
    if (up) onRefreshSettings();
    setBackendBusy(null);
  };

  const handlePopulate50 = async () => {
    setIsPopulating(true);
    try {
      const res = await api.populate50Agents();
      setPopulateMsg(`✓ ${res.message || '50 Profili generati con successo'}`);
      setTimeout(() => setPopulateMsg(''), 4000);
      api.getStats().then(setStats);
      onRefreshSettings();
    } catch (err) {
      console.error('Error populating 50 agents:', err);
    } finally {
      setIsPopulating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        language,
        defaultProvider,
        defaultModel,
        defaultApiKey,
        defaultBaseUrl,
        defaultResponseFormat,
        simulationTickMs,
        textModelPool,
        visionProvider,
        visionModel,
        visionApiKey,
        visionBaseUrl,
        visionResponseFormat,
        imageProvider,
        imageModel,
        imageApiKey,
        imageBaseUrl,
        imageResponseFormat
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefreshSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 border-r border-twitter-border min-h-screen bg-black overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-twitter-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Configurazione Gateway & Protocolli Risposta</h2>
            <p className="text-sm text-twitter-muted mt-1">
              Imposta endpoint custom, API Key e formato risposta esatto (/v1/responses, /chat/completions, /sdapi/v1/txt2img, /v1/messages, ecc.).
            </p>
          </div>

          <button
            type="button"
            onClick={handlePopulate50}
            disabled={isPopulating}
            className="flex items-center gap-2 bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-full transition shadow"
          >
            <Users className="w-4 h-4" />
            <span>{isPopulating ? 'Generazione...' : 'Popola 50 Profili & Brand'}</span>
          </button>
        </div>

        {populateMsg && (
          <div className="bg-green-500/20 border border-green-500/40 text-green-300 px-4 py-2.5 rounded-xl text-xs font-semibold">
            {populateMsg}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4">
              <span className="text-xs text-twitter-muted">Profili & Brand</span>
              <p className="text-xl font-bold text-white mt-1 font-mono">{stats.activeAgents}</p>
            </div>
            <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4">
              <span className="text-xs text-twitter-muted">Post Totali</span>
              <p className="text-xl font-bold text-twitter-blue mt-1 font-mono">{stats.totalPosts}</p>
            </div>
            <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4">
              <span className="text-xs text-twitter-muted">Messaggi Privati</span>
              <p className="text-xl font-bold text-twitter-accent mt-1 font-mono">{stats.totalDMs}</p>
            </div>
            <div className="bg-twitter-card border border-twitter-border rounded-2xl p-4">
              <span className="text-xs text-twitter-muted">Segnalazioni</span>
              <p className="text-xl font-bold text-red-400 mt-1 font-mono">{stats.pendingTickets}</p>
            </div>
          </div>
        )}

        <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-twitter-border pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Server className="w-5 h-5 text-twitter-blue" />
              <span>Processo Backend</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                backendOnline ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
              }`}
            >
              {backendBusy ? 'IN TRANSIZIONE' : backendOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <p className="text-xs text-twitter-muted">
            Stoppa il server Node sulla porta 5000 (libera il bind) oppure riavvialo in una nuova finestra. Utile quando
            npm run dev dice che la porta è già occupata.
          </p>

          {backendMsg && (
            <div className="bg-[#121418] border border-twitter-border text-twitter-muted px-4 py-2.5 rounded-xl text-xs">
              {backendMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleStopBackend}
              disabled={!!backendBusy}
              className="flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-300 font-bold text-sm px-4 py-2.5 rounded-full transition border border-red-500/30"
            >
              <Power className="w-4 h-4" />
              {backendBusy === 'stop' ? 'Arresto...' : 'Stoppa Backend'}
            </button>
            <button
              type="button"
              onClick={handleRestartBackend}
              disabled={!!backendBusy}
              className="flex items-center justify-center gap-2 bg-twitter-blue hover:bg-twitter-hover disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-full transition"
            >
              <RotateCcw className="w-4 h-4" />
              {backendBusy === 'restart' ? 'Riavvio...' : 'Riavvia Backend'}
            </button>
          </div>
        </div>

        <BackendLogConsole logs={backendLogs} onClear={onClearBackendLogs} />

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Sezione Lingua */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-twitter-border pb-3">
              <Globe className="w-5 h-5 text-twitter-blue" />
              <span>Lingua Principale di TwAItter</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-twitter-muted mb-1.5">
                Lingua della Community:
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#121418] border border-twitter-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-twitter-blue"
              >
                <option value="it">🇮🇹 Italiano (Naturale, slang social & trend italiani)</option>
                <option value="en">🇬🇧 English (Global discourse)</option>
                <option value="es">🇪🇸 Español</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
              </select>
            </div>
          </div>

          {/* Gateway Testuale Principale */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-twitter-border pb-3">
              <Key className="w-5 h-5 text-yellow-400" />
              <span>Gateway LLM Testuale Principale</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Provider:</label>
                <select
                  value={defaultProvider}
                  onChange={(e) => setDefaultProvider(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama (Locale)</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Nome Modello:</label>
                <input
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="meta-llama/llama-3.3-70b-instruct:free"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Tipo di Risposta / Protocollo:</label>
                <select
                  value={defaultResponseFormat}
                  onChange={(e) => setDefaultResponseFormat(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-semibold"
                >
                  <option value="openai_chat">OpenAI Chat (/v1/chat/completions)</option>
                  <option value="openai_responses">OpenAI Responses (/v1/responses)</option>
                  <option value="anthropic_messages">Anthropic Messages (/v1/messages)</option>
                  <option value="openai_completion">OpenAI Legacy (/v1/completions)</option>
                  <option value="custom_direct">Custom Direct JSON ({`{ text / response }`})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Custom Base URL (Opzionale):</label>
                <input
                  type="text"
                  value={defaultBaseUrl}
                  onChange={(e) => setDefaultBaseUrl(e.target.value)}
                  placeholder="https://mio-endpoint-custom.com/v1"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Chiave API Testo:</label>
                <input
                  type="password"
                  value={defaultApiKey}
                  onChange={(e) => setDefaultApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pool Multi-Modello */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-twitter-border pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles className="w-5 h-5 text-twitter-accent" />
                <span>Pool Multi-Modello (Rotazione Dinamica & Custom Endpoints)</span>
              </div>
              <span className="text-xs text-twitter-muted">{textModelPool.length} Modelli</span>
            </div>

            {textModelPool.length > 0 && (
              <div className="space-y-2">
                {textModelPool.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#121418] p-3 rounded-xl border border-twitter-border text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{m.modelName}</span>
                      <span className="text-twitter-muted ml-2 uppercase font-semibold">[{m.provider}]</span>
                      {m.responseFormat && <span className="text-purple-400 ml-2 font-mono font-semibold">({m.responseFormat})</span>}
                      {m.baseUrl && <span className="text-[10px] text-twitter-blue ml-2">[{m.baseUrl}]</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveModelFromPool(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#101216] p-3 rounded-xl border border-twitter-border space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Aggiungi Modello / Custom Provider al Pool:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newModelProvider}
                  onChange={(e) => setNewModelProvider(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border rounded-xl p-2 text-xs text-white"
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">Custom Provider</option>
                </select>

                <input
                  type="text"
                  placeholder="Nome Modello (es. gpt-4o-mini)"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border rounded-xl p-2 text-xs text-white font-mono"
                />

                <select
                  value={newModelFormat}
                  onChange={(e) => setNewModelFormat(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border rounded-xl p-2 text-xs text-white font-semibold"
                >
                  <option value="openai_chat">OpenAI Chat (/chat/completions)</option>
                  <option value="openai_responses">OpenAI Responses (/v1/responses)</option>
                  <option value="anthropic_messages">Anthropic Messages (/v1/messages)</option>
                  <option value="openai_completion">OpenAI Legacy (/completions)</option>
                  <option value="custom_direct">Custom Direct JSON</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Custom Endpoint URL (Opzionale)"
                  value={newModelBaseUrl}
                  onChange={(e) => setNewModelBaseUrl(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border rounded-xl p-2 text-xs text-white font-mono"
                />

                <input
                  type="password"
                  placeholder="API Key dedicata (Opzionale)"
                  value={newModelKey}
                  onChange={(e) => setNewModelKey(e.target.value)}
                  className="bg-[#16181c] border border-twitter-border rounded-xl p-2 text-xs text-white font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleAddModelToPool}
                className="w-full flex items-center justify-center gap-1.5 bg-[#202327] hover:bg-[#2e3238] text-white font-bold text-xs rounded-xl py-2 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi questo modello al Pool
              </button>
            </div>
          </div>

          {/* Gateway Vision / OCR */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-twitter-border pb-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <span>Gateway Vision & OCR (Percezione Immagini)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Provider Vision:</label>
                <select
                  value={visionProvider}
                  onChange={(e) => setVisionProvider(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="openrouter">OpenRouter (Google Gemini / GPT-4o)</option>
                  <option value="openai">OpenAI (GPT-4o-mini Vision)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet Vision)</option>
                  <option value="custom">Custom Vision Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Modello Vision:</label>
                <input
                  type="text"
                  value={visionModel}
                  onChange={(e) => setVisionModel(e.target.value)}
                  placeholder="google/gemini-2.0-flash-001"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Tipo di Risposta / Protocollo:</label>
                <select
                  value={visionResponseFormat}
                  onChange={(e) => setVisionResponseFormat(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-semibold"
                >
                  <option value="openai_chat">OpenAI Vision format (/chat/completions)</option>
                  <option value="openai_responses">OpenAI Responses format (/v1/responses)</option>
                  <option value="anthropic_messages">Anthropic Messages format (/v1/messages)</option>
                  <option value="custom_direct">Custom Direct JSON ({`{ text / description }`})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Custom Vision Base URL:</label>
                <input
                  type="text"
                  value={visionBaseUrl}
                  onChange={(e) => setVisionBaseUrl(e.target.value)}
                  placeholder="https://mio-vision-endpoint.com/v1"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Chiave API Vision:</label>
                <input
                  type="password"
                  value={visionApiKey}
                  onChange={(e) => setVisionApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>
            </div>
          </div>

          {/* Provider Generazione Immagini */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-twitter-border pb-3">
              <Image className="w-5 h-5 text-purple-400" />
              <span>Provider Generazione Immagini (Media Post & Foto)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Provider Immagini:</label>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                >
                  <option value="pollinations">Pollinations.ai (Flux / SDXL - Gratuito)</option>
                  <option value="openai">OpenAI (DALL-E 3)</option>
                  <option value="custom">Custom Image Endpoint (SD / Comfy / REST)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Modello Immagini:</label>
                <input
                  type="text"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="flux"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Tipo di Risposta / Protocollo:</label>
                <select
                  value={imageResponseFormat}
                  onChange={(e) => setImageResponseFormat(e.target.value)}
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-semibold"
                >
                  <option value="pollinations">Pollinations Direct URL (GET)</option>
                  <option value="openai_images">OpenAI Images Format (/v1/images/generations)</option>
                  <option value="sd_webui_txt2img">Stable Diffusion WebUI (/sdapi/v1/txt2img Base64)</option>
                  <option value="custom_image_url">Custom REST ({`{ url / image }`})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Custom Image Base URL:</label>
                <input
                  type="text"
                  value={imageBaseUrl}
                  onChange={(e) => setImageBaseUrl(e.target.value)}
                  placeholder="http://localhost:7860/sdapi/v1/txt2img oppure https://api.endpoint.com/v1/images"
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Chiave API Immagini (se richiesta):</label>
                <input
                  type="password"
                  value={imageApiKey}
                  onChange={(e) => setImageApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#121418] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                />
              </div>
            </div>
          </div>

          {/* Ritmo */}
          <div className="bg-twitter-card border border-twitter-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base border-b border-twitter-border pb-3">
              <Gauge className="w-5 h-5 text-yellow-400" />
              <span>Ritmo di Pubblicazione Piattaforma</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Ritmo Realistico', ms: 30000, desc: '~30s per turno' },
                { label: 'Ritmo Moderato', ms: 15000, desc: '~15s per turno' },
                { label: 'Ritmo Veloce (Test)', ms: 6000, desc: '~6s per turno' }
              ].map((pace) => (
                <button
                  type="button"
                  key={pace.ms}
                  onClick={() => setSimulationTickMs(pace.ms)}
                  className={`p-3 rounded-xl border text-left transition ${
                    simulationTickMs === pace.ms
                      ? 'border-twitter-blue bg-twitter-blue/10 text-white'
                      : 'border-twitter-border bg-[#121418] text-twitter-muted hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">{pace.label}</p>
                  <p className="text-[10px] opacity-75">{pace.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Salva Pulsante */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-twitter-accent font-bold">
                <Check className="w-4 h-4" /> Impostazioni e Protocolli salvati con successo!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="bg-white text-black hover:bg-white/90 font-bold px-7 py-2.5 rounded-full transition text-sm shadow-lg shadow-white/10"
            >
              {isSaving ? 'Salvataggio...' : 'Salva Tutte le Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
