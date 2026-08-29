import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  FileText,
  Globe2,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Youtube
} from 'lucide-react';
import { IAgentSource } from '../types';
import { api } from '../services/api';

interface AgentSourcesPanelProps {
  username: string;
  knowledgeEnabled: boolean;
  webSearchEnabled: boolean;
  onKnowledgeEnabledChange: (enabled: boolean) => void;
  onWebSearchEnabledChange: (enabled: boolean) => void;
}

type ComposerMode = 'text' | 'url' | 'file';

function sourceIcon(source: IAgentSource) {
  if (source.kind === 'youtube' || source.kind === 'youtube_channel') return Youtube;
  if (source.kind === 'url') return Globe2;
  return FileText;
}

export const AgentSourcesPanel: React.FC<AgentSourcesPanelProps> = ({
  username,
  knowledgeEnabled,
  webSearchEnabled,
  onKnowledgeEnabledChange,
  onWebSearchEnabledChange
}) => {
  const [sources, setSources] = useState<IAgentSource[]>([]);
  const [mode, setMode] = useState<ComposerMode>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState('');

  const loadSources = async () => {
    setIsLoading(true);
    try {
      setSources(await api.getAgentSources(username));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Impossibile caricare le fonti');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [username]);

  const resetComposer = () => {
    setTitle('');
    setText('');
    setUrl('');
    setFile(null);
  };

  const addSource = async () => {
    setIsSaving(true);
    setError('');
    try {
      let created: IAgentSource;
      if (mode === 'text') {
        if (!text.trim()) throw new Error('Inserisci del testo o Markdown');
        created = await api.addAgentTextSource(username, {
          title: title.trim() || undefined,
          text,
          format: text.includes('# ') || text.includes('## ') ? 'markdown' : 'text'
        });
      } else if (mode === 'url') {
        if (!url.trim()) throw new Error('Inserisci una URL');
        created = await api.addAgentUrlSource(username, { title: title.trim() || undefined, url: url.trim() });
      } else {
        if (!file) throw new Error('Seleziona un file TXT, Markdown o PDF');
        created = await api.addAgentFileSource(username, file, title.trim() || undefined);
      }
      setSources((current) => [created, ...current.filter((source) => source._id !== created._id)]);
      resetComposer();
    } catch (err: any) {
      setError(err.message || 'Errore durante l’aggiunta della fonte');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSource = (source: IAgentSource) => {
    setSources((current) => current.map((item) => item._id === source._id ? source : item));
  };

  const toggleSource = async (source: IAgentSource) => {
    setBusyId(source._id);
    try {
      updateSource(await api.setAgentSourceEnabled(username, source._id, !source.enabled));
    } catch (err: any) {
      setError(err.message || 'Impossibile aggiornare la fonte');
    } finally {
      setBusyId(null);
    }
  };

  const refreshSource = async (source: IAgentSource) => {
    setBusyId(source._id);
    try {
      updateSource(await api.refreshAgentSource(username, source._id));
    } catch (err: any) {
      setError(err.message || 'Impossibile aggiornare la fonte');
    } finally {
      setBusyId(null);
    }
  };

  const removeSource = async (source: IAgentSource) => {
    if (!window.confirm(`Rimuovere la fonte “${source.title}”?`)) return;
    setBusyId(source._id);
    try {
      await api.deleteAgentSource(username, source._id);
      setSources((current) => current.filter((item) => item._id !== source._id));
    } catch (err: any) {
      setError(err.message || 'Impossibile rimuovere la fonte');
    } finally {
      setBusyId(null);
    }
  };

  const runTest = async () => {
    if (!testQuery.trim()) return;
    setBusyId('test');
    try {
      const result = await api.testAgentSourceRetrieval(username, testQuery.trim());
      setTestResult(result.context || 'Nessun passaggio pertinente trovato.');
    } catch (err: any) {
      setError(err.message || 'Ricerca di prova fallita');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-twitter-border bg-[#16181c] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Conoscenza del profilo</h4>
            <p className="text-[11px] text-twitter-muted mt-0.5">Le fonti vengono cercate per pertinenza e usate come retroterra, senza trasformare ogni post in un riassunto.</p>
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 text-xs text-white">
          <span>Usa le fonti assegnate</span>
          <input type="checkbox" checked={knowledgeEnabled} onChange={(event) => onKnowledgeEnabledChange(event.target.checked)} className="w-4 h-4 accent-emerald-500" />
        </label>
        <label className="flex items-center justify-between gap-3 text-xs text-white">
          <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-twitter-blue" /> Ricerca web dinamica</span>
          <input type="checkbox" checked={webSearchEnabled} onChange={(event) => onWebSearchEnabledChange(event.target.checked)} className="w-4 h-4 accent-twitter-blue" />
        </label>
        <p className="text-[10px] text-twitter-muted">La ricerca web è memorizzata in cache per 20 minuti e non viene eseguita sui messaggi privati.</p>
      </div>

      {error && <div className="p-3 rounded-xl border border-red-800/60 bg-red-950/40 text-xs text-red-300">{error}</div>}

      <div className="rounded-xl border border-twitter-border bg-[#121418] p-4 space-y-3">
        <div className="flex gap-1 rounded-lg bg-black/30 p-1">
          {([
            ['text', FileText, 'Testo'],
            ['url', Link2, 'URL / YouTube'],
            ['file', Upload, 'File']
          ] as const).map(([value, Icon, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`flex-1 py-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition ${mode === value ? 'bg-[#24282f] text-white' : 'text-twitter-muted hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titolo della fonte (opzionale)" className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
        {mode === 'text' && (
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} placeholder="Incolla appunti, istruzioni editoriali, testo o Markdown..." className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-y" />
        )}
        {mode === 'url' && (
          <div>
            <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://sito.it/pagina oppure URL YouTube/canale" className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue" />
            <p className="text-[10px] text-twitter-muted mt-1.5">Supporta pagine web, TXT/Markdown/PDF remoti, video e canali YouTube pubblici.</p>
          </div>
        )}
        {mode === 'file' && (
          <label className="block border border-dashed border-twitter-border hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition">
            <Upload className="w-5 h-5 mx-auto text-emerald-400 mb-1.5" />
            <span className="text-xs text-white">{file ? file.name : 'Seleziona TXT, Markdown o PDF'}</span>
            <span className="block text-[10px] text-twitter-muted mt-1">Massimo 10 MB; PDF fino a 250 pagine</span>
            <input type="file" accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="hidden" />
          </label>
        )}
        <button type="button" disabled={isSaving} onClick={addSource} className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {isSaving ? 'Analisi della fonte...' : 'Aggiungi fonte'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white">Fonti assegnate ({sources.length}/50)</h4>
          <button type="button" onClick={loadSources} className="p-1.5 text-twitter-muted hover:text-white"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /></button>
        </div>
        {isLoading ? (
          <div className="py-6 text-center text-twitter-muted text-xs"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Caricamento fonti...</div>
        ) : sources.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed border-twitter-border text-xs text-twitter-muted">Nessuna fonte assegnata.</div>
        ) : sources.map((source) => {
          const Icon = sourceIcon(source);
          const isBusy = busyId === source._id;
          return (
            <div key={source._id} className={`rounded-xl border p-3 ${source.status === 'failed' ? 'border-red-800/70 bg-red-950/20' : 'border-twitter-border bg-[#16181c]'} ${!source.enabled ? 'opacity-60' : ''}`}>
              <div className="flex gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${source.kind.startsWith('youtube') ? 'text-red-400' : 'text-emerald-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{source.title}</p>
                  <p className="text-[10px] text-twitter-muted truncate">{source.fileName || source.sourceUrl || `${source.wordCount.toLocaleString('it-IT')} parole`}</p>
                  <p className={`text-[10px] mt-1 ${source.status === 'ready' ? 'text-emerald-400' : source.status === 'failed' ? 'text-red-400' : 'text-twitter-blue'}`}>
                    {source.status === 'ready' ? `Pronta · ${source.wordCount.toLocaleString('it-IT')} parole` : source.status === 'failed' ? source.error || 'Elaborazione fallita' : 'Elaborazione in corso'}
                  </p>
                </div>
                <div className="flex items-start gap-1">
                  <button type="button" disabled={isBusy} onClick={() => toggleSource(source)} className="px-2 py-1 rounded-full border border-twitter-border text-[10px] text-twitter-muted hover:text-white">{source.enabled ? 'On' : 'Off'}</button>
                  {source.sourceUrl && <button type="button" disabled={isBusy} onClick={() => refreshSource(source)} className="p-1.5 text-twitter-muted hover:text-white" title="Aggiorna"><RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} /></button>}
                  <button type="button" disabled={isBusy} onClick={() => removeSource(source)} className="p-1.5 text-twitter-muted hover:text-red-400" title="Rimuovi"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-twitter-border bg-[#121418] p-3 space-y-2">
        <p className="text-[11px] font-semibold text-white flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-twitter-blue" /> Prova il recupero delle fonti</p>
        <div className="flex gap-2">
          <input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} placeholder="Es. cosa pensa dei browser Chromium?" className="flex-1 min-w-0 bg-[#16181c] border border-twitter-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-twitter-blue" />
          <button type="button" disabled={busyId === 'test'} onClick={runTest} className="px-3 py-2 rounded-xl bg-twitter-blue text-white text-xs font-bold">Prova</button>
        </div>
        {testResult && <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-2 text-[10px] text-[#cfd4da]">{testResult}</pre>}
      </div>
    </div>
  );
};
