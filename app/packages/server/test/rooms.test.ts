import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, isRoomCode } from '@syz/protocol';
import { ROOM_TTL_MS, RoomStore } from '../src/rooms.ts';

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('RoomStore', () => {
  it('crea salas con un código válido y una partida nueva', () => {
    const store = new RoomStore();
    const room = store.create();
    expect(isRoomCode(room.code)).toBe(true);
    expect(room.game).toEqual({ phase: 'setup' });
    expect(store.find(room.code)).toBe(room);
  });

  it('no repite un código que ya está en uso', () => {
    // El generador devuelve primero el mismo código dos veces y luego otro.
    const sequence = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
    let i = 0;
    const store = new RoomStore({ randomInt: () => sequence[i++] ?? 2 });
    const a = store.create();
    const b = store.create();
    expect(a.code).toBe(ROOM_CODE_ALPHABET[0].repeat(5));
    expect(b.code).not.toBe(a.code);
  });

  it('no encuentra un código que no existe', () => {
    expect(new RoomStore().find('ZZZZZ')).toBeUndefined();
  });

  it('la caducidad es de 4 horas sin actividad', () => {
    expect(ROOM_TTL_MS).toBe(4 * 60 * 60 * 1000);
  });

  it('elimina con todo su estado la sala sin actividad durante la caducidad', () => {
    const c = clock();
    const store = new RoomStore({ now: c.now });
    const room = store.create();

    c.advance(ROOM_TTL_MS - 1);
    expect(store.sweep()).toEqual([]);
    expect(store.find(room.code)).toBe(room);

    c.advance(1);
    expect(store.sweep()).toEqual([room.code]);
    expect(store.find(room.code)).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it('la actividad reinicia la caducidad', () => {
    const c = clock();
    const store = new RoomStore({ now: c.now });
    const room = store.create();

    c.advance(ROOM_TTL_MS - 1000);
    store.touch(room.code);
    c.advance(ROOM_TTL_MS - 1000);
    expect(store.sweep()).toEqual([]);
    expect(store.find(room.code)).toBeDefined();
  });

  it('solo elimina las salas caducadas', () => {
    const c = clock();
    const store = new RoomStore({ now: c.now });
    const old = store.create();
    c.advance(ROOM_TTL_MS / 2);
    const recent = store.create();
    c.advance(ROOM_TTL_MS / 2);
    expect(store.sweep()).toEqual([old.code]);
    expect(store.find(recent.code)).toBeDefined();
  });
});
