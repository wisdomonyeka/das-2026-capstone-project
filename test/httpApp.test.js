import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/http/app.js';

describe('HTTP app', () => {
  const server = createAppServer();
  let baseUrl;
  before(async () => {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  it('answers a real GET /health request with JSON', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('returns consistent JSON errors for unknown API routes and malformed JSON', async () => {
    const missing = await fetch(`${baseUrl}/api/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: { code: 'NOT_FOUND', message: 'API route not found' } });

    const malformed = await fetch(`${baseUrl}/health`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(Object.keys(await malformed.json()), ['error']);
  });

  it('serves public files without allowing traversal outside public', async () => {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Event Ticketing/);
    const escapeAttempt = await fetch(`${baseUrl}/%2e%2e%2fREADME.md`);
    assert.equal(escapeAttempt.status, 404);
  });
});
