-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PROVIDER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "slots_provider_id_start_at_idx" ON "slots"("provider_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "slots_provider_id_start_at_end_at_key" ON "slots"("provider_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "bookings_client_id_created_at_idx" ON "bookings"("client_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_slot_id_idx" ON "bookings"("slot_id");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A slot must have a positive duration.
ALTER TABLE "slots"
  ADD CONSTRAINT "slots_start_before_end_check" CHECK ("start_at" < "end_at");

-- At most ONE active booking per slot. This is the DB-level double-booking guard:
-- a second CONFIRMED insert for the same slot is rejected by Postgres itself.
CREATE UNIQUE INDEX "bookings_one_active_per_slot"
  ON "bookings" ("slot_id")
  WHERE "status" = 'CONFIRMED';