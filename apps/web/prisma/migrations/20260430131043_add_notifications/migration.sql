-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCHEDULE_PUBLISHED', 'SCHEDULE_CLOSED', 'SHIFT_CANCELLED', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_REJECTED', 'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'CANDIDATE_QUEUED', 'CANDIDATE_APPROVED', 'CANDIDATE_REJECTED', 'CANDIDATE_WITHDRAWN', 'REQUEST_SUBMITTED', 'REQUEST_RESOLVED', 'REQUEST_PEER_DECISION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- DropIndex
DROP INDEX "specialty_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationPreference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notificationPreference_user_id_idx" ON "notificationPreference"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notificationPreference_user_id_type_channel_key" ON "notificationPreference"("user_id", "type", "channel");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationPreference" ADD CONSTRAINT "notificationPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
