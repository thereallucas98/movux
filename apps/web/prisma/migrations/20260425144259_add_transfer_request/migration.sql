-- CreateEnum
CREATE TYPE "TransferRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "transferRequest" (
    "id" TEXT NOT NULL,
    "original_assignment_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_reason" TEXT,
    "new_assignment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transferRequest_new_assignment_id_key" ON "transferRequest"("new_assignment_id");

-- CreateIndex
CREATE INDEX "transferRequest_original_assignment_id_status_idx" ON "transferRequest"("original_assignment_id", "status");

-- CreateIndex
CREATE INDEX "transferRequest_target_user_id_status_idx" ON "transferRequest"("target_user_id", "status");

-- CreateIndex
CREATE INDEX "transferRequest_status_created_at_idx" ON "transferRequest"("status", "created_at");

-- AddForeignKey
ALTER TABLE "transferRequest" ADD CONSTRAINT "transferRequest_original_assignment_id_fkey" FOREIGN KEY ("original_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferRequest" ADD CONSTRAINT "transferRequest_new_assignment_id_fkey" FOREIGN KEY ("new_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferRequest" ADD CONSTRAINT "transferRequest_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferRequest" ADD CONSTRAINT "transferRequest_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferRequest" ADD CONSTRAINT "transferRequest_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
