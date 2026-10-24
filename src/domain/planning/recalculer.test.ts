import { describe, expect, it } from "vitest";
import { genererPlanning, jour, MODELE_TACHES, planifierMiseAJour, type ProfilMariage, type TacheExistante } from "./index";

const profil: ProfilMariage = { dateMariage: jour(2028, 6, 17), dateDebut: jour(2026, 10, 23), ceremonies: ["CIVILE"] };
const existantes = (p: ProfilMariage): TacheExistante[] =>
  genererPlanning(MODELE_TACHES, p).taches.map((t) => ({ modeleId: t.modeleId, faite: false, masquee: false, masqueeParLeCouple: false }));

describe("recalcul du planning", () => {
  it("recale toutes les tâches non faites quand la date change", () => {
    const avant = existantes(profil);
    const maj = planifierMiseAJour(avant, MODELE_TACHES, { ...profil, dateMariage: jour(2028, 9, 16) });
    expect(maj.aCreer).toHaveLength(0);
    expect(maj.aDater).toHaveLength(avant.length);
    expect(maj.aDater.find((t) => t.modeleId === "T010")?.dateIdeale).toEqual(jour(2027, 9, 16));
  });

  it("ne touche pas aux dates des tâches faites", () => {
    const avant = existantes(profil).map((e) => (e.modeleId === "T010" ? { ...e, faite: true } : e));
    const maj = planifierMiseAJour(avant, MODELE_TACHES, { ...profil, dateMariage: jour(2028, 9, 16) });
    expect(maj.aDater.some((t) => t.modeleId === "T010")).toBe(false);
  });

  it("ajoute les tâches d'une nouvelle cérémonie et masque celles d'une cérémonie retirée", () => {
    const avecLaique = existantes({ ...profil, ceremonies: ["CIVILE", "LAIQUE"] });
    const ajout = planifierMiseAJour(existantes(profil), MODELE_TACHES, { ...profil, ceremonies: ["CIVILE", "LAIQUE"] });
    expect(ajout.aCreer.map((t) => t.modeleId)).toEqual(expect.arrayContaining(["T014", "T116", "T117"]));
    const retrait = planifierMiseAJour(avecLaique, MODELE_TACHES, profil);
    expect(retrait.aMasquer).toEqual(expect.arrayContaining(["T014", "T116", "T117"]));
  });

  it("réaffiche une tâche masquée par une règle, mais pas une tâche masquée par le couple", () => {
    const base = existantes(profil);
    const masquees = base.map((e) =>
      e.modeleId === "T012" ? { ...e, masquee: true } : e.modeleId === "T019" ? { ...e, masquee: true, masqueeParLeCouple: true } : e,
    );
    const maj = planifierMiseAJour(masquees, MODELE_TACHES, profil);
    expect(maj.aReafficher).toContain("T012");
    expect(maj.aReafficher).not.toContain("T019");
  });
});
