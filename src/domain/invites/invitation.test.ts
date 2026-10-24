import { describe, expect, it } from "vitest";
import { estAccompagnantAConfirmer, preparerInvitation } from "./invitation";

describe("ajout par invitation", () => {
  it("une personne seule n'a pas de foyer", () => {
    const r = preparerInvitation("personne", [{ prenom: " Zoé ", nom: "Durand", enfant: false }], "", false);
    expect(r).toEqual({ foyer: null, personnes: [{ prenom: "Zoé", nom: "Durand", enfant: false, aConfirmer: false }] });
  });

  it("l'accompagnant devient une vraie personne, à nommer plus tard", () => {
    const r = preparerInvitation("personne", [{ prenom: "Zoé", nom: "Durand", enfant: false }], "", true);
    if ("erreur" in r) throw new Error(r.erreur);
    expect(r.foyer).toBe("Zoé Durand et son accompagnant");
    expect(r.personnes[1]).toMatchObject({ prenom: "Accompagnant de Zoé", nom: null, aConfirmer: true });
    expect(estAccompagnantAConfirmer(r.personnes[1]!.prenom)).toBe(true);
  });

  it("un couple qui partage un nom forme un foyer « Zoé et Paul Durand »", () => {
    const r = preparerInvitation("couple", [{ prenom: "Zoé", nom: "", enfant: false }, { prenom: "Paul", nom: "", enfant: false }], "Durand", false);
    if ("erreur" in r) throw new Error(r.erreur);
    expect(r.foyer).toBe("Zoé et Paul Durand");
    expect(r.personnes.map((p) => p.nom)).toEqual(["Durand", "Durand"]);
  });

  it("un couple aux noms différents garde chaque nom", () => {
    const r = preparerInvitation("couple", [{ prenom: "Zoé", nom: "Durand", enfant: false }, { prenom: "Inès", nom: "Moreau", enfant: false }], "", false);
    if ("erreur" in r) throw new Error(r.erreur);
    expect(r.foyer).toBe("Zoé Durand et Inès Moreau");
  });

  it("une famille ignore les lignes vides et garde les enfants", () => {
    const r = preparerInvitation(
      "famille",
      [
        { prenom: "Zoé", nom: "", enfant: false },
        { prenom: "Paul", nom: "", enfant: false },
        { prenom: "Hugo", nom: "", enfant: true },
        { prenom: "", nom: "", enfant: false },
      ],
      "Durand",
      false,
    );
    if ("erreur" in r) throw new Error(r.erreur);
    expect(r.foyer).toBe("Famille Durand");
    expect(r.personnes).toHaveLength(3);
    expect(r.personnes[2]?.enfant).toBe(true);
  });

  it("une famille d'une seule personne n'a pas de foyer (pas d'erreur)", () => {
    const r = preparerInvitation("famille", [{ prenom: "Paul", nom: "", enfant: true }, { prenom: "", nom: "", enfant: false }], "Lefèvre", false);
    expect(r).toEqual({ foyer: null, personnes: [{ prenom: "Paul", nom: "Lefèvre", enfant: true, aConfirmer: false }] });
  });

  it("refuse un couple incomplet ou une invitation vide", () => {
    expect(preparerInvitation("couple", [{ prenom: "Zoé", nom: "", enfant: false }], "", false)).toHaveProperty("erreur");
    expect(preparerInvitation("famille", [{ prenom: " ", nom: "", enfant: false }], "Durand", false)).toHaveProperty("erreur");
  });
});
