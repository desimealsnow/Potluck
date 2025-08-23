// apps/server/tests/events/lifecycle.spec.ts
debugger
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { app, ownerToken, resetEvents } from '../helpers/testUtils';
import logger from '../../src/logger';
import { OpenApiTestHelper } from '../helpers/openApiTestHelper';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const apiHelper = new OpenApiTestHelper('../../docs/api-spec.yaml');
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe('Events – full lifecycle (draft → published → cancelled → archived → deleted → restored → purged)', () => {
  /* Shared state */
  let token: string;
  let eventId: string;
  let postBody: any;

  /* ============= SET-UP ============= */
  beforeAll(async () => {
    await resetEvents();
    token = await ownerToken();

    // 1️⃣  CREATE  (draft)
    postBody = apiHelper.getSamplePostPayload('/events');
    const createRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send(postBody);

    logger.info('CREATE response', { status: createRes.status, body: createRes.body });
    expect(createRes.status).toBe(201);

    eventId = createRes.body.event.id;
    expect(createRes.body.event.status).toBe('draft');
  });

  /* ============= PUBLISH ============= */
  it('POST /events/:id/publish → status = published', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('PUBLISH response', { status: res.status, error: res.error, body: res.body });
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe('published');
  });

  /* ============= CANCEL ============= */
  it('POST /events/:id/cancel → status = cancelled', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Host unavailable' });

    logger.info('CANCEL response', { status: res.status, error: res.error,  body: res.body });
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe('cancelled');
  });

  /* ============= ARCHIVE ============= */
  it('POST /events/:id/purge → status = purge', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/purge`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('purge response', { status: res.status, error: res.error,  body: res.body });
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe('archived');
  });

  /* ============= HARD-DELETE ============= */
  it('DELETE /events/:id → 204 & subsequent GET = 404', async () => {
    const del = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(204);
    logger.info('SOFT DELETE response', { status: del.status, error: del.error,  body: del.body });

    const follow = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(follow.status).toBe(404);
  });

  /* ============= RESTORE ============= */
  it('POST /events/:id/restore → status back to archived', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${eventId}/restore`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('RESTORE response', { status: res.status, error: res.error,  body: res.body });
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe('archived');
  });

  /* ============= PURGE (hard-delete) ============= */
  it('POST /events/:id/purge → 204 & hard 404 afterwards', async () => {
    const purge = await request(app)
      .post(`/api/v1/events/${eventId}/purge`)
      .set('Authorization', `Bearer ${token}`);

    expect(purge.status).toBe(204);
    logger.info('PURGE response', { status: purge.status, error: purge.error,  body: purge.body });

    const follow = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(follow.status).toBe(404);
    logger.info('PURGE FOLLOW response', { status: follow.status, error: follow.error,  body: follow.body });

  });

  /* ============= CLEAN-UP ============= */
  afterAll(async () => {
    await resetEvents();
  });
});
