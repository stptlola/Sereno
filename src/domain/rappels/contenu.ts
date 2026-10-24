import type { EmailRappel } from "./rappels";

// Texte des e-mails de rappel, dans la voix Sereno : chaleureux, concret, jamais culpabilisant.

const formatJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function contenuRappel(e: EmailRappel, prenom: string): string {
  const parties = [`Bonjour ${prenom},`];
  if (e.echeances.length) {
    parties.push(
      e.echeances.length === 1
        ? `Une échéance importante arrive dans une semaine : ${e.echeances[0]!.titre.toLowerCase()}, prévue le ${formatJour.format(e.echeances[0]!.echeance!)}.`
        : `Quelques échéances importantes arrivent dans une semaine :\n${e.echeances.map((t) => `• ${t.titre}`).join("\n")}`,
    );
  }
  if (e.priorites.length) {
    parties.push(
      `${e.type === "mensuel" ? "Pour ce mois-ci" : "Cette semaine"}, voici vos prochaines étapes :\n${e.priorites
        .map((t) => `• ${t.titre}${t.echeance ? ` (${formatJour.format(t.echeance)})` : ""}`)
        .join("\n")}`,
    );
  }
  parties.push(e.type === "mensuel" ? "Rien ne presse : vous avez de l’avance. Profitez-en." : "Une chose à la fois, et tout se fera.");
  return parties.join("\n\n");
}
