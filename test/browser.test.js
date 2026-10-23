import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
function browser(fetchImpl, imageFails = false) {
  const elements = new Map();
  let click;
  for (const selector of ['#new-fox', '#status', '#fox-image', '#source', '#placeholder', '.photo-card', '#count']) {
    elements.set(selector, {
      hidden: ['#fox-image', '#source'].includes(selector),
      setAttribute(key, value) { this[key] = value; },
      addEventListener(event, callback) { if (event === 'click') click = callback; }
    });
  }
  class FakeImage {
    set src(value) { if (value) queueMicrotask(() => imageFails ? this.onerror() : this.onload()); }
  }
  vm.runInNewContext(script, {
    document: { querySelector: selector => elements.get(selector) },
    Image: FakeImage, fetch: fetchImpl, AbortSignal, setTimeout, clearTimeout
  });
  return { elements, click: () => click() };
}
test('UI displays a loaded fox, source link and count', async () => {
  const fox = { image: 'https://randomfox.ca/images/1.jpg', link: 'https://randomfox.ca/?i=1' };
  const { elements, click } = browser(async () => ({ ok: true, json: async () => fox }));
  const pending = click();
  assert.equal(elements.get('#new-fox').disabled, true);
  await pending;
  assert.equal(elements.get('#fox-image').src, fox.image);
  assert.equal(elements.get('#fox-image').hidden, false);
  assert.equal(elements.get('#placeholder').hidden, true);
  assert.equal(elements.get('#source').href, fox.link);
  assert.equal(elements.get('#count').textContent, 'NO. 001');
  assert.equal(elements.get('#new-fox').disabled, false);
  await click();
  assert.equal(elements.get('#count').textContent, 'NO. 002');
});
test('UI shows a retry message and restores button after API failure', async () => {
  const { elements, click } = browser(async () => ({ ok: false }));
  await click();
  assert.match(elements.get('#status').textContent, /try again/);
  assert.equal(elements.get('#new-fox').disabled, false);
  assert.equal(elements.get('.photo-card')['aria-busy'], 'false');
  assert.equal(elements.get('#fox-image').hidden, true);
});
test('UI handles image load failure without displaying broken image', async () => {
  const { elements, click } = browser(async () => ({ ok: true, json: async () => ({ image: 'fox.jpg' }) }), true);
  await click();
  assert.match(elements.get('#status').textContent, /try again/);
  assert.equal(elements.get('#fox-image').hidden, true);
  assert.equal(elements.get('#new-fox').disabled, false);
});
