import { describe, expect, it } from "vitest";
import { jour } from "../planning/dates";
import { adresseSite, adresseValide, memeNom, nettoyerReponsesPerso, reponsesOuvertes, validerReponses } from "./site";

describe("adresse du mini-site", () => {
  it("se forme à partir des prénoms, sans accents", () => {
    expect(adresseSite("Léa", "Sam")).toBe("lea-et-sam");
    expect(adresseSite("Anne-Charlotte", "Zoé")).toBe("anne-charlotte-et-zoe");
    expect(adresseSite("Léa", null)).toBe("lea");
  });
  it("refuse les adresses invalides", () => {
    expect(adresseValide("lea-et-sam")).toBe(true);
    expect(adresseValide("Lea")).toBe(false);
    expect(adresseValide("a")).toBe(false);
    expect(adresseValide("lea--sam")).toBe(false);
    expect(adresseValide("-lea")).toBe(false);
  });
});

describe("réponses d'un foyer", () => {
  const foyer = [
    { id: "a", momentsInvites: ["vin", "diner"] },
    { id: "b", momentsInvites: ["vin"] },
  ];
  it("ne garde que les moments auxquels chacun est convié", () => {
    const r = validerReponses(foyer, [
      { guestId: "a", reponse: "PRESENT", moments: ["vin", "diner", "brunch"], regimes: ["Végan", "Inventé"], allergies: " noix " },
      { guestId: "b", reponse: "PRESENT", moments: ["diner"], regimes: [], allergies: null },
    ], ["Végan"]);
    expect(r.erreur).toBeUndefined();
    expect(r.valides[0]).toMatchObject({ moments: ["vin", "diner"], regimes: ["Végan"], allergies: "noix" });
    expect(r.valides[1]?.moments).toEqual([]);
  });
  it("n'inscrit un absent à aucun moment", () => {
    const r = validerReponses(foyer, [
      { guestId: "a", reponse: "ABSENT", moments: ["vin"], regimes: ["Végan"], allergies: "x" },
      { guestId: "b", reponse: "PRESENT", moments: ["vin"], regimes: [], allergies: null },
    ], ["Végan"]);
    expect(r.valides[0]).toMatchObject({ moments: [], regimes: [], allergies: null });
  });
  it("refuse une réponse pour quelqu'un d'un autre foyer, ou incomplète", () => {
    expect(validerReponses(foyer, [{ guestId: "z", reponse: "PRESENT", moments: [], regimes: [], allergies: null }], []).erreur).toBeDefined();
    expect(validerReponses(foyer, [{ guestId: "a", reponse: "PRESENT", moments: [], regimes: [], allergies: null }], []).erreur).toBeDefined();
  });
});

describe("questions personnalisées et date limite", () => {
  it("ignore les questions inconnues et les choix hors liste", () => {
    const q = [{ id: "q1", libelle: "Chanson ?", type: "texte" as const, choix: [] }, { id: "q2", libelle: "Navette ?", type: "choix" as const, choix: ["Oui", "Non"] }];
    expect(nettoyerReponsesPerso(q, { q1: " Dancing Queen ", q2: "Peut-être", q9: "x" })).toEqual({ q1: "Dancing Queen" });
  });
  it("ferme les réponses après la date limite, mais pas le jour même", () => {
    expect(reponsesOuvertes(jour(2027, 5, 1), jour(2027, 5, 1))).toBe(true);
    expect(reponsesOuvertes(jour(2027, 5, 1), jour(2027, 5, 2))).toBe(false);
    expect(reponsesOuvertes(null, jour(2030, 1, 1))).toBe(true);
  });
  it("reconnaît un nom saisi sans accents", () => {
    expect(memeNom({ prenom: "Zoé", nom: "Lefèvre" }, { prenom: "zoe", nom: "LEFEVRE" })).toBe(true);
    expect(memeNom({ prenom: "Zoé", nom: "Lefèvre" }, { prenom: "Zoé", nom: "Martin" })).toBe(false);
  });
});
