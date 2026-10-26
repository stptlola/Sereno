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

  it("retire « Famille » tapé dans le nom commun", () => {
    const r = preparerInvitation("couple", [{ prenom: "Sylvie", nom: "", enfant: false }, { prenom: "Christian", nom: "", enfant: false }], "Famille Lecerf", false);
    if ("erreur" in r) throw new Error(r.erreur);
    expect(r.foyer).toBe("Sylvie et Christian Lecerf");
    expect(r.personnes.map((p) => p.nom)).toEqual(["Lecerf", "Lecerf"]);
    const f = preparerInvitation("famille", [{ prenom: "Léa", nom: "", enfant: false }], "la famille Meurisse", false);
    if ("erreur" in f) throw new Error(f.erreur);
    expect(f.personnes[0]?.nom).toBe("Meurisse");
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

import { regrouperParInvitation } from "./invitation";

describe("liste par invitation", () => {
  const m = (id: string, prenom: string, x: Partial<Parameters<typeof regrouperParInvitation>[0][number]> = {}) => ({
    id, prenom, nom: "Meurisse", foyerId: null as string | null, foyer: null as string | null, enfant: false, reponse: "EN_ATTENTE" as const, cote: "PARTENAIRE_1", lien: "famille", ...x,
  });

  it("regroupe un foyer sur une seule ligne, adultes d'abord", () => {
    const [inv] = regrouperParInvitation([m("1", "Marc", { foyerId: "f", foyer: "Famille Meurisse", enfant: true }), m("2", "Léa", { foyerId: "f", foyer: "Famille Meurisse" }), m("3", "Lily", { foyerId: "f", foyer: "Famille Meurisse" })]);
    expect(inv?.titre).toBe("Famille Meurisse");
    expect(inv?.prenoms).toBe("Léa, Lily et Marc");
    expect(inv?.membres).toHaveLength(3);
  });

  it("une personne seule garde son nom complet, sans liste de prénoms", () => {
    const [inv] = regrouperParInvitation([m("1", "Sylvie", { nom: "Cerf" })]);
    expect(inv).toMatchObject({ titre: "Sylvie Cerf", prenoms: "" });
  });

  it("garde l'ordre de saisie du couple", () => {
    const [inv] = regrouperParInvitation([m("1", "Katy", { foyerId: "f", foyer: "Katy et Hervé Stephant" }), m("2", "Hervé", { foyerId: "f", foyer: "Katy et Hervé Stephant" })]);
    expect(inv?.prenoms).toBe("Katy et Hervé");
  });

  it("signale des réponses différentes au sein d'un foyer", () => {
    const [inv] = regrouperParInvitation([m("1", "Katy", { foyerId: "f", foyer: "Katy et Hervé Stephant", reponse: "PRESENT" }), m("2", "Hervé", { foyerId: "f", foyer: "Katy et Hervé Stephant", reponse: "ABSENT" })]);
    expect(inv?.reponse).toBe("MIXTE");
    expect(inv?.titre).toBe("Katy et Hervé Stephant");
  });
});
