-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "schedule" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_workspace_id_status_is_active_idx" ON "schedule"("workspace_id", "status", "is_active");

-- CreateIndex
CREATE INDEX "schedule_workspace_id_category_id_period_start_period_end_idx" ON "schedule"("workspace_id", "category_id", "period_start", "period_end");

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
-- See Task 05 validation §2 for background.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
