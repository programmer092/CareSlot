import { PrismaService } from '../src/prisma/prisma.service';
import {
  api,
  book,
  cancel,
  createSlot,
  createTestApp,
  resetDatabase,
  signIn,
  slotWindow,
  TestApp,
} from './helpers/app';

describe('Permissions (e2e)', () => {
  let app: TestApp;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(() => app.close());
  beforeEach(() => resetDatabase(prisma));

  it('a CLIENT cannot publish, edit or delete slots (403)', async () => {
    const { cookie } = await signIn(app, prisma, 'CLIENT');
    const provider = await signIn(app, prisma, 'PROVIDER');
    const slot = await createSlot(prisma, provider.user.id, 24);

    const res = await api(app)
      .post('/api/providers/me/slots')
      .set('Cookie', cookie)
      .send(slotWindow(48))
      .expect(403);
    expect(res.body.error).toBe('This action requires role: PROVIDER');

    await api(app)
      .patch(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', cookie)
      .send(slotWindow(48))
      .expect(403);
    await api(app)
      .delete(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', cookie)
      .expect(403);
    await api(app)
      .get('/api/providers/me/slots')
      .set('Cookie', cookie)
      .expect(403);
    await api(app)
      .get('/api/providers/me/bookings')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('a PROVIDER cannot book or list client bookings (403)', async () => {
    const provider = await signIn(app, prisma, 'PROVIDER');
    const slot = await createSlot(prisma, provider.user.id, 24);

    const res = await book(app, provider.cookie, [slot.id]).expect(403);
    expect(res.body.error).toBe('This action requires role: CLIENT');
    await api(app)
      .get('/api/bookings/me')
      .set('Cookie', provider.cookie)
      .expect(403);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("a provider cannot edit or delete another provider's slot (403)", async () => {
    const owner = await signIn(app, prisma, 'PROVIDER');
    const other = await signIn(app, prisma, 'PROVIDER');
    const slot = await createSlot(prisma, owner.user.id, 24);

    const res = await api(app)
      .patch(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', other.cookie)
      .send(slotWindow(48))
      .expect(403);
    expect(res.body.error).toBe('You can only manage your own slots');

    await api(app)
      .delete(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', other.cookie)
      .expect(403);
    expect(
      await prisma.slot.findUnique({ where: { id: slot.id } }),
    ).not.toBeNull();
  });

  it("a client cannot cancel another client's booking (403)", async () => {
    const provider = await signIn(app, prisma, 'PROVIDER');
    const alice = await signIn(app, prisma, 'CLIENT');
    const bob = await signIn(app, prisma, 'CLIENT');
    const slot = await createSlot(prisma, provider.user.id, 24);
    const booking = (await book(app, alice.cookie, [slot.id]).expect(201)).body
      .data[0];

    const res = await cancel(app, bob.cookie, booking.id).expect(403);
    expect(res.body.error).toBe('You can only cancel your own bookings');

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(stored.status).toBe('CONFIRMED');
  });

  it('provider discovery needs a session but works for either role', async () => {
    const provider = await signIn(app, prisma, 'PROVIDER', 'Dr Zed');
    const client = await signIn(app, prisma, 'CLIENT');
    await createSlot(prisma, provider.user.id, 24);

    await api(app).get('/api/providers').expect(401);

    for (const cookie of [client.cookie, provider.cookie]) {
      const list = await api(app)
        .get('/api/providers')
        .set('Cookie', cookie)
        .expect(200);
      expect(list.body.data).toEqual([
        { id: provider.user.id, name: 'Dr Zed', email: provider.user.email },
      ]);
      const slots = await api(app)
        .get(`/api/providers/${provider.user.id}/slots`)
        .set('Cookie', cookie)
        .expect(200);
      expect(slots.body.data).toHaveLength(1);
    }
  });
});
