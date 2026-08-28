import { Router, Request, Response } from 'express';
import { RelationshipService } from '../services/relationshipService';
import { Relationship } from '../models/Relationship';
import { socketManager } from '../sockets/socketManager';

const router = Router();

router.get('/:username', async (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;
    const relationships = await Relationship.find({ sourceUsername: username }).sort({ updatedAt: -1 }).lean();
    const blockedList = await RelationshipService.getBlockedUsernamesFor(username);
    res.json({ relationships, blockedList });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:sourceUsername/:targetUsername', async (req: Request, res: Response) => {
  try {
    const sourceUsername = req.params.sourceUsername as string;
    const targetUsername = req.params.targetUsername as string;
    const relationship = await RelationshipService.getRelationship(sourceUsername, targetUsername);
    res.json(relationship);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/block', async (req: Request, res: Response) => {
  try {
    const { sourceUsername, targetUsername, reason } = req.body;
    if (!sourceUsername || !targetUsername) {
      return res.status(400).json({ error: 'Missing sourceUsername or targetUsername' });
    }
    const rel = await RelationshipService.blockUser(sourceUsername, targetUsername, reason);
    socketManager.broadcast('USER_BLOCKED', { sourceUsername, targetUsername });
    res.json(rel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/unblock', async (req: Request, res: Response) => {
  try {
    const { sourceUsername, targetUsername } = req.body;
    if (!sourceUsername || !targetUsername) {
      return res.status(400).json({ error: 'Missing sourceUsername or targetUsername' });
    }
    const rel = await RelationshipService.unblockUser(sourceUsername, targetUsername);
    socketManager.broadcast('USER_UNBLOCKED', { sourceUsername, targetUsername });
    res.json(rel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
