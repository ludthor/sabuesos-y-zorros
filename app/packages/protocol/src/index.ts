/**
 * Mensajes entre cliente y servidor y utilidades del código de sala.
 * Lo comparten cliente y servidor; no contiene reglas del juego.
 */

import type { BoardView, GameAction, RuleError, Side } from '@syz/engine';

/** Caracteres que se confunden al dictar el código en voz alta (C0-01). */
export const ROOM_CODE_CONFUSABLES = ['0', 'O', '1', 'I', 'L'] as const;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

/** Una sala se elimina tras 4 horas sin actividad (ADR-0006, confirmado en C0-01). */
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

/** Una sala a la que no se une ningún otro dispositivo se cierra a los 15 minutos (Ariel, 2026-11-16). */
export const ROOM_UNUSED_TTL_MS = 15 * 60 * 1000;

/** Por qué se cerró una sala: nadie se unió a tiempo, o pasó la caducidad sin actividad. */
export type ExpiryReason = 'unused' | 'inactive';

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
  | { type: 'join_room'; code: string }
  /** Elegir o cambiar el bando de este dispositivo (C0-03). */
  | { type: 'choose_side'; side: Side }
  /** Una acción de la partida. El servidor la aplica con el motor (ADR-0001, ADR-0002). */
  | { type: 'game_action'; action: GameAction };

export type ErrorCode = 'room_not_found' | 'bad_message' | 'not_in_room' | 'side_locked';

export type ServerMessage =
  /** Al conectar: dirección que deben usar los demás dispositivos, si el servidor la conoce. */
  | { type: 'welcome'; shareOrigin: string | null }
  | { type: 'room_created'; code: string }
  | { type: 'room_joined'; code: string }
  | { type: 'room_expired'; reason: ExpiryReason }
  /**
   * Lo que este dispositivo ve de la sala. Llega al entrar y cada vez que algo cambia.
   * Sin bando no hay tablero; con bando, solo la vista de ese bando (ADR-0001).
   */
  | { type: 'room_state'; side: Side | null; board: BoardView | null; devices: Record<Side, number> }
  /** El motor no ha aceptado la acción; el dispositivo sigue en la sala. */
  | { type: 'action_rejected'; reason: RuleError }
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
  if (msg.type === 'choose_side' && (msg.side === 'foxes' || msg.side === 'hounds')) {
    return { type: 'choose_side', side: msg.side };
  }
  if (msg.type === 'game_action') {
    const action = parseGameAction(msg.action);
    return action && { type: 'game_action', action };
  }
  return null;
}

/** Comprueba la forma de una acción; las reglas las comprueba el motor. */
function parseGameAction(data: unknown): GameAction | null {
  if (typeof data !== 'object' || data === null) return null;
  const a = data as Record<string, unknown>;
  switch (a.type) {
    case 'set_territory_count':
      return typeof a.count === 'number' ? { type: a.type, count: a.count } : null;
    case 'set_territory':
      return typeof a.id === 'string' && typeof a.inPlay === 'boolean'
        ? { type: a.type, id: a.id, inPlay: a.inPlay }
        : null;
    case 'start_game':
      return { type: a.type };
    case 'choose_first_territory':
      return typeof a.id === 'string' ? { type: a.type, id: a.id } : null;
    default:
      return null;
  }
}
