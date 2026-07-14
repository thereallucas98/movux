-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'PENDING_CLOSURE';

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "clock_tolerance_minutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "timeEntry" (
    "id" TEXT NOT NULL,
    "shift_assignment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clock_in_at" TIMESTAMP(3) NOT NULL,
    "clock_in_location" JSONB,
    "clock_in_within_tolerance" BOOLEAN NOT NULL,
    "clock_out_at" TIMESTAMP(3),
    "clock_out_location" JSONB,
    "clock_out_within_tolerance" BOOLEAN,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "closed_by_user_id" TEXT,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timeEntry_shift_assignment_id_key" ON "timeEntry"("shift_assignment_id");

-- CreateIndex
CREATE INDEX "timeEntry_user_id_clock_in_at_idx" ON "timeEntry"("user_id", "clock_in_at");

-- AddForeignKey
ALTER TABLE "timeEntry" ADD CONSTRAINT "timeEntry_shift_assignment_id_fkey" FOREIGN KEY ("shift_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeEntry" ADD CONSTRAINT "timeEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeEntry" ADD CONSTRAINT "timeEntry_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
