import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { fetchFox } from './fox.js';

const publicDir = new URL('../public/', import.meta.url);
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']]
]);

export function createApp({ fetchImpl = fetch } = {}) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https://randomfox.ca; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, data, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type });
      res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
    };
    try {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return send(405, { error: 'Method not allowed' });
      }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/health') return send(200, { status: 'ok' });
      if (path === '/api/fox') {
        try {
          return send(200, await fetchFox(fetchImpl));
        } catch {
          return send(502, { error: 'The fox service is unavailable. Please try again.' });
        }
      }
      const asset = assets.get(path);
      if (!asset) return send(404, { error: 'Not found' });
      return send(200, await readFile(new URL(asset[0], publicDir)), asset[1]);
    } catch {
      return send(500, { error: 'Something went wrong' });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const server = createApp();
  server.listen(port, '0.0.0.0', () => console.log(`Random Fox listening on http://localhost:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
