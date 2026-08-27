import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export type SocketEventType =
  | 'NEW_POST'
  | 'NEW_REPLY'
  | 'NEW_REACTION'
  | 'NEW_DM'
  | 'NEW_TICKET'
  | 'TICKET_UPDATED'
  | 'AGENT_UPDATED'
  | 'SIMULATION_STATUS'
  | 'AGENT_ACTION_LOG'
  | 'ENGINE_STATUS';

export interface SocketMessage {
  type: SocketEventType;
  payload: any;
}

class SocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        this.clients.delete(ws);
      });
    });

    console.log('WebSocket server initialized on /ws');
  }

  public broadcast(type: SocketEventType, payload: any) {
    if (!this.wss) return;
    const data = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}

export const socketManager = new SocketManager();
