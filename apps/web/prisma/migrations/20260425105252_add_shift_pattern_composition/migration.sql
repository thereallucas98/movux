-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED', 'COMPLETED');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "shift" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "pattern_id" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shiftPattern" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT,
    "days_of_week" INTEGER[],
    "start_time_minutes" INTEGER NOT NULL,
    "end_time_minutes" INTEGER NOT NULL,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shiftPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shiftExpectedComposition" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shiftExpectedComposition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_schedule_id_status_idx" ON "shift"("schedule_id", "status");

-- CreateIndex
CREATE INDEX "shift_schedule_id_start_at_idx" ON "shift"("schedule_id", "start_at");

-- CreateIndex
CREATE INDEX "shift_category_id_start_at_idx" ON "shift"("category_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "shift_pattern_id_start_at_key" ON "shift"("pattern_id", "start_at");

-- CreateIndex
CREATE INDEX "shiftPattern_schedule_id_idx" ON "shiftPattern"("schedule_id");

-- CreateIndex
CREATE INDEX "shiftExpectedComposition_specialty_id_idx" ON "shiftExpectedComposition"("specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "shiftExpectedComposition_shift_id_specialty_id_key" ON "shiftExpectedComposition"("shift_id", "specialty_id");

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "shiftPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftPattern" ADD CONSTRAINT "shiftPattern_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftPattern" ADD CONSTRAINT "shiftPattern_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftExpectedComposition" ADD CONSTRAINT "shiftExpectedComposition_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftExpectedComposition" ADD CONSTRAINT "shiftExpectedComposition_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
-- See Task 05 validation §2 for background.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
