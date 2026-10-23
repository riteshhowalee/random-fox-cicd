import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchFox, validateFox, FOX_API } from '../src/fox.js';

const fox = { image: 'https://randomfox.ca/images/89.jpg', link: 'https://randomfox.ca/?i=89' };

test('accepts valid fox data and discards extra fields', () => {
  assert.deepEqual(validateFox({ ...fox, extra: 'ignored' }), fox);
});
test('rejects missing or malformed API fields', () => {
  for (const data of [null, {}, { image: 123, link: fox.link }, { ...fox, image: 'bad-url' }]) {
    assert.throws(() => validateFox(data));
  }
});
test('rejects unsafe origins, schemes, credentials and image paths', () => {
  for (const url of ['http://randomfox.ca/images/1.jpg', 'https://evil.test/images/1.jpg',
    'javascript:alert(1)', 'https://user:password@randomfox.ca/images/1.jpg',
    'https://randomfox.ca/evil.svg', 'https://randomfox.ca.evil.test/images/1.jpg']) {
    assert.throws(() => validateFox({ ...fox, image: url }));
  }
  assert.throws(() => validateFox({ ...fox, link: 'https://evil.test/' }));
});
test('calls documented API with JSON header and timeout signal', async () => {
  const result = await fetchFox(async (url, options) => {
    assert.equal(url, FOX_API);
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => fox };
  });
  assert.deepEqual(result, fox);
});
test('rejects upstream HTTP errors, network failures and invalid JSON', async () => {
  await assert.rejects(fetchFox(async () => ({ ok: false })));
  await assert.rejects(fetchFox(async () => { throw new Error('offline'); }));
  await assert.rejects(fetchFox(async () => ({ ok: true, json: async () => { throw new Error('bad JSON'); } })));
});
