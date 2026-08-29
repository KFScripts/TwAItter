import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { Agent } from '../models/Agent';
import { AgentSource } from '../models/AgentSource';
import { AgentSourceService } from '../services/agentSourceService';

const router = Router();
const routeParam = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4, parts: 6 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtension = ['.txt', '.md', '.markdown', '.pdf'].includes(extension);
    const allowedMime = ['text/plain', 'text/markdown', 'application/pdf', 'application/octet-stream'].includes(file.mimetype);
    if (!allowedExtension || !allowedMime) {
      callback(new Error('Formato non supportato. Usa TXT, Markdown o PDF.'));
      return;
    }
    callback(null, true);
  }
});

async function requireAgent(username: string) {
  const agent = await Agent.findOne({ username });
  if (!agent) throw new Error('Profilo AI non trovato');
  return agent;
}

async function assertSourceLimit(username: string) {
  const count = await AgentSource.countDocuments({ agentUsername: username });
  if (count >= 50) throw new Error('Limite di 50 fonti per profilo raggiunto');
}

router.get('/:username/sources', async (req: Request, res: Response) => {
  try {
    await requireAgent(routeParam(req.params.username));
    const sources = await AgentSourceService.listSources(routeParam(req.params.username));
    res.json(sources);
  } catch (error: any) {
    res.status(error.message === 'Profilo AI non trovato' ? 404 : 500).json({ error: error.message });
  }
});

router.post('/:username/sources/text', async (req: Request, res: Response) => {
  try {
    await requireAgent(routeParam(req.params.username));
    await assertSourceLimit(routeParam(req.params.username));
    const text = typeof req.body.text === 'string' ? req.body.text : '';
    if (!text.trim()) return res.status(400).json({ error: 'Inserisci il contenuto della fonte' });
    const source = await AgentSourceService.createInlineSource(routeParam(req.params.username), {
      title: req.body.title,
      text,
      format: req.body.format === 'markdown' ? 'markdown' : 'text'
    });
    res.status(201).json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:username/sources/url', async (req: Request, res: Response) => {
  try {
    await requireAgent(routeParam(req.params.username));
    await assertSourceLimit(routeParam(req.params.username));
    const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
    if (!url) return res.status(400).json({ error: 'Inserisci una URL' });
    const source = await AgentSourceService.createUrlSource(routeParam(req.params.username), url, req.body.title);
    res.status(201).json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:username/sources/file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    await requireAgent(routeParam(req.params.username));
    await assertSourceLimit(routeParam(req.params.username));
    if (!req.file) return res.status(400).json({ error: 'Seleziona un file TXT, Markdown o PDF' });
    const source = await AgentSourceService.createFileSource(routeParam(req.params.username), req.file, req.body.title);
    res.status(201).json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:username/sources/:sourceId', async (req: Request, res: Response) => {
  try {
    const enabled = Boolean(req.body.enabled);
    const source = await AgentSourceService.setSourceEnabled(
      routeParam(req.params.username),
      routeParam(req.params.sourceId),
      enabled
    );
    res.json(source);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/:username/sources/:sourceId/refresh', async (req: Request, res: Response) => {
  try {
    const source = await AgentSourceService.refreshSource(routeParam(req.params.username), routeParam(req.params.sourceId));
    res.json(source);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:username/sources/test-retrieval', async (req: Request, res: Response) => {
  try {
    const agent = await requireAgent(routeParam(req.params.username));
    const query = typeof req.body.query === 'string' ? req.body.query : '';
    if (!query.trim()) return res.status(400).json({ error: 'Inserisci una query di prova' });
    const context = await AgentSourceService.buildContext(agent, query, { includeWebSearch: true });
    res.json({ context });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:username/sources/:sourceId', async (req: Request, res: Response) => {
  try {
    const deleted = await AgentSourceService.deleteSource(routeParam(req.params.username), routeParam(req.params.sourceId));
    if (!deleted) return res.status(404).json({ error: 'Fonte non trovata' });
    res.json({ message: 'Fonte rimossa' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.use((error: any, _req: Request, res: Response, _next: any) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File troppo grande (max 10 MB)' : error.message });
  }
  return res.status(400).json({ error: error.message || 'Errore durante il caricamento' });
});

export default router;
