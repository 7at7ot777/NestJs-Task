import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const user = { email: 'john@example.com', password: 'Password123' };
  const admin = { email: 'admin@example.com', password: 'Password123', role: 'admin' };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  const login = async (creds: { email: string; password: string }) => {
    const res = await server()
      .post('/auth/login')
      .send({ email: creds.email, password: creds.password })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  };

  it('GET /health is public', async () => {
    const res = await server().get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('signup returns the user without the password', async () => {
    const res = await server().post('/auth/signup').send(user).expect(201);
    expect(res.body).toMatchObject({ email: user.email, role: 'user' });
    expect(res.body.id).toBeDefined();
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('signup rejects a duplicate email', async () => {
    await server().post('/auth/signup').send(user).expect(409);
  });

  it('signup validates input', async () => {
    const res = await server()
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
  });

  it('login rejects wrong password with the consistent error shape', async () => {
    const res = await server()
      .post('/auth/login')
      .send({ ...user, password: 'WrongPassword' })
      .expect(401);
    expect(res.body).toMatchObject({ success: false, statusCode: 401, message: 'Invalid credentials' });
  });

  it('profile requires a token', async () => {
    const res = await server().get('/auth/profile').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('profile returns the token payload', async () => {
    const { accessToken } = await login(user);
    const res = await server()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ email: user.email, role: 'user' });
    expect(res.body.userId).toBeDefined();
  });

  it('admin route: 403 for user, 200 for admin', async () => {
    const { accessToken: userToken } = await login(user);
    await server().get('/auth/admin').set('Authorization', `Bearer ${userToken}`).expect(403);

    await server().post('/auth/signup').send(admin).expect(201);
    const { accessToken: adminToken } = await login(admin);
    await server().get('/auth/admin').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });

  it('refresh issues a new pair and rejects an access token', async () => {
    const { accessToken, refreshToken } = await login(user);

    const res = await server().post('/auth/refresh').send({ refreshToken }).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    await server().post('/auth/refresh').send({ refreshToken: accessToken }).expect(401);
  });
});
