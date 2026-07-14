-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "userSpecialty" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "userSpecialty_workspace_id_is_active_idx" ON "userSpecialty"("workspace_id", "is_active");

-- CreateIndex
CREATE INDEX "userSpecialty_specialty_id_is_active_idx" ON "userSpecialty"("specialty_id", "is_active");

-- CreateIndex
CREATE INDEX "userSpecialty_user_id_is_active_idx" ON "userSpecialty"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "userSpecialty" ADD CONSTRAINT "userSpecialty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSpecialty" ADD CONSTRAINT "userSpecialty_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSpecialty" ADD CONSTRAINT "userSpecialty_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate NULLS NOT DISTINCT unique indexes (Prisma drops them on every migrate dev
-- because the DSL can't model them). Requires Postgres 15+. See Task 05 validation §2.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
