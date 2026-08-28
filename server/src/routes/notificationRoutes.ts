import { Router, Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { Agent } from '../models/Agent';
import { User } from '../models/User';

const router = Router();

async function getSendersMap(usernames: string[]) {
  const [agents, users] = await Promise.all([
    Agent.find({ username: { $in: usernames } })
      .select('username displayName avatarUrl verificationBadge')
      .lean(),
    User.find({ username: { $in: usernames } })
      .select('username displayName avatarUrl verificationBadge')
      .lean()
  ]);

  const map = new Map<string, any>();
  agents.forEach((a) => map.set(a.username, a));
  users.forEach((u) => {
    if (!map.has(u.username)) map.set(u.username, u);
  });
  return map;
}

// Ottieni notifiche per un utente
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const notifications = await Notification.find({ recipientUsername: username })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const senderUsernames = [...new Set(notifications.map((n) => n.senderUsername))];
    const sendersMap = await getSendersMap(senderUsernames);

    const populated = notifications.map((n) => ({
      ...n,
      sender: sendersMap.get(n.senderUsername) || {
        username: n.senderUsername,
        displayName: n.senderUsername,
        avatarUrl: ''
      }
    }));

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Conta notifiche non lette
router.get('/:username/unread-count', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const count = await Notification.countDocuments({ recipientUsername: username, isRead: false });
    res.json({ unreadCount: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Segna singola notifica come letta
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notif);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Segna tutte le notifiche di un utente come lette
router.put('/read-all/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    await Notification.updateMany({ recipientUsername: username, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
