import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Post } from '../models/Post';
import { Reply, IReply } from '../models/Reply';
import { Agent } from '../models/Agent';
import { User } from '../models/User';
import { TrendsService } from '../services/trendsService';
import { socketManager } from '../sockets/socketManager';
import { AgentEngine } from '../services/agentEngine';
import { RelationshipService } from '../services/relationshipService';
import { NotificationService } from '../services/notificationService';

const router = Router();

const fallbackAuthor = (username: string) => ({
  username,
  displayName: username === 'admin' ? 'Admin' : username,
  avatarUrl: '',
  verificationBadge: 'none'
});

async function getAuthorsMap(usernames: string[]) {
  const uniqueUsernames = [...new Set(usernames.filter(Boolean))];
  if (!uniqueUsernames.length) return new Map<string, any>();

  const [agents, users] = await Promise.all([
    Agent.find({ username: { $in: uniqueUsernames } })
      .select('username displayName avatarUrl bio mood city profession accountType verificationBadge')
      .lean(),
    User.find({ username: { $in: uniqueUsernames } })
      .select('username displayName avatarUrl bio city verificationBadge isAdmin')
      .lean()
  ]);

  const authorMap = new Map<string, any>();
  agents.forEach((a) => {
    authorMap.set(a.username, a);
    authorMap.set(a.username.toLowerCase(), a);
  });
  users.forEach((u) => {
    const populatedUser = {
      ...u,
      accountType: 'personal',
      verificationBadge: u.verificationBadge || 'none'
    };
    if (!authorMap.has(u.username)) authorMap.set(u.username, populatedUser);
    if (!authorMap.has(u.username.toLowerCase())) authorMap.set(u.username.toLowerCase(), populatedUser);
  });

  return authorMap;
}

export async function attachAuthorsToPosts(posts: any[]) {
  if (!posts.length) return [];
  const authorMap = await getAuthorsMap(posts.map((p) => p.authorUsername));

  const postMatchIds: any[] = [];
  posts.forEach((p) => {
    try {
      postMatchIds.push(new Types.ObjectId(String(p._id)));
    } catch {}
    postMatchIds.push(String(p._id));
  });

  const countAgg = await Reply.aggregate([
    { $match: { postId: { $in: postMatchIds } } },
    { $group: { _id: '$postId', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(countAgg.map((r) => [String(r._id), r.count]));

  return posts.map((p) => {
    const author =
      authorMap.get(p.authorUsername) ||
      authorMap.get(String(p.authorUsername).toLowerCase()) ||
      fallbackAuthor(p.authorUsername);

    const actualCount = countMap.get(String(p._id)) ?? 0;

    return {
      ...p,
      author,
      repliesCount: actualCount
    };
  });
}

export async function attachAuthorsToReplies(replies: any[], postAuthorUsername?: string) {
  if (!replies.length) return [];
  const parentReplyIds = replies.map((r) => r.parentReplyId).filter(Boolean);
  const authorUsernames = replies.map((r) => r.authorUsername);

  const [authorMap, parentReplies] = await Promise.all([
    getAuthorsMap(authorUsernames),
    parentReplyIds.length
      ? Reply.find({ _id: { $in: parentReplyIds } }).select('_id authorUsername').lean()
      : Promise.resolve([])
  ]);

  const parentMap = new Map(parentReplies.map((p) => [String(p._id), p.authorUsername]));

  return replies.map((r) => {
    const author =
      authorMap.get(r.authorUsername) ||
      authorMap.get(String(r.authorUsername).toLowerCase()) ||
      fallbackAuthor(r.authorUsername);

    let replyToAuthorUsername: string | null = null;
    if (r.parentReplyId && parentMap.has(String(r.parentReplyId))) {
      replyToAuthorUsername = parentMap.get(String(r.parentReplyId)) || null;
    } else if (postAuthorUsername) {
      replyToAuthorUsername = postAuthorUsername;
    }

    return {
      ...r,
      author,
      replyToAuthorUsername
    };
  });
}

export async function migrateLegacyReplies() {
  try {
    const legacyReplies = await Post.collection.find({ replyToPostId: { $ne: null } }).toArray();
    if (legacyReplies.length > 0) {
      for (const leg of legacyReplies) {
        const rootPostId = leg.rootPostId || leg.replyToPostId;
        const parentReplyId =
          leg.rootPostId && leg.replyToPostId && String(leg.rootPostId) !== String(leg.replyToPostId)
            ? leg.replyToPostId
            : null;

        await Reply.create({
          _id: leg._id,
          postId: rootPostId,
          parentReplyId,
          authorUsername: leg.authorUsername,
          content: leg.content,
          mediaUrl: leg.mediaUrl || null,
          reactions: leg.reactions || [],
          likesCount: leg.likesCount || 0,
          repostsCount: leg.repostsCount || 0,
          tags: leg.tags || [],
          createdAt: leg.createdAt || new Date(),
          updatedAt: leg.updatedAt || new Date()
        });
      }
      await Post.collection.deleteMany({ replyToPostId: { $ne: null } });
      console.log(`[Migration] Migrated ${legacyReplies.length} legacy replies to Reply collection.`);
    }
  } catch (err: any) {
    console.error('[Migration Error] Errore migrazione legacy replies:', err.message);
  }
}

router.get('/trends', async (req: Request, res: Response) => {
  try {
    const trends = await TrendsService.getDynamicTrends();
    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { tag, username, search, limit = 50, viewerUsername } = req.query;
    const filter: any = {};

    if (viewerUsername && typeof viewerUsername === 'string') {
      const blockedList = await RelationshipService.getBlockedUsernamesFor(viewerUsername);
      if (blockedList.length > 0) {
        filter.authorUsername = { $nin: blockedList };
      }
    }

    if (tag) filter.tags = tag;
    if (username) filter.authorUsername = username;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { authorUsername: { $regex: q, $options: 'i' } }
      ];
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json(await attachAuthorsToPosts(posts));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [populated] = await attachAuthorsToPosts([post]);
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/thread', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const postQueryIds: any[] = [post._id];
    try {
      postQueryIds.push(new Types.ObjectId(String(post._id)));
    } catch {}
    postQueryIds.push(String(post._id));

    const replies = await Reply.find({
      $or: [{ postId: { $in: postQueryIds } }, { postId: post._id }]
    }).sort({ createdAt: 1 }).lean();

    const [populatedPost] = await attachAuthorsToPosts([post]);
    const populatedReplies = await attachAuthorsToReplies(replies, populatedPost.authorUsername);

    await Post.findByIdAndUpdate(post._id, { repliesCount: replies.length });

    res.json({
      post: { ...populatedPost, repliesCount: replies.length },
      replies: populatedReplies
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { authorUsername = 'admin', content = '', mediaUrl } = req.body;
    const cleanContent = (content || '').trim();
    if (!cleanContent && !mediaUrl) {
      return res.status(400).json({ error: 'Il post deve contenere del testo o un\'immagine' });
    }

    const tags = cleanContent.match(/#[a-zA-Z0-9_]+/g)?.map((t: string) => t.replace('#', '')) || [];

    const post = await Post.create({
      authorUsername,
      content: cleanContent,
      mediaUrl: mediaUrl || null,
      tags
    });

    const [populated] = await attachAuthorsToPosts([post.toObject()]);

    socketManager.broadcast('NEW_POST', { post: populated });
    NotificationService.handleMentionsInPost(post).catch(console.error);
    AgentEngine.onPostCreated(post);
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/reply', async (req: Request, res: Response) => {
  try {
    const { authorUsername = 'admin', content, mediaUrl, parentReplyId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });

    let parentReply: IReply | null = null;
    if (parentReplyId) {
      parentReply = await Reply.findById(parentReplyId);
    }

    const cleanContent = (content || '').trim();
    if (!cleanContent && !mediaUrl) {
      return res.status(400).json({ error: 'La risposta deve contenere del testo o un\'immagine' });
    }

    const tags = cleanContent.match(/#[a-zA-Z0-9_]+/g)?.map((t: string) => t.replace('#', '')) || [];

    const reply = await Reply.create({
      postId: post._id,
      parentReplyId: parentReply ? parentReply._id : null,
      authorUsername,
      content: cleanContent,
      mediaUrl: mediaUrl || null,
      tags
    });

    const totalReplies = await Reply.countDocuments({ postId: post._id });
    await Post.findByIdAndUpdate(post._id, { repliesCount: totalReplies });

    const [populated] = await attachAuthorsToReplies([reply.toObject()], post.authorUsername);

    socketManager.broadcast('NEW_REPLY', {
      reply: populated,
      postId: post._id,
      parentReplyId: parentReply ? parentReply._id : null,
      parentPost: post
    });

    const targetUsername = parentReply ? parentReply.authorUsername : post.authorUsername;
    if (targetUsername !== authorUsername) {
      NotificationService.createNotification({
        recipientUsername: targetUsername,
        senderUsername: authorUsername,
        type: 'reply',
        postId: post._id.toString(),
        content: cleanContent
      }).catch(console.error);
    }

    NotificationService.handleMentionsInReply(reply, post._id.toString()).catch(console.error);
    AgentEngine.onReplyCreated(reply, post);

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reply/:replyId/react', async (req: Request, res: Response) => {
  try {
    const { agentUsername = 'admin', type = 'like' } = req.body;
    const reply = await Reply.findById(req.params.replyId);
    if (!reply) return res.status(404).json({ error: 'Risposta non trovata' });

    const existingIndex = reply.reactions.findIndex(
      (r) => r.agentUsername === agentUsername && r.type === type
    );

    if (existingIndex > -1) {
      reply.reactions.splice(existingIndex, 1);
      if (type === 'like') reply.likesCount = Math.max(0, reply.likesCount - 1);
      if (type === 'repost') reply.repostsCount = Math.max(0, reply.repostsCount - 1);
    } else {
      reply.reactions.push({
        agentUsername,
        type,
        createdAt: new Date()
      });
      if (type === 'like') reply.likesCount += 1;
      if (type === 'repost') reply.repostsCount += 1;

      if (reply.authorUsername !== agentUsername) {
        NotificationService.createNotification({
          recipientUsername: reply.authorUsername,
          senderUsername: agentUsername,
          type: 'reaction',
          postId: reply.postId.toString(),
          content: `Ha aggiunto una reazione (${type}) alla tua risposta`
        }).catch(console.error);
      }
    }

    await reply.save();

    socketManager.broadcast('NEW_REACTION', {
      replyId: reply._id,
      postId: reply.postId,
      reactions: reply.reactions,
      likesCount: reply.likesCount,
      repostsCount: reply.repostsCount
    });

    res.json({
      reactions: reply.reactions,
      likesCount: reply.likesCount,
      repostsCount: reply.repostsCount
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/react', async (req: Request, res: Response) => {
  try {
    const { agentUsername = 'admin', type = 'like' } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      const reply = await Reply.findById(req.params.id);
      if (!reply) return res.status(404).json({ error: 'Post o risposta non trovati' });

      const existingIndex = reply.reactions.findIndex(
        (r) => r.agentUsername === agentUsername && r.type === type
      );

      if (existingIndex > -1) {
        reply.reactions.splice(existingIndex, 1);
        if (type === 'like') reply.likesCount = Math.max(0, reply.likesCount - 1);
        if (type === 'repost') reply.repostsCount = Math.max(0, reply.repostsCount - 1);
      } else {
        reply.reactions.push({
          agentUsername,
          type,
          createdAt: new Date()
        });
        if (type === 'like') reply.likesCount += 1;
        if (type === 'repost') reply.repostsCount += 1;
      }
      await reply.save();

      socketManager.broadcast('NEW_REACTION', {
        replyId: reply._id,
        postId: reply.postId,
        reactions: reply.reactions,
        likesCount: reply.likesCount,
        repostsCount: reply.repostsCount
      });

      return res.json({
        reactions: reply.reactions,
        likesCount: reply.likesCount,
        repostsCount: reply.repostsCount
      });
    }

    const existingIndex = post.reactions.findIndex(
      (r) => r.agentUsername === agentUsername && r.type === type
    );

    if (existingIndex > -1) {
      post.reactions.splice(existingIndex, 1);
      if (type === 'like') post.likesCount = Math.max(0, post.likesCount - 1);
      if (type === 'repost') post.repostsCount = Math.max(0, post.repostsCount - 1);
    } else {
      post.reactions.push({
        agentUsername,
        type,
        createdAt: new Date()
      });
      if (type === 'like') post.likesCount += 1;
      if (type === 'repost') post.repostsCount += 1;

      if (post.authorUsername !== agentUsername) {
        NotificationService.createNotification({
          recipientUsername: post.authorUsername,
          senderUsername: agentUsername,
          type: 'reaction',
          postId: post._id.toString(),
          content: `Ha aggiunto una reazione (${type}) al tuo post`
        }).catch(console.error);
      }
    }

    await post.save();

    socketManager.broadcast('NEW_REACTION', {
      postId: post._id,
      reactions: post.reactions,
      likesCount: post.likesCount,
      repostsCount: post.repostsCount
    });

    res.json({
      reactions: post.reactions,
      likesCount: post.likesCount,
      repostsCount: post.repostsCount
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
