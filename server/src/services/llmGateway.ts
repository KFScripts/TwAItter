import axios from 'axios';
import { IAgent } from '../models/Agent';
import { Settings } from '../models/Settings';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequestOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export class LLMGateway {
  public static async generateCompletion(
    agent: IAgent,
    options: LLMRequestOptions
  ): Promise<string> {
    const settings = await Settings.findOne();

    let provider = agent.modelConfig?.provider || settings?.defaultProvider || 'openrouter';
    let model = agent.modelConfig?.modelName || settings?.defaultModel || 'meta-llama/llama-3.3-70b-instruct:free';
    let apiKey = agent.modelConfig?.apiKey || settings?.defaultApiKey || process.env.DEFAULT_LLM_API_KEY || '';
    let customBaseUrl = agent.modelConfig?.baseUrl || settings?.defaultBaseUrl || process.env.DEFAULT_LLM_BASE_URL || '';
    let responseFormat = agent.modelConfig?.responseFormat || settings?.defaultResponseFormat || 'openai_chat';

    // Model pool resolution
    if (settings?.textModelPool && settings.textModelPool.length > 0 && !agent.modelConfig?.apiKey) {
      const poolItem = settings.textModelPool[Math.floor(Math.random() * settings.textModelPool.length)];
      if (poolItem) {
        provider = poolItem.provider;
        model = poolItem.modelName;
        if (poolItem.apiKey) apiKey = poolItem.apiKey;
        if (poolItem.baseUrl) customBaseUrl = poolItem.baseUrl;
        if (poolItem.responseFormat) responseFormat = poolItem.responseFormat;
      }
    }

    if (!apiKey && provider !== 'ollama' && !customBaseUrl) {
      throw new Error(`Nessuna chiave API o endpoint custom configurato per l'agente @${agent.username}`);
    }

    try {
      if (responseFormat === 'anthropic_messages' || provider === 'anthropic') {
        const endpoint = customBaseUrl || 'https://api.anthropic.com/v1/messages';
        console.log(`[LLM Gateway] [Anthropic] -> ${endpoint} (Modello: ${model})`);

        const systemMessage = options.messages.find((m) => m.role === 'system')?.content || '';
        const userMessages = options.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await axios.post(
          endpoint,
          {
            model,
            system: systemMessage,
            messages: userMessages,
            max_tokens: options.maxTokens ?? 350,
            temperature: options.temperature ?? 0.85
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            timeout: 25000
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Anthropic.`);
        const choice = response.data?.content?.[0]?.text;
        if (typeof choice === 'string') return choice.trim();
      } else if (responseFormat === 'openai_responses') {
        let endpoint = customBaseUrl;
        if (!endpoint) endpoint = 'https://api.openai.com/v1/responses';
        console.log(`[LLM Gateway] [OpenAI Responses] -> ${endpoint} (Modello: ${model})`);

        const payload = {
          model,
          input: options.messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options.temperature ?? 0.85
        };

        const response = await axios.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
          },
          timeout: 25000
        });

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Responses API.`);
        const choice =
          response.data?.output?.[0]?.content?.[0]?.text ||
          response.data?.output_text ||
          response.data?.response ||
          response.data?.choices?.[0]?.message?.content;

        if (typeof choice === 'string') return choice.trim();
      } else if (responseFormat === 'openai_completion') {
        const endpoint = customBaseUrl || 'https://api.openai.com/v1/completions';
        console.log(`[LLM Gateway] [OpenAI Legacy Completion] -> ${endpoint} (Modello: ${model})`);

        const prompt = options.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

        const response = await axios.post(
          endpoint,
          {
            model,
            prompt,
            max_tokens: options.maxTokens ?? 300,
            temperature: options.temperature ?? 0.85
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            timeout: 25000
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Completions.`);
        const choice = response.data?.choices?.[0]?.text;
        if (typeof choice === 'string') return choice.trim();
      } else if (responseFormat === 'custom_direct') {
        const endpoint = customBaseUrl;
        if (!endpoint) throw new Error('Custom direct endpoint URL non specificato');
        console.log(`[LLM Gateway] [Custom Direct] -> ${endpoint} (Modello: ${model})`);

        const userMsg = options.messages.find((m) => m.role === 'user')?.content || '';
        const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';

        const response = await axios.post(
          endpoint,
          {
            model,
            prompt: `${systemMsg}\n\n${userMsg}`,
            input: userMsg,
            system: systemMsg,
            messages: options.messages
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            timeout: 25000
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Custom Endpoint.`);
        if (typeof response.data === 'string') return response.data.trim();
        const choice = response.data?.text || response.data?.output || response.data?.response || response.data?.result || response.data?.message;
        if (typeof choice === 'string') return choice.trim();
      } else {
        // Standard OpenAI Chat / OpenRouter / Groq / Ollama
        let endpoint = customBaseUrl;
        let headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (!endpoint) {
          switch (provider.toLowerCase()) {
            case 'openrouter':
              endpoint = 'https://openrouter.ai/api/v1/chat/completions';
              headers['Authorization'] = `Bearer ${apiKey}`;
              headers['HTTP-Referer'] = 'https://twaitter.local';
              headers['X-Title'] = 'TwAItter';
              break;
            case 'openai':
              endpoint = 'https://api.openai.com/v1/chat/completions';
              headers['Authorization'] = `Bearer ${apiKey}`;
              break;
            case 'groq':
              endpoint = 'https://api.groq.com/openai/v1/chat/completions';
              headers['Authorization'] = `Bearer ${apiKey}`;
              break;
            case 'ollama':
              endpoint = 'http://localhost:11434/v1/chat/completions';
              break;
            default:
              endpoint = 'https://openrouter.ai/api/v1/chat/completions';
              headers['Authorization'] = `Bearer ${apiKey}`;
              break;
          }
        } else {
          if (!endpoint.endsWith('/chat/completions') && !endpoint.includes('?')) {
            endpoint = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
          }
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        }

        console.log(`[LLM Gateway] [ChatCompletions] -> ${endpoint} (Modello: ${model})`);

        const payload: any = {
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.85,
          max_tokens: options.maxTokens ?? 300
        };

        if (options.responseFormatJson) {
          payload.response_format = { type: 'json_object' };
        }

        const response = await axios.post(endpoint, payload, { headers, timeout: 25000 });
        console.log(`[LLM Gateway] Risposta ricevuta con successo.`);
        const choice = response.data?.choices?.[0]?.message?.content;
        if (typeof choice === 'string') return choice.trim();
      }
    } catch (error: any) {
      const errDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[LLM Gateway Error] Errore chiamata modello per @${agent.username}: ${errDetails}`);
      throw new Error(errDetails);
    }

    throw new Error('Nessuna risposta valida ricevuta dal modello');
  }
}
