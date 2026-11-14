import type { ClientMessage, ServerMessage } from '@syz/protocol';

/** Lo que recibe la interfaz: mensajes del servidor y la pérdida de la conexión. */
export type ConnectionEvent = ServerMessage | { type: 'connection_lost' };

/** Canal con el servidor de salas (ADR-0003). En las pruebas se sustituye por uno falso. */
export interface Connection {
  send(msg: ClientMessage): void;
  subscribe(listener: (event: ConnectionEvent) => void): () => void;
}

function defaultUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/ws`;
}

/**
 * Abre el websocket. Los mensajes enviados antes de conectar esperan en cola.
 * Si la conexión se corta, avisa con `connection_lost`; reconectar es cosa de C1-04.
 */
export function connectToServer(url = defaultUrl()): Connection {
  const ws = new WebSocket(url);
  const pending: string[] = [];
  const listeners = new Set<(event: ConnectionEvent) => void>();
  const emit = (event: ConnectionEvent) => listeners.forEach((l) => l(event));
  let lost = false;
  const onLost = () => {
    if (lost) return;
    lost = true;
    emit({ type: 'connection_lost' });
  };

  ws.addEventListener('open', () => pending.splice(0).forEach((m) => ws.send(m)));
  ws.addEventListener('message', (event) => {
    try {
      emit(JSON.parse(String(event.data)) as ServerMessage);
    } catch {
      // Un mensaje ilegible del servidor se ignora.
    }
  });
  ws.addEventListener('close', onLost);
  ws.addEventListener('error', onLost);

  return {
    send(msg) {
      const data = JSON.stringify(msg);
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
      else if (ws.readyState === WebSocket.CONNECTING) pending.push(data);
      else onLost();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
