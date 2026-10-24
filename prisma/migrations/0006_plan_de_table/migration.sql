-- CreateEnum
CREATE TYPE "FormeTable" AS ENUM ('RONDE', 'RECTANGLE', 'OVALE', 'CARREE', 'DEMI_LUNE');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "accessibility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seat" INTEGER,
ADD COLUMN     "tableId" TEXT;

-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "roomDepthCm" INTEGER NOT NULL DEFAULT 1400,
ADD COLUMN     "roomWidthCm" INTEGER NOT NULL DEFAULT 2000;

-- CreateTable
CREATE TABLE "SeatingTable" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "shape" "FormeTable" NOT NULL DEFAULT 'RONDE',
    "seats" INTEGER NOT NULL DEFAULT 10,
    "honor" BOOLEAN NOT NULL DEFAULT false,
    "x" INTEGER NOT NULL DEFAULT 300,
    "y" INTEGER NOT NULL DEFAULT 300,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatingTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomElement" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoomElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingConstraint" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "guestAId" TEXT NOT NULL,
    "guestBId" TEXT NOT NULL,
    "together" BOOLEAN NOT NULL,

    CONSTRAINT "SeatingConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatingTable_weddingId_idx" ON "SeatingTable"("weddingId");

-- CreateIndex
CREATE INDEX "RoomElement_weddingId_idx" ON "RoomElement"("weddingId");

-- CreateIndex
CREATE INDEX "SeatingConstraint_weddingId_idx" ON "SeatingConstraint"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatingConstraint_guestAId_guestBId_key" ON "SeatingConstraint"("guestAId", "guestBId");

-- AddForeignKey
ALTER TABLE "SeatingTable" ADD CONSTRAINT "SeatingTable_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomElement" ADD CONSTRAINT "RoomElement_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingConstraint" ADD CONSTRAINT "SeatingConstraint_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingConstraint" ADD CONSTRAINT "SeatingConstraint_guestAId_fkey" FOREIGN KEY ("guestAId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingConstraint" ADD CONSTRAINT "SeatingConstraint_guestBId_fkey" FOREIGN KEY ("guestBId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

