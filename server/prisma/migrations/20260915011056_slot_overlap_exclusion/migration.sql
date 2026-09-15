-- DropIndex
DROP INDEX "slots_provider_id_start_at_end_at_key";

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "slots"
  ADD CONSTRAINT "slots_no_overlap_per_provider"
  EXCLUDE USING gist ("provider_id" WITH =, tstzrange("start_at", "end_at") WITH &&);
