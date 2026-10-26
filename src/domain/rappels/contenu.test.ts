import { describe, expect, it } from "vitest";
import { signer, verifier } from "@/lib/signature";
import { jour } from "../planning/dates";
import { contenuRappel } from "./contenu";

describe("contenu des rappels", () => {
  it("annonce l'échéance puis les priorités, sans culpabiliser", () => {
    const t = { id: "a", titre: "Déposer le dossier de mariage à la mairie", echeance: jour(2026, 11, 2), faite: false, repere: "LEGAL" };
    const texte = contenuRappel({ userId: "u", email: "e", type: "hebdo+echeance", sujet: "", priorites: [t], echeances: [t], paiements: [] }, "Léa");
    expect(texte).toContain("Bonjour Léa");
    expect(texte).toContain("prévue le lundi 2 novembre");
    expect(texte).toContain("Cette semaine");
    expect(texte).not.toMatch(/retard|urgent/i);
  });
});

describe("liens signés", () => {
  it("accepte la bonne signature et refuse toute modification", () => {
    const s = signer("secret-de-test-assez-long", "u1:hebdo");
    expect(verifier("secret-de-test-assez-long", "u1:hebdo", s)).toBe(true);
    expect(verifier("secret-de-test-assez-long", "u2:hebdo", s)).toBe(false);
    expect(verifier("autre-secret", "u1:hebdo", s)).toBe(false);
    expect(verifier("secret-de-test-assez-long", "u1:hebdo", "abc")).toBe(false);
  });
});
