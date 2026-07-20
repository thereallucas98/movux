-- AlterTable
ALTER TABLE "shipment" ADD COLUMN     "collected_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "in_transit_at" TIMESTAMP(3);
