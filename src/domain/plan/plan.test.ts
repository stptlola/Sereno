import { describe, expect, it } from "vitest";
import { alertes, groupes, proposerPlan, type InvitePlan, type TablePlan } from "./plan";

const i = (id: string, x: Partial<InvitePlan> = {}): InvitePlan => ({ id, nom: id, foyer: null, cote: "COMMUN", lien: "ami", enfant: false, accompagnant: false, accessibilite: false, tableId: null, ...x });
const t = (id: string, places: number, x = 0, y = 0, honneur = false): TablePlan => ({ id, nom: `Table ${id}`, places, honneur, x, y });
const opt = { garderPlaces: false, melangerCotes: true, sorties: [] as { x: number; y: number }[] };
const tableDe = (p: ReturnType<typeof proposerPlan>, id: string) => p.placements.find((x) => x.inviteId === id)?.tableId;

describe("groupes à placer ensemble", () => {
  it("réunit un foyer et les invités liés par une contrainte « ensemble »", () => {
    const g = groupes([i("a", { foyer: "F" }), i("b", { foyer: "F" }), i("c"), i("d")], [{ a: "c", b: "d", type: "ENSEMBLE" }]);
    expect(g.map((x) => x.map((y) => y.id).sort().join(""))).toEqual(expect.arrayContaining(["ab", "cd"]));
  });
});

describe("proposition de placement", () => {
  it("garde les foyers ensemble et respecte les capacités, « + 1 » compris", () => {
    const p = proposerPlan([i("a", { foyer: "F", accompagnant: true }), i("b", { foyer: "F" }), i("c"), i("d")], [t("1", 3), t("2", 4)], [], opt);
    expect(tableDe(p, "a")).toBe(tableDe(p, "b"));
    expect(p.nonPlaces).toEqual([]);
    expect(p.placements.find((x) => x.inviteId === "a")?.raison).toBe("Avec son foyer");
  });

  it("sépare les invités à séparer", () => {
    const p = proposerPlan([i("a"), i("b")], [t("1", 8), t("2", 8)], [{ a: "a", b: "b", type: "SEPARES" }], opt);
    expect(tableDe(p, "a")).not.toBe(tableDe(p, "b"));
  });

  it("place près d'une sortie ceux qui en ont besoin, et les proches près de la table d'honneur", () => {
    const tables = [t("h", 2, 0, 0, true), t("pres", 8, 10, 0), t("loin", 8, 100, 0), t("sortie", 8, 200, 0)];
    const p = proposerPlan([i("mamie", { accessibilite: true }), i("papa", { lien: "parent" })], tables, [], { ...opt, sorties: [{ x: 210, y: 0 }] });
    expect(tableDe(p, "mamie")).toBe("sortie");
    expect(tableDe(p, "papa")).toBe("pres");
    expect(p.placements.find((x) => x.inviteId === "mamie")?.raison).toBe("Près d’une sortie");
  });

  it("ne place personne à la table d'honneur et garde les placements choisis si demandé", () => {
    const p = proposerPlan([i("a", { tableId: "2" }), i("b")], [t("h", 4, 0, 0, true), t("2", 4)], [], { ...opt, garderPlaces: true });
    expect(tableDe(p, "a")).toBe("2");
    expect(p.placements.find((x) => x.inviteId === "a")?.raison).toBe("Placé par vous");
    expect(p.placements.some((x) => x.tableId === "h")).toBe(false);
  });

  it("regroupe par affinités : les collègues avec les collègues", () => {
    const p = proposerPlan([i("c1", { lien: "collegue" }), i("a1", { lien: "ami" }), i("c2", { lien: "collegue" }), i("a2", { lien: "ami" })], [t("1", 2), t("2", 2)], [], opt);
    expect(tableDe(p, "c1")).toBe(tableDe(p, "c2"));
  });

  it("installe les mariés à la table d'honneur, et les garde ensemble sinon", () => {
    const avecHonneur = proposerPlan([i("lea", { marie: true }), i("sam", { marie: true }), i("a")], [t("h", 2, 0, 0, true), t("1", 8)], [], opt);
    expect(tableDe(avecHonneur, "lea")).toBe("h");
    expect(tableDe(avecHonneur, "sam")).toBe("h");
    expect(avecHonneur.placements.find((x) => x.inviteId === "lea")?.raison).toBe("À la table d’honneur");
    const sans = proposerPlan([i("lea", { marie: true }), i("sam", { marie: true }), i("a"), i("b")], [t("1", 2), t("2", 2)], [], opt);
    expect(tableDe(sans, "lea")).toBe(tableDe(sans, "sam"));
  });

  it("signale les invités qui ne trouvent pas de place", () => {
    const p = proposerPlan([i("a"), i("b"), i("c")], [t("1", 2)], [], opt);
    expect(p.nonPlaces).toHaveLength(1);
  });
});

describe("alertes", () => {
  it("signale table trop pleine, invités à séparer réunis, enfant seul et invités sans table", () => {
    const inv = [
      i("a", { tableId: "1", accompagnant: true }),
      i("b", { tableId: "1" }),
      i("e", { tableId: "2", enfant: true, foyer: "F" }),
      i("p", { tableId: "1", foyer: "F" }),
      i("z"),
    ];
    const msgs = alertes(inv, [t("1", 3), t("2", 8)], [{ a: "a", b: "b", type: "SEPARES" }]).map((x) => x.message);
    expect(msgs).toEqual([
      "Table 1 : 4 personnes pour 3 places.",
      "e est à la Table 2, sans adulte de son foyer.",
      "a et b sont à la même table, alors que vous souhaitiez les séparer.",
      "1 invité n’a pas encore de table.",
    ]);
  });
});
