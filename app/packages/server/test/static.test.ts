import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { serveStatic } from '../src/static.ts';

let dir: string;
let server: Server;
let port: number;

async function serve(root: string) {
  server = createServer(serveStatic(root));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
}

/** GET con la ruta tal cual, sin que el cliente la normalice. */
function get(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    request({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    })
      .on('error', reject)
      .end();
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'syz-static-'));
  mkdirSync(join(dir, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(dir, 'dist', 'index.html'), 'INDICE');
  writeFileSync(join(dir, 'dist', 'assets', 'app.js'), 'CODIGO');
  writeFileSync(join(dir, 'secreto.txt'), 'SECRETO');
});

afterEach(async () => {
  await new Promise((r) => server?.close(r));
  rmSync(dir, { recursive: true, force: true });
});

describe('serveStatic', () => {
  it('sirve los archivos compilados', async () => {
    await serve(join(dir, 'dist'));
    expect(await get('/assets/app.js')).toEqual({ status: 200, body: 'CODIGO' });
  });

  it('las rutas de la app devuelven index.html', async () => {
    await serve(join(dir, 'dist'));
    expect(await get('/')).toEqual({ status: 200, body: 'INDICE' });
    expect(await get('/sala/K7MPX')).toEqual({ status: 200, body: 'INDICE' });
  });

  it('un archivo compilado que no existe da 404', async () => {
    await serve(join(dir, 'dist'));
    expect((await get('/assets/nada.js')).status).toBe(404);
  });

  it('no sale de la carpeta servida', async () => {
    await serve(join(dir, 'dist'));
    for (const path of ['/../secreto.txt', '/..%2fsecreto.txt', '/%2e%2e/secreto.txt']) {
      expect((await get(path)).body).not.toBe('SECRETO');
    }
  });

  it('una dirección mal codificada da 400', async () => {
    await serve(join(dir, 'dist'));
    expect((await get('/%E0')).status).toBe(400);
  });

  it('sin interfaz compilada responde 503 en lugar de caerse', async () => {
    await serve(join(dir, 'vacia'));
    const res = await get('/');
    expect(res.status).toBe(503);
    expect(res.body).toMatch(/npm run build/);
    expect((await get('/sala/K7MPX')).status).toBe(503);
  });
});
