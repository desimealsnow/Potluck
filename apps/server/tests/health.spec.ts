// apps/server/tests/health.spec.ts
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import { createApp } from '../src/app';

const app = createApp(); // <-- invoke here!

describe('GET /health', () => {
  it('returns 200 OK', async () => {
    const res = await request(app).get('/health'); // Use the app instance!
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});