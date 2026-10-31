import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/http/router.js';

describe('router', () => {
  it('matches method and path and extracts decoded parameters', () => {
    const router = new Router();
    const handler = () => {};
    router.get('/api/events/:eventId', handler);
    assert.deepEqual(router.match('GET', '/api/events/event%201'), { handler, params: { eventId: 'event 1' } });
  });

  it('does not match a different method or path', () => {
    const router = new Router();
    router.get('/api/events/:eventId', () => {});
    assert.equal(router.match('POST', '/api/events/1'), null);
    assert.equal(router.match('GET', '/api/events/1/tickets'), null);
  });
});
