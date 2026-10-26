-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "mealChoice" TEXT;

-- AlterTable
ALTER TABLE "MiniSite" ADD COLUMN     "mealOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "addressToken" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notifReponses" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AddressSubmission" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "guestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'A_TRIER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddressSubmission_weddingId_status_idx" ON "AddressSubmission"("weddingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_addressToken_key" ON "Wedding"("addressToken");

-- AddForeignKey
ALTER TABLE "AddressSubmission" ADD CONSTRAINT "AddressSubmission_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

