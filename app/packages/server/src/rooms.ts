import { randomInt as cryptoRandomInt } from 'node:crypto';
import { createGame, type GameState, type Territory } from '@syz/engine';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  ROOM_UNUSED_TTL_MS,
  type ExpiryReason,
} from '@syz/protocol';
import { loadTerritories } from './cards.ts';

export { ROOM_TTL_MS, ROOM_UNUSED_TTL_MS };

export interface Room {
  code: string;
  game: GameState;
  createdAt: number;
  lastActivity: number;
  /** Si algún dispositivo, además del que la creó, ha entrado en la sala. */
  joined: boolean;
}

export interface RoomStoreOptions {
  now?: () => number;
  /** Entero aleatorio en [0, max). Por defecto, criptográfico. */
  randomInt?: (max: number) => number;
  ttlMs?: number;
  unusedTtlMs?: number;
  /** Territorios de cada partida nueva. Por defecto, los de cartas/cartas.csv. */
  territories?: readonly Territory[];
}

/** Salas en memoria. No guarda nada fuera de la partida (ADR-0006). */
export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly now: () => number;
  private readonly randomInt: (max: number) => number;
  private readonly ttlMs: number;
  private readonly unusedTtlMs: number;
  private readonly territories: readonly Territory[];

  constructor(options: RoomStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.randomInt = options.randomInt ?? ((max) => cryptoRandomInt(max));
    this.ttlMs = options.ttlMs ?? ROOM_TTL_MS;
    this.unusedTtlMs = options.unusedTtlMs ?? ROOM_UNUSED_TTL_MS;
    this.territories = options.territories ?? loadTerritories();
  }

  get size(): number {
    return this.rooms.size;
  }

  create(): Room {
    let code: string;
    do code = this.generateCode();
    while (this.rooms.has(code));
    const now = this.now();
    const room: Room = { code, game: createGame(this.territories), createdAt: now, lastActivity: now, joined: false };
    this.rooms.set(code, room);
    return room;
  }

  find(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  touch(code: string): void {
    const room = this.rooms.get(code);
    if (room) room.lastActivity = this.now();
  }

  /** Anota que otro dispositivo ha entrado: desde ahí solo cuenta la caducidad por inactividad. */
  markJoined(code: string): void {
    const room = this.rooms.get(code);
    if (room) room.joined = true;
  }

  /** Elimina las salas que deben cerrarse y devuelve sus códigos con el motivo. */
  sweep(): Array<{ code: string; reason: ExpiryReason }> {
    const now = this.now();
    const expired: Array<{ code: string; reason: ExpiryReason }> = [];
    for (const [code, room] of this.rooms) {
      const reason: ExpiryReason | null =
        !room.joined && now - room.createdAt >= this.unusedTtlMs
          ? 'unused'
          : now - room.lastActivity >= this.ttlMs
            ? 'inactive'
            : null;
      if (reason) {
        this.rooms.delete(code);
        expired.push({ code, reason });
      }
    }
    return expired;
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[this.randomInt(ROOM_CODE_ALPHABET.length)];
    }
    return code;
  }
}
