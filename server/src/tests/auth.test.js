const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await User.deleteMany();
});

describe('Auth Endpoints', () => {
    const testUser = { name: 'Test User', email: 'test@example.com', password: 'Test@12345' };

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app).post('/api/v1/auth/register').send(testUser);
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(testUser.email);
            expect(res.body.data.accessToken).toBeDefined();
            expect(res.body.data.refreshToken).toBeDefined();
        });

        it('should not register with duplicate email', async () => {
            await request(app).post('/api/v1/auth/register').send(testUser);
            const res = await request(app).post('/api/v1/auth/register').send(testUser);
            expect(res.status).toBe(409);
        });

        it('should validate password strength', async () => {
            const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, password: 'weak' });
            expect(res.status).toBe(400);
        });

        it('should validate email format', async () => {
            const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, email: 'invalid' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/v1/auth/register').send(testUser);
        });

        it('should login with valid credentials', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBeDefined();
        });

        it('should reject invalid password', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: 'wrong' });
            expect(res.status).toBe(401);
        });

        it('should reject non-existent email', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({ email: 'none@example.com', password: 'Test@12345' });
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return user profile when authenticated', async () => {
            const reg = await request(app).post('/api/v1/auth/register').send(testUser);
            const token = reg.body.data.accessToken;
            const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data.user.email).toBe(testUser.email);
        });

        it('should reject unauthenticated requests', async () => {
            const res = await request(app).get('/api/v1/auth/me');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should issue new tokens with valid refresh token', async () => {
            const reg = await request(app).post('/api/v1/auth/register').send(testUser);
            const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken: reg.body.data.refreshToken });
            expect(res.status).toBe(200);
            expect(res.body.data.accessToken).toBeDefined();
        });
    });
});

describe('Health Check', () => {
    it('GET /health should return status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('healthy');
    });
});
