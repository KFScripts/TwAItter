import { Schema, model, Document } from 'mongoose';

export interface IModelConfig {
  provider: string;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  responseFormat: string; // 'openai_chat' | 'openai_responses' | 'openai_completion' | 'anthropic_messages' | 'ollama' | 'custom_direct'
}

export interface ISettings extends Document {
  language: string;
  isSimulationActive: boolean;
  simulationTickMs: number;
  defaultProvider: string;
  defaultModel: string;
  defaultApiKey: string;
  defaultBaseUrl: string;
  defaultResponseFormat: string;
  textModelPool: IModelConfig[];
  visionProvider: string;
  visionModel: string;
  visionApiKey: string;
  visionBaseUrl: string;
  visionResponseFormat: string;
  imageProvider: string;
  imageModel: string;
  imageApiKey: string;
  imageBaseUrl: string;
  imageResponseFormat: string; // 'pollinations' | 'openai_images' | 'sd_webui_txt2img' | 'custom_image_url' | 'custom_binary'
  autoTicketChance: number;
  updatedAt: Date;
}

const modelConfigSchema = new Schema<IModelConfig>(
  {
    provider: { type: String, default: 'openrouter' },
    modelName: { type: String, default: 'meta-llama/llama-3.3-70b-instruct:free' },
    apiKey: { type: String, default: '' },
    baseUrl: { type: String, default: '' },
    responseFormat: { type: String, default: 'openai_chat' }
  },
  { _id: false }
);

const settingsSchema = new Schema<ISettings>(
  {
    language: { type: String, default: 'it' },
    isSimulationActive: { type: Boolean, default: true },
    simulationTickMs: { type: Number, default: 15000 },
    defaultProvider: { type: String, default: 'openrouter' },
    defaultModel: { type: String, default: 'meta-llama/llama-3.3-70b-instruct:free' },
    defaultApiKey: { type: String, default: '' },
    defaultBaseUrl: { type: String, default: '' },
    defaultResponseFormat: { type: String, default: 'openai_chat' },
    textModelPool: [modelConfigSchema],
    visionProvider: { type: String, default: 'openrouter' },
    visionModel: { type: String, default: 'google/gemini-2.0-flash-001' },
    visionApiKey: { type: String, default: '' },
    visionBaseUrl: { type: String, default: '' },
    visionResponseFormat: { type: String, default: 'openai_chat' },
    imageProvider: { type: String, default: 'pollinations' },
    imageModel: { type: String, default: 'flux' },
    imageApiKey: { type: String, default: '' },
    imageBaseUrl: { type: String, default: '' },
    imageResponseFormat: { type: String, default: 'pollinations' },
    autoTicketChance: { type: Number, default: 5 }
  },
  { timestamps: true }
);

export const Settings = model<ISettings>('Settings', settingsSchema);
