import axios from 'axios';
import { Settings } from '../models/Settings';

export class VisionGateway {
  private static cache: Map<string, string> = new Map();

  public static async describeImage(imageUrl: string, language: string = 'it'): Promise<string> {
    if (!imageUrl) return '';
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl)!;
    }

    const settings = await Settings.findOne();
    const provider = settings?.visionProvider || process.env.DEFAULT_VISION_PROVIDER || 'openrouter';
    const model = settings?.visionModel || process.env.DEFAULT_VISION_MODEL || 'google/gemini-2.0-flash-001';
    const apiKey = settings?.visionApiKey || settings?.defaultApiKey || process.env.DEFAULT_VISION_API_KEY || process.env.DEFAULT_LLM_API_KEY || '';
    const customBaseUrl = settings?.visionBaseUrl || process.env.DEFAULT_VISION_BASE_URL || '';

    if (!apiKey && !customBaseUrl) {
      const fallback = this.getHeuristicImageDescription(imageUrl, language);
      this.cache.set(imageUrl, fallback);
      return fallback;
    }

    try {
      let endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      };

      if (customBaseUrl) {
        endpoint = customBaseUrl.endsWith('/chat/completions')
          ? customBaseUrl
          : `${customBaseUrl.replace(/\/+$/, '')}/chat/completions`;
      } else if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
      }

      const promptText =
        language === 'it'
          ? 'Fornisci una descrizione molto concisa (massimo 1-2 frasi) di cosa è raffigurato in questa immagine allegata al post social.'
          : 'Provide a very concise description (1-2 sentences max) of what is depicted in this image attached to a social post.';

      const payload = {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 150
      };

      const response = await axios.post(endpoint, payload, { headers, timeout: 20000 });
      const description = response.data?.choices?.[0]?.message?.content?.trim() || '';

      if (description) {
        this.cache.set(imageUrl, description);
        return description;
      }
    } catch (err: any) {
      console.warn(`[VisionGateway Error]: ${err.message}. Using heuristic fallback.`);
    }

    const fallback = this.getHeuristicImageDescription(imageUrl, language);
    this.cache.set(imageUrl, fallback);
    return fallback;
  }

  private static getHeuristicImageDescription(imageUrl: string, language: string): string {
    if (imageUrl.includes('pollinations.ai/prompt/')) {
      const match = imageUrl.match(/pollinations\.ai\/prompt\/([^?&]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).replace(/\+/g, ' ');
        return language === 'it'
          ? `[Immagine allegata: Foto/grafica raffigurante ${decoded}]`
          : `[Attached image: Photo depicting ${decoded}]`;
      }
    }
    return language === 'it'
      ? '[Immagine allegata: Foto condivisa dall’utente nel post]'
      : '[Attached image: Photo shared in the post]';
  }
}
