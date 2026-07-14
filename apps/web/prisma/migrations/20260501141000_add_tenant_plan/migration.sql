-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'SMALL_TEAM', 'BUSINESS', 'CORPORATE');

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "grace_period_until" TIMESTAMP(3),
ADD COLUMN     "plan" "PlanTier" NOT NULL DEFAULT 'FREE';
