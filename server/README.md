# CareSlot API (`server/`)

NestJS 11 + Prisma 7 + PostgreSQL 17. The full documentation (architecture,
database constraints, booking logic, API reference, tests) lives in the
[root README](../README.md); this file only lists the commands that are run
from inside `server/`.

```bash
pnpm start:dev              # API with hot reload on http://localhost:3000/api
pnpm build && pnpm start:prod

pnpm test                   # unit tests (src/**/*.spec.ts)
pnpm test:e2e               # API tests against a real Postgres (test/**/*.e2e-spec.ts)
pnpm test:all               # both

pnpm lint                   # eslint --fix
pnpm lint:check             # eslint, no changes (used to verify)
pnpm format                 # prettier --write
pnpm format:check

pnpm prisma:generate        # regenerate src/generated/prisma (git-ignored)
pnpm prisma:migrate         # create/apply a migration in development
pnpm prisma:migrate:deploy  # apply pending migrations only
pnpm prisma:migrate:status
pnpm prisma:seed
pnpm prisma:reset           # drop, re-migrate, re-seed
pnpm prisma:studio
```

Layout:

```
prisma/               schema, migrations (hand-edited SQL for the constraints), seed
prisma.config.ts      datasource URL + seed command (Prisma 7 config file)
src/
  app.setup.ts        global prefix, CORS, cookies, validation - shared with the tests
  main.ts             bootstrap + Swagger
  auth/               register/login/logout/me, JWT cookie, global guards
  users/              user lookups
  slots/              provider availability (/providers/...)
  bookings/           booking and cancellation (/bookings/...)
  prisma/             PrismaService + Prisma-error -> HTTP mapping
  shared/             response envelope, exception filter, pagination, logger
test/
  setup/              test database URL, creation and migration
  helpers/            app factory, sign-in and fixture helpers
  *.e2e-spec.ts       API tests
```
