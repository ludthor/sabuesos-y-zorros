import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  isRoomCode,
  normalizeRoomCode,
  parseClientMessage,
  type ServerMessage,
} from '@syz/protocol';
import { RoomStore } from './rooms.ts';

export const WS_PATH = '/ws';
const SWEEP_INTERVAL_MS = 60 * 1000;

export interface SyzServerOptions {
  store?: RoomStore;
  /** Sirve la interfaz (Vite en desarrollo, archivos estáticos en producción). */
  handleHttp?: (req: IncomingMessage, res: ServerResponse) => void;
  /** Cada cuánto se buscan salas caducadas. 0 lo desactiva (pruebas). */
  sweepIntervalMs?: number;
  /**
   * Dirección por la que otros dispositivos llegan a este servidor, por ejemplo
   * http://192.168.1.10:3000. El cliente la usa en el QR si él mismo se abrió en localhost.
   */
  shareOrigin?: string | null;
}

export interface SyzServer {
  httpServer: ReturnType<typeof createServer>;
  store: RoomStore;
  listen(port: number, host?: string): Promise<number>;
  /** Elimina las salas caducadas y avisa a sus dispositivos. */
  sweep(): void;
  /** Número de dispositivos unidos a una sala. */
  joinedCount(): number;
  close(): Promise<void>;
}

/**
 * Servidor de salas (ADR-0001, ADR-0003): guarda el estado y comunica cada
 * dispositivo con su sala por websocket. Los registros no incluyen el
 * contenido de las salas (ADR-0006).
 */
export function createSyzServer(options: SyzServerOptions = {}): SyzServer {
  const store = options.store ?? new RoomStore();
  const members = new Map<string, Set<WebSocket>>();
  const roomBySocket = new Map<WebSocket, string>();

  const httpServer = createServer((req, res) => {
    if (options.handleHttp) return options.handleHttp(req, res);
    res.writeHead(404).end();
  });

  // Los mensajes del protocolo son diminutos; uno grande es un error o un abuso.
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  httpServer.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    // Las demás conexiones (por ejemplo, la recarga en caliente de Vite) no son nuestras.
    if (path !== WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  function send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  function join(ws: WebSocket, code: string) {
    leave(ws);
    roomBySocket.set(ws, code);
    let set = members.get(code);
    if (!set) members.set(code, (set = new Set()));
    set.add(ws);
  }

  function leave(ws: WebSocket) {
    const code = roomBySocket.get(ws);
    if (code === undefined) return;
    roomBySocket.delete(ws);
    members.get(code)?.delete(ws);
  }

  wss.on('connection', (ws) => {
    send(ws, { type: 'welcome', shareOrigin: options.shareOrigin ?? null });
    ws.on('message', (data) => {
      const msg = parseClientMessage(String(data));
      if (!msg) return send(ws, { type: 'error', error: 'bad_message' });

      const current = roomBySocket.get(ws);
      if (current) store.touch(current);

      switch (msg.type) {
        case 'create_room': {
          const room = store.create();
          join(ws, room.code);
          return send(ws, { type: 'room_created', code: room.code });
        }
        case 'join_room': {
          const code = normalizeRoomCode(msg.code);
          if (!isRoomCode(code) || !store.find(code)) {
            leave(ws);
            return send(ws, { type: 'error', error: 'room_not_found' });
          }
          store.touch(code);
          join(ws, code);
          return send(ws, { type: 'room_joined', code });
        }
      }
    });
    ws.on('close', () => leave(ws));
    // Un fallo de un dispositivo (trama inválida, mensaje enorme) no debe tumbar el servidor.
    ws.on('error', () => ws.terminate());
  });

  function sweep() {
    for (const code of store.sweep()) {
      for (const ws of members.get(code) ?? []) {
        roomBySocket.delete(ws);
        send(ws, { type: 'room_expired' });
      }
      members.delete(code);
    }
  }

  const interval = options.sweepIntervalMs ?? SWEEP_INTERVAL_MS;
  const timer = interval > 0 ? setInterval(sweep, interval) : undefined;
  timer?.unref();

  return {
    httpServer,
    store,
    sweep,
    joinedCount: () => roomBySocket.size,
    listen(port, host) {
      return new Promise((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, host, () => resolve((httpServer.address() as AddressInfo).port));
      });
    },
    close() {
      if (timer) clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
      return new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}
