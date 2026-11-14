/**
 * Mensajes entre cliente y servidor y utilidades del código de sala.
 * Lo comparten cliente y servidor; no contiene reglas del juego.
 */

/** Sin 0, O, 1, I ni L: se confunden al dictar el código en voz alta (C0-01). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

const ROOM_CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

/** Pasa a mayúsculas y quita espacios y guiones, para aceptar lo que se teclee. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isRoomCode(code: string): boolean {
  return ROOM_CODE_RE.test(code);
}

export function roomPath(code: string): string {
  return `/sala/${code}`;
}

export function parseRoomPath(pathname: string): string | null {
  const match = /^\/sala\/([^/]+)\/?$/.exec(pathname);
  return match ? normalizeRoomCode(decodeURIComponent(match[1]!)) : null;
}

export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; code: string };

export type ErrorCode = 'room_not_found' | 'bad_message';

export type ServerMessage =
  | { type: 'room_created'; code: string }
  | { type: 'room_joined'; code: string }
  | { type: 'room_expired' }
  | { type: 'error'; error: ErrorCode };

/** Valida un mensaje recibido por la red; devuelve null si no es válido. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.type === 'create_room') return { type: 'create_room' };
  if (msg.type === 'join_room' && typeof msg.code === 'string') {
    return { type: 'join_room', code: msg.code };
  }
  return null;
}
