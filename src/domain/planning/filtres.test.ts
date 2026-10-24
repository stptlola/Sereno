import { describe, expect, it } from "vitest";
import { FILTRES_VIDES, filtrer, filtresActifs, lireFiltres } from "./filtres";

const T = [
  { titre: "Réserver le lieu de réception", statut: "FAIT" as const, responsable: "Léa", categorie: "Réception · Lieu" },
  { titre: "Déposer le dossier de mariage à la mairie", statut: "A_FAIRE" as const, responsable: null, categorie: "Démarches" },
  { titre: "Réserver le photographe", statut: "EN_COURS" as const, responsable: "Sam", categorie: "Réception · Photo et vidéo" },
];

describe("filtres du planning", () => {
  it("cherche sans tenir compte des accents ni des majuscules, mot par mot", () => {
    expect(filtrer(T, { ...FILTRES_VIDES, recherche: "reserver PHOTO" }).map((t) => t.titre)).toEqual(["Réserver le photographe"]);
    expect(filtrer(T, { ...FILTRES_VIDES, recherche: "mairie dossier" })).toHaveLength(1);
  });

  it("filtre par statut, responsable et rubrique", () => {
    expect(filtrer(T, { ...FILTRES_VIDES, statut: "enCours" })).toHaveLength(1);
    expect(filtrer(T, { ...FILTRES_VIDES, statut: "aFaire" })).toHaveLength(1);
    expect(filtrer(T, { ...FILTRES_VIDES, responsable: "lea" })).toHaveLength(1);
    expect(filtrer(T, { ...FILTRES_VIDES, rubrique: "Réception" })).toHaveLength(2);
  });

  it("lit les filtres depuis l'adresse, en ignorant les valeurs inconnues", () => {
    const f = lireFiltres({ q: "lieu", statut: "nimporte", qui: "Sam" });
    expect(f).toEqual({ recherche: "lieu", statut: "tous", responsable: "Sam", rubrique: "" });
    expect(filtresActifs(f)).toBe(true);
    expect(filtresActifs(lireFiltres({}))).toBe(false);
  });
});
