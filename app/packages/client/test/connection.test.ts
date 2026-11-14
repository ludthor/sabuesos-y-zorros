import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { connectToServer, type ConnectionEvent } from '../src/connection.ts';

/** Un puerto en el que no escucha nadie. */
async function closedPort(): Promise<number> {
  const srv = createServer();
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const { port } = srv.address() as { port: number };
  await new Promise((r) => srv.close(r));
  return port;
}

describe('connectToServer', () => {
  it('avisa al perder la conexión y vuelve a avisar en cada envío posterior', async () => {
    const connection = connectToServer(`ws://127.0.0.1:${await closedPort()}/ws`);
    const events: ConnectionEvent[] = [];
    connection.subscribe((e) => events.push(e));

    await expect.poll(() => events.length, { timeout: 3000 }).toBe(1);
    expect(events).toEqual([{ type: 'connection_lost' }]);

    connection.send({ type: 'create_room' });
    expect(events).toEqual([{ type: 'connection_lost' }, { type: 'connection_lost' }]);
  });
});
