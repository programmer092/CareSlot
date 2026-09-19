# CareSlot

Appointment booking for care providers and their clients.

- **Providers** publish 30–60 minute availability slots and see who booked them.
- **Clients** browse providers, book a slot (or several back-to-back slots as one session) and cancel.
- A slot can never be double-booked, a provider can never edit or delete a slot underneath a booking, and cancellations are safe to retry — all enforced in PostgreSQL, not just in application code, and covered by API tests that run against a real database.

| | |
| --- | --- |
| Backend | NestJS 11 · TypeScript · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL 17 |
| Frontend | Vite · React 19 · TanStack Query · Tailwind (`client/`) |
| Auth | JWT in an `httpOnly` cookie (Bearer header also accepted), roles `CLIENT` / `PROVIDER` |
| Docs | Swagger UI at `/api/docs` |
| Tests | 8 unit + 39 API tests (Jest + supertest against Postgres) — see [Testing](#testing) |

## Contents

1. [Architecture](#architecture)
2. [Database schema and constraints](#database-schema-and-constraints)
3. [Booking and cancellation logic](#booking-and-cancellation-logic)
4. [Setup](#setup)
5. [Migrations](#migrations)
6. [Seed data](#seed-data)
7. [Running the app](#running-the-app)
8. [API documentation](#api-documentation)
9. [Testing](#testing)

---

## Architecture

### Repository layout

```
CareSlot/
├── docker-compose.yml      Postgres 17 (host port 5433, user/pass/db = careslot)
├── package.json            pnpm workspace: dev / build / test / lint scripts for both packages
├── server/                 NestJS API                       -> server/README.md for per-package commands
│   ├── prisma/             schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── main.ts         bootstrap + Swagger
│   │   ├── app.setup.ts    global prefix, CORS, cookie parser, ValidationPipe (shared with the tests)
│   │   ├── auth/           AuthController/Service, JwtAuthGuard + RolesGuard (registered globally)
│   │   ├── users/          UsersService
│   │   ├── slots/          SlotsController/Service   (/api/providers/...)
│   │   ├── bookings/       BookingsController/Service (/api/bookings/...)
│   │   ├── prisma/         PrismaService, prisma-error.mapper.ts
│   │   └── shared/         response envelope, exception filter, pagination, request logger
│   └── test/               e2e specs, helpers, test-database setup
└── client/                 Vite/React SPA (role-based routes: client booking UI, provider slot management)
```

### Request pipeline (server)

Every request goes through the same chain, in this order:

1. **`LoggerMiddleware`** – one log line per request (method, URL, IP, user agent).
2. **`JwtAuthGuard`** (global) – reads the JWT from the `access_token` cookie or an `Authorization: Bearer` header, verifies it and puts `{ id, email, role }` on `req.user`. Routes marked `@Public()` skip it.
3. **`RolesGuard`** (global) – enforces `@Roles('PROVIDER')` / `@Roles('CLIENT')` on a handler or controller → `403` otherwise.
4. **`ValidationPipe`** – `whitelist + forbidNonWhitelisted + transform`: unknown properties are rejected with `400` (so e.g. nobody can pass `role: "PROVIDER"` to `/auth/register`), and query strings are coerced to numbers/dates through the DTOs.
5. **Controller → Service → Prisma**. Services throw Nest `HttpException`s for business rules; they *do not* try/catch database errors.
6. **`ResponseEnvelopeInterceptor`** – wraps every successful body in `{ success: true, data, meta_data, error: null }` (`meta_data` carries pagination).
7. **`ApiExceptionFilter`** – turns any error into the same envelope with `success: false`. Prisma errors are translated by `prisma-error.mapper.ts` (unique violation → `409`, exclusion violation → `409`, not found → `404`, …); anything unexpected is logged and returned as a generic `500` without a stack trace.

The consequence of 5 + 7 is the key design decision of the backend: **database constraints are the source of truth**. The services validate input and give friendly error messages, but the guarantees that matter (no double booking, no overlapping slots, no edits under a booking) are enforced by Postgres and merely *translated* into HTTP status codes.

### Authentication

- `POST /api/auth/register` creates a `CLIENT`. There is no self-service provider sign-up; providers are created by the seed (or directly in the database) — a deliberate product choice for a care platform.
- Passwords are hashed with **argon2id**. Login returns the public user and sets an `httpOnly; SameSite=Lax` cookie (`Secure` when `NODE_ENV=production`) with the JWT; the hash is never serialised (`omit: { password: true }` in Prisma).
- The same JWT is accepted as `Authorization: Bearer <token>` for non-browser clients (Swagger, curl, tests).
- Login failures for a wrong password and an unknown email return the same message, so the endpoint does not reveal which emails exist.

### Frontend

The SPA in `client/` talks to the API cross-origin (`VITE_API_URL`, cookies sent with `withCredentials`), and the server whitelists it via `CORS_ORIGINS`. Routes are role-based: clients get provider browsing, booking and "my bookings"; providers get slot management and "bookings on my slots". The client is deliberately thin — every rule lives in the API.

---

## Database schema and constraints

```
users                          slots                              bookings
─────────────────────          ────────────────────────────       ─────────────────────────────
id          uuid PK            id           uuid PK               id            uuid PK
email       text UNIQUE        provider_id  uuid FK→users         slot_id       uuid FK→slots (RESTRICT)
password    text (argon2)      start_at     timestamptz           client_id     uuid FK→users (CASCADE)
name        text               end_at       timestamptz           status        CONFIRMED | CANCELLED
role        CLIENT|PROVIDER    created_at / updated_at            cancelled_at  timestamptz NULL
created_at / updated_at                                           created_at / updated_at
```

Prisma cannot express partial indexes, CHECK constraints or exclusion constraints in `schema.prisma`, so those are **hand-written SQL in the migrations**. Prisma's differ ignores constructs it does not model, so later `migrate dev` runs leave them intact (migration 2 was generated on top of migration 1's hand-written SQL and did not try to remove it).

| Constraint / index | Where | What it guarantees | Surfaced to the API as |
| --- | --- | --- | --- |
| `users_email_key` UNIQUE | migration 1 | one account per email | `409 Email is already registered` |
| `slots_start_before_end_check` CHECK (`start_at < end_at`) | migration 1 (hand-written) | a slot has positive duration | `400` (services validate first; reaching the CHECK would be a bug) |
| **`bookings_one_active_per_slot`** UNIQUE `(slot_id) WHERE status = 'CONFIRMED'` | migration 1 (hand-written) | **at most one confirmed booking per slot** — the double-booking guard. Cancelled rows are excluded, so a slot becomes bookable again after cancellation while history is kept. | `409 A requested slot is already booked` |
| **`slots_no_overlap_per_provider`** EXCLUDE USING gist (`provider_id WITH =, tstzrange(start_at, end_at) WITH &&`) | migration 2 (hand-written, needs `btree_gist`) | a provider's slots never overlap, even when created concurrently | `409 Overlaps one of your existing slots` |
| `bookings_slot_id_fkey` ON DELETE **RESTRICT** | migration 1 | a slot with bookings cannot be deleted by accident | `409` (the service checks under a lock first) |
| `bookings_client_id_fkey` / `slots_provider_id_fkey` ON DELETE CASCADE | migration 1 | deleting a user removes their slots/bookings | — |
| `slots(provider_id, start_at)`, `bookings(client_id, created_at DESC)`, `bookings(slot_id)` | migration 1 | indexes for the listing queries | — |

Availability is **derived**, not stored: a slot is available iff it has no `CONFIRMED` booking. There is no `is_booked` flag that could drift out of sync.

---

## Booking and cancellation logic

### Rules

| Action | Who | Rules (→ status when violated) |
| --- | --- | --- |
| Publish slot | PROVIDER | ISO-8601 with timezone (`400`) · starts in the future (`400`) · 30–60 min long (`400`) · no overlap with own slots (`409`) |
| Move slot | PROVIDER (owner) | same window rules · slot exists (`404`) · is mine (`403`) · has not started (`400`) · has no confirmed booking (`409`) |
| Delete slot | PROVIDER (owner) | exists / mine / future / unbooked as above; cancelled bookings on that slot are deleted with it |
| Book | CLIENT | 1–10 unique slot ids (`400`) · all exist (`404`) · first one is in the future (`400`) · all same provider (`400`) · back-to-back with no gaps (`400`) · none already booked (`409`, nothing is booked) |
| Cancel | CLIENT (owner) | exists (`404`) · mine (`403`) · not already cancelled (`409`) · slot has not started (`400`) |

A cancellation flips `status` to `CANCELLED` and stamps `cancelled_at`; the row is kept. The provider's booking list shows both confirmed and cancelled rows; the client's "available slots" list hides only slots with a `CONFIRMED` booking, so a cancelled slot is immediately rebookable by anyone.

### Concurrency

Four races matter. Each is handled by Postgres, and each has a dedicated test in [`server/test/concurrency.e2e-spec.ts`](server/test/concurrency.e2e-spec.ts).

**1. Two clients book the same slot at the same time** → exactly one `201`, the rest `409`.
`BookingsService.create` deliberately has no "is it still free?" pre-check — a check-then-insert is exactly the race we are trying to avoid. It just inserts; the partial unique index `bookings_one_active_per_slot` lets one `INSERT` through and rejects the others with `23505`, which Prisma reports as `P2002` and the filter maps to `409`. For multi-slot sessions the inserts run in one transaction, so if any slot is taken the whole session rolls back.

**2. A provider edits or deletes a slot while a client is booking it** → the two are serialised; the edit sees the booking (`409`) or the booking sees the new slot.
Before this revision the provider path was `SELECT` (no booking?) → `UPDATE slots`, two statements a booking could land between, so a confirmed booking could end up on a slot whose time had just changed. Now both flows run in a transaction and take **row locks on the slot**:

| Flow | Lock taken on the slot row | Blocks |
| --- | --- | --- |
| `BookingsService.create` | `SELECT … FOR SHARE` (plus the `FOR KEY SHARE` the FK adds on `INSERT`) | provider edits |
| `SlotsService.update` / `remove` | `SELECT … FOR UPDATE` | bookings **and** other edits |

Shared locks don't block each other, so this does not slow down concurrent bookings (race 1 still relies on the index), but `FOR SHARE` and `FOR UPDATE` are mutually exclusive: whichever transaction locks first finishes first, and the other one then reads the committed result. The "no confirmed booking" check in `lockOwnedAndFree` therefore cannot be stale. Delete additionally has the FK `RESTRICT` as a backstop.

**3. The same booking is cancelled twice at once** (double click, two tabs, a retried request) → exactly one `200`, every other attempt `409 Booking is already cancelled`.
`BookingsService.cancel` first runs the precise checks (404/403/409/400) and then performs a **compare-and-set**: `UPDATE bookings SET status='CANCELLED' WHERE id=$1 AND status='CONFIRMED'`. If a concurrent cancel already won, the update matches zero rows (Prisma `P2025`) and the service returns the same `409` a sequential duplicate gets. The response is therefore consistent regardless of timing, and `cancelled_at` is written exactly once.

**4. Two overlapping slots are created at once** → one `201`, the rest `409`. The service's overlap query is just for a friendlier message; the `btree_gist` exclusion constraint is what actually decides.

---

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10+ (`npm i -g pnpm`)
- Docker (only for PostgreSQL; the app itself runs on the host)

### First run

```bash
# 1. Install dependencies for both packages
pnpm install

# 2. Start Postgres 17 (listens on localhost:5433 so it does not clash with a local Postgres)
docker-compose up -d db

# 3. Create the env files (defaults match docker-compose.yml)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Generate the Prisma client (src/generated is git-ignored), apply migrations, seed demo data
pnpm --filter server prisma:generate
pnpm --filter server prisma:migrate:deploy
pnpm seed

# 5. Start the API and the client with hot reload
pnpm dev
```

| What | URL |
| --- | --- |
| API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |
| Swagger UI | http://localhost:3000/api/docs |
| Client | http://localhost:5173 |

If port 3000 is busy, set `PORT` in `server/.env` and `VITE_API_URL` in `client/.env` accordingly.

### Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://careslot:careslot@localhost:5433/careslot?schema=public` | matches the `db` service in `docker-compose.yml` |
| `PORT` | `3000` | |
| `JWT_SECRET` | `change-me` | change outside local dev |
| `JWT_EXPIRES_IN_SECONDS` | `3600` | also the cookie max-age |
| `NODE_ENV` | `development` | `production` adds `Secure` to the cookie |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated browser origins allowed to call the API |
| `TEST_DATABASE_URL` | *(unset)* | optional; where the e2e tests run — see [Testing](#testing) |

`client/.env`: `VITE_API_URL` (default `http://localhost:3000/api`).

---

## Migrations

Migrations live in [`server/prisma/migrations/`](server/prisma/migrations/) and are plain SQL, applied in order:

| Migration | Contents |
| --- | --- |
| `20260914152906_init` | enums, `users` / `slots` / `bookings`, foreign keys, listing indexes, **plus hand-written** `slots_start_before_end_check` and the partial unique index `bookings_one_active_per_slot` |
| `20260915011056_slot_overlap_exclusion` | `CREATE EXTENSION btree_gist`; replaces the exact-match unique index `(provider_id, start_at, end_at)` with the exclusion constraint `slots_no_overlap_per_provider` |

```bash
pnpm --filter server prisma:migrate:deploy   # apply pending migrations (first setup, CI, production)
pnpm --filter server prisma:migrate:status   # what is applied / pending
pnpm --filter server prisma:migrate          # dev: diff schema.prisma, create a new migration, apply it
pnpm --filter server prisma:reset            # dev: drop everything, re-apply all migrations, re-seed
```

To add a migration that needs SQL Prisma cannot generate (indexes with `WHERE`, `CHECK`, `EXCLUDE`): `prisma migrate dev --create-only`, append the SQL to the generated `migration.sql`, then `prisma migrate dev` to apply it.

---

## Seed data

`pnpm seed` (= `prisma db seed`, wired in `server/prisma.config.ts` to run [`server/prisma/seed.ts`](server/prisma/seed.ts)) creates:

| Role | Email | Password |
| --- | --- | --- |
| Provider | `provider@gmail.com` | `password` |
| Client | `client@gmail.com` | `password` |

plus **15 one-hour slots** for the provider: 09:00, 10:00 and 11:00 UTC on each of the next 5 days. It is safe to re-run: users are upserted and slots use `createMany({ skipDuplicates: true })`, so an existing window is skipped (the exclusion constraint counts as a conflict).

---

## Running the app

```bash
pnpm dev                              # server (watch) + client (Vite) together
pnpm --filter server start:dev        # API only, watch mode
pnpm --filter client dev              # client only (needs the API running)

pnpm build                            # client -> client/dist, server -> server/dist
pnpm --filter server start:prod       # node server/dist/main
```

---

## API documentation

Interactive docs: **http://localhost:3000/api/docs** (Swagger UI; use *Authorize* with the cookie after logging in, or paste the JWT as a Bearer token). The raw OpenAPI document is at `/api/docs-json`.

### Conventions

- All routes are under `/api`. Bodies are JSON. Timestamps are ISO-8601 in UTC (`2026-09-20T09:00:00.000Z`); inputs **must** carry a timezone.
- Every response uses the same envelope:

  ```jsonc
  { "success": true,  "data": { … } | [ … ], "meta_data": null | { "page", "page_size", "hasNext", "hasPrevious" }, "error": null }
  { "success": false, "data": null, "meta_data": null, "error": "Human-readable message" }
  ```
  `204` responses have no body. Validation errors join all messages into one `error` string.
- List endpoints accept `?page=` (default 1) and `?page_size=` (default 25, max 100) and return `meta_data`.
- Status codes: `400` validation / business rule on the input · `401` no or invalid session · `403` wrong role or not the owner · `404` not found · `409` conflicts with existing data (already booked, overlap, duplicate email, already cancelled) · `500` unexpected (logged, generic message).

### Endpoints

| Method & path | Role | Purpose | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/health` | public | liveness check | `200 { status: "ok", uptimeSeconds }` | — |
| `POST /api/auth/register` | public | create a CLIENT account and sign in; body `{ email, password (8–128), name }` | `201 { user }` + cookie | `400`, `409 Email is already registered` |
| `POST /api/auth/login` | public | body `{ email, password }` | `200 { user }` + cookie | `400`, `401 Invalid email or password` |
| `POST /api/auth/logout` | any | clears the cookie | `204` | `401` |
| `GET /api/auth/me` | any | current user | `200 user` | `401` |
| `GET /api/providers` | any | list providers (`id, name, email`), paginated | `200 [ … ]` | `401` |
| `GET /api/providers/:id/slots` | any | **available** (future, unbooked) slots of a provider; `?from=&to=` (ISO, defaults: now → +7 days), paginated | `200 [ slot ]` | `400`, `404 Provider not found` |
| `GET /api/providers/me/slots` | PROVIDER | all my slots in `?from=&to=` with `booking: { id, client: { id, name, email } } \| null` | `200 [ … ]` | `401`, `403` |
| `POST /api/providers/me/slots` | PROVIDER | publish a slot; body `{ startAt, endAt }` | `201 slot` | `400` window rules, `409` overlap |
| `PATCH /api/providers/me/slots/:id` | PROVIDER | move an unbooked slot; body `{ startAt, endAt }` | `200 slot` | `400`, `403 not mine`, `404`, `409 booked / overlap` |
| `DELETE /api/providers/me/slots/:id` | PROVIDER | delete an unbooked slot | `204` | `400 past`, `403`, `404`, `409 Slot has a confirmed booking` |
| `GET /api/providers/me/bookings` | PROVIDER | bookings on my slots (confirmed and cancelled); `?search=` matches client name, paginated | `200 [ { id, status, createdAt, cancelledAt, slot, client } ]` | `401`, `403` |
| `POST /api/bookings` | CLIENT | body `{ slotIds: [uuid, …] }` (1–10, same provider, consecutive) — all or nothing | `201 [ booking ]` (one per slot, each with `slot.provider`) | `400`, `403`, `404`, `409 A requested slot is already booked` |
| `GET /api/bookings/me` | CLIENT | my bookings (both statuses), ordered by slot start, paginated | `200 [ booking ]` | `401`, `403` |
| `PATCH /api/bookings/:id/cancel` | CLIENT | cancel my confirmed booking | `200 booking` (`status: CANCELLED`, `cancelledAt`) | `400 Past bookings cannot be cancelled`, `403`, `404`, `409 Booking is already cancelled` |

### Example session (curl)

```bash
API=http://localhost:3000/api

# log in as the demo client; keep the cookie
curl -s -c jar -H 'Content-Type: application/json' \
  -d '{"email":"client@gmail.com","password":"password"}' $API/auth/login

# find the provider and a free slot
curl -s -b jar $API/providers
curl -s -b jar "$API/providers/<providerId>/slots?page_size=3"

# book it (or several consecutive ids for a longer session)
curl -s -b jar -H 'Content-Type: application/json' \
  -d '{"slotIds":["<slotId>"]}' $API/bookings

# a second booking of the same slot -> 409
# cancel, then cancel again -> 200, then 409
curl -s -b jar -X PATCH $API/bookings/<bookingId>/cancel
curl -s -b jar -X PATCH $API/bookings/<bookingId>/cancel
```

---

## Testing

Two Jest projects, both under `server/`:

| Command (from the repo root) | What runs | Needs Postgres? |
| --- | --- | --- |
| `pnpm test:unit` | `src/**/*.spec.ts` — pure logic (Prisma-error → HTTP mapping, health controller) | no |
| `pnpm test:e2e` | `test/**/*.e2e-spec.ts` — boots the real `AppModule` through the same `configureApp()` as `main.ts` and drives it with supertest against a **real PostgreSQL** | **yes** (`docker-compose up -d db`) |
| `pnpm test` | both, in that order | yes |

(From `server/`: `pnpm test`, `pnpm test:e2e`, `pnpm test:all`.)

### How the e2e suite is wired

- `test/jest-e2e.json` — the config. `maxWorkers: 1` because all files share one database.
- `test/setup/env.ts` (Jest `setupFiles`) — sets `NODE_ENV=test` and **derives the test database URL**: `DATABASE_URL` with `_test` appended to the database name (`careslot` → `careslot_test`), or `TEST_DATABASE_URL` if set. It refuses to run if the result equals the development URL, because the suite truncates tables between tests.
- `test/setup/global-setup.ts` (Jest `globalSetup`) — creates `careslot_test` if it does not exist and runs `prisma migrate deploy` on it. Nothing to do by hand; the first run prints `e2e database ready: careslot_test`.
- `test/helpers/app.ts` — `createTestApp()`, `resetDatabase()` (`TRUNCATE … CASCADE` before each test), `signIn()` (inserts a user with a pre-hashed password and logs in through the real endpoint to obtain the cookie), `createSlot()` / `slotWindow()` fixtures.
- Fixtures are inserted with Prisma where the setup is not what is being tested (e.g. a PROVIDER account, which has no public sign-up), and every assertion goes through HTTP.

### What is covered (39 API tests)

| File | Area | Tests |
| --- | --- | --- |
| `auth.e2e-spec.ts` | Authentication | register sets an `httpOnly` cookie and never leaks the hash · duplicate email → 409 · login OK / wrong password / unknown email → same 401 message · no session and tampered token → 401 · Bearer header accepted · logout clears the cookie · registration validation incl. `role` cannot be self-assigned |
| `permissions.e2e-spec.ts` | Permissions | CLIENT cannot manage slots (403) · PROVIDER cannot book (403) · provider cannot touch another provider's slot (403) · client cannot cancel another client's booking (403) · provider discovery needs a session but works for both roles |
| `slots.e2e-spec.ts` | Validation & slot management | publish a valid slot · 8 invalid-window cases (end before start, 20 min, 90 min, past, no timezone, not a date, missing field, unknown field) · overlap → 409 **and** the exclusion constraint rejects a direct insert · CHECK constraint rejects `end < start` · move/delete unbooked slot · booked slot cannot be moved/deleted, past slot cannot be changed · clients only see future unbooked slots while the provider sees all with the booker · pagination and query validation |
| `bookings.e2e-spec.ts` | Booking, cancellation, rebooking | book → leaves the available list, visible to client and provider (with `?search=`) · second booking of the same slot → 409 · consecutive slots as one session, all-or-nothing · past / unknown / non-consecutive / mixed-provider / empty / duplicate ids rejected · cancel keeps history, frees the slot, another client rebooks it · duplicate cancel → 409 and `cancelledAt` unchanged · cannot cancel a started slot |
| `concurrency.e2e-spec.ts` | Concurrency | **8 parallel bookings of one slot → exactly one 201** · **provider edit blocks behind an in-flight booking transaction and then gets 409** (this test returned `200` against the previous implementation) · delete vs. book in parallel, 5 rounds, never both succeed · **6 parallel cancels → exactly one 200, five 409** (previously several 200s) · 5 parallel overlapping slot creates → one 201 |

The in-flight-booking test opens a raw `pg` transaction that does what the booking service does (`SELECT … FOR SHARE` + `INSERT`) and holds it open; the provider's `PATCH` must stay pending until that transaction commits and must then be rejected. This makes the interleaving deterministic rather than hoping `Promise.all` hits the window.
