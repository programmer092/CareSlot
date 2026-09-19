import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { Client } from 'pg';
import {
  databaseName,
  devDatabaseUrl,
  loadServerEnv,
  testDatabaseUrl,
} from './test-database';

export default async function globalSetup(): Promise<void> {
  loadServerEnv();
  const testUrl = testDatabaseUrl();
  const dbName = databaseName(testUrl);

  const admin = new Client({ connectionString: devDatabaseUrl() });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres at ${devDatabaseUrl()} - start it with ` +
        `"docker-compose up -d db" (${(error as Error).message})`,
    );
  }
  const exists = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(dbName)}`);
  }
  await admin.end();

  execFileSync(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: testUrl },
      stdio: 'pipe',
    },
  );
  process.stdout.write(`\ne2e database ready: ${dbName}\n`);
}
