import * as dotenv from 'dotenv';
import * as path from 'node:path';

export const DEFAULT_DATABASE_URL =
  'postgresql://careslot:careslot@localhost:5433/careslot?schema=public';

export function loadServerEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
}

export function devDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function testDatabaseUrl(): string {
  const url = new URL(process.env.TEST_DATABASE_URL ?? devDatabaseUrl());
  if (!process.env.TEST_DATABASE_URL) {
    url.pathname = `${url.pathname.replace(/\/$/, '')}_test`;
  }
  if (url.toString() === new URL(devDatabaseUrl()).toString()) {
    throw new Error(
      'Refusing to run e2e tests against the development database ' +
        '(TEST_DATABASE_URL must differ from DATABASE_URL)',
    );
  }
  return url.toString();
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}
