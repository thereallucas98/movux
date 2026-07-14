-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('ADMIN', 'COORDENADOR', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "WorkspaceVertical" AS ENUM ('HOSPITAL', 'CLINIC', 'GYM', 'OTHER');

-- CreateTable
CREATE TABLE "workspace" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "vertical" "WorkspaceVertical" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaceMembership" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_tenant_id_is_active_idx" ON "workspace"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "workspaceMembership_user_id_idx" ON "workspaceMembership"("user_id");

-- CreateIndex
CREATE INDEX "workspaceMembership_workspace_id_is_active_idx" ON "workspaceMembership"("workspace_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workspaceMembership_workspace_id_user_id_key" ON "workspaceMembership"("workspace_id", "user_id");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMembership" ADD CONSTRAINT "workspaceMembership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaceMembership" ADD CONSTRAINT "workspaceMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
