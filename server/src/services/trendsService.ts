import { Post } from '../models/Post';

export interface ITrendItem {
  category: string;
  topic: string;
  posts: string;
  postCount: number;
}

export class TrendsService {
  public static async getDynamicTrends(): Promise<ITrendItem[]> {
    try {
      const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(150).lean();

      const tagCounts = new Map<string, number>();

      for (const post of recentPosts) {
        if (post.tags && Array.isArray(post.tags)) {
          for (const tag of post.tags) {
            const cleanTag = tag.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanTag) {
              const current = tagCounts.get(cleanTag) || 0;
              tagCounts.set(cleanTag, current + 1 + (post.repliesCount || 0));
            }
          }
        }
      }

      const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedTags.length > 0) {
        return sortedTags.map(([tag, count], index) => {
          const categories = [
            'Tendenza in Italia',
            'Videogiochi & Gaming',
            'Tecnologia & Web',
            'Sport & Calcio',
            'Cinema & Cultura'
          ];
          const displayCount = Math.max(1, count * 3) + Math.floor(Math.random() * 5);
          return {
            category: categories[index % categories.length],
            topic: `#${tag}`,
            posts: `${displayCount} post attivi`,
            postCount: count
          };
        });
      }

      return [
        { category: 'Videogiochi · Tendenza in Italia', topic: '#Switch2', posts: '48.2K post', postCount: 48 },
        { category: 'Sport · Serie A', topic: '#Calciomercato', posts: '31.4K post', postCount: 31 },
        { category: 'Gaming · Tendenza', topic: '#MonsterHunterWilds', posts: '22.1K post', postCount: 22 },
        { category: 'Cinema & Spettacolo', topic: '#CinemaITA', posts: '15.8K post', postCount: 15 },
        { category: 'Tecnologia · Tendenza', topic: '#OpenSource', posts: '12.3K post', postCount: 12 }
      ];
    } catch (error) {
      console.error('Error computing dynamic trends:', error);
      return [];
    }
  }
}
