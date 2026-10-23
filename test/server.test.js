import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

const fox = { image: 'https://randomfox.ca/images/89.jpg', link: 'https://randomfox.ca/?i=89' };
async function start(t, fetchImpl) {
  const server = createApp({ fetchImpl });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves health independently of upstream API', async t => {
  const base = await start(t, () => { throw new Error('must not call upstream'); });
  const result = await fetch(`${base}/health`);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { status: 'ok' });
});
test('serves page and assets with correct types and security headers', async t => {
  const base = await start(t);
  for (const [path, type, content] of [['/', 'text/html', 'Find me a fox'],
    ['/styles.css', 'text/css', '@media'], ['/app.js', 'text/javascript', '/api/fox']]) {
    const result = await fetch(`${base}${path}`);
    assert.equal(result.status, 200);
    assert.ok(result.headers.get('content-type').startsWith(type));
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    assert.match(result.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.ok((await result.text()).includes(content));
  }
});
test('API route returns normalized fox data without caching', async t => {
  const base = await start(t, async () => ({ ok: true, json: async () => fox }));
  const result = await fetch(`${base}/api/fox`);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), fox);
});
test('API route returns safe 502 for upstream failures', async t => {
  const base = await start(t, async () => { throw new Error('private detail'); });
  const result = await fetch(`${base}/api/fox`);
  assert.equal(result.status, 502);
  const body = await result.text();
  assert.match(body, /try again/);
  assert.ok(!body.includes('private detail'));
});
test('API route rejects unsafe upstream payload', async t => {
  const base = await start(t, async () => ({ ok: true, json: async () => ({ ...fox, image: 'https://evil.test/a.jpg' }) }));
  assert.equal((await fetch(`${base}/api/fox`)).status, 502);
});
test('unknown paths and private files return 404', async t => {
  const base = await start(t);
  for (const path of ['/missing', '/.env', '/package.json', '/src/server.js', '/%2e%2e/package.json']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404);
  }
});
test('unsupported methods return 405 and Allow header', async t => {
  const base = await start(t);
  const result = await fetch(`${base}/api/fox`, { method: 'POST' });
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('allow'), 'GET');
});
