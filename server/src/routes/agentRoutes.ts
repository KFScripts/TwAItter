import { Router, Request, Response } from 'express';
import { Agent } from '../models/Agent';
import { User } from '../models/User';
import { AgentEngine } from '../services/agentEngine';
import { AgentGenerator } from '../services/agentGenerator';

const router = Router();

async function getFollowersCountMap(usernames: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!usernames.length) return map;

  const [userAgg, agentAgg] = await Promise.all([
    User.aggregate([
      { $unwind: '$following' },
      { $match: { following: { $in: usernames } } },
      { $group: { _id: '$following', count: { $sum: 1 } } }
    ]),
    Agent.aggregate([
      { $unwind: '$following' },
      { $match: { following: { $in: usernames } } },
      { $group: { _id: '$following', count: { $sum: 1 } } }
    ])
  ]);

  usernames.forEach((u) => map.set(u, 0));
  userAgg.forEach((r) => map.set(r._id, (map.get(r._id) || 0) + r.count));
  agentAgg.forEach((r) => map.set(r._id, (map.get(r._id) || 0) + r.count));

  return map;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { sortBy } = req.query;
    const agents = await Agent.find().lean();
    const usernames = agents.map((a) => a.username);
    const followersMap = await getFollowersCountMap(usernames);

    const enriched = agents.map((a) => ({
      ...a,
      followersCount: followersMap.get(a.username) || 0,
      followingCount: (a.following || []).length
    }));

    if (sortBy === 'followers') {
      enriched.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    } else {
      enriched.sort((a, b) => a.username.localeCompare(b.username));
    }

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/force-trend', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    let agent = null;
    if (username) {
      agent = await Agent.findOne({ username });
    }
    const result = await AgentEngine.generateForcedTrendPost(agent || undefined);
    res.json({
      message: `Nuovo trend ${result.topic} lanciato con successo da @${result.agent}`,
      ...result
    });
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
    const agent = await Agent.findOne({ username: req.params.username }).lean();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const followersMap = await getFollowersCountMap([agent.username]);
    res.json({
      ...agent,
      followersCount: followersMap.get(agent.username) || 0,
      followingCount: (agent.following || []).length
    });
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
