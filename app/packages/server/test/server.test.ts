import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { isRoomCode, type ClientMessage, type ServerMessage } from '@syz/protocol';
import { ROOM_TTL_MS, RoomStore } from '../src/rooms.ts';
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

    now += ROOM_TTL_MS;
    server!.sweep();

    expect(await organizer.next()).toEqual({ type: 'room_expired' });
    expect(store.find(created.code)).toBeUndefined();
    expect(server!.joinedCount()).toBe(0);

    const late = await client(url);
    late.send({ type: 'join_room', code: created.code });
    expect(await late.next()).toEqual({ type: 'error', error: 'room_not_found' });
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
      const room = store.create();

      now += ROOM_TTL_MS;
      vi.advanceTimersByTime(60 * 1000);

      expect(store.find(room.code)).toBeUndefined();
      void own.close();
    } finally {
      vi.useRealTimers();
    }
  });
});

