import axios from 'axios';
import * as cheerio from 'cheerio';

export interface RssItem {
  title: string;
  category: string;
  source?: string;
  pubDate?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchService {
  private static readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  private static readonly searchCache = new Map<string, { expiresAt: number; results: WebSearchResult[] }>();
  private static readonly SEARCH_CACHE_MS = 20 * 60 * 1000;

  private static cleanTitle(text: string): string {
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s*-\s*[A-Za-z0-9\s\.\(\)\/]+$/i, '')
      .trim();
  }

  private static extractRssItems(xml: string, category: string, limit: number = 10): RssItem[] {
    const items: RssItem[] = [];
    const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const rawTitle = match[1];
      const title = this.cleanTitle(rawTitle);
      if (title && !title.toLowerCase().includes('google news') && title.length > 12) {
        items.push({ title, category });
      }
    }
    return items;
  }

  public static async fetchFeed(url: string, category: string, limit: number = 10): Promise<RssItem[]> {
    try {
      const res = await axios.get(url, {
        timeout: 6000,
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      return this.extractRssItems(res.data, category, limit);
    } catch {
      return [];
    }
  }

  public static async fetchLiveNews(lang: 'it' | 'en' = 'it'): Promise<RssItem[]> {
    const feeds =
      lang === 'it'
        ? [
            { url: 'https://news.google.com/rss?hl=it&gl=IT&ceid=IT:it', cat: 'Prima Pagina' },
            { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=it&gl=IT&ceid=IT:it', cat: 'Tecnologia' },
            { url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=it&gl=IT&ceid=IT:it', cat: 'Spettacolo' },
            { url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=it&gl=IT&ceid=IT:it', cat: 'Sport' },
            { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=it&gl=IT&ceid=IT:it', cat: 'Economia' },
            { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=it&gl=IT&ceid=IT:it', cat: 'Scienza' },
            { url: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=it&gl=IT&ceid=IT:it', cat: 'Italia' },
            { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=it&gl=IT&ceid=IT:it', cat: 'Mondo' },
            { url: 'https://www.ansa.it/sito/ansait_rss.xml', cat: 'Attualità' },
            { url: 'https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml', cat: 'Tecnologia' },
            { url: 'https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml', cat: 'Cultura' },
            { url: 'https://www.ansa.it/sito/notizie/sport/sport_rss.xml', cat: 'Sport' }
          ]
        : [
            { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', cat: 'Top News' },
            { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en', cat: 'Technology' },
            { url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en', cat: 'Entertainment' },
            { url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en', cat: 'Sports' },
            { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en', cat: 'Business' },
            { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en', cat: 'Science' },
            { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', cat: 'World' }
          ];

    const results = await Promise.all(feeds.map((f) => this.fetchFeed(f.url, f.cat, 8)));
    const flat = results.flat();

    const seen = new Set<string>();
    return flat.filter((item) => {
      const key = item.title.toLowerCase().slice(0, 35);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public static async searchWeb(query: string, limit: number = 4): Promise<WebSearchResult[]> {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim().slice(0, 240);
    if (normalizedQuery.length < 3) return [];

    const cacheKey = `${normalizedQuery.toLowerCase()}::${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.results;

    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: normalizedQuery },
        timeout: 8000,
        responseType: 'text',
        maxContentLength: 2 * 1024 * 1024,
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml'
        }
      });
      const $ = cheerio.load(String(response.data || ''));
      const results: WebSearchResult[] = [];

      $('.result').each((_, element) => {
        if (results.length >= Math.max(1, Math.min(limit, 8))) return false;
        const link = $(element).find('.result__a').first();
        const title = link.text().replace(/\s+/g, ' ').trim();
        const rawHref = link.attr('href') || '';
        const snippet = $(element).find('.result__snippet').first().text().replace(/\s+/g, ' ').trim();
        if (!title || !rawHref) return;

        let url = rawHref;
        try {
          const parsed = new URL(rawHref, 'https://duckduckgo.com');
          url = parsed.searchParams.get('uddg') || parsed.toString();
        } catch {}
        if (!/^https?:\/\//i.test(url)) return;
        results.push({ title, url, snippet: snippet.slice(0, 500) });
      });

      this.searchCache.set(cacheKey, {
        expiresAt: Date.now() + this.SEARCH_CACHE_MS,
        results
      });
      return results;
    } catch (error: any) {
      console.warn(`[Web Search] Ricerca fallita per "${normalizedQuery}": ${error.message}`);
      return [];
    }
  }
}
