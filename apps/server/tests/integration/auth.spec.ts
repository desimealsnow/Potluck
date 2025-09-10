import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { TestDbHelper, testSupabase } from '../setup';
import { faker } from '@faker-js/faker';

const app = getTestApp();

describe('Auth API Integration Tests', () => {
  
  beforeEach(async () => {
    await TestDbHelper.cleanupAll();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register new user with valid credentials', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'securePassword123!',
        displayName: faker.person.fullName()
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      // Verify response doesn't expose sensitive data
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).toMatchObject({
        user: expect.objectContaining({
          email: userData.email,
          // Should not include password or sensitive fields
        })
      });
    });

    it('should reject signup with weak password', async () => {
      const userData = {
        email: faker.internet.email(),
        password: '123', // Too weak
        displayName: faker.person.fullName()
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('password'),
        code: '400'
      });
    });

    it('should reject signup with invalid email', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'securePassword123!',
        displayName: faker.person.fullName()
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('email'),
        code: '400'
      });
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: faker.internet.email(),
        password: 'securePassword123!',
        displayName: faker.person.fullName()
      };

      // First registration should succeed
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('exists'),
        code: '409'
      });
    });

    it('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: faker.internet.email()
          // Missing password and displayName
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('required'),
        code: '400'
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: { email: string; password: string };

    beforeEach(async () => {
      // Create test user for login tests
      testUser = {
        email: faker.internet.email(),
        password: 'securePassword123!'
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testUser.email,
          password: testUser.password,
          displayName: faker.person.fullName()
        });
    });

    it('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: expect.objectContaining({
          email: testUser.email
        }),
        session: expect.objectContaining({
          access_token: expect.any(String),
          expires_in: expect.any(Number)
        })
      });

      // Verify token format
      expect(response.body.session.access_token).toMatch(/^ey/); // JWT starts with 'ey'
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Invalid'),
        code: '401'
      });
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anyPassword'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Invalid'),
        code: '401'
      });
    });

    it('should require email and password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('required'),
        code: '400'
      });
    });

    it('should handle malformed email gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'anyPassword'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('email'),
        code: '400'
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: faker.internet.email(),
        password: 'securePassword123!',
        displayName: faker.person.fullName()
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.session.access_token;
    });

    it('should logout authenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('logged out')
      });
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Unauthorized'),
        code: '401'
      });
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Invalid'),
        code: '401'
      });
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        code: '401'
      });
    });
  });

  describe('Authentication Middleware Integration', () => {
    let authToken: string;

    beforeEach(async () => {
      // Setup authenticated user
      const userData = {
        email: faker.internet.email(),
        password: 'securePassword123!',
        displayName: faker.person.fullName()
      };

      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      authToken = loginResponse.body.session.access_token;
    });

    it('should allow access to protected routes with valid token', async () => {
      // Try accessing protected events endpoint
      await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should not be 401/403
    });

    it('should deny access to protected routes without token', async () => {
      await request(app)
        .get('/api/v1/events')
        .expect(401);
    });

    it('should deny access with expired/invalid token', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });

  afterAll(async () => {
    await TestDbHelper.cleanupAll();
  });
});
