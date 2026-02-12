-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,
    "primary_client_id" TEXT,
    "secondary_client_id" TEXT,
    "occupants_count" INTEGER NOT NULL DEFAULT 1,
    "rental_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tourist_tax_included" BOOLEAN NOT NULL DEFAULT false,
    "cleaning_included" BOOLEAN NOT NULL DEFAULT false,
    "linen_included" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'France',
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_per_night" DECIMAL(10,2) NOT NULL,
    "weekly_night_rate" DECIMAL(10,2),
    "min_nights" INTEGER NOT NULL DEFAULT 3,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_periods" (
    "id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "season_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "date_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_price_per_night" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_key" ON "seasons"("name");

-- CreateIndex
CREATE INDEX "date_periods_year_idx" ON "date_periods"("year");

-- CreateIndex
CREATE INDEX "date_periods_start_date_end_date_idx" ON "date_periods"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_primary_client_id_fkey" FOREIGN KEY ("primary_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_secondary_client_id_fkey" FOREIGN KEY ("secondary_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_periods" ADD CONSTRAINT "date_periods_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

