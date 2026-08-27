import { Router, Request, Response } from 'express';
import { Settings } from '../models/Settings';
import { Agent } from '../models/Agent';
import { Post } from '../models/Post';
import { DirectMessage } from '../models/DirectMessage';
import { SupportTicket } from '../models/SupportTicket';
import { AgentEngine } from '../services/agentEngine';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/toggle-simulation', async (req: Request, res: Response) => {
  try {
    const { enable } = req.body;
    if (enable) {
      await AgentEngine.startAutonomousEngine();
    } else {
      await AgentEngine.stopAutonomousEngine();
    }
    const settings = await Settings.findOne();
    res.json({ isSimulationActive: settings?.isSimulationActive ?? false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tick', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    await AgentEngine.triggerManualTick(username);
    res.json({ success: true, message: 'Tick executed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [agentsCount, postsCount, dmsCount, ticketsPending, ticketsTotal] = await Promise.all([
      Agent.countDocuments({ isActive: true }),
      Post.countDocuments(),
      DirectMessage.countDocuments(),
      SupportTicket.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments()
    ]);

    res.json({
      activeAgents: agentsCount,
      totalPosts: postsCount,
      totalDMs: dmsCount,
      pendingTickets: ticketsPending,
      totalTickets: ticketsTotal
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
