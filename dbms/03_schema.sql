-- Kreg Lite CP2 PostgreSQL schema: users, monitors, check_results, incidents.
-- Based on prisma/migrations/20261113181735_init/migration.sql plus the
-- natural keys and integrity checks recommended by dbms/01_normalization.md.
-- Destructive and repeatable: existing rows in these four tables are removed.

BEGIN;

-- Drop child tables first, followed by their parent tables and enum.
DROP TABLE IF EXISTS "check_results" CASCADE;
DROP TABLE IF EXISTS "incidents" CASCADE;
DROP TABLE IF EXISTS "monitors" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TYPE IF EXISTS "MonitorStatus";

-- MonitorStatus limits stored state to application-supported values.
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DOWN', 'UNKNOWN');

-- Stores one identity and password hash per registered account.
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Surrogate primary key for stable references.
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Stores per-user check configuration and latest monitor state.
CREATE TABLE "monitors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "interval_sec" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "status" "MonitorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Surrogate primary key for stable references.
    CONSTRAINT "monitors_pkey" PRIMARY KEY ("id"),
    -- Only supported check intervals are accepted.
    CONSTRAINT "monitors_interval_sec_check" CHECK ("interval_sec" BETWEEN 10 AND 3600),
    -- A failure count cannot become negative.
    CONSTRAINT "monitors_consecutive_failures_check" CHECK ("consecutive_failures" >= 0)
);

-- Preserves the outcome of each scheduled HTTP check.
CREATE TABLE "check_results" (
    "id" SERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "is_up" BOOLEAN NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "error" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Surrogate primary key for stable references.
    CONSTRAINT "check_results_pkey" PRIMARY KEY ("id"),
    -- A monitor has at most one recorded check per timestamp.
    CONSTRAINT "check_results_monitor_id_checked_at_key" UNIQUE ("monitor_id", "checked_at"),
    -- HTTP response codes must be valid when recorded.
    CONSTRAINT "check_results_status_code_check" CHECK ("status_code" IS NULL OR "status_code" BETWEEN 100 AND 599),
    -- Response duration cannot be negative when known.
    CONSTRAINT "check_results_response_time_ms_check" CHECK ("response_time_ms" IS NULL OR "response_time_ms" >= 0)
);

-- Tracks downtime periods; NULL resolved_at denotes an open incident.
CREATE TABLE "incidents" (
    "id" SERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    -- Surrogate primary key for stable references.
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id"),
    -- A monitor cannot start two incidents at the same instant.
    CONSTRAINT "incidents_monitor_id_started_at_key" UNIQUE ("monitor_id", "started_at"),
    -- Resolution cannot precede incident creation.
    CONSTRAINT "incidents_resolved_at_check" CHECK ("resolved_at" IS NULL OR "resolved_at" >= "started_at")
);

-- Uniquely identify accounts by email, as in Prisma.
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Speed up loading all monitors owned by one user.
CREATE INDEX "monitors_user_id_idx" ON "monitors"("user_id");

-- Retain Prisma's check-history access path by monitor and time.
CREATE INDEX "check_results_monitor_id_checked_at_idx" ON "check_results"("monitor_id", "checked_at");

-- Retain Prisma's incident-history access path by monitor and start time.
CREATE INDEX "incidents_monitor_id_started_at_idx" ON "incidents"("monitor_id", "started_at");

-- Cascade monitor deletion when its owning user is deleted or changed.
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cascade check-history deletion when its monitor is removed.
ALTER TABLE "check_results" ADD CONSTRAINT "check_results_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cascade incident-history deletion when its monitor is removed.
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Allow only one still-open downtime incident per monitor.
CREATE UNIQUE INDEX "incidents_one_open_per_monitor_key"
    ON "incidents"("monitor_id") WHERE "resolved_at" IS NULL;

COMMIT;
