-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "shiftTimelineNote" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shiftTimelineNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shiftTimelineNote_shift_id_created_at_idx" ON "shiftTimelineNote"("shift_id", "created_at");

-- AddForeignKey
ALTER TABLE "shiftTimelineNote" ADD CONSTRAINT "shiftTimelineNote_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shiftTimelineNote" ADD CONSTRAINT "shiftTimelineNote_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes dropped by Prisma drift.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
