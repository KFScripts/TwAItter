import { Agent } from '../models/Agent';
import { Settings } from '../models/Settings';
import { AgentGenerator } from './agentGenerator';

export async function seedDatabase() {
  const currentCount = await Agent.countDocuments();
  if (currentCount === 0) {
    console.log('Generating 50 authentic Italian social profiles...');
    const agentsList = AgentGenerator.generate50ItalianAgents();
    await Agent.insertMany(agentsList);
    console.log('50 Italian social profiles seeded successfully.');
  }

  const existingSettings = await Settings.findOne();
  if (!existingSettings) {
    await Settings.create({
      language: process.env.PLATFORM_LANGUAGE || 'it',
      isSimulationActive: false,
      simulationTickMs: 15000,
      defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'openrouter',
      defaultModel: process.env.DEFAULT_LLM_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
      defaultApiKey: process.env.DEFAULT_LLM_API_KEY || '',
      defaultResponseFormat: 'openai_chat',
      visionProvider: process.env.DEFAULT_VISION_PROVIDER || 'openrouter',
      visionModel: process.env.DEFAULT_VISION_MODEL || 'google/gemini-2.0-flash-001',
      visionApiKey: process.env.DEFAULT_VISION_API_KEY || '',
      visionResponseFormat: 'openai_chat',
      imageProvider: process.env.DEFAULT_IMAGE_PROVIDER || 'pollinations',
      imageModel: 'flux',
      imageResponseFormat: 'pollinations'
    });
  }
}
