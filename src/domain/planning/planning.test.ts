import { describe, expect, it } from "vitest";
import {
  ajouterMois,
  ecartJours,
  genererPlanning,
  jour,
  MODELE_TACHES,
  prochainesTaches,
  type ProfilMariage,
} from "./index";

const base: ProfilMariage = {
  dateMariage: jour(2028, 6, 17),
  dateDebut: jour(2026, 10, 22),
  ceremonies: ["CIVILE"],
};

const ids = (p: ReturnType<typeof genererPlanning>) => p.taches.map((t) => t.modeleId);

describe("modèle de tâches", () => {
  it("contient 131 tâches aux identifiants uniques", () => {
    expect(MODELE_TACHES).toHaveLength(131);
    expect(new Set(MODELE_TACHES.map((t) => t.id)).size).toBe(131);
  });

  it("a un conseil pour chaque tâche", () => {
    expect(MODELE_TACHES.every((t) => t.conseil.length > 10)).toBe(true);
  });
});

describe("dates", () => {
  it("ajoute des mois en restant dans le mois, comme EDATE", () => {
    expect(ajouterMois(jour(2027, 1, 31), 1)).toEqual(jour(2027, 2, 28));
    expect(ajouterMois(jour(2028, 3, 31), -1)).toEqual(jour(2028, 2, 29));
    expect(ajouterMois(jour(2027, 6, 19), -18)).toEqual(jour(2025, 12, 19));
  });

  it("compte les jours sans être perturbé par l'heure d'été", () => {
    expect(ecartJours(jour(2027, 3, 27), jour(2027, 3, 29))).toBe(2);
  });
});

describe("cérémonies (règles d'adaptation)", () => {
  it("un mariage civil ne voit ni tâches religieuses ni laïques", () => {
    const p = genererPlanning(MODELE_TACHES, base);
    expect(ids(p)).toContain("T012");
    expect(ids(p)).not.toContain("T013");
    expect(ids(p)).not.toContain("T014");
  });

  it("une cérémonie laïque ajoute l'officiant et les rituels", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, ceremonies: ["CIVILE", "LAIQUE"] });
    expect(ids(p)).toEqual(expect.arrayContaining(["T014", "T116", "T117"]));
  });
});

describe("horizon (M2-11, M2-12)", () => {
  it("garde les tâches d'anticipation pour un mariage lointain, à leur date idéale", () => {
    const p = genererPlanning(MODELE_TACHES, base);
    const t001 = p.taches.find((t) => t.modeleId === "T001");
    expect(t001?.dateAffichee).toEqual(jour(2026, 12, 17));
    expect(t001?.resserree).toBe(false);
  });

  it("masque l'anticipation quand le mariage est dans moins d'un an", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, dateMariage: jour(2027, 3, 20) });
    expect(ids(p)).not.toContain("T001");
  });

  it("n'affiche aucune tâche en retard le premier jour d'un mariage proche", () => {
    const debut = base.dateDebut;
    const p = genererPlanning(MODELE_TACHES, { ...base, dateMariage: jour(2027, 3, 20) });
    expect(p.taches.every((t) => t.dateAffichee >= debut)).toBe(true);
  });

  it("répartit les tâches resserrées sur plusieurs semaines, les démarches légales d'abord", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, dateMariage: jour(2027, 3, 20) });
    const resserrees = p.taches.filter((t) => t.resserree);
    const dates = new Set(resserrees.map((t) => t.dateAffichee.getTime()));
    expect(dates.size).toBeGreaterThan(1);
    const premiere = p.taches.find((t) => t.resserree);
    expect(premiere?.repere).toBe("LEGAL");
  });

  it("ne place jamais une tâche resserrée après la veille du mariage", () => {
    const mariage = jour(2026, 11, 5);
    const p = genererPlanning(MODELE_TACHES, { ...base, dateMariage: mariage });
    expect(p.taches.filter((t) => t.resserree).every((t) => t.dateAffichee < mariage)).toBe(true);
  });

  it("prend une date provisoire dans 12 mois quand la date n'est pas fixée", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, dateMariage: null });
    expect(p.dateProvisoire).toBe(true);
    expect(p.dateMariage).toEqual(jour(2027, 10, 22));
  });
});

describe("conditions et réservations", () => {
  it("n'affiche la garde de l'animal que si le couple en a un", () => {
    expect(ids(genererPlanning(MODELE_TACHES, base))).not.toContain("T130");
    expect(ids(genererPlanning(MODELE_TACHES, { ...base, options: { animal: true } }))).toContain("T130");
  });

  it("masque la lune de miel et les enfants quand le couple répond non", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, options: { luneDeMiel: false, enfants: false } });
    expect(ids(p)).not.toEqual(expect.arrayContaining(["T034"]));
    expect(ids(p)).not.toContain("T033");
  });

  it("coche d'office les tâches d'un prestataire déjà réservé", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, dejaReserve: ["lieu", "photographe"] });
    const faites = p.taches.filter((t) => t.cocheeDOffice).map((t) => t.modeleId).sort();
    expect(faites).toEqual(["T006", "T009", "T010", "T016"]);
  });

  it("exclut l'EVJF/EVG, réservé à l'espace des témoins", () => {
    expect(ids(genererPlanning(MODELE_TACHES, base))).not.toContain("T049");
  });

  it("propose les prochaines tâches non faites et non facultatives", () => {
    const p = genererPlanning(MODELE_TACHES, { ...base, dejaReserve: ["lieu"] });
    const prochaines = prochainesTaches(p, 3);
    expect(prochaines).toHaveLength(3);
    expect(prochaines.every((t) => !t.faite && !t.facultative)).toBe(true);
  });
});
