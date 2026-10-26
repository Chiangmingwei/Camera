import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

interface SignalMessage {
  id: string;
  timestamp: number;
  fromRole: 'camera' | 'controller';
  toRole: 'camera' | 'controller' | 'all';
  type: string;
  payload: any;
}

interface RoomState {
  roomId: string;
  createdAt: number;
  lastActive: number;
  cameraActive: boolean;
  controllerActive: boolean;
  cameraLastSeen: number;
  controllerLastSeen: number;
  messages: SignalMessage[];
}

const rooms = new Map<string, RoomState>();

// Periodically clean up stale rooms older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - room.lastActive > 30 * 60 * 1000) {
      rooms.delete(id);
    }
  }
}, 60 * 1000);

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      cameraActive: false,
      controllerActive: false,
      cameraLastSeen: 0,
      controllerLastSeen: 0,
      messages: [],
    };
    rooms.set(roomId, room);
  }
  return room;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // Signaling API Routes
  app.post('/api/signal/rooms/:roomId/join', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const { role } = req.body;
    const room = getOrCreateRoom(roomId);
    room.lastActive = Date.now();

    if (role === 'camera') {
      room.cameraActive = true;
      room.cameraLastSeen = Date.now();
    } else if (role === 'controller') {
      room.controllerActive = true;
      room.controllerLastSeen = Date.now();
    }

    const now = Date.now();
    res.json({
      success: true,
      roomId,
      cameraActive: room.cameraActive && now - room.cameraLastSeen < 15000,
      controllerActive: room.controllerActive && now - room.controllerLastSeen < 15000,
    });
  });

  app.post('/api/signal/rooms/:roomId/message', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const { fromRole, toRole, type, payload } = req.body;
    const room = getOrCreateRoom(roomId);
    room.lastActive = Date.now();

    const msg: SignalMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      fromRole,
      toRole: toRole || 'all',
      type,
      payload,
    };

    if (fromRole === 'camera') room.cameraLastSeen = Date.now();
    if (fromRole === 'controller') room.controllerLastSeen = Date.now();

    room.messages.push(msg);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    res.json({ success: true, messageId: msg.id });
  });

  app.get('/api/signal/rooms/:roomId/messages', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const role = req.query.role as 'camera' | 'controller';
    const since = parseInt((req.query.since as string) || '0', 10);
    const room = getOrCreateRoom(roomId);
    const now = Date.now();

    if (role === 'camera') room.cameraLastSeen = now;
    if (role === 'controller') room.controllerLastSeen = now;

    const filtered = room.messages.filter(
      (m) => m.timestamp > since && (m.toRole === role || m.toRole === 'all') && m.fromRole !== role
    );

    res.json({
      messages: filtered,
      now,
      cameraActive: room.cameraActive && now - room.cameraLastSeen < 15000,
      controllerActive: room.controllerActive && now - room.controllerLastSeen < 15000,
    });
  });

  app.get('/api/signal/rooms/:roomId/status', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const room = getOrCreateRoom(roomId);
    const now = Date.now();

    res.json({
      roomId,
      cameraActive: room.cameraActive && now - room.cameraLastSeen < 15000,
      controllerActive: room.controllerActive && now - room.controllerLastSeen < 15000,
    });
  });

  app.post('/api/signal/rooms/:roomId/reset', (req, res) => {
    const roomId = req.params.roomId.toUpperCase();
    const room = getOrCreateRoom(roomId);
    room.messages = [];
    res.json({ success: true });
  });

  // Client serving: Dev vs Production
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(currentDir, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isDev = process.env.IS_DEV === 'true';
  const isProduction = !isDev && hasDist;

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeleLens server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
