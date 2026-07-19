-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'CARRIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'OPEN', 'PROPOSALS_RECEIVED', 'CARRIER_SELECTED', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'REVIEWED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('RESIDENTIAL_MOVING', 'COMMERCIAL_FREIGHT', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('ANY', 'MOTORCYCLE', 'VAN', 'TRUCK_SMALL', 'TRUCK_LARGE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('COMPLETED', 'CARRIER_REJECTED', 'CUSTOMER_REJECTED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PRO_MONTHLY', 'PRO_SEMESTER', 'PRO_ANNUAL', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('CUSTOMER', 'CARRIER');

-- CreateEnum
CREATE TYPE "ModifierCode" AS ENUM ('FLOOR', 'HELPER', 'DISASSEMBLY', 'PACKING', 'DIFFICULT_ACCESS', 'NIGHT_WEEKEND');

-- CreateEnum
CREATE TYPE "NeighborhoodClassification" AS ENUM ('POPULAR', 'MIDDLE', 'UPSCALE');

-- CreateEnum
CREATE TYPE "TimeWindow" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('ORIGIN', 'DESTINATION');

-- CreateEnum
CREATE TYPE "ModifierValueType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "SubscriberType" AS ENUM ('CARRIER', 'COMPANY');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'CALLED', 'ACTIVE', 'EXHAUSTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PUBLISHED', 'CARRIER_CALLED', 'PROPOSAL_RECEIVED', 'CARRIER_SELECTED', 'SAFETY_CONFIRMED', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'WINDOW_ALERT', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CompanyMemberRole" AS ENUM ('OWNER', 'MANAGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "CarrierDocumentType" AS ENUM ('CPF', 'CNH_FRONT', 'CNH_BACK', 'ADDRESS_PROOF', 'SELFIE', 'CNPJ', 'SOCIAL_CONTRACT');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'SEMESTER', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LastTrigger" AS ENUM ('VOLUME', 'DEVIATION', 'TIME', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "state" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "ibge_code" TEXT NOT NULL,

    CONSTRAINT "state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city" (
    "id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ibge_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhood" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" "NeighborhoodClassification" NOT NULL,
    "ibge_code" TEXT,

    CONSTRAINT "neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoodCluster" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "neighborhoodCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clusterNeighborhood" (
    "cluster_id" TEXT NOT NULL,
    "neighborhood_id" TEXT NOT NULL,

    CONSTRAINT "clusterNeighborhood_pkey" PRIMARY KEY ("cluster_id","neighborhood_id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customerProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone" TEXT,
    "avg_rating" DECIMAL(3,2),
    "total_shipments" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "customerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrierProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "bio" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "avg_rating" DECIMAL(3,2),
    "total_shipments" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_company_id" TEXT,

    CONSTRAINT "carrierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "owner_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companyMembership" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CompanyMemberRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "companyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT,
    "company_id" TEXT,
    "plate" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "crlv_url" TEXT,
    "crlv_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrierDocument" (
    "id" TEXT NOT NULL,
    "carrier_id" TEXT,
    "company_id" TEXT,
    "type" "CarrierDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "external_validation" JSONB,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "max_active_proposals" INTEGER NOT NULL,
    "max_drivers" INTEGER,
    "extra_driver_price_in_cents" INTEGER,
    "has_advanced_analytics" BOOLEAN NOT NULL DEFAULT false,
    "has_priority_in_search" BOOLEAN NOT NULL DEFAULT false,
    "has_verified_badge" BOOLEAN NOT NULL DEFAULT false,
    "has_fleet_management" BOOLEAN NOT NULL DEFAULT false,
    "has_multi_branch" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "subscriber_type" "SubscriberType" NOT NULL,
    "subscriber_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "mp_preapproval_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "grace_period_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount_in_cents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "mp_payment_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricingTemplate" (
    "id" TEXT NOT NULL,
    "origin_cluster_id" TEXT NOT NULL,
    "destination_cluster_id" TEXT NOT NULL,
    "shipment_type" "ShipmentType" NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "base_price_in_cents" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricingModifier" (
    "id" TEXT NOT NULL,
    "city_id" TEXT,
    "code" "ModifierCode" NOT NULL,
    "name" TEXT NOT NULL,
    "value_type" "ModifierValueType" NOT NULL,
    "value_in_cents" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pricingModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrierPricingConfig" (
    "id" TEXT NOT NULL,
    "carrier_id" TEXT,
    "company_id" TEXT,
    "modifier_code" "ModifierCode" NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "carrierPricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricingSignal" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "shipment_id" TEXT,
    "signal_type" "SignalType" NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "weight" DECIMAL(4,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricingSnapshot" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "base_price_in_cents" INTEGER NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "last_trigger" "LastTrigger" NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "ShipmentType" NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_weight_kg" DECIMAL(8,2),
    "estimated_volume_m3" DECIMAL(8,2),
    "vehicle_type_required" "VehicleType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "time_window" "TimeWindow" NOT NULL,
    "specific_time" TIME,
    "suggested_price_in_cents" INTEGER NOT NULL,
    "final_price_in_cents" INTEGER,
    "eta_minutes" INTEGER,
    "window_expires_at" TIMESTAMP(3),
    "customer_sla_hours" INTEGER NOT NULL,
    "safety_term_customer_at" TIMESTAMP(3),
    "safety_term_carrier_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipmentAddress" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood_id" TEXT,
    "neighborhood_name" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "zip_code" TEXT NOT NULL,
    "lat" DECIMAL(10,8),
    "lng" DECIMAL(11,8),
    "floor" INTEGER,
    "has_elevator" BOOLEAN,

    CONSTRAINT "shipmentAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipmentModifier" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "modifier_code" "ModifierCode" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "applied_value_in_cents" INTEGER NOT NULL,

    CONSTRAINT "shipmentModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipmentPhoto" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposalQueueEntry" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "called_at" TIMESTAMP(3),
    "exhausted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposalQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,
    "queue_entry_id" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_attempt" INTEGER NOT NULL DEFAULT 1,
    "customer_sla_hours" INTEGER NOT NULL,
    "carrier_sla_hours" INTEGER NOT NULL,
    "agreed_sla_hours" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposalAttempt" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "message" TEXT,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "response_type" "ResponseType" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "proposalAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatRoom" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatMessage" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "chatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safetyCheckIn" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ReviewerRole" NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,

    CONSTRAINT "safetyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipmentEvent" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "triggered_by" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "shipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveryConfirmation" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "issue_description" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveryConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "reviewer_role" "ReviewerRole" NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewTag" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target_role" "ReviewerRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reviewTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviewTagSelection" (
    "review_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "reviewTagSelection_pkey" PRIMARY KEY ("review_id","tag_id")
);

-- CreateTable
CREATE TABLE "notificationLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template_code" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider_message_id" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoodCluster_city_id_slug_key" ON "neighborhoodCluster"("city_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customerProfile_user_id_key" ON "customerProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carrierProfile_user_id_key" ON "carrierProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carrierProfile_cpf_key" ON "carrierProfile"("cpf");

-- CreateIndex
CREATE INDEX "carrierProfile_verification_status_idx" ON "carrierProfile"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "company_cnpj_key" ON "company"("cnpj");

-- CreateIndex
CREATE INDEX "subscription_status_current_period_end_idx" ON "subscription"("status", "current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "pricingTemplate_origin_cluster_id_destination_cluster_id_sh_key" ON "pricingTemplate"("origin_cluster_id", "destination_cluster_id", "shipment_type", "vehicle_type");

-- CreateIndex
CREATE INDEX "pricingSignal_template_id_created_at_idx" ON "pricingSignal"("template_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pricingSnapshot_template_id_key" ON "pricingSnapshot"("template_id");

-- CreateIndex
CREATE INDEX "shipment_customer_id_status_idx" ON "shipment"("customer_id", "status");

-- CreateIndex
CREATE INDEX "shipment_status_scheduled_date_idx" ON "shipment"("status", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "shipmentAddress_shipment_id_type_key" ON "shipmentAddress"("shipment_id", "type");

-- CreateIndex
CREATE INDEX "proposalQueueEntry_shipment_id_position_idx" ON "proposalQueueEntry"("shipment_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "proposalQueueEntry_shipment_id_carrier_id_key" ON "proposalQueueEntry"("shipment_id", "carrier_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_queue_entry_id_key" ON "proposal"("queue_entry_id");

-- CreateIndex
CREATE INDEX "proposal_carrier_id_status_idx" ON "proposal"("carrier_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_shipment_id_carrier_id_key" ON "proposal"("shipment_id", "carrier_id");

-- CreateIndex
CREATE UNIQUE INDEX "chatRoom_shipment_id_key" ON "chatRoom"("shipment_id");

-- CreateIndex
CREATE INDEX "chatMessage_room_id_sent_at_idx" ON "chatMessage"("room_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "safetyCheckIn_shipment_id_role_key" ON "safetyCheckIn"("shipment_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "deliveryConfirmation_shipment_id_key" ON "deliveryConfirmation"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_shipment_id_reviewer_role_key" ON "review"("shipment_id", "reviewer_role");

-- CreateIndex
CREATE UNIQUE INDEX "reviewTag_code_key" ON "reviewTag"("code");

-- CreateIndex
CREATE INDEX "notificationLog_user_id_status_created_at_idx" ON "notificationLog"("user_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "city_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhood" ADD CONSTRAINT "neighborhood_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoodCluster" ADD CONSTRAINT "neighborhoodCluster_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clusterNeighborhood" ADD CONSTRAINT "clusterNeighborhood_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "neighborhoodCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clusterNeighborhood" ADD CONSTRAINT "clusterNeighborhood_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhood"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerProfile" ADD CONSTRAINT "customerProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierProfile" ADD CONSTRAINT "carrierProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierProfile" ADD CONSTRAINT "carrierProfile_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierProfile" ADD CONSTRAINT "carrierProfile_current_company_id_fkey" FOREIGN KEY ("current_company_id") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companyMembership" ADD CONSTRAINT "companyMembership_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companyMembership" ADD CONSTRAINT "companyMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierDocument" ADD CONSTRAINT "carrierDocument_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierDocument" ADD CONSTRAINT "carrierDocument_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierDocument" ADD CONSTRAINT "carrierDocument_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptionPayment" ADD CONSTRAINT "subscriptionPayment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingTemplate" ADD CONSTRAINT "pricingTemplate_origin_cluster_id_fkey" FOREIGN KEY ("origin_cluster_id") REFERENCES "neighborhoodCluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingTemplate" ADD CONSTRAINT "pricingTemplate_destination_cluster_id_fkey" FOREIGN KEY ("destination_cluster_id") REFERENCES "neighborhoodCluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingModifier" ADD CONSTRAINT "pricingModifier_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierPricingConfig" ADD CONSTRAINT "carrierPricingConfig_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrierPricingConfig" ADD CONSTRAINT "carrierPricingConfig_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingSignal" ADD CONSTRAINT "pricingSignal_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pricingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingSignal" ADD CONSTRAINT "pricingSignal_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricingSnapshot" ADD CONSTRAINT "pricingSnapshot_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pricingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentAddress" ADD CONSTRAINT "shipmentAddress_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentAddress" ADD CONSTRAINT "shipmentAddress_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentAddress" ADD CONSTRAINT "shipmentAddress_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentModifier" ADD CONSTRAINT "shipmentModifier_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentPhoto" ADD CONSTRAINT "shipmentPhoto_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposalQueueEntry" ADD CONSTRAINT "proposalQueueEntry_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposalQueueEntry" ADD CONSTRAINT "proposalQueueEntry_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_queue_entry_id_fkey" FOREIGN KEY ("queue_entry_id") REFERENCES "proposalQueueEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposalAttempt" ADD CONSTRAINT "proposalAttempt_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatRoom" ADD CONSTRAINT "chatRoom_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatMessage" ADD CONSTRAINT "chatMessage_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatMessage" ADD CONSTRAINT "chatMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safetyCheckIn" ADD CONSTRAINT "safetyCheckIn_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safetyCheckIn" ADD CONSTRAINT "safetyCheckIn_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentEvent" ADD CONSTRAINT "shipmentEvent_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipmentEvent" ADD CONSTRAINT "shipmentEvent_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveryConfirmation" ADD CONSTRAINT "deliveryConfirmation_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveryConfirmation" ADD CONSTRAINT "deliveryConfirmation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewTagSelection" ADD CONSTRAINT "reviewTagSelection_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewTagSelection" ADD CONSTRAINT "reviewTagSelection_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "reviewTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationLog" ADD CONSTRAINT "notificationLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
