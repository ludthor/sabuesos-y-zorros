import type { ClientMessage, ServerMessage } from '@syz/protocol';

/** Canal con el servidor de salas (ADR-0003). En las pruebas se sustituye por uno falso. */
export interface Connection {
  send(msg: ClientMessage): void;
  subscribe(listener: (msg: ServerMessage) => void): () => void;
}

function defaultUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/ws`;
}

/** Abre el websocket. Los mensajes enviados antes de conectar esperan en cola. */
export function connectToServer(url = defaultUrl()): Connection {
  const ws = new WebSocket(url);
  const pending: string[] = [];
  const listeners = new Set<(msg: ServerMessage) => void>();

  ws.addEventListener('open', () => pending.splice(0).forEach((m) => ws.send(m)));
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data)) as ServerMessage;
    listeners.forEach((l) => l(msg));
  });

  return {
    send(msg) {
      const data = JSON.stringify(msg);
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
      else pending.push(data);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
