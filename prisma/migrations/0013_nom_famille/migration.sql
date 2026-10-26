-- Correctif : « Famille Lecerf » saisi comme nom commun d'un couple ou d'une famille.
-- Le nom de famille redevient « Lecerf », et le nom du foyer est recomposé en conséquence.
UPDATE "Household" h
SET name = regexp_replace(h.name, '\s+(la\s+)?famille\s+', ' ', 'gi')
WHERE h.name ~* '\s(la\s+)?famille\s'
  AND EXISTS (SELECT 1 FROM "Guest" g WHERE g."householdId" = h.id AND g."lastName" ~* '^(la\s+)?famille\s');

UPDATE "Guest"
SET "lastName" = regexp_replace("lastName", '^(la\s+)?famille\s+', '', 'i')
WHERE "lastName" ~* '^(la\s+)?famille\s';
