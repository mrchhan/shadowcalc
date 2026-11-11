/**
 * ShadowCalc production server (zero dependencies, Node 18.18+).
 *
 *   GET /api/rates   -> normalized exchange rates via a keyed provider
 *   GET /api/health  -> liveness check
 *   GET /*           -> the built single-page app from ./dist
 *
 * Configure with environment variables (see .env.example):
 *   EXCHANGE_RATE_API_KEY  secret key, stays on the server
 *   PORT                   default 8787
 */
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRates, RatesConfigError } from './rates.mjs';

const PORT = Number(process.env.PORT) || 8787;
const API_KEY = process.env.EXCHANGE_RATE_API_KEY?.trim() || '';
const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

/** CSP hashes for inline <script> blocks in the built index.html (theme bootstrap). */
function inlineScriptHashes() {
  try {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
    );
  } catch {
    return [];
  }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes().join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://open.er-api.com https://api.frankfurter.dev",
    "frame-ancestors 'none'",
  ].join('; '),
};

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

async function handleRates(res) {
  try {
    const snapshot = await getRates({ apiKey: API_KEY });
    sendJson(res, 200, snapshot, { 'Cache-Control': 'public, max-age=300' });
  } catch (err) {
    const status = err instanceof RatesConfigError ? 501 : 502;
    // Never echo the upstream URL: it contains the API key.
    console.error(`[rates] ${err instanceof Error ? err.message : err}`);
    sendJson(res, status, {
      error: err instanceof RatesConfigError ? err.message : 'Upstream exchange-rate provider is unavailable',
    });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  // Resolve inside DIST only (blocks ../ traversal).
  let filePath = normalize(join(DIST, pathname));
  if (filePath !== DIST && !filePath.startsWith(DIST + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let info = await stat(filePath).catch(() => null);
  if (info?.isDirectory()) {
    filePath = join(filePath, 'index.html');
    info = await stat(filePath).catch(() => null);
  }
  if (!info) {
    // SPA fallback
    filePath = join(DIST, 'index.html');
    info = await stat(filePath).catch(() => null);
    if (!info) {
      res.writeHead(503, { 'Content-Type': 'text/plain' }).end('App not built yet. Run `npm run build` first.');
      return;
    }
  }

  const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/api/rates') return handleRates(res);
  if (pathname === '/api/health') return sendJson(res, 200, { ok: true, ratesConfigured: Boolean(API_KEY) });
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`ShadowCalc running at http://localhost:${PORT}`);
  console.log(
    API_KEY
      ? 'Rates proxy: ExchangeRate-API (keyed) at /api/rates'
      : 'Rates proxy: not configured (set EXCHANGE_RATE_API_KEY). The app will use key-less providers.',
  );
});
