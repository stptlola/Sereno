import { describe, expect, it } from "vitest";
import { compter, doublonDe, importer, lireCsv, repartition, versCsv, type Invite } from "./invites";

const inv = (x: Partial<Invite>): Invite => ({ prenom: "A", nom: null, cote: "COMMUN", lien: null, age: "ADULTE", email: null, reponse: "EN_ATTENTE", regimes: [], accompagnant: false, moments: [], ...x });

describe("compteurs", () => {
  const c = compter([
    inv({ reponse: "PRESENT", accompagnant: true, moments: ["diner"], cote: "PARTENAIRE_1" }),
    inv({ reponse: "PRESENT", regimes: ["Végan"], moments: ["diner", "brunch"], cote: "PARTENAIRE_2" }),
    inv({ reponse: "ABSENT", cote: "PARTENAIRE_2" }),
    inv({ age: "ENFANT", cote: "PARTENAIRE_1" }),
  ]);
  it("compte un « +1 » comme une personne de plus", () => {
    expect(c.personnes).toBe(5);
    expect(c.presents).toBe(3);
    expect(c.absents).toBe(1);
    expect(c.enAttente).toBe(1);
  });
  it("compte enfants, repas spéciaux et moments des présents", () => {
    expect(c.enfants).toBe(1);
    expect(c.repasSpeciaux).toBe(1);
    expect(c.parMoment).toEqual({ diner: 3, brunch: 1 });
  });
  it("donne une répartition par côté qui fait 100 %", () => {
    const r = repartition(c.parCote);
    expect(r.p1 + r.p2 + r.commun).toBe(100);
    expect(r.p1).toBe(60);
  });
});

describe("doublons", () => {
  const existants = [{ id: "g1", prenom: "Camille", nom: "Martin", email: "camille@exemple.fr" }];
  it("reconnaît un même nom, sans tenir compte des accents ni des majuscules", () => {
    expect(doublonDe({ prenom: "camille", nom: "MARTIN", email: null }, existants)).toBe("g1");
  });
  it("reconnaît une même adresse e-mail", () => {
    expect(doublonDe({ prenom: "Cam", nom: null, email: "Camille@exemple.fr" }, existants)).toBe("g1");
  });
  it("ne signale pas deux prénoms identiques sans nom", () => {
    expect(doublonDe({ prenom: "Camille", nom: null, email: null }, existants)).toBeNull();
  });
});

describe("export et import CSV", () => {
  it("échappe les points-virgules et guillemets, avec la marque UTF-8 pour Excel", () => {
    const csv = versCsv([
      { prenom: "Zoé", nom: 'O"Neil; Jr', cote: "Léa", lien: "Ami", enfant: false, listeB: true, reponse: "Présent", plat: "Poisson", regimes: ["Végan"], allergies: null, email: null, telephone: null, foyer: null, adresse: "12 rue des Lys\n69002 LYON", table: "3" },
    ]);
    expect(csv.startsWith("\uFEFFPrénom;Nom")).toBe(true);
    // L'adresse tient sur une ligne dans le tableur.
    expect(lireCsv(csv)[1]).toEqual(["Zoé", 'O"Neil; Jr', "Léa", "Ami", "Non", "B", "Présent", "Poisson", "Végan", "", "", "", "", "12 rue des Lys, 69002 LYON", "3"]);
  });

  it("reconnaît les colonnes dans n'importe quel ordre et liste les erreurs ligne par ligne", () => {
    const texte = "E-mail,prenom,NOM,Côté,Enfant,Régime\nzoe@ex.fr,Zoé,Durand,Sam,non,végan\nmauvais,Paul,,Léa,oui,\n,,Sans prénom,,,\n";
    const r = importer(texte, { p1: "Léa", p2: "Sam" });
    expect(r.invites).toHaveLength(2);
    expect(r.invites[0]).toMatchObject({ prenom: "Zoé", nom: "Durand", cote: "PARTENAIRE_2", regimes: ["Végan"], email: "zoe@ex.fr", age: "ADULTE" });
    expect(r.invites[1]).toMatchObject({ prenom: "Paul", cote: "PARTENAIRE_1", age: "ENFANT", email: null });
    expect(r.erreurs.map((e) => e.ligne)).toEqual([3, 4]);
  });

  it("refuse un fichier sans colonne Prénom", () => {
    expect(importer("Nom;Email\nMartin;a@b.fr", { p1: "Léa", p2: null }).erreurs[0]?.message).toContain("Prénom");
  });

  it("relit son propre export", () => {
    const csv = versCsv([{ prenom: "Zoé", nom: "Durand", cote: "Sam", lien: "Ami proche", enfant: false, reponse: "Présent", regimes: ["Sans gluten"], allergies: "Noix", email: "zoe@ex.fr", telephone: "0600000000", foyer: "Famille Durand", table: null }]);
    const r = importer(csv, { p1: "Léa", p2: "Sam" });
    expect(r.erreurs).toEqual([]);
    expect(r.invites[0]).toMatchObject({ prenom: "Zoé", cote: "PARTENAIRE_2", lien: "amiProche", reponse: "PRESENT", regimes: ["Sans gluten"], allergies: "Noix", foyer: "Famille Durand" });
  });
});
