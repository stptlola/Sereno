-- Le « + 1 » anonyme devient une vraie personne, « Accompagnant de … », dans le même foyer,
-- à la même table et avec la même réponse. Le couple la renomme dès qu'il connaît son prénom.

-- 1. Un foyer pour chaque invité avec « + 1 » qui n'en a pas encore.
WITH sans_foyer AS (
  SELECT g.id, g."weddingId", g."firstName", g."lastName", gen_random_uuid()::text AS foyer_id
  FROM "Guest" g
  WHERE g."plusOne" = true AND g."householdId" IS NULL
), foyers AS (
  INSERT INTO "Household" (id, "weddingId", name)
  SELECT foyer_id, "weddingId", trim("firstName" || ' ' || coalesce("lastName", '')) || ' et son accompagnant'
  FROM sans_foyer
  RETURNING id
)
UPDATE "Guest" g SET "householdId" = s.foyer_id FROM sans_foyer s WHERE g.id = s.id;

-- 2. Une personne pour chaque « + 1 ».
INSERT INTO "Guest" (id, "weddingId", "householdId", "firstName", side, category, "ageGroup", rsvp, "rsvpAt", "tableId", diets, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, g."weddingId", g."householdId", 'Accompagnant de ' || g."firstName", g.side, g.category, 'ADULTE', g.rsvp, g."rsvpAt", g."tableId", '{}', now(), now()
FROM "Guest" g
WHERE g."plusOne" = true;

-- 3. Plus aucun « + 1 » anonyme.
UPDATE "Guest" SET "plusOne" = false WHERE "plusOne" = true;
