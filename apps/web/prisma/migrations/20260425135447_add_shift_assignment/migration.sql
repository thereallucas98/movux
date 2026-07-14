-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING_ACCEPT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'TRANSFERRED', 'COMPLETED');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- AlterTable
ALTER TABLE "shift" ADD COLUMN     "decision_window_hours" INTEGER NOT NULL DEFAULT 48;

-- CreateTable
CREATE TABLE "shiftAssignment" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING_ACCEPT',
    "decision_deadline" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shiftAssignment_user_id_status_idx" ON "shiftAssignment"("user_id", "status");

-- CreateIndex
CREATE INDEX "shiftAssignment_shift_id_status_idx" ON "shiftAssignment"("shift_id", "status");

-- CreateIndex
CREATE INDEX "shiftAssignment_decision_deadline_idx" ON "shiftAssignment"("decision_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "shiftAssignment_shift_id_user_id_key" ON "shiftAssignment"("shift_id", "user_id");

-- AddForeignKey
ALTER TABLE "shiftAssignment" ADD CONSTRAINT "shiftAssignment_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftAssignment" ADD CONSTRAINT "shiftAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftAssignment" ADD CONSTRAINT "shiftAssignment_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
-- See Task 05 validation §2 for background.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
