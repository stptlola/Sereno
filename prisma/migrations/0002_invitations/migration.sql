-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "role" "RoleMembre" NOT NULL,
    "email" TEXT,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_weddingId_idx" ON "Invitation"("weddingId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
