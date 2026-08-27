/**
 * Ripara JSON troncato o leggermente malformato (stringhe aperte, parentesi
 * mancanti, virgole finali, newline non escapati). Restituisce null se
 * il testo non è recuperabile in un oggetto.
 */
export function repairJsonObject(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const start = raw.indexOf('{');
  if (start < 0) return null;

  const rebuilt = rebuildJsonPrefix(raw.slice(start));
  if (!rebuilt) return null;

  try {
    const parsed = JSON.parse(rebuilt);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return rebuilt;
    }
  } catch {
    return null;
  }

  return null;
}

export function tryParseJsonObject(raw: string): any | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    const repaired = repairJsonObject(raw);
    if (!repaired) return null;
    try {
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function rebuildJsonPrefix(src: string): string | null {
  let out = '';
  let inString = false;
  let escape = false;
  const stack: Array<'}' | ']'> = [];

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const code = src.charCodeAt(i);

    if (inString) {
      if (escape) {
        if (ch === 'u') {
          const hex = src.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            out += `\\u${hex}`;
            i += 4;
          }
          escape = false;
          continue;
        }
        if ('"\\/bfnrt'.includes(ch)) {
          out += `\\${ch}`;
        } else {
          out += ch;
        }
        escape = false;
        continue;
      }

      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += '"';
        continue;
      }
      if (code < 0x20) {
        if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        else out += `\\u${code.toString(16).padStart(4, '0')}`;
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += '"';
      continue;
    }
    if (ch === '{') {
      stack.push('}');
      out += ch;
      continue;
    }
    if (ch === '[') {
      stack.push(']');
      out += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      out += ch;
      continue;
    }
    out += ch;
  }

  if (inString) {
    out += '"';
  }

  out = stripDanglingProperty(out);
  out = out.replace(/,(\s*[}\]])/g, '$1');

  while (stack.length) {
    out = out.replace(/,\s*$/, '');
    out += stack.pop();
  }

  out = out.replace(/,(\s*[}\]])/g, '$1');
  return out.trim() || null;
}

function stripDanglingProperty(text: string): string {
  let out = text.replace(/,\s*$/, '');
  out = out.replace(/,\s*"(?:\\.|[^"\\])*"\s*:\s*$/, '');
  out = out.replace(/,\s*"(?:\\.|[^"\\])*"\s*$/, '');
  out = out.replace(/([{\[])\s*"(?:\\.|[^"\\])*"\s*:\s*$/, '$1');
  out = out.replace(/:\s*$/, ': null');
  return out.replace(/,\s*$/, '');
}
