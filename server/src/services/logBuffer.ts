import util from 'util';
import { socketManager } from '../sockets/socketManager';

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface BackendLogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 500;
const buffer: BackendLogEntry[] = [];
let seq = 0;
let hooked = false;

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return util.inspect(arg, { depth: 4, colors: false, breakLength: 120 });
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .replace(/\r\n/g, '\n')
    .trimEnd();
}

function push(level: LogLevel, args: unknown[]): BackendLogEntry {
  const entry: BackendLogEntry = {
    id: ++seq,
    ts: new Date().toISOString(),
    level,
    message: formatArgs(args) || '(empty)'
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  socketManager.broadcast('BACKEND_LOG', entry);
  return entry;
}

export function hookConsole() {
  if (hooked) return;
  hooked = true;

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  console.log = (...args: unknown[]) => {
    original.log(...args);
    push('log', args);
  };
  console.info = (...args: unknown[]) => {
    original.info(...args);
    push('info', args);
  };
  console.warn = (...args: unknown[]) => {
    original.warn(...args);
    push('warn', args);
  };
  console.error = (...args: unknown[]) => {
    original.error(...args);
    push('error', args);
  };
}

export function getLogs(): BackendLogEntry[] {
  return buffer.slice();
}

export function clearLogs() {
  buffer.length = 0;
}
