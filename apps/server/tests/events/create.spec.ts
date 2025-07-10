import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { app, ownerToken, resetEvents } from '../helpers/testUtils';
import logger from '../../src/logger';
import { OpenApiTestHelper } from '../helpers/openApiTestHelper';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';


const apiHelper = new OpenApiTestHelper('../../docs/api-spec.yaml');

describe('Events – full lifecycle', () => {
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
    logger.info({ message: 'POST sample body', postBody });

    // Create one event we’ll use for the rest of the suite
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .send(postBody);

    logger.info({ message: 'POST response', status: res.status, body: res.body });
    expect(res.status).toBe(201);

    eventId = res.body.event.id;  
    logger.info({ message: 'Event ID', eventId });
    // (optional) keep returned body for deeper comparisons
  });

  /* ============= GET ASSERTION ============= */
  it('GET /events/:id → matches schema & data', async () => {
    const res = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('GET response', res.body);
    const returned = res.body.event ?? res.body; // fallback if structure changes
    expect(returned.id).toBe(eventId);


    /* Schema validation */
    const getSchema = apiHelper.getResponseSchema('/events/{eventId}', 'get', '200');
    if (getSchema) {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);                                  // dates, uuid, email …
      const specWithId = { $id: 'openapi', ...apiHelper.apiSpec };
      ajv.addSchema(specWithId);
      const validate = ajv.getSchema('openapi#/components/schemas/EventFull')
                    ?? ajv.compile({ $ref: 'openapi#/components/schemas/EventFull' });
      const valid = validate(res.body);
      expect(valid).toBe(true);
    }

    /* Basic payload sanity */
    expect(res.body.event.title).toBe(postBody.title);
    expect(res.body.event.location.formatted_address).toBe(postBody.location.formatted_address);
  });

  /* ============= DELETE ASSERTION ============= */
  it('DELETE /events/:id → 204', async () => {
    const res = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    logger.info('DELETE response', { status: res.status });
    expect(res.status).toBe(204);

    /* Confirm it’s really gone */
    const followUp = await request(app)
      .get(`/api/v1/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(followUp.status).toBe(404);
  });

  /* ============= CLEAN-UP ============= */
  afterAll(async () => {
    await resetEvents();      // ensure DB clean for next test suite
  });
});
