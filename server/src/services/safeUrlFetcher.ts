import axios from 'axios';
import { lookup } from 'dns/promises';
import net from 'net';

export interface SafeFetchResult {
  finalUrl: string;
  contentType: string;
  body: Buffer;
}

export class SafeUrlFetcher {
  private static readonly MAX_BYTES = 10 * 1024 * 1024;
  private static readonly MAX_REDIRECTS = 3;
  private static readonly USER_AGENT =
    'Mozilla/5.0 (compatible; TwAItterSourceBot/1.0; +https://github.com/KFScripts/TwAItter)';

  private static isPrivateIpv4(address: string): boolean {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return true;
    }
    const [a, b, c] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  private static isPrivateAddress(address: string): boolean {
    const version = net.isIP(address);
    if (version === 4) return this.isPrivateIpv4(address);
    if (version !== 6) return true;

    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) {
      return this.isPrivateIpv4(normalized.slice('::ffff:'.length));
    }
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith('2001:db8:')
    );
  }

  public static async validateUrl(rawUrl: string): Promise<URL> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      throw new Error('URL non valida');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Sono consentiti soltanto URL HTTP o HTTPS');
    }
    if (parsed.username || parsed.password) {
      throw new Error('Le URL con credenziali incorporate non sono consentite');
    }
    if (parsed.port && !['80', '443'].includes(parsed.port)) {
      throw new Error('La porta indicata nella URL non è consentita');
    }
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (['localhost', 'localhost.localdomain'].includes(hostname.toLowerCase())) {
      throw new Error('Gli indirizzi locali non sono consentiti');
    }

    if (net.isIP(hostname)) {
      if (this.isPrivateAddress(hostname)) throw new Error('Gli indirizzi privati o riservati non sono consentiti');
      return parsed;
    }

    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((entry) => this.isPrivateAddress(entry.address))) {
      throw new Error('La destinazione risolve a un indirizzo privato o non valido');
    }
    return parsed;
  }

  public static async fetch(rawUrl: string, redirectCount: number = 0): Promise<SafeFetchResult> {
    if (redirectCount > this.MAX_REDIRECTS) throw new Error('Troppi reindirizzamenti');
    const parsed = await this.validateUrl(rawUrl);

    const response = await axios.get<ArrayBuffer>(parsed.toString(), {
      timeout: 12000,
      responseType: 'arraybuffer',
      maxRedirects: 0,
      maxContentLength: this.MAX_BYTES,
      maxBodyLength: this.MAX_BYTES,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': this.USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain,text/markdown;q=0.9,*/*;q=0.5'
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) throw new Error('Redirect senza destinazione');
      const nextUrl = new URL(location, parsed).toString();
      return this.fetch(nextUrl, redirectCount + 1);
    }

    const body = Buffer.from(response.data);
    if (body.length > this.MAX_BYTES) throw new Error('La fonte supera il limite di 10 MB');

    return {
      finalUrl: parsed.toString(),
      contentType: String(response.headers['content-type'] || '').toLowerCase(),
      body
    };
  }
}
