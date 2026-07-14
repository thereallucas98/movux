-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('SWAP', 'OFFER', 'TIME_OFF');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_PEER', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- AlterTable
ALTER TABLE "shiftAssignment" ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "request" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT NOT NULL,
    "resolved_by_id" TEXT,
    "reason" TEXT NOT NULL,
    "resolution_reason" TEXT,
    "attachment_url" TEXT,
    "attachment_mime_type" TEXT,
    "attachment_size_bytes" INTEGER,
    "swap_source_assignment_id" TEXT,
    "swap_target_user_id" TEXT,
    "swap_target_assignment_id" TEXT,
    "peer_accepted_at" TIMESTAMP(3),
    "peer_rejected_at" TIMESTAMP(3),
    "offer_source_assignment_id" TEXT,
    "time_off_start" TIMESTAMP(3),
    "time_off_end" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_workspace_id_status_idx" ON "request"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "request_requested_by_id_status_idx" ON "request"("requested_by_id", "status");

-- CreateIndex
CREATE INDEX "request_swap_target_user_id_status_idx" ON "request"("swap_target_user_id", "status");

-- CreateIndex
CREATE INDEX "request_type_status_idx" ON "request"("type", "status");

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_swap_target_user_id_fkey" FOREIGN KEY ("swap_target_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_swap_source_assignment_id_fkey" FOREIGN KEY ("swap_source_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_swap_target_assignment_id_fkey" FOREIGN KEY ("swap_target_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_offer_source_assignment_id_fkey" FOREIGN KEY ("offer_source_assignment_id") REFERENCES "shiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Type-specific column integrity (research §1). Prisma DSL doesn't model CHECK constraints.
ALTER TABLE "request"
  ADD CONSTRAINT "request_swap_fields_chk" CHECK (
    (type = 'SWAP' AND swap_source_assignment_id IS NOT NULL
                   AND swap_target_user_id IS NOT NULL
                   AND swap_target_assignment_id IS NOT NULL)
    OR (type <> 'SWAP' AND swap_source_assignment_id IS NULL
                       AND swap_target_user_id IS NULL
                       AND swap_target_assignment_id IS NULL
                       AND peer_accepted_at IS NULL
                       AND peer_rejected_at IS NULL)
  );

ALTER TABLE "request"
  ADD CONSTRAINT "request_offer_fields_chk" CHECK (
    (type = 'OFFER' AND offer_source_assignment_id IS NOT NULL)
    OR (type <> 'OFFER' AND offer_source_assignment_id IS NULL)
  );

ALTER TABLE "request"
  ADD CONSTRAINT "request_time_off_fields_chk" CHECK (
    (type = 'TIME_OFF' AND time_off_start IS NOT NULL
                       AND time_off_end IS NOT NULL
                       AND time_off_end > time_off_start)
    OR (type <> 'TIME_OFF' AND time_off_start IS NULL
                           AND time_off_end IS NULL)
  );

ALTER TABLE "request"
  ADD CONSTRAINT "request_pending_peer_swap_only_chk" CHECK (
    status <> 'PENDING_PEER' OR type = 'SWAP'
  );

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
