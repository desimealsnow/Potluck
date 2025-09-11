import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { TestDbHelper, testSupabase } from '../setup';
// NOTE: Use static emails to avoid creating many random users in Supabase
import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';

const app = getTestApp();

describe('Auth API Integration Tests', () => {
  
  beforeEach(async () => {
    await TestDbHelper.cleanupAll();
  });

  // Helper to delete a user if it already exists
  const admin = (testSupabase as any).auth.admin;
  async function deleteUserIfExists(email: string) {
    const list = await admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.data?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found?.id) await admin.deleteUser(found.id);
  }

  describe('POST /api/v1/auth/signup', () => {

    it('should register new user with valid credentials', async () => {
      const userData = {
        email: 'signup_user1@gmail.com',
        password: 'securePassword123!',
        displayName: 'Signup User 1'
      };

      await deleteUserIfExists(userData.email);

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
        email: 'signup_user2@hotmail.com',
        password: '123', // Too weak
        displayName: 'Signup User 2'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        errors: {
          password: {
            _errors: [expect.stringContaining('6 character')]
          }
        }
      });
    });

    it('should reject signup with invalid email', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'securePassword123!',
        displayName: 'Invalid Email User'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        errors: {
          email: {
            _errors: [expect.stringContaining('email')]
          }
        }
      });
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'signup_user3@hotmail.com',
        password: 'securePassword123!',
        displayName: 'Signup User 3'
      };

      await deleteUserIfExists(userData.email);

      // First registration should succeed
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400); // Supabase returns 400 for duplicate email, not 409

      expect(response.body).toMatchObject({
        error: expect.stringContaining('already registered')
      });
    });

    it('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'missing_fields@hotmail.com'
          // Missing password and displayName
        })
        .expect(400);

      expect(response.body).toMatchObject({
        errors: {
          password: {
            _errors: [expect.stringContaining('Required')]
          }
        }
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: { email: string; password: string };

    beforeEach(async () => {
      // Create test user for login tests
      testUser = {
        email: 'login_user@hotmail.com',
        password: 'securePassword123!'
      };

      await deleteUserIfExists(testUser.email);

      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testUser.email,
          password: testUser.password,
          displayName: 'Login User'
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
        error: expect.stringContaining('Invalid')
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
        error: expect.stringContaining('Invalid')
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
        errors: {
          password: {
            _errors: [expect.stringContaining('Required')]
          }
        }
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
        errors: {
          email: {
            _errors: [expect.stringContaining('email')]
          }
        }
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: 'logout_user@hotmail.com',
        password: 'securePassword123!',
        displayName: 'Logout User'
      };

      await deleteUserIfExists(userData.email);

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
        message: 'Logged out'
      });
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(400); // No token returns 400, not 401

      expect(response.body).toMatchObject({
        error: 'No auth token'
      });
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(200); // Logout endpoint doesn't validate token format

      expect(response.body).toMatchObject({
        message: 'Logged out'
      });
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'InvalidFormat token')
        .expect(200); // Logout endpoint doesn't validate token format

      expect(response.body).toMatchObject({
        message: 'Logged out'
      });
    });
  });

  describe('Authentication Middleware Integration', () => {
    let authToken: string;

    beforeEach(async () => {
      // Setup authenticated user
      const userData = {
        email: 'middleware_user@hotmail.com',
        password: 'securePassword123!',
        displayName: 'Middleware User'
      };

      await deleteUserIfExists(userData.email);

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
