import { Router, Request, Response } from 'express';
import { Agent } from '../models/Agent';
import { AgentEngine } from '../services/agentEngine';
import { AgentGenerator } from '../services/agentGenerator';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await Agent.find().sort({ username: 1 });
    res.json(agents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/populate-50', async (req: Request, res: Response) => {
  try {
    await Agent.deleteMany({});
    const agentsList = AgentGenerator.generate50ItalianAgents();
    const created = await Agent.insertMany(agentsList);
    res.json({ message: `Generati con successo ${created.length} profili italiani diversificati e aziende`, count: created.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-single', async (req: Request, res: Response) => {
  try {
    const generatedData = AgentGenerator.generateSingleUniqueProfile();
    const created = await Agent.create(generatedData);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:username', async (req: Request, res: Response) => {
  try {
    const agent = await Agent.findOne({ username: req.params.username });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      username,
      displayName,
      avatarUrl,
      bio,
      age,
      city,
      profession,
      accountType,
      verificationBadge,
      personalityPrompt,
      physicalAppearance,
      mood,
      modelConfig,
      activityInterval
    } = req.body;

    const avatar = avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

    const newAgent = await Agent.create({
      username: username.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''),
      displayName,
      avatarUrl: avatar,
      bio,
      age: age || undefined,
      city: city || 'Italia',
      profession: profession || 'Membro della community',
      accountType: accountType || 'personal',
      verificationBadge: verificationBadge || (accountType === 'software' || accountType === 'business' ? 'gold' : 'none'),
      personalityPrompt,
      physicalAppearance: physicalAppearance || '',
      memories: [`Creato su TwAItter`, `Professione: ${profession || 'Creativo'}`],
      mood: mood || 'focused',
      modelConfig: modelConfig || {},
      activityInterval: activityInterval || 20
    });

    res.status(201).json(newAgent);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:username', async (req: Request, res: Response) => {
  try {
    const updated = await Agent.findOneAndUpdate(
      { username: req.params.username },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Agent not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:username/trigger', async (req: Request, res: Response) => {
  try {
    const agent = await Agent.findOne({ username: req.params.username });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    await AgentEngine.executeAgentTurn(agent);
    res.json({ message: `Turn triggered for @${agent.username}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:username', async (req: Request, res: Response) => {
  try {
    const deleted = await Agent.findOneAndDelete({ username: req.params.username });
    if (!deleted) return res.status(404).json({ error: 'Agent not found' });
    res.json({ message: 'Agent deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
