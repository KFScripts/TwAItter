import axios from 'axios';
import { IAgent } from '../models/Agent';
import { Settings } from '../models/Settings';
import { repairJsonObject } from '../utils/jsonRepair';

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
    const agentCfg = agent.modelConfig;
    const hasPersonalGateway = !!(agentCfg?.apiKey || agentCfg?.baseUrl);

    let provider = settings?.defaultProvider || 'openrouter';
    let model = settings?.defaultModel || 'meta-llama/llama-3.3-70b-instruct:free';
    let apiKey = settings?.defaultApiKey || process.env.DEFAULT_LLM_API_KEY || '';
    let customBaseUrl = settings?.defaultBaseUrl || process.env.DEFAULT_LLM_BASE_URL || '';
    let responseFormat = settings?.defaultResponseFormat || 'openai_chat';

    if (hasPersonalGateway) {
      if (agentCfg.provider) provider = agentCfg.provider;
      if (agentCfg.modelName) model = agentCfg.modelName;
      if (agentCfg.apiKey) apiKey = agentCfg.apiKey;
      if (agentCfg.baseUrl) customBaseUrl = agentCfg.baseUrl;
      if (agentCfg.responseFormat) responseFormat = agentCfg.responseFormat;
    }

    if (settings?.textModelPool && settings.textModelPool.length > 0 && !agentCfg?.apiKey) {
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

    const timeout = parseInt(process.env.LLM_TIMEOUT_MS || '', 10) || 90000;

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
            max_tokens: options.maxTokens ?? (options.responseFormatJson ? 800 : 350),
            temperature: options.temperature ?? 0.85
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            timeout
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Anthropic.`);
        const choice = this.extractTextFromResponse(response.data);
        if (choice) return choice;
      } else if (responseFormat === 'openai_responses') {
        let endpoint = customBaseUrl;
        if (!endpoint) endpoint = 'https://api.openai.com/v1/responses';
        console.log(`[LLM Gateway] [OpenAI Responses] -> ${endpoint} (Modello: ${model})`);

        const payload: any = {
          model,
          input: options.messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: options.temperature ?? 0.85,
          max_output_tokens: options.maxTokens ?? (options.responseFormatJson ? 800 : 350)
        };

        const response = await axios.post(endpoint, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
          },
          timeout
        });

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Responses API.`);
        const choice = this.extractTextFromResponse(response.data);
        if (choice) return choice;
      } else if (responseFormat === 'openai_completion') {
        const endpoint = customBaseUrl || 'https://api.openai.com/v1/completions';
        console.log(`[LLM Gateway] [OpenAI Legacy Completion] -> ${endpoint} (Modello: ${model})`);

        const prompt = options.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

        const response = await axios.post(
          endpoint,
          {
            model,
            prompt,
            max_tokens: options.maxTokens ?? (options.responseFormatJson ? 800 : 300),
            temperature: options.temperature ?? 0.85
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            timeout
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Completions.`);
        const choice = this.extractTextFromResponse(response.data);
        if (choice) return choice;
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
            timeout
          }
        );

        console.log(`[LLM Gateway] Risposta ricevuta con successo da Custom Endpoint.`);
        const choice = this.extractTextFromResponse(response.data);
        if (choice) return choice;
      } else {
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
          max_tokens: options.maxTokens ?? (options.responseFormatJson ? 800 : 300)
        };

        if (options.responseFormatJson) {
          payload.response_format = { type: 'json_object' };
        }

        const response = await axios.post(endpoint, payload, { headers, timeout });
        console.log(`[LLM Gateway] Risposta ricevuta con successo.`);
        const choice = this.extractTextFromResponse(response.data);
        if (choice) return choice;
      }
    } catch (error: any) {
      const errDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error(`[LLM Gateway Error] Errore chiamata modello per @${agent.username}: ${errDetails}`);
      throw new Error(errDetails);
    }

    throw new Error('Nessuna risposta valida ricevuta dal modello');
  }

  private static extractTextFromResponse(data: any): string | null {
    if (!data) return null;
    if (typeof data === 'string') {
      if (data.includes('data:')) {
        const streamLines = data.split('\n');
        let accumulated = '';
        for (const line of streamLines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
            try {
              const json = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '';
              accumulated += delta;
            } catch {}
          }
        }
        if (accumulated) return this.preferJsonPayload(accumulated);
      }
      return this.preferJsonPayload(data);
    }

    const message = data?.choices?.[0]?.message || data?.message;
    const contentCandidates = [
      this.coerceContent(message?.content),
      this.coerceContent(data?.output_text),
      this.coerceContent(data?.content?.[0]?.text),
      this.coerceContent(data?.output?.[0]?.content?.[0]?.text),
      this.coerceContent(data?.choices?.[0]?.text),
      this.coerceContent(data?.text),
      this.coerceContent(data?.output),
      this.coerceContent(data?.response),
      this.coerceContent(data?.result)
    ].filter((v): v is string => !!v);

    for (const candidate of contentCandidates) {
      const preferred = this.preferJsonPayload(candidate);
      if (preferred) return preferred;
    }

    const reasoningFallback = [
      this.coerceContent(message?.reasoning_content),
      this.coerceContent(message?.reasoning),
      this.coerceContent(data?.reasoning)
    ].filter((v): v is string => !!v);

    for (const candidate of reasoningFallback) {
      const preferred = this.preferJsonPayload(candidate);
      if (preferred && preferred.trim().startsWith('{')) return preferred;
    }

    return contentCandidates[0] ? this.preferJsonPayload(contentCandidates[0]) : null;
  }

  private static coerceContent(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      const joined = value
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object') {
            const rec = part as Record<string, unknown>;
            if (rec.type === 'thinking' || rec.type === 'reasoning') return '';
            if (typeof rec.text === 'string') return rec.text;
            if (typeof rec.content === 'string') return rec.content;
          }
          return '';
        })
        .join('\n')
        .trim();
      return joined || null;
    }
    return null;
  }

  private static preferJsonPayload(raw: string): string {
    const stripped = raw
      .replace(/<(?:think|thinking|reason|reasoning|analysis)[^>]*>[\s\S]*?<\/(?:think|thinking|reason|reasoning|analysis)>/gi, '')
      .replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1')
      .trim();

    const jsonStart = stripped.indexOf('{');
    if (jsonStart >= 0) {
      const slice = stripped.slice(jsonStart);
      const jsonEnd = slice.lastIndexOf('}');
      const maybeJson = jsonEnd > 0 ? slice.slice(0, jsonEnd + 1) : slice;
      try {
        const parsed = JSON.parse(maybeJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return maybeJson;
        }
      } catch {
        const repaired = repairJsonObject(slice);
        if (repaired) {
          try {
            const parsed = JSON.parse(repaired);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return repaired;
            }
          } catch {
            // keep stripped text
          }
        }
      }
    }

    return stripped;
  }
}
