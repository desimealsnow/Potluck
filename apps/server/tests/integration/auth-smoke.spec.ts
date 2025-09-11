import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken } from '../setup';

const app = getTestApp();

let accessToken: string;

beforeAll(async () => {
  // Obtain a JWT via test helper (auto-creates user if missing)
  accessToken = await getAuthToken('HOST');
});

describe('Auth smoke', () => {
  it('GET /api/v1/events with valid Bearer token returns 200', async () => {
    await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('GET /api/v1/events without token returns 401', async () => {
    await request(app)
      .get('/api/v1/events')
      .expect(401);
  });
});


