import { app, ownerToken, resetEvents,outsiderToken } from '../helpers/testUtils';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import logger from '../../src/logger';
import { OpenApiTestHelper } from '../helpers/openApiTestHelper';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';


const apiHelper = new OpenApiTestHelper('../../docs/api-spec.yaml');


describe('Events – RLS', () => {

  /* Shared state */
  let token: string;
  let eventId: string;
  let postBody: any;

  /* ============= SET-UP ============= */
  beforeAll(async () => {
    await resetEvents();          // clean slate
    token = await ownerToken();   // auth once for all calls

    // Build sample payload from spec
    postBody = apiHelper.getSamplePostPayload('/events');
    logger.info({ message: 'RLS POST sample body', postBody });

    // Create one event we’ll use for the rest of the suite
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send(postBody);

    logger.info({ message: 'RLS POST response', status: res.status, body: res.body });
    expect(res.status).toBe(201);

    eventId = res.body.event.id;  
    logger.info({ message: 'RLS Event ID', eventId });
    // (optional) keep returned body for deeper comparisons
  });


  it('403 when non-owner updates event', async () => {
    const outsiderJwt = await outsiderToken();

    // outsider tries patch
    const res = await request(app)
      .put(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${outsiderJwt}`)
      .send(postBody);

    expect(res.status).toBe(403);
  });

  it('DELETE /events/:id → 204', async () => {
    const res = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('RLS DELETE response', { status: res.status });
    expect(res.status).toBe(204);
  });
  
});



