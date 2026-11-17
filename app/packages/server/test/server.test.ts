import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { isRoomCode, type ClientMessage, type ServerMessage } from '@syz/protocol';
import { ROOM_TTL_MS, ROOM_UNUSED_TTL_MS, RoomStore } from '../src/rooms.ts';
import { createSyzServer, type SyzServer } from '../src/server.ts';

let server: SyzServer | undefined;
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const s of sockets.splice(0)) s.terminate();
  await server?.close();
  server = undefined;
});

async function start(store = new RoomStore(), shareOrigin?: string) {
  server = createSyzServer({ store, sweepIntervalMs: 0, shareOrigin });
  const port = await server.listen(0, '127.0.0.1');
  return { url: `ws://127.0.0.1:${port}/ws`, store };
}

/** Un cliente de prueba que guarda los mensajes que recibe. */
async function client(url: string) {
  const c = await rawClient(url);
  await c.next(); // el saludo «welcome» que llega al conectar
  return c;
}

async function rawClient(url: string) {
  const ws = new WebSocket(url);
  sockets.push(ws);
  const inbox: ServerMessage[] = [];
  const waiters: Array<() => void> = [];
  ws.on('message', (data) => {
    inbox.push(JSON.parse(String(data)));
    waiters.splice(0).forEach((w) => w());
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return {
    ws,
    inbox,
    send: (msg: ClientMessage | Record<string, unknown>) => ws.send(JSON.stringify(msg)),
    async next(): Promise<ServerMessage> {
      while (inbox.length === 0) await new Promise<void>((r) => waiters.push(r));
      return inbox.shift()!;
    },
    /** El siguiente mensaje del tipo indicado; descarta los anteriores de otros tipos. */
    async until<T extends ServerMessage['type']>(type: T): Promise<Extract<ServerMessage, { type: T }>> {
      for (;;) {
        const msg = await this.next();
        if (msg.type === type) return msg as Extract<ServerMessage, { type: T }>;
      }
    },
  };
}

describe('servidor de salas (C0-01)', () => {
  it('«Nueva partida» crea una sala y devuelve su código', async () => {
    const { url, store } = await start();
    const c = await client(url);
    c.send({ type: 'create_room' });
    const msg = await c.next();
    expect(msg.type).toBe('room_created');
    if (msg.type !== 'room_created') return;
    expect(isRoomCode(msg.code)).toBe(true);
    expect(store.find(msg.code)).toBeDefined();
  });

  it('otro dispositivo entra con el código de una sala que existe', async () => {
    const { url } = await start();
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.next();
    if (created.type !== 'room_created') throw new Error('sin sala');

    const other = await client(url);
    other.send({ type: 'join_room', code: created.code.toLowerCase() });
    expect(await other.next()).toEqual({ type: 'room_joined', code: created.code });
  });

  it('un código que no existe recibe un aviso y no entra en ninguna sala', async () => {
    const { url } = await start();
    const c = await client(url);
    c.send({ type: 'join_room', code: 'ZZZZZ' });
    expect(await c.next()).toEqual({ type: 'error', error: 'room_not_found' });
    expect(server!.joinedCount()).toBe(0);
  });

  it('un mensaje mal formado recibe un error y no crea nada', async () => {
    const { url, store } = await start();
    const c = await client(url);
    c.ws.send('no es json');
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' });
    c.send({ type: 'join_room' });
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' });
    expect(store.size).toBe(0);
  });

  it('al caducar, la sala desaparece, avisa a quien siga dentro y su código deja de valer', async () => {
    let now = 0;
    const { url, store } = await start(new RoomStore({ now: () => now }));
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.next();
    if (created.type !== 'room_created') throw new Error('sin sala');
    const other = await client(url);
    other.send({ type: 'join_room', code: created.code });
    await other.next();

    now += ROOM_TTL_MS;
    server!.sweep();

    expect(await organizer.until('room_expired')).toEqual({ type: 'room_expired', reason: 'inactive' });
    expect(await other.until('room_expired')).toEqual({ type: 'room_expired', reason: 'inactive' });
    expect(store.find(created.code)).toBeUndefined();
    expect(server!.joinedCount()).toBe(0);

    const late = await client(url);
    late.send({ type: 'join_room', code: created.code });
    expect(await late.next()).toEqual({ type: 'error', error: 'room_not_found' });
  });

  it('si nadie se une en 15 minutos, la sala se cierra y avisa al organizador', async () => {
    let now = 0;
    const { url, store } = await start(new RoomStore({ now: () => now }));
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.next();
    if (created.type !== 'room_created') throw new Error('sin sala');

    now += ROOM_UNUSED_TTL_MS;
    server!.sweep();

    expect(await organizer.until('room_expired')).toEqual({ type: 'room_expired', reason: 'unused' });
    expect(store.find(created.code)).toBeUndefined();
  });

  it('cuando otro dispositivo entra, la sala ya no se cierra a los 15 minutos', async () => {
    let now = 0;
    const { url, store } = await start(new RoomStore({ now: () => now }));
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.next();
    if (created.type !== 'room_created') throw new Error('sin sala');

    now += ROOM_UNUSED_TTL_MS - 1000;
    const other = await client(url);
    other.send({ type: 'join_room', code: created.code });
    await other.next();

    now += ROOM_UNUSED_TTL_MS * 2;
    server!.sweep();
    expect(store.find(created.code)).toBeDefined();
  });

  it('los mensajes de la sala cuentan como actividad', async () => {
    let now = 0;
    const { url, store } = await start(new RoomStore({ now: () => now }));
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.next();
    if (created.type !== 'room_created') throw new Error('sin sala');

    now += ROOM_TTL_MS - 1000;
    const other = await client(url);
    other.send({ type: 'join_room', code: created.code });
    await other.next();

    now += ROOM_TTL_MS - 1000;
    server!.sweep();
    expect(store.find(created.code)).toBeDefined();
  });

  it('al conectar, indica la dirección que deben usar los demás dispositivos', async () => {
    const { url } = await start(new RoomStore(), 'http://192.168.1.10:3000');
    const c = await rawClient(url);
    expect(await c.next()).toEqual({ type: 'welcome', shareOrigin: 'http://192.168.1.10:3000' });
  });

  it('el servidor elimina por sí solo las salas caducadas, sin que nadie lo pida', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let now = 0;
      const store = new RoomStore({ now: () => now });
      const own = createSyzServer({ store }); // intervalo por defecto
      const unused = store.create();
      const used = store.create();
      store.markJoined(used.code);

      now += ROOM_UNUSED_TTL_MS;
      vi.advanceTimersByTime(60 * 1000);
      expect(store.find(unused.code)).toBeUndefined();
      expect(store.find(used.code)).toBeDefined();

      now += ROOM_TTL_MS;
      vi.advanceTimersByTime(60 * 1000);
      expect(store.find(used.code)).toBeUndefined();
      void own.close();
    } finally {
      vi.useRealTimers();
    }
  });
});


describe('bandos (C0-03)', () => {
  async function roomWithTwoDevices() {
    const { url, store } = await start();
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    const created = await organizer.until('room_created');
    await organizer.until('room_state');
    const other = await client(url);
    other.send({ type: 'join_room', code: created.code });
    await other.until('room_state');
    return { url, store, code: created.code, organizer, other };
  }

  it('al entrar, el dispositivo aún no tiene bando ni ve el tablero', async () => {
    const { url } = await start();
    const organizer = await client(url);
    organizer.send({ type: 'create_room' });
    await organizer.until('room_created');
    expect(await organizer.next()).toEqual({
      type: 'room_state',
      side: null,
      board: null,
      devices: { foxes: 0, hounds: 0 },
    });
  });

  it('cuando elige bando, ve los territorios en juego y el marcador', async () => {
    const { other } = await roomWithTwoDevices();
    other.send({ type: 'choose_side', side: 'foxes' });
    const state = await other.until('room_state');
    expect(state.side).toBe('foxes');
    expect(state.devices).toEqual({ foxes: 1, hounds: 0 });
    expect(state.board?.score).toEqual({ foxes: 0, hounds: 0 });
    expect(state.board?.territories.map((t) => t.name)).toEqual([
      'Pregunta y objetivos',
      'Antecedentes',
      'Método',
      'Resultados',
      'Limitaciones',
      'Contribución',
    ]);
    expect(state.board?.territories.every((t) => t.owner === null)).toBe(true);
  });

  it('cuando un dispositivo cambia el estado, el otro lo recibe en menos de un segundo', async () => {
    const { organizer, other } = await roomWithTwoDevices();
    organizer.send({ type: 'choose_side', side: 'hounds' });
    await organizer.until('room_state');
    await other.until('room_state');

    const sentAt = performance.now();
    other.send({ type: 'choose_side', side: 'foxes' });
    const seen = await organizer.until('room_state');
    expect(performance.now() - sentAt).toBeLessThan(1000);
    expect(seen.side).toBe('hounds');
    expect(seen.devices).toEqual({ foxes: 1, hounds: 1 });
  });

  it('un dispositivo puede cambiar de bando antes de empezar', async () => {
    const { other } = await roomWithTwoDevices();
    other.send({ type: 'choose_side', side: 'foxes' });
    await other.until('room_state');
    other.send({ type: 'choose_side', side: 'hounds' });
    const state = await other.until('room_state');
    expect(state.side).toBe('hounds');
    expect(state.devices).toEqual({ foxes: 0, hounds: 1 });
  });

  it('si un dispositivo se va, los demás ven un dispositivo menos en su bando', async () => {
    const { organizer, other } = await roomWithTwoDevices();
    other.send({ type: 'choose_side', side: 'foxes' });
    expect((await organizer.until('room_state')).devices).toEqual({ foxes: 1, hounds: 0 });
    other.ws.close();
    expect((await organizer.until('room_state')).devices).toEqual({ foxes: 0, hounds: 0 });
  });

  it('el estado que recibe cada dispositivo solo trae el tablero público (ADR-0001)', async () => {
    const { other } = await roomWithTwoDevices();
    other.send({ type: 'choose_side', side: 'hounds' });
    const state = await other.until('room_state');
    expect(Object.keys(state).sort()).toEqual(['board', 'devices', 'side', 'type']);
    expect(Object.keys(state.board!).sort()).toEqual(['phase', 'score', 'territories']);
  });

  it('elegir bando fuera de una sala, o un bando que no existe, recibe un error', async () => {
    const { url } = await start();
    const c = await client(url);
    c.send({ type: 'choose_side', side: 'foxes' });
    expect(await c.next()).toEqual({ type: 'error', error: 'not_in_room' });
    c.send({ type: 'choose_side', side: 'wolves' });
    expect(await c.next()).toEqual({ type: 'error', error: 'bad_message' });
  });
});
