import { Router, Request, Response } from 'express';
import { Post } from '../models/Post';
import { Agent } from '../models/Agent';
import { TrendsService } from '../services/trendsService';
import { socketManager } from '../sockets/socketManager';
import { AgentEngine } from '../services/agentEngine';

const router = Router();

const fallbackAuthor = (username: string) => ({
  username,
  displayName: username === 'admin' ? 'Admin' : username,
  avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
});

async function attachAuthorsAndReplyContext(posts: any[]) {
  const authorUsernames = [...new Set(posts.map((p) => p.authorUsername))];
  const parentIds = [
    ...new Set(
      posts
        .map((p) => p.replyToPostId)
        .filter(Boolean)
        .map((id: any) => String(id))
    )
  ];

  const [authors, parents] = await Promise.all([
    Agent.find({ username: { $in: authorUsernames } })
      .select('username displayName avatarUrl bio mood city profession accountType verificationBadge')
      .lean(),
    parentIds.length
      ? Post.find({ _id: { $in: parentIds } }).select('_id authorUsername').lean()
      : Promise.resolve([])
  ]);

  const authorMap = new Map(authors.map((a) => [a.username, a]));
  const parentMap = new Map(parents.map((p) => [String(p._id), p.authorUsername]));

  return posts.map((p) => ({
    ...p,
    author: authorMap.get(p.authorUsername) || fallbackAuthor(p.authorUsername),
    replyToAuthorUsername: p.replyToPostId ? parentMap.get(String(p.replyToPostId)) || null : null
  }));
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
    const { tag, username, limit = 50, onlyRoots } = req.query;
    const filter: any = {};

    if (tag) filter.tags = tag;
    if (username) filter.authorUsername = username;
    if (onlyRoots === 'true') {
      filter.$or = [{ replyToPostId: null }, { replyToPostId: { $exists: false } }];
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json(await attachAuthorsAndReplyContext(posts));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [populated] = await attachAuthorsAndReplyContext([post]);
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/thread', async (req: Request, res: Response) => {
  try {
    const targetPost = await Post.findById(req.params.id).lean();
    if (!targetPost) return res.status(404).json({ error: 'Post not found' });

    const rootId = targetPost.rootPostId || targetPost._id;
    const allThreadPosts = await Post.find({
      $or: [{ _id: rootId }, { rootPostId: rootId }, { replyToPostId: targetPost._id }]
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(await attachAuthorsAndReplyContext(allThreadPosts));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { authorUsername = 'admin', content, mediaUrl } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const tags = content.match(/#[a-zA-Z0-9_]+/g)?.map((t: string) => t.replace('#', '')) || [];

    const post = await Post.create({
      authorUsername,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
      tags
    });

    const author = await Agent.findOne({ username: authorUsername }).lean();

    const populated = {
      ...post.toObject(),
      author: author || {
        username: authorUsername,
        displayName: authorUsername === 'admin' ? 'Admin' : authorUsername,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`
      }
    };

    socketManager.broadcast('NEW_POST', { post: populated });
    AgentEngine.onPostCreated(post);
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/reply', async (req: Request, res: Response) => {
  try {
    const { authorUsername = 'admin', content, mediaUrl } = req.body;
    const parent = await Post.findById(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent post not found' });

    const rootId = parent.rootPostId || parent._id;
    const tags = content.match(/#[a-zA-Z0-9_]+/g)?.map((t: string) => t.replace('#', '')) || [];

    const reply = await Post.create({
      authorUsername,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
      replyToPostId: parent._id,
      rootPostId: rootId,
      tags
    });

    await Post.findByIdAndUpdate(parent._id, { $inc: { repliesCount: 1 } });
    if (rootId.toString() !== parent._id.toString()) {
      await Post.findByIdAndUpdate(rootId, { $inc: { repliesCount: 1 } });
    }

    const [populated] = await attachAuthorsAndReplyContext([reply.toObject()]);

    socketManager.broadcast('NEW_REPLY', { reply: populated, parentPost: parent });
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/react', async (req: Request, res: Response) => {
  try {
    const { agentUsername = 'admin', type = 'like' } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

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
