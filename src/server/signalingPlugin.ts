import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

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

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, data: any, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

export function signalingPlugin(): Plugin {
  return {
    name: 'telelens-signaling-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlStr = req.url || '';
        if (!urlStr.startsWith('/api/signal')) {
          return next();
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
          return;
        }

        try {
          const parsedUrl = new URL(urlStr, 'http://localhost:3000');
          const pathname = parsedUrl.pathname;
          // Format: /api/signal/rooms/:roomId/...
          const parts = pathname.split('/').filter(Boolean); // ['api', 'signal', 'rooms', ':roomId', ...]
          
          if (parts.length >= 4 && parts[2] === 'rooms') {
            const roomId = parts[3].toUpperCase();
            const action = parts[4] || 'status';
            const room = getOrCreateRoom(roomId);
            room.lastActive = Date.now();

            if (action === 'join' && req.method === 'POST') {
              const body = await parseBody(req);
              const role = body.role as 'camera' | 'controller';
              if (role === 'camera') {
                room.cameraActive = true;
                room.cameraLastSeen = Date.now();
              } else if (role === 'controller') {
                room.controllerActive = true;
                room.controllerLastSeen = Date.now();
              }

              return sendJson(res, {
                success: true,
                roomId,
                cameraActive: room.cameraActive && Date.now() - room.cameraLastSeen < 15000,
                controllerActive: room.controllerActive && Date.now() - room.controllerLastSeen < 15000,
              });
            }

            if (action === 'message' && req.method === 'POST') {
              const body = await parseBody(req);
              const { fromRole, toRole, type, payload } = body;
              
              const msg: SignalMessage = {
                id: Math.random().toString(36).substring(2, 9),
                timestamp: Date.now(),
                fromRole,
                toRole: toRole || 'all',
                type,
                payload,
              };

              // Update presence
              if (fromRole === 'camera') room.cameraLastSeen = Date.now();
              if (fromRole === 'controller') room.controllerLastSeen = Date.now();

              room.messages.push(msg);
              // Keep maximum 100 messages
              if (room.messages.length > 100) {
                room.messages = room.messages.slice(-100);
              }

              return sendJson(res, { success: true, messageId: msg.id });
            }

            if (action === 'messages' && req.method === 'GET') {
              const role = parsedUrl.searchParams.get('role') as 'camera' | 'controller';
              const since = parseInt(parsedUrl.searchParams.get('since') || '0', 10);
              const now = Date.now();

              if (role === 'camera') room.cameraLastSeen = now;
              if (role === 'controller') room.controllerLastSeen = now;

              const filtered = room.messages.filter(
                (m) => m.timestamp > since && (m.toRole === role || m.toRole === 'all') && m.fromRole !== role
              );

              return sendJson(res, {
                messages: filtered,
                now,
                cameraActive: room.cameraActive && now - room.cameraLastSeen < 15000,
                controllerActive: room.controllerActive && now - room.controllerLastSeen < 15000,
              });
            }

            if (action === 'status' && req.method === 'GET') {
              const now = Date.now();
              return sendJson(res, {
                roomId,
                cameraActive: room.cameraActive && now - room.cameraLastSeen < 15000,
                controllerActive: room.controllerActive && now - room.controllerLastSeen < 15000,
              });
            }

            if (action === 'reset' && req.method === 'POST') {
              room.messages = [];
              return sendJson(res, { success: true });
            }
          }

          sendJson(res, { error: 'Not found' }, 404);
        } catch (err: any) {
          sendJson(res, { error: err.message || 'Internal error' }, 500);
        }
      });
    },
  };
}
