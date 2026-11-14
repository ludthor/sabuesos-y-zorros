import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSyzServer } from './server.ts';
import { resolveShareOrigin } from './share-origin.ts';
import { serveStatic } from './static.ts';

const here = dirname(fileURLToPath(import.meta.url));
const clientRoot = resolve(here, '../../client');
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let handleHttp: Handler = (_req, res) => void res.writeHead(503).end();
const listensOnNetwork = host === '0.0.0.0' || host === '::';
const lanOrigins = listensOnNetwork
  ? Object.values(networkInterfaces())
      .flat()
      .filter((net) => net && net.family === 'IPv4' && !net.internal)
      .map((net) => `http://${net!.address}:${port}`)
  : [];
let shareOrigin: string | null;
try {
  shareOrigin = resolveShareOrigin(process.env.PUBLIC_URL, lanOrigins);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const server = createSyzServer({ handleHttp: (req, res) => handleHttp(req, res), shareOrigin });

if (production) {
  handleHttp = serveStatic(resolve(clientRoot, 'dist'));
} else {
  // En desarrollo, Vite sirve la interfaz en el mismo puerto que los websockets.
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({
    root: clientRoot,
    configFile: resolve(clientRoot, 'vite.config.ts'),
    server: { middlewareMode: true, ws: { server: server.httpServer } },
    appType: 'spa',
  });
  handleHttp = (req, res) => vite.middlewares(req, res);
}

await server.listen(port, host);

console.log(`Sabuesos y Zorros${production ? '' : ' (desarrollo)'} en http://localhost:${port}`);
for (const origin of lanOrigins) console.log(`  en la red local: ${origin}`);
if (shareOrigin) console.log(`  el QR de las salas lleva a ${shareOrigin}`);
