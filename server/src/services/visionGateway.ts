import axios from 'axios';
import { Settings } from '../models/Settings';

export class VisionGateway {
  private static cache: Map<string, string> = new Map();

  public static async describeImage(imageUrl: string, language: string = 'it'): Promise<string> {
    if (!imageUrl) return '';
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl)!;
    }

    if (imageUrl.startsWith('data:image/svg+xml') || imageUrl.trim().startsWith('<svg')) {
      const svgDescription = this.extractSvgContent(imageUrl, language);
      if (svgDescription) {
        this.cache.set(imageUrl, svgDescription);
        return svgDescription;
      }
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
          ? 'Analizza questa immagine in modo dettagliato ed esegui un OCR accurato di tutti i testi visibili.\nFornisci:\n1. [Descrizione Visiva]: Cosa è raffigurato (soggetti, persone, ambiente, oggetti, stile o contesto ironico/meme).\n2. [Testo / OCR]: Trascrivi fedelmente e integralmente ogni testo, titolo, didascalia, messaggio di chat, interfaccia o scritta visibile (se non c\'è testo scrivi "Nessun testo rilevato").'
          : 'Analyze this image in detail and perform accurate OCR on all visible text.\nProvide:\n1. [Visual Description]: What is depicted (subjects, scene, objects, style, or meme context).\n2. [Text / OCR]: Exact transcription of all visible text, titles, captions, messages, UI elements, or labels (if none, state "No text detected").';

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
        max_tokens: 600
      };

      const response = await axios.post(endpoint, payload, { headers, timeout: 25000 });
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

  private static extractSvgContent(svgDataUri: string, language: string): string {
    try {
      let rawSvg = '';
      if (svgDataUri.startsWith('data:image/svg+xml;base64,')) {
        rawSvg = Buffer.from(svgDataUri.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
      } else if (svgDataUri.startsWith('data:image/svg+xml;utf8,')) {
        rawSvg = decodeURIComponent(svgDataUri.replace('data:image/svg+xml;utf8,', ''));
      } else if (svgDataUri.startsWith('data:image/svg+xml,')) {
        rawSvg = decodeURIComponent(svgDataUri.replace('data:image/svg+xml,', ''));
      } else if (svgDataUri.trim().startsWith('<svg')) {
        rawSvg = svgDataUri;
      }

      if (!rawSvg) return '';

      const textMatches = rawSvg.match(/<text[^>]*>([\s\S]*?)<\/text>/gi) || [];
      const extractedLines: string[] = [];

      for (const tm of textMatches) {
        const cleaned = tm
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        if (cleaned && !extractedLines.includes(cleaned)) {
          extractedLines.push(cleaned);
        }
      }

      if (extractedLines.length > 0) {
        return language === 'it'
          ? `[Grafica/Screenshot SVG - Testo rilevato (OCR)]: ${extractedLines.join(' | ')}`
          : `[SVG Graphic/Screenshot - Detected text (OCR)]: ${extractedLines.join(' | ')}`;
      }
    } catch {}
    return '';
  }

  private static getHeuristicImageDescription(imageUrl: string, language: string): string {
    if (imageUrl.includes('pollinations.ai/prompt/')) {
      const match = imageUrl.match(/pollinations\.ai\/prompt\/([^?&]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).replace(/\+/g, ' ');
        return language === 'it'
          ? `[Immagine allegata: Foto/grafica raffigurante "${decoded}"]`
          : `[Attached image: Photo depicting "${decoded}"]`;
      }
    }
    return language === 'it'
      ? '[Immagine allegata: Foto condivisa dall’utente nel post/DM]'
      : '[Attached image: Photo shared in the post/DM]';
  }
}
