import React, { useEffect, useRef, useState } from 'react';
import { IBackendLog } from '../types';
import { Terminal, Trash2, Pause, Play, ArrowDown } from 'lucide-react';

interface BackendLogConsoleProps {
  logs: IBackendLog[];
  onClear: () => void;
}

const LEVEL_CLASS: Record<IBackendLog['level'], string> = {
  log: 'text-[#d4d4d4]',
  info: 'text-sky-300',
  warn: 'text-amber-300',
  error: 'text-red-400'
};

const LEVEL_LABEL: Record<IBackendLog['level'], string> = {
  log: 'LOG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR'
};

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString('it-IT', { hour12: false });
}

export const BackendLogConsole: React.FC<BackendLogConsoleProps> = ({ logs, onClear }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | IBackendLog['level']>('all');

  const visible = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  useEffect(() => {
    if (paused) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, paused, filter]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (!atBottom && !paused) setPaused(true);
  };

  return (
    <div className="bg-twitter-card border border-twitter-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-twitter-border">
        <div className="flex items-center gap-2 text-white font-bold text-base min-w-0">
          <Terminal className="w-5 h-5 text-twitter-accent shrink-0" />
          <span>Console Backend</span>
          <span className="text-[11px] font-semibold text-twitter-muted font-mono">
            {visible.length}/{logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-[#121418] border border-twitter-border rounded-lg px-2 py-1 text-[11px] text-white"
          >
            <option value="all">Tutti</option>
            <option value="log">log</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-twitter-border text-twitter-muted hover:text-white hover:bg-[#121418] transition"
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {paused ? 'Live' : 'Pausa'}
          </button>
          {paused && (
            <button
              type="button"
              onClick={() => {
                setPaused(false);
                const el = scrollerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-twitter-border text-twitter-blue hover:bg-twitter-blue/10 transition"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Fine
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Pulisci
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="bg-[#0b0d10] h-[420px] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-5"
      >
        {visible.length === 0 ? (
          <p className="text-twitter-muted px-1 py-2">Nessun log. I messaggi del backend appariranno qui in tempo reale.</p>
        ) : (
          visible.map((entry) => (
            <div key={entry.id} className="flex gap-2 whitespace-pre-wrap break-all">
              <span className="text-twitter-muted shrink-0">{formatTime(entry.ts)}</span>
              <span className={`shrink-0 font-bold ${LEVEL_CLASS[entry.level]}`}>{LEVEL_LABEL[entry.level]}</span>
              <span className={LEVEL_CLASS[entry.level]}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
