-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "isCouple" BOOLEAN NOT NULL DEFAULT false;


-- Les mariés de chaque mariage existant deviennent deux personnes à placer, présentes d'office.
INSERT INTO "Guest" (id, "weddingId", "firstName", side, category, "ageGroup", rsvp, diets, "isCouple", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, w.id, w."partner1Name", 'PARTENAIRE_1', 'marie', 'ADULTE', 'PRESENT', '{}', true, now(), now()
FROM "Wedding" w
WHERE NOT EXISTS (SELECT 1 FROM "Guest" g WHERE g."weddingId" = w.id AND g."isCouple" AND g.side = 'PARTENAIRE_1');

INSERT INTO "Guest" (id, "weddingId", "firstName", side, category, "ageGroup", rsvp, diets, "isCouple", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, w.id, w."partner2Name", 'PARTENAIRE_2', 'marie', 'ADULTE', 'PRESENT', '{}', true, now(), now()
FROM "Wedding" w
WHERE w."partner2Name" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Guest" g WHERE g."weddingId" = w.id AND g."isCouple" AND g.side = 'PARTENAIRE_2');
