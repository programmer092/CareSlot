import { PrismaService } from '../src/prisma/prisma.service';
import {
  api,
  book,
  createSlot,
  createTestApp,
  resetDatabase,
  signIn,
  slotWindow,
  TestApp,
} from './helpers/app';

describe('Provider slots & validation', () => {
  let app: TestApp;
  let prisma: PrismaService;
  let provider: { user: { id: string }; cookie: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDatabase(prisma);
    provider = await signIn(app, prisma, 'PROVIDER');
  });

  const createViaApi = (body: object) =>
    api(app)
      .post('/api/providers/me/slots')
      .set('Cookie', provider.cookie)
      .send(body);

  it('publishes a 30-60 minute slot in the future', async () => {
    const window = slotWindow(24, 45);
    const res = await createViaApi(window).expect(201);

    expect(res.body.data).toMatchObject({
      providerId: provider.user.id,
      startAt: window.startAt,
      endAt: window.endAt,
    });
    expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    [
      'end before start',
      { ...slotWindow(24), endAt: slotWindow(23).startAt },
      'startAt must be before endAt',
    ],
    [
      'too short (20 min)',
      slotWindow(24, 20),
      'Slot length must be between 30 and 60 minutes',
    ],
    [
      'too long (90 min)',
      slotWindow(24, 90),
      'Slot length must be between 30 and 60 minutes',
    ],
    ['in the past', slotWindow(-2), 'Slot must start in the future'],
    [
      'no timezone',
      { startAt: '2030-01-01T09:00:00', endAt: '2030-01-01T10:00:00' },
      'must be ISO 8601 with a timezone',
    ],
    [
      'not a date',
      { startAt: 'tomorrow', endAt: 'later' },
      'startAt must be a valid ISO 8601 date string',
    ],
    [
      'missing field',
      { startAt: slotWindow(24).startAt },
      'endAt must be a valid ISO 8601 date string',
    ],
    [
      'unknown field',
      { ...slotWindow(24), price: 10 },
      'property price should not exist',
    ],
  ])('rejects an invalid window: %s (400)', async (_label, body, message) => {
    const res = await createViaApi(body).expect(400);
    expect(res.body.error).toContain(message);
    expect(await prisma.slot.count()).toBe(0);
  });

  it('rejects an overlapping slot with 409, and the database enforces it even if the service is bypassed', async () => {
    await createViaApi(slotWindow(24, 60)).expect(201);

    const res = await createViaApi(slotWindow(24.5, 60)).expect(409);
    expect(res.body.error).toMatch(/^Overlaps your existing slot/);

    await expect(
      createSlot(prisma, provider.user.id, 24.5, 60),
    ).rejects.toThrow(/slots_no_overlap_per_provider/);

    const other = await signIn(app, prisma, 'PROVIDER');
    await api(app)
      .post('/api/providers/me/slots')
      .set('Cookie', other.cookie)
      .send(slotWindow(24, 60))
      .expect(201);
  });

  it('the database rejects a slot whose end is before its start (CHECK constraint)', async () => {
    const { startAt, endAt } = slotWindow(24);
    await expect(
      prisma.slot.create({
        data: { providerId: provider.user.id, startAt: endAt, endAt: startAt },
      }),
    ).rejects.toThrow(/slots_start_before_end_check/);
  });

  it('a provider can move and delete an unbooked slot', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const moved = slotWindow(48, 30);

    const res = await api(app)
      .patch(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', provider.cookie)
      .send(moved)
      .expect(200);
    expect(res.body.data).toMatchObject({ id: slot.id, ...moved });

    await api(app)
      .delete(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', provider.cookie)
      .expect(204);
    expect(await prisma.slot.findUnique({ where: { id: slot.id } })).toBeNull();

    await api(app)
      .delete(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', provider.cookie)
      .expect(404);
  });

  it('a booked slot cannot be moved or deleted (409) and a past one cannot be changed (400)', async () => {
    const client = await signIn(app, prisma, 'CLIENT');
    const booked = await createSlot(prisma, provider.user.id, 24);
    await book(app, client.cookie, [booked.id]).expect(201);

    const patch = await api(app)
      .patch(`/api/providers/me/slots/${booked.id}`)
      .set('Cookie', provider.cookie)
      .send(slotWindow(48))
      .expect(409);
    expect(patch.body.error).toBe('Slot has a confirmed booking');
    await api(app)
      .delete(`/api/providers/me/slots/${booked.id}`)
      .set('Cookie', provider.cookie)
      .expect(409);

    const past = await createSlot(prisma, provider.user.id, -3);
    const res = await api(app)
      .delete(`/api/providers/me/slots/${past.id}`)
      .set('Cookie', provider.cookie)
      .expect(400);
    expect(res.body.error).toBe('Past slots cannot be changed');
    expect(await prisma.slot.count()).toBe(2);
  });

  it('clients only see future, unbooked slots; the provider sees all of theirs with the booker', async () => {
    const client = await signIn(app, prisma, 'CLIENT', 'Booker Bob');
    const past = await createSlot(prisma, provider.user.id, -3);
    const free = await createSlot(prisma, provider.user.id, 24);
    const taken = await createSlot(prisma, provider.user.id, 26);
    await book(app, client.cookie, [taken.id]).expect(201);

    const available = await api(app)
      .get(`/api/providers/${provider.user.id}/slots`)
      .set('Cookie', client.cookie)
      .expect(200);
    expect(available.body.data.map((s: { id: string }) => s.id)).toEqual([
      free.id,
    ]);
    expect(available.body.meta_data).toEqual({
      page: 1,
      page_size: 25,
      hasNext: false,
      hasPrevious: false,
    });

    const from = new Date(Date.now() - 24 * 3600_000).toISOString();
    const mine = await api(app)
      .get(`/api/providers/me/slots?from=${from}`)
      .set('Cookie', provider.cookie)
      .expect(200);
    expect(mine.body.data.map((s: { id: string }) => s.id)).toEqual([
      past.id,
      free.id,
      taken.id,
    ]);
    expect(mine.body.data[1].booking).toBeNull();
    expect(mine.body.data[2].booking.client.name).toBe('Booker Bob');
  });

  it('paginates and validates query parameters', async () => {
    for (let h = 24; h < 30; h++) await createSlot(prisma, provider.user.id, h);

    const page1 = await api(app)
      .get(`/api/providers/${provider.user.id}/slots?page=1&page_size=4`)
      .set('Cookie', provider.cookie)
      .expect(200);
    expect(page1.body.data).toHaveLength(4);
    expect(page1.body.meta_data).toMatchObject({
      hasNext: true,
      hasPrevious: false,
    });

    const page2 = await api(app)
      .get(`/api/providers/${provider.user.id}/slots?page=2&page_size=4`)
      .set('Cookie', provider.cookie)
      .expect(200);
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.meta_data).toMatchObject({
      hasNext: false,
      hasPrevious: true,
    });

    await api(app)
      .get(`/api/providers/${provider.user.id}/slots?page_size=500`)
      .set('Cookie', provider.cookie)
      .expect(400);
    await api(app)
      .get('/api/providers/not-a-uuid/slots')
      .set('Cookie', provider.cookie)
      .expect(400);
    await api(app)
      .get('/api/providers/00000000-0000-4000-8000-000000000000/slots')
      .set('Cookie', provider.cookie)
      .expect(404);
  });
});
