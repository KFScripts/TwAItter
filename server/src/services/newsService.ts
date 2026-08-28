import { WebSearchService } from './webSearchService';
import { IAgent } from '../models/Agent';

export interface INewsArticle {
  title: string;
  category: string;
  timestamp: number;
}

export interface IContextPayload {
  dateTimeFormatted: string;
  trendingTopics: string[];
  recentEvents: string[];
  realWorldNews: string[];
  globalXTrends: string[];
}

export class NewsService {
  private static newsPool: INewsArticle[] = [];
  private static lastSyncTime: number = 0;
  private static isSyncing: boolean = false;
  private static syncIntervalMs: number = 10 * 60 * 1000;

  public static async initNewsPool(): Promise<void> {
    if (this.newsPool.length === 0) {
      await this.syncNewsPool();
    }
    setInterval(() => {
      this.syncNewsPool().catch((e) => console.error('[News Sync Error]', e.message));
    }, this.syncIntervalMs);
  }

  public static async syncNewsPool(lang: 'it' | 'en' = 'it'): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      console.log('[News Sync] Scaricamento notizie reali online in streaming...');
      const liveItems = await WebSearchService.fetchLiveNews(lang);

      if (liveItems.length > 0) {
        const unique = new Map<string, INewsArticle>();
        for (const item of liveItems) {
          const key = item.title.toLowerCase().slice(0, 40);
          if (!unique.has(key)) {
            unique.set(key, {
              title: item.title,
              category: item.category,
              timestamp: Date.now()
            });
          }
        }
        this.newsPool = Array.from(unique.values());
        this.lastSyncTime = Date.now();
        console.log(`[News Sync] Pool aggiornato con successo: ${this.newsPool.length} notizie online caricate.`);
      }
    } catch (err: any) {
      console.error('[News Sync] Errore fetch online:', err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  public static getPersonalizedNews(agent?: IAgent, maxItems: number = 6): string[] {
    if (this.newsPool.length === 0) {
      return [];
    }

    if (!agent) {
      const shuffled = [...this.newsPool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, maxItems).map((n) => `[${n.category}] ${n.title}`);
    }

    const agentText = `${agent.displayName} ${agent.bio} ${agent.profession || ''} ${agent.personalityPrompt}`.toLowerCase();
    const tokens = agentText
      .split(/[^a-z0-9àèéìòù]+/i)
      .filter((t) => t.length > 3);

    const scored = this.newsPool.map((article) => {
      const artText = `${article.title} ${article.category}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (artText.includes(token)) {
          score += 1;
        }
      }
      return { article, score };
    });

    scored.sort((a, b) => b.score - a.score || (0.5 - Math.random()));
    return scored.slice(0, maxItems).map((s) => `[${s.article.category}] ${s.article.title}`);
  }

  public static async getCurrentContext(language: string = 'it', agent?: IAgent): Promise<IContextPayload> {
    if (this.newsPool.length === 0) {
      await this.syncNewsPool(language === 'it' ? 'it' : 'en');
    }

    const now = new Date();
    const locale = language === 'it' ? 'it-IT' : 'en-US';
    const dateTimeFormatted = now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const categories = Array.from(new Set(this.newsPool.map((n) => n.category)));
    const selectedEvents: string[] = [];

    for (const cat of categories) {
      const inCat = this.newsPool.filter((n) => n.category === cat);
      if (inCat.length > 0) {
        const randomItem = inCat[Math.floor(Math.random() * inCat.length)];
        selectedEvents.push(`[${randomItem.category}] ${randomItem.title}`);
      }
    }

    const globalXTrends = this.newsPool
      .slice(0, 5)
      .map((n) => n.title);

    const trendingTags: string[] = [];
    const stopWords = new Set(['della', 'delle', 'degli', 'nella', 'nelle', 'hanno', 'prima', 'dopo', 'tutti', 'anche', 'senza', 'fatto', 'punto', 'cosa', 'sono', 'come', 'dove', 'quando', 'perche', 'tutto', 'with', 'from', 'that', 'this', 'have', 'more', 'about']);
    const wordCounts = new Map<string, number>();

    for (const article of this.newsPool) {
      const words = article.title.split(/[^a-zA-Z0-9àèéìòù]+/);
      for (const w of words) {
        const clean = w.trim();
        const lower = clean.toLowerCase();
        if (clean.length > 4 && !stopWords.has(lower) && !/^\d+$/.test(clean)) {
          const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
          wordCounts.set(capitalized, (wordCounts.get(capitalized) || 0) + 1);
        }
      }
    }

    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => `#${word}`);

    trendingTags.push(...topWords);

    const personalizedNews = this.getPersonalizedNews(agent, 6);

    return {
      dateTimeFormatted,
      trendingTopics: trendingTags,
      recentEvents: selectedEvents,
      realWorldNews: personalizedNews,
      globalXTrends
    };
  }
}
