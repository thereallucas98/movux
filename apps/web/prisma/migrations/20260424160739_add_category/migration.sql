-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('GLOBAL', 'TENANT', 'WORKSPACE');

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "scope" "CategoryScope" NOT NULL,
    "vertical" "WorkspaceVertical",
    "tenant_id" TEXT,
    "workspace_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_scope_vertical_idx" ON "category"("scope", "vertical");

-- CreateIndex
CREATE INDEX "category_scope_tenant_id_idx" ON "category"("scope", "tenant_id");

-- CreateIndex
CREATE INDEX "category_scope_workspace_id_idx" ON "category"("scope", "workspace_id");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
