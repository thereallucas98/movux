-- CreateEnum
CREATE TYPE "ShiftAssignmentMode" AS ENUM ('DIRECT_ASSIGN', 'OPEN_FOR_APPLY');

-- CreateEnum
CREATE TYPE "ShiftCandidateStatus" AS ENUM ('QUEUED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- AlterTable
ALTER TABLE "shift" ADD COLUMN     "assignment_mode" "ShiftAssignmentMode" NOT NULL DEFAULT 'DIRECT_ASSIGN';

-- CreateTable
CREATE TABLE "shiftCandidate" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "queue_position" INTEGER NOT NULL,
    "status" "ShiftCandidateStatus" NOT NULL DEFAULT 'QUEUED',
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_reason" TEXT,
    "resulting_assignment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shiftCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shiftCandidate_resulting_assignment_id_key" ON "shiftCandidate"("resulting_assignment_id");

-- CreateIndex
CREATE INDEX "shiftCandidate_user_id_status_idx" ON "shiftCandidate"("user_id", "status");

-- CreateIndex
CREATE INDEX "shiftCandidate_shift_id_status_idx" ON "shiftCandidate"("shift_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shiftCandidate_shift_id_user_id_key" ON "shiftCandidate"("shift_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shiftCandidate_shift_id_queue_position_key" ON "shiftCandidate"("shift_id", "queue_position");

-- AddForeignKey
ALTER TABLE "shiftCandidate" ADD CONSTRAINT "shiftCandidate_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftCandidate" ADD CONSTRAINT "shiftCandidate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftCandidate" ADD CONSTRAINT "shiftCandidate_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftCandidate" ADD CONSTRAINT "shiftCandidate_resulting_assignment_id_fkey" FOREIGN KEY ("resulting_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
