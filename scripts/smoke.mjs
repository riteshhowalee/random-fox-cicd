import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    ready = true;
    break;
  } catch {
    await setTimeout(500);
  }
}
assert.ok(ready, 'Server did not become healthy');
const page = await fetch(base, { signal: AbortSignal.timeout(3000) });
assert.equal(page.status, 200);
assert.match(await page.text(), /Fox &amp; Found|Fox & Found/);
for (const asset of ['/app.js', '/styles.css']) {
  assert.equal((await fetch(`${base}${asset}`, { signal: AbortSignal.timeout(3000) })).status, 200);
}
console.log('PASS: health, homepage, JavaScript and CSS');
