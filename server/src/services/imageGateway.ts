import axios from 'axios';
import { Settings } from '../models/Settings';

export class ImageGateway {
  public static async generateImage(prompt: string): Promise<string | null> {
    try {
      const settings = await Settings.findOne();
      const provider = settings?.imageProvider || process.env.DEFAULT_IMAGE_PROVIDER || 'pollinations';
      const apiKey = settings?.imageApiKey || process.env.DEFAULT_IMAGE_API_KEY || '';
      const customBaseUrl = settings?.imageBaseUrl || '';
      const responseFormat = settings?.imageResponseFormat || (provider === 'openai' ? 'openai_images' : 'pollinations');

      console.log(`[Image Gateway] Generazione immagine (Provider: ${provider}, Formato: ${responseFormat})`);

      if (responseFormat === 'sd_webui_txt2img' || (customBaseUrl && customBaseUrl.includes('/sdapi/'))) {
        const endpoint = customBaseUrl || 'http://localhost:7860/sdapi/v1/txt2img';
        console.log(`[Image Gateway] Richiesta a SD WebUI -> ${endpoint}`);
        const res = await axios.post(
          endpoint,
          {
            prompt: `${prompt}, high quality, realistic photography`,
            negative_prompt: 'deformed, blurry, low quality, bad anatomy',
            steps: 20,
            width: 768,
            height: 512
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            timeout: 45000
          }
        );
        const b64 = res.data?.images?.[0];
        if (b64) return `data:image/png;base64,${b64}`;
      }

      if (responseFormat === 'openai_images' || provider === 'openai') {
        const endpoint = customBaseUrl || 'https://api.openai.com/v1/images/generations';
        console.log(`[Image Gateway] Richiesta a OpenAI DALL-E -> ${endpoint}`);
        const res = await axios.post(
          endpoint,
          {
            model: settings?.imageModel || 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            timeout: 35000
          }
        );
        const url = res.data?.data?.[0]?.url;
        if (url) return url;
        const b64 = res.data?.data?.[0]?.b64_json;
        if (b64) return `data:image/png;base64,${b64}`;
      }

      if (responseFormat === 'custom_image_url' || (provider === 'custom' && customBaseUrl)) {
        const endpoint = customBaseUrl;
        console.log(`[Image Gateway] Richiesta a Custom Image Endpoint -> ${endpoint}`);
        const res = await axios.post(
          endpoint,
          {
            prompt,
            model: settings?.imageModel || 'flux'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            timeout: 35000
          }
        );

        if (typeof res.data === 'string' && (res.data.startsWith('http') || res.data.startsWith('data:image'))) {
          return res.data;
        }
        return res.data?.url || res.data?.data?.[0]?.url || res.data?.image || res.data?.output?.[0] || null;
      }

      // Default Pollinations.ai (Fast Turbo engine)
      const sanitized = encodeURIComponent(prompt.slice(0, 160));
      const seed = Math.floor(Math.random() * 999999);
      const model = settings?.imageModel && settings.imageModel !== 'flux' ? settings.imageModel : 'turbo';
      return `https://image.pollinations.ai/prompt/${sanitized}?width=800&height=500&model=${model}&nologo=true&seed=${seed}`;
    } catch (error: any) {
      console.warn('[Image Gateway Error]:', error.message);
      return null;
    }
  }
}
