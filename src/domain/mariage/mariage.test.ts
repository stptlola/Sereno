import { describe, expect, it } from "vitest";
import { POSTES_PAR_DEFAUT, repartirBudget } from "../budget/repartition";
import { jour, MODELE_TACHES } from "../planning";
import { preparerMariage } from "./preparer";
import { schemaReponses } from "./reponses";

describe("répartition du budget", () => {
  it("a des parts qui font 100 %", () => {
    expect(POSTES_PAR_DEFAUT.reduce((s, p) => s + p.part, 0)).toBe(100);
  });

  it("tombe juste au centime près, arrondis compris", () => {
    const postes = repartirBudget(1_999_999);
    expect(postes.reduce((s, p) => s + p.prevuCentimes, 0)).toBe(1_999_999);
  });

  it("crée des postes vides quand il n'y a pas de budget", () => {
    const postes = repartirBudget(null);
    expect(postes).toHaveLength(11);
    expect(postes.every((p) => p.prevuCentimes === 0)).toBe(true);
  });
});

describe("réponses du démarrage", () => {
  it("accepte des réponses incomplètes avec des valeurs par défaut", () => {
    const r = schemaReponses.parse({ prenom1: " Léa " });
    expect(r.prenom1).toBe("Léa");
    expect(r.ceremonies).toEqual(["CIVILE"]);
    expect(r.invites).toBeUndefined();
  });

  it("ignore un nombre d'invités illisible plutôt que d'échouer", () => {
    expect(schemaReponses.parse({ invites: "beaucoup" }).invites).toBeUndefined();
  });

  it("garde le culte seulement pour une cérémonie religieuse", () => {
    const avec = preparerMariage(schemaReponses.parse({ ceremonies: ["CIVILE", "RELIGIEUSE"], culte: "juif" }), MODELE_TACHES, new Date("2026-10-23"));
    const sans = preparerMariage(schemaReponses.parse({ ceremonies: ["CIVILE"], culte: "juif" }), MODELE_TACHES, new Date("2026-10-23"));
    expect(avec.mariage.religion).toBe("juif");
    expect(sans.mariage.religion).toBeNull();
  });

  it("refuse un prestataire inconnu", () => {
    expect(schemaReponses.safeParse({ dejaReserve: ["traiteurx"] }).success).toBe(false);
  });
});

describe("préparation du mariage", () => {
  const reponses = schemaReponses.parse({
    prenom1: "Léa",
    prenom2: "Sam",
    date: "2028-06-17",
    invites: "100",
    budget: "20000",
    ceremonies: ["CIVILE", "LAIQUE"],
    dejaReserve: ["lieu"],
  });
  const resultat = preparerMariage(reponses, MODELE_TACHES, new Date("2026-10-23T15:00:00Z"));

  it("enregistre la date, le budget en centimes et les prestataires réservés", () => {
    expect(resultat.mariage.date).toEqual(jour(2028, 6, 17));
    expect(resultat.mariage.dateIsTentative).toBe(false);
    expect(resultat.mariage.budgetTotalCents).toBe(2_000_000);
    expect(resultat.mariage.bookedVendors).toEqual(["lieu"]);
  });

  it("génère les tâches avec celles du lieu déjà faites", () => {
    expect(resultat.taches.length).toBeGreaterThan(100);
    const faites = resultat.taches.filter((t) => t.done).map((t) => t.templateId);
    expect(faites.sort()).toEqual(["T006", "T009", "T010"]);
  });

  it("répartit le budget sur les 11 postes", () => {
    expect(resultat.postesBudget.reduce((s, p) => s + p.prevuCentimes, 0)).toBe(2_000_000);
  });

  it("marque la date comme provisoire si elle n'est pas fixée", () => {
    const r = preparerMariage(schemaReponses.parse({ prenom1: "Léa" }), MODELE_TACHES, new Date("2026-10-23"));
    expect(r.mariage.date).toBeNull();
    expect(r.mariage.dateIsTentative).toBe(true);
    expect(r.mariage.partner2Name).toBeNull();
  });
});
