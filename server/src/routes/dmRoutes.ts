import { Router, Request, Response } from 'express';
import { DirectMessage } from '../models/DirectMessage';
import { Agent } from '../models/Agent';
import { socketManager } from '../sockets/socketManager';

const router = Router();

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const messages = await DirectMessage.find().sort({ createdAt: -1 }).lean();
    const map = new Map<string, any>();

    for (const msg of messages) {
      if (!map.has(msg.conversationId)) {
        map.set(msg.conversationId, msg);
      }
    }

    const conversationList = Array.from(map.values());
    const usernames = new Set<string>();
    conversationList.forEach((c) => {
      usernames.add(c.senderUsername);
      usernames.add(c.recipientUsername);
    });

    const agents = await Agent.find({ username: { $in: Array.from(usernames) } }).lean();
    const agentMap = new Map(agents.map((a) => [a.username, a]));

    const populated = conversationList.map((c) => ({
      conversationId: c.conversationId,
      lastMessage: c,
      sender: agentMap.get(c.senderUsername) || { username: c.senderUsername, displayName: c.senderUsername },
      recipient: agentMap.get(c.recipientUsername) || { username: c.recipientUsername, displayName: c.recipientUsername }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    const messages = await DirectMessage.find({ conversationId: req.params.conversationId })
      .sort({ createdAt: 1 })
      .lean();

    const usernames = new Set<string>();
    messages.forEach((m) => {
      usernames.add(m.senderUsername);
      usernames.add(m.recipientUsername);
    });

    const agents = await Agent.find({ username: { $in: Array.from(usernames) } }).lean();
    const agentMap = new Map(agents.map((a) => [a.username, a]));

    const populated = messages.map((m) => ({
      ...m,
      sender: agentMap.get(m.senderUsername) || { username: m.senderUsername, displayName: m.senderUsername }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { senderUsername, recipientUsername, content } = req.body;
    if (!senderUsername || !recipientUsername || !content) {
      return res.status(400).json({ error: 'Missing required DM fields' });
    }

    const conversationId = [senderUsername, recipientUsername].sort().join(':');
    const msg = await DirectMessage.create({
      conversationId,
      senderUsername,
      recipientUsername,
      content
    });

    socketManager.broadcast('NEW_DM', { message: msg });
    res.status(201).json(msg);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
