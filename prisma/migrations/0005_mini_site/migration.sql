-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "rsvpAnswers" JSONB,
ADD COLUMN     "rsvpMessage" TEXT,
ADD COLUMN     "rsvpOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvpToken" TEXT;

-- CreateTable
CREATE TABLE "MiniSite" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "welcome" TEXT,
    "programme" JSONB NOT NULL DEFAULT '[]',
    "lieux" JSONB NOT NULL DEFAULT '[]',
    "hebergements" TEXT,
    "transport" TEXT,
    "cadeauxLien" TEXT,
    "faq" JSONB NOT NULL DEFAULT '[]',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "rsvpDeadline" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MiniSite_weddingId_key" ON "MiniSite"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniSite_slug_key" ON "MiniSite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_rsvpToken_key" ON "Guest"("rsvpToken");

-- AddForeignKey
ALTER TABLE "MiniSite" ADD CONSTRAINT "MiniSite_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

