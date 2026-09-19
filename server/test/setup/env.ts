import { loadServerEnv, testDatabaseUrl } from './test-database';

loadServerEnv();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET ??= 'e2e-only-secret';
process.env.JWT_EXPIRES_IN_SECONDS ??= '3600';
process.env.CORS_ORIGINS ??= '';
