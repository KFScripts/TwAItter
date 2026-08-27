import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { socketManager } from './sockets/socketManager';
import { seedDatabase } from './services/seedData';
import { AgentEngine } from './services/agentEngine';
import { hookConsole } from './services/logBuffer';

import agentRoutes from './routes/agentRoutes';
import postRoutes from './routes/postRoutes';
import dmRoutes from './routes/dmRoutes';
import ticketRoutes from './routes/ticketRoutes';
import settingsRoutes from './routes/settingsRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();
hookConsole();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

async function bootstrap() {
  await connectDB();
  socketManager.init(server);
  await seedDatabase();

  const autoStart = process.env.AUTO_SIMULATION_ENABLED !== 'false';
  if (autoStart) {
    await AgentEngine.startAutonomousEngine();
  }

  server.listen(PORT, () => {
    console.log(`TwAItter backend server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
});
