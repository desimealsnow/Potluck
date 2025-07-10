import { app, ownerToken } from '../helpers/testUtils';
import request from 'supertest';
import { expect, describe, it } from 'vitest';

describe('Events – validation', () => {
  it('400 when required fields missing', async () => {
    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${await ownerToken()}`)
      .send({});                          // empty payload

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 on invalid UUID param', async () => {
    const res = await request(app)
      .get('/events/not-a-uuid')
      .set('Authorization', `Bearer ${await ownerToken()}`);

    expect(res.status).toBe(400);
  });
});
