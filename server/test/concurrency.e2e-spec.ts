import { Client } from 'pg';
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

type Session = { user: { id: string }; cookie: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const statuses = (results: { status: number }[]) =>
  results.map((r) => r.status).sort((a, b) => a - b);

describe('Concurrency (e2e)', () => {
  let app: TestApp;
  let prisma: PrismaService;
  let provider: Session;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });
  afterAll(() => app.close());
  beforeEach(async () => {
    await resetDatabase(prisma);
    provider = await signIn(app, prisma, 'PROVIDER');
  });

  it('double-booking: of 8 clients booking the same slot at once, exactly one succeeds', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const clients: Session[] = [];
    for (let i = 0; i < 8; i++)
      clients.push(await signIn(app, prisma, 'CLIENT'));

    const results = await Promise.all(
      clients.map((c) => book(app, c.cookie, [slot.id])),
    );

    expect(statuses(results)).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    for (const r of results.filter((r) => r.status === 409)) {
      expect(r.body.error).toBe('A requested slot is already booked');
    }
    const rows = await prisma.booking.findMany({ where: { slotId: slot.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('CONFIRMED');
    expect(rows[0].clientId).toBe(
      clients[results.findIndex((r) => r.status === 201)].user.id,
    );
  });

  it('a provider cannot move a slot while a client booking on it is in flight', async () => {
    const slot = await createSlot(prisma, provider.user.id, 24);
    const client = await signIn(app, prisma, 'CLIENT');

    const inFlight = new Client({ connectionString: process.env.DATABASE_URL });
    await inFlight.connect();
    await inFlight.query('BEGIN');
    await inFlight.query('SELECT id FROM slots WHERE id = $1 FOR SHARE', [
      slot.id,
    ]);
    await inFlight.query(
      `INSERT INTO bookings (id, slot_id, client_id, updated_at)
       VALUES (gen_random_uuid(), $1, $2, now())`,
      [slot.id, client.user.id],
    );

    const moved = slotWindow(48);
    const patch = api(app)
      .patch(`/api/providers/me/slots/${slot.id}`)
      .set('Cookie', provider.cookie)
      .send(moved);
    const pending = Symbol('pending');
    expect(await Promise.race([patch, sleep(300).then(() => pending)])).toBe(
      pending,
    );

    await inFlight.query('COMMIT');
    await inFlight.end();

    const res = await patch;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Slot has a confirmed booking');

    const stored = await prisma.slot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(stored.startAt).toEqual(slot.startAt);
    expect(
      await prisma.booking.count({
        where: { slotId: slot.id, status: 'CONFIRMED' },
      }),
    ).toBe(1);
  });

  it('deleting a slot and booking it at the same time never both succeed', async () => {
    const client = await signIn(app, prisma, 'CLIENT');

    for (let round = 0; round < 5; round++) {
      const slot = await createSlot(prisma, provider.user.id, 24 + round);
      const [del, bk] = await Promise.all([
        api(app)
          .delete(`/api/providers/me/slots/${slot.id}`)
          .set('Cookie', provider.cookie),
        book(app, client.cookie, [slot.id]),
      ]);

      const remaining = await prisma.slot.findUnique({
        where: { id: slot.id },
      });
      const bookings = await prisma.booking.count({
        where: { slotId: slot.id },
      });
      if (del.status === 204) {
        expect(bk.status).toBe(404);
        expect(remaining).toBeNull();
        expect(bookings).toBe(0);
      } else {
        expect(bk.status).toBe(201);
        expect(del.status).toBe(409);
        expect(remaining).not.toBeNull();
        expect(bookings).toBe(1);
      }
    }
  });

  it('simultaneous cancels of the same booking: exactly one 200, the rest 409', async () => {
    const client = await signIn(app, prisma, 'CLIENT');
    const slot = await createSlot(prisma, provider.user.id, 24);
    const booking = (await book(app, client.cookie, [slot.id]).expect(201)).body
      .data[0];

    const results = await Promise.all(
      Array.from({ length: 6 }, () => cancel(app, client.cookie, booking.id)),
    );

    expect(statuses(results)).toEqual([200, 409, 409, 409, 409, 409]);
    for (const r of results.filter((r) => r.status === 409)) {
      expect(r.body.error).toBe('Booking is already cancelled');
    }
    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(stored.status).toBe('CANCELLED');
    expect(stored.cancelledAt?.toISOString()).toBe(
      results.find((r) => r.status === 200)!.body.data.cancelledAt,
    );
  });

  it('overlapping slots created at once: the exclusion constraint lets only one through', async () => {
    const window = slotWindow(24);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api(app)
          .post('/api/providers/me/slots')
          .set('Cookie', provider.cookie)
          .send(window),
      ),
    );

    expect(statuses(results)).toEqual([201, 409, 409, 409, 409]);
    expect(await prisma.slot.count()).toBe(1);
  });
});
