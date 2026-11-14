import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

/** Sirve la interfaz compilada; cualquier otra ruta devuelve index.html (por ejemplo, /sala/K7MPX). */
export function serveStatic(root: string) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      return void res.writeHead(400).end();
    }
    const candidate = normalize(join(root, pathname));
    let file = join(root, 'index.html');
    if (candidate.startsWith(root + sep)) {
      const info = await stat(candidate).catch(() => undefined);
      if (info?.isFile()) file = candidate;
      // Un archivo compilado que no existe es un error, no una ruta de la app.
      else if (pathname.startsWith('/assets/')) return void res.writeHead(404).end();
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const cache = file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    createReadStream(file).pipe(res);
  };
}
