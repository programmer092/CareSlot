import { PrismaService } from '../src/prisma/prisma.service';
import {
  api,
  cookieFrom,
  createTestApp,
  PASSWORD,
  resetDatabase,
  signIn,
  TestApp,
} from './helpers/app';

describe('Authentication (e2e)', () => {
  let app: TestApp;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(() => app.close());
  beforeEach(() => resetDatabase(prisma));

  it('registers a CLIENT, sets an httpOnly session cookie and never returns the password hash', async () => {
    const res = await api(app)
      .post('/api/auth/register')
      .send({
        email: 'alice@Example.com ',
        password: PASSWORD,
        name: ' Alice ',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      success: true,
      error: null,
      data: {
        user: { email: 'alice@example.com', name: 'Alice', role: 'CLIENT' },
      },
    });
    expect(res.body.data.user).not.toHaveProperty('password');

    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/^access_token=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);

    const me = await api(app)
      .get('/api/auth/me')
      .set('Cookie', cookieFrom(res))
      .expect(200);
    expect(me.body.data.email).toBe('alice@example.com');
  });

  it('rejects a duplicate email with 409 (users_email_key)', async () => {
    const payload = { email: 'dup@test.dev', password: PASSWORD, name: 'Dup' };
    await api(app).post('/api/auth/register').send(payload).expect(201);

    const res = await api(app)
      .post('/api/auth/register')
      .send(payload)
      .expect(409);
    expect(res.body).toEqual({
      success: false,
      data: null,
      meta_data: null,
      error: 'Email is already registered',
    });
  });

  it('logs in with valid credentials and answers 401 to a wrong password or unknown email', async () => {
    const { user } = await signIn(app, prisma, 'CLIENT');

    await api(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: PASSWORD })
      .expect(200)
      .expect((res) => expect(res.body.data.user.id).toBe(user.id));

    const wrong = await api(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'not-the-password' })
      .expect(401);
    expect(wrong.body.error).toBe('Invalid email or password');

    const unknown = await api(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.dev', password: PASSWORD })
      .expect(401);
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  it('answers 401 when there is no session or the token is tampered with', async () => {
    const none = await api(app).get('/api/auth/me').expect(401);
    expect(none.body.error).toBe('Authentication required');

    const bad = await api(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.jwt')
      .expect(401);
    expect(bad.body.error).toBe('Invalid or expired token');
  });

  it('accepts the same token as a Bearer header (for non-browser clients)', async () => {
    const { cookie, user } = await signIn(app, prisma, 'CLIENT');
    const token = cookie.replace(/^access_token=/, '');

    const res = await api(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it('logout clears the cookie', async () => {
    const { cookie } = await signIn(app, prisma, 'CLIENT');

    const res = await api(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/^access_token=;/);
  });

  it('validates the registration payload and refuses unknown fields such as role', async () => {
    const invalid = await api(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' })
      .expect(400);
    expect(invalid.body.error).toContain('email must be an email');
    expect(invalid.body.error).toContain(
      'password must be longer than or equal to 8 characters',
    );
    expect(invalid.body.error).toContain('name should not be empty');

    const escalated = await api(app)
      .post('/api/auth/register')
      .send({
        email: 'eve@test.dev',
        password: PASSWORD,
        name: 'Eve',
        role: 'PROVIDER',
      })
      .expect(400);
    expect(escalated.body.error).toContain('property role should not exist');
    expect(await prisma.user.count()).toBe(0);
  });
});
