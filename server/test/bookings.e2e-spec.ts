import { PrismaService } from '../src/prisma/prisma.service';
import {
  api,
  book,
  cancel,
  createSlot,
  createTestApp,
  resetDatabase,
  signIn,
  TestApp,
} from './helpers/app';

type Session = { user: { id: string; email: string }; cookie: string };

describe('Booking & cancellation (e2e)', () => {
  let app: TestApp;
  let prisma: PrismaService;
  let provider: Session;
  let client: Session;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDatabase(prisma);
    provider = await signIn(app, prisma, 'PROVIDER', 'Dr Who');
    client = await signIn(app, prisma, 'CLIENT', 'Clara');
  });

  it('a client books a free slot; it leaves the available list and both parties see it', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);

    const res = await book(app, client.cookie, [slot.id]).expect(201);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      slotId: slot.id,
      clientId: client.user.id,
      status: 'CONFIRMED',
      cancelledAt: null,
      slot: { id: slot.id, provider: { id: provider.user.id, name: 'Dr Who' } },
    });

    const available = await api(app)
      .get(`/api/providers/${provider.user.id}/slots`)
      .set('Cookie', client.cookie)
      .expect(200);
    expect(available.body.data).toEqual([]);

    const mine = await api(app)
      .get('/api/bookings/me')
      .set('Cookie', client.cookie)
      .expect(200);
    expect(mine.body.data.map((b: { slotId: string }) => b.slotId)).toEqual([
      slot.id,
    ]);

    const theirs = await api(app)
      .get('/api/providers/me/bookings?search=cla')
      .set('Cookie', provider.cookie)
      .expect(200);
    expect(theirs.body.data).toHaveLength(1);
    expect(theirs.body.data[0].client).toEqual({
      id: client.user.id,
      name: 'Clara',
      email: client.user.email,
    });
  });

  it('a slot can be booked only once: the second client gets 409', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const other = await signIn(app, prisma, 'CLIENT');
    await book(app, client.cookie, [slot.id]).expect(201);

    const res = await book(app, other.cookie, [slot.id]).expect(409);
    expect(res.body.error).toBe('A requested slot is already booked');
    await book(app, client.cookie, [slot.id]).expect(409);

    expect(await prisma.booking.count({ where: { slotId: slot.id } })).toBe(1);
  });

  it('books consecutive slots as one session, all or nothing', async () => {
    const first = await createSlot(prisma, provider.user.id, 24);
    const second = await createSlot(prisma, provider.user.id, 25);
    const third = await createSlot(prisma, provider.user.id, 26);
    const other = await signIn(app, prisma, 'CLIENT');
    await book(app, other.cookie, [third.id]).expect(201);

    const ok = await book(app, client.cookie, [second.id, first.id]).expect(
      201,
    );
    expect(ok.body.data.map((b: { slotId: string }) => b.slotId)).toEqual([
      first.id,
      second.id,
    ]);

    const fourth = await createSlot(prisma, provider.user.id, 27);
    await book(app, client.cookie, [third.id, fourth.id]).expect(409);
    expect(await prisma.booking.count({ where: { slotId: fourth.id } })).toBe(
      0,
    );
  });

  it('rejects past, unknown, non-consecutive and mixed-provider slots', async () => {
    const past = await createSlot(prisma, provider.user.id, -2);
    const a = await createSlot(prisma, provider.user.id, 24);
    const c = await createSlot(prisma, provider.user.id, 26);
    const otherProvider = await signIn(app, prisma, 'PROVIDER');
    const b = await createSlot(prisma, otherProvider.user.id, 25);

    const pastRes = await book(app, client.cookie, [past.id]).expect(400);
    expect(pastRes.body.error).toBe('Cannot book a slot in the past');

    const missing = await book(app, client.cookie, [
      '00000000-0000-4000-8000-000000000000',
    ]).expect(404);
    expect(missing.body.error).toBe('One or more slots not found');

    const gap = await book(app, client.cookie, [a.id, c.id]).expect(400);
    expect(gap.body.error).toBe('Slots must be consecutive');

    const mixed = await book(app, client.cookie, [a.id, b.id]).expect(400);
    expect(mixed.body.error).toBe('All slots must belong to the same provider');

    await book(app, client.cookie, []).expect(400);
    await book(app, client.cookie, ['nope']).expect(400);
    await book(app, client.cookie, [a.id, a.id]).expect(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('cancelling keeps the history, frees the slot and lets another client rebook it', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const booking = (await book(app, client.cookie, [slot.id]).expect(201)).body
      .data[0];

    const res = await cancel(app, client.cookie, booking.id).expect(200);
    expect(res.body.data).toMatchObject({
      id: booking.id,
      status: 'CANCELLED',
    });
    expect(new Date(res.body.data.cancelledAt).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );

    const available = await api(app)
      .get(`/api/providers/${provider.user.id}/slots`)
      .set('Cookie', client.cookie)
      .expect(200);
    expect(available.body.data.map((s: { id: string }) => s.id)).toEqual([
      slot.id,
    ]);

    const other = await signIn(app, prisma, 'CLIENT');
    const rebooked = (await book(app, other.cookie, [slot.id]).expect(201)).body
      .data[0];
    expect(rebooked.id).not.toBe(booking.id);

    const rows = await prisma.booking.findMany({
      where: { slotId: slot.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows.map((r) => r.status)).toEqual(['CANCELLED', 'CONFIRMED']);

    const history = await api(app)
      .get('/api/providers/me/bookings')
      .set('Cookie', provider.cookie)
      .expect(200);
    expect(
      history.body.data.map((b: { status: string }) => b.status).sort(),
    ).toEqual(['CANCELLED', 'CONFIRMED']);
  });

  it('a duplicate cancellation is answered with 409 and changes nothing', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const booking = (await book(app, client.cookie, [slot.id]).expect(201)).body
      .data[0];
    const first = await cancel(app, client.cookie, booking.id).expect(200);

    const again = await cancel(app, client.cookie, booking.id).expect(409);
    expect(again.body.error).toBe('Booking is already cancelled');

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(stored.cancelledAt?.toISOString()).toBe(first.body.data.cancelledAt);

    await cancel(
      app,
      client.cookie,
      '00000000-0000-4000-8000-000000000000',
    ).expect(404);
    await cancel(app, client.cookie, 'not-a-uuid').expect(400);
  });

  it('a booking whose slot already started cannot be cancelled (400)', async () => {
    const past = await createSlot(prisma, provider.user.id, -1);
    const booking = await prisma.booking.create({
      data: { slotId: past.id, clientId: client.user.id },
    });

    const res = await cancel(app, client.cookie, booking.id).expect(400);
    expect(res.body.error).toBe('Past bookings cannot be cancelled');
  });
});
