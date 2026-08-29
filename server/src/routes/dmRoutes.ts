import { Router, Request, Response } from 'express';
import { DirectMessage } from '../models/DirectMessage';
import { Agent } from '../models/Agent';
import { User } from '../models/User';
import { socketManager } from '../sockets/socketManager';
import { AgentEngine } from '../services/agentEngine';

import { RelationshipService } from '../services/relationshipService';
import { NotificationService } from '../services/notificationService';

const router = Router();

async function getParticipantsMap(usernames: string[]) {
  const [agents, users] = await Promise.all([
    Agent.find({ username: { $in: usernames } })
      .select('username displayName avatarUrl bio verificationBadge')
      .lean(),
    User.find({ username: { $in: usernames } })
      .select('username displayName avatarUrl bio verificationBadge')
      .lean()
  ]);

  const map = new Map<string, any>();
  agents.forEach((a) => map.set(a.username, a));
  users.forEach((u) => {
    if (!map.has(u.username)) map.set(u.username, u);
  });
  return map;
}

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const rawUser = (req.query.username as string) || (req.headers['x-username'] as string) || (req.headers['authorization'] as string);
    const username = rawUser ? rawUser.replace('Bearer ', '').trim() : '';

    const filter: any = {};
    if (username && username !== 'admin' && req.query.all !== 'true') {
      filter.$or = [{ senderUsername: username }, { recipientUsername: username }];
    } else if (!username && req.query.all !== 'true') {
      return res.json([]);
    }

    const messages = await DirectMessage.find(filter).sort({ createdAt: -1 }).lean();
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

    const userMap = await getParticipantsMap(Array.from(usernames));

    const populated = conversationList.map((c) => ({
      conversationId: c.conversationId,
      lastMessage: c,
      sender: userMap.get(c.senderUsername) || { username: c.senderUsername, displayName: c.senderUsername, avatarUrl: '' },
      recipient: userMap.get(c.recipientUsername) || { username: c.recipientUsername, displayName: c.recipientUsername, avatarUrl: '' }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/all-conversations', async (req: Request, res: Response) => {
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

    const userMap = await getParticipantsMap(Array.from(usernames));

    const populated = conversationList.map((c) => ({
      conversationId: c.conversationId,
      lastMessage: c,
      sender: userMap.get(c.senderUsername) || { username: c.senderUsername, displayName: c.senderUsername, avatarUrl: '' },
      recipient: userMap.get(c.recipientUsername) || { username: c.recipientUsername, displayName: c.recipientUsername, avatarUrl: '' }
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

    const userMap = await getParticipantsMap(Array.from(usernames));

    const populated = messages.map((m) => ({
      ...m,
      sender: userMap.get(m.senderUsername) || { username: m.senderUsername, displayName: m.senderUsername, avatarUrl: '' }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { senderUsername, recipientUsername, content = '', mediaUrl, attachmentType, fileName, fileSize } = req.body;
    if (!senderUsername || !recipientUsername || (!content && !mediaUrl)) {
      return res.status(400).json({ error: 'Il messaggio deve contenere testo o un allegato' });
    }

    const relToSender = await RelationshipService.getRelationship(recipientUsername, senderUsername);
    if (relToSender.isBlocked) {
      return res.status(403).json({ error: `@${recipientUsername} ti ha bloccato e non accetta messaggi privati.` });
    }

    const relToRecipient = await RelationshipService.getRelationship(senderUsername, recipientUsername);
    if (relToRecipient.isBlocked) {
      return res.status(403).json({ error: `Hai bloccato @${recipientUsername}. Sbloccalo per inviare un messaggio.` });
    }

    const conversationId = [senderUsername, recipientUsername].sort().join(':');
    const msg = await DirectMessage.create({
      conversationId,
      senderUsername,
      recipientUsername,
      content: content || (attachmentType === 'image' ? '📷 Foto allegata' : '📎 File allegato'),
      mediaUrl: mediaUrl || null,
      attachmentType: attachmentType || null,
      fileName: fileName || null,
      fileSize: fileSize || null
    });

    socketManager.broadcast('NEW_DM', { message: msg });
    
    NotificationService.createNotification({
      recipientUsername,
      senderUsername,
      type: 'dm',
      conversationId,
      content: content || (attachmentType === 'image' ? '📷 Ti ha inviato una foto' : '📎 Ti ha inviato un file allegato')
    }).catch(console.error);

    AgentEngine.onDirectMessageReceived(msg);
    res.status(201).json(msg);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/read', async (req: Request, res: Response) => {
  try {
    const { conversationId, readerUsername } = req.body;
    if (!conversationId || !readerUsername) {
      return res.status(400).json({ error: 'Missing conversationId or readerUsername' });
    }

    const now = new Date();
    const result = await DirectMessage.updateMany(
      { conversationId, recipientUsername: readerUsername, status: { $ne: 'read' } },
      { $set: { status: 'read', isRead: true, readAt: now } }
    );

    if (result.modifiedCount > 0) {
      socketManager.broadcast('DM_STATUS_UPDATED', {
        conversationId,
        readerUsername,
        status: 'read',
        readAt: now
      });
    }

    res.json({ success: true, count: result.modifiedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
