import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Role, User } from '../../src/generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';

export type TestApp = INestApplication<App>;

export const PASSWORD = '123password';

const HOUR_MS = 60 * 60 * 1000;
let passwordHash: string | undefined;
let userCounter = 0;

export async function createTestApp(): Promise<{
  app: TestApp;
  prisma: PrismaService;
}> {
  Logger.overrideLogger(false);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE bookings, slots, users RESTART IDENTITY CASCADE',
  );
}

export function api(app: TestApp) {
  return request(app.getHttpServer());
}

export async function createUser(
  prisma: PrismaService,
  role: Role,
  name?: string,
): Promise<User> {
  passwordHash ??= await argon2.hash(PASSWORD);
  userCounter += 1;
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}${userCounter}@test.dev`,
      name: name ?? `${role} ${userCounter}`,
      role,
      password: passwordHash,
    },
  });
}

export function cookieFrom(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | string;
  const cookies = Array.isArray(raw) ? raw : [raw];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

export async function login(app: TestApp, user: User): Promise<string> {
  const res = await api(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  return cookieFrom(res);
}

export async function signIn(
  app: TestApp,
  prisma: PrismaService,
  role: Role,
  name?: string,
): Promise<{ user: User; cookie: string }> {
  const user = await createUser(prisma, role, name);
  return { user, cookie: await login(app, user) };
}

export function slotWindow(hoursFromNow: number, minutes = 60) {
  const start = new Date(Date.now() + hoursFromNow * HOUR_MS);
  start.setUTCSeconds(0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function createSlot(
  prisma: PrismaService,
  providerId: string,
  hoursFromNow: number,
  minutes = 60,
) {
  const { startAt, endAt } = slotWindow(hoursFromNow, minutes);
  return prisma.slot.create({ data: { providerId, startAt, endAt } });
}

export function book(app: TestApp, cookie: string, slotIds: string[]) {
  return api(app).post('/api/bookings').set('Cookie', cookie).send({ slotIds });
}

export function cancel(app: TestApp, cookie: string, bookingId: string) {
  return api(app)
    .patch(`/api/bookings/${bookingId}/cancel`)
    .set('Cookie', cookie);
}
