import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node -r ts-node/register/transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
