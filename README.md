# CareSlot

Appointment booking app: a NestJS + Prisma + PostgreSQL API (`server/`) and a Vite/React client (`client/`), managed as a pnpm workspace.

## Prerequisites

- Node.js 22+
- pnpm 10+ (`npm i -g pnpm`)
- Docker (for the Postgres database)

## Quick start

```bash
# 1. Install dependencies for both packages
pnpm install

# 2. Start Postgres (listens on localhost:5433)
docker-compose up -d db

# 3. Create env files
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Generate the Prisma client, apply migrations and seed demo data
pnpm --filter server prisma:generate
pnpm --filter server prisma:migrate
pnpm seed

# 5. Start the server and client together (with hot reload)
pnpm dev
```

Once running:

| What        | URL                              |
| ----------- | -------------------------------- |
| API         | http://localhost:3000/api        |
| Swagger UI  | http://localhost:3000/api/docs   |
| Client      | http://localhost:5173            |

### Demo accounts (from the seed)

| Role     | Email                | Password   |
| -------- | -------------------- | ---------- |
| Provider | `provider@gmail.com` | `password` |
| Client   | `client@gmail.com`   | `password` |

The seed also creates 15 one-hour slots for the provider (09:00–12:00 UTC, over the next 5 days).

## Starting the server only

```bash
pnpm --filter server start:dev     # watch mode
pnpm --filter server start         # single run, no watch
pnpm --filter server start:debug   # watch mode with the Node inspector attached
```

Or from inside `server/`: `pnpm start:dev`.

### Production build

```bash
pnpm build                         # builds client → server/public, then compiles the server
pnpm --filter server start:prod    # runs the compiled server from server/dist
```

## Starting the client only

```bash
pnpm --filter client dev
```

The client calls the API at `VITE_API_URL` (see `client/.env`), so the server must be running.

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable                 | Default                                                            | Notes                                           |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`           | `postgresql://careslot:careslot@localhost:5433/careslot?schema=public` | Matches the `db` service in `docker-compose.yml` |
| `PORT`                   | `3000`                                                             | API port                                        |
| `JWT_SECRET`             | `change-me`                                                        | Change this outside of local dev                |
| `JWT_EXPIRES_IN_SECONDS` | `3600`                                                             |                                                 |
| `NODE_ENV`               | `development`                                                      |                                                 |
| `CORS_ORIGINS`           | `http://localhost:5173`                                            | Comma-separated list of allowed browser origins |

`client/.env` (see `client/.env.example`):

| Variable       | Default                     |
| -------------- | --------------------------- |
| `VITE_API_URL` | `http://localhost:3000/api` |

## Other useful commands

```bash
pnpm lint                                  # lint both packages

pnpm --filter server prisma:studio         # browse the database
pnpm --filter server prisma:migrate:status # check pending migrations
pnpm --filter server prisma:reset          # drop, re-migrate and re-seed the database

docker-compose down                        # stop Postgres (keeps data)
docker-compose down -v                     # stop Postgres and delete its data
pnpm clean                                 # remove build output
```
