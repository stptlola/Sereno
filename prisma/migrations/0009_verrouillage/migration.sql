-- AlterTable
ALTER TABLE "RoomElement" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SeatingTable" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;

