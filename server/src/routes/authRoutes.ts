import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import crypto from 'crypto';

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName, avatarUrl, bio, city } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email e password sono obbligatori' });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: email.toLowerCase().trim() }]
    });

    if (existing) {
      return res.status(400).json({ error: 'Username o email già in uso' });
    }

    const user = await User.create({
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      displayName: displayName || cleanUsername,
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      bio: bio || 'Nuovo utente su TwAItter 🚀',
      city: city || 'Italia'
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    res.status(201).json({ user: userObj, token: user.username });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Credenziali mancanti' });
    }

    const input = usernameOrEmail.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ username: input }, { email: input }]
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Username o password errati' });
    }

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;

    res.json({ user: userObj, token: user.username });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const username = (req.headers['x-username'] || req.headers['authorization']) as string;
    if (!username) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const clean = username.replace('Bearer ', '').trim();
    const user = await User.findOne({ username: clean }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const username = (req.headers['x-username'] || req.headers['authorization']) as string;
    if (!username) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    const clean = username.replace('Bearer ', '').trim();
    const { displayName, avatarUrl, bio, city } = req.body;

    const updated = await User.findOneAndUpdate(
      { username: clean },
      { $set: { displayName, avatarUrl, bio, city } },
      { new: true }
    ).select('-passwordHash');

    if (!updated) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/follow/:targetUsername', async (req: Request, res: Response) => {
  try {
    const username = (req.headers['x-username'] || req.headers['authorization']) as string;
    if (!username) return res.status(401).json({ error: 'Non autenticato' });

    const clean = username.replace('Bearer ', '').trim();
    const target = req.params.targetUsername as string;

    const user = await User.findOne({ username: clean });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    const isFollowing = user.following.includes(target);
    if (isFollowing) {
      user.following = user.following.filter((f) => f !== target);
    } else {
      user.following.push(target);
    }

    await user.save();
    res.json({ following: user.following, isFollowing: !isFollowing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
