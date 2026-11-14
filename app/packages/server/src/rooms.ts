import { randomInt as cryptoRandomInt } from 'node:crypto';
import { createGame, type GameState } from '@syz/engine';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_TTL_MS } from '@syz/protocol';

export { ROOM_TTL_MS };

export interface Room {
  code: string;
  game: GameState;
  lastActivity: number;
}

export interface RoomStoreOptions {
  now?: () => number;
  /** Entero aleatorio en [0, max). Por defecto, criptográfico. */
  randomInt?: (max: number) => number;
  ttlMs?: number;
}

/** Salas en memoria. No guarda nada fuera de la partida (ADR-0006). */
export class RoomStore {
  private readonly rooms = new Map<string, Room>();
  private readonly now: () => number;
  private readonly randomInt: (max: number) => number;
  private readonly ttlMs: number;

  constructor(options: RoomStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.randomInt = options.randomInt ?? ((max) => cryptoRandomInt(max));
    this.ttlMs = options.ttlMs ?? ROOM_TTL_MS;
  }

  get size(): number {
    return this.rooms.size;
  }

  create(): Room {
    let code: string;
    do code = this.generateCode();
    while (this.rooms.has(code));
    const room: Room = { code, game: createGame(), lastActivity: this.now() };
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

  /** Elimina las salas caducadas y devuelve sus códigos. */
  sweep(): string[] {
    const limit = this.now() - this.ttlMs;
    const expired: string[] = [];
    for (const [code, room] of this.rooms) {
      if (room.lastActivity <= limit) {
        this.rooms.delete(code);
        expired.push(code);
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
