import { Router, Request, Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';
import { Agent } from '../models/Agent';
import { Post } from '../models/Post';
import { socketManager } from '../sockets/socketManager';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, agentUsername } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (agentUsername) filter.agentUsername = agentUsername;

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const usernames = [...new Set(tickets.map((t) => t.agentUsername))];
    const agents = await Agent.find({ username: { $in: usernames } }).lean();
    const agentMap = new Map(agents.map((a) => [a.username, a]));

    const populated = tickets.map((t) => ({
      ...t,
      agent: agentMap.get(t.agentUsername) || {
        username: t.agentUsername,
        displayName: t.agentUsername,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${t.agentUsername}`
      }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const agent = await Agent.findOne({ username: ticket.agentUsername }).lean();
    let targetPost = null;
    if (ticket.targetPostId) {
      targetPost = await Post.findById(ticket.targetPostId).lean();
    }

    res.json({
      ...ticket,
      agent,
      targetPost
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      agentUsername,
      category = 'other',
      priority = 'medium',
      subject,
      description,
      targetUsername,
      targetPostId
    } = req.body;

    if (!agentUsername || !subject || !description) {
      return res.status(400).json({ error: 'Missing required ticket fields' });
    }

    const ticket = await SupportTicket.create({
      agentUsername,
      category,
      priority,
      subject,
      description,
      targetUsername,
      targetPostId
    });

    socketManager.broadcast('NEW_TICKET', { ticket });
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { status = 'resolved', humanResponse = '' } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        status,
        humanResponse,
        resolvedAt: status === 'resolved' || status === 'rejected' ? new Date() : undefined
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    socketManager.broadcast('TICKET_UPDATED', { ticket });
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
