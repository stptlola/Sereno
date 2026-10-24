import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

// Envoi des e-mails par SMTP. Sans SMTP_HOST (développement), l'e-mail est affiché dans les logs.

let transport: Transporter | null | undefined;

function transporteur() {
  if (transport !== undefined) return transport;
  const e = env();
  transport = e.SMTP_HOST
    ? nodemailer.createTransport({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_PORT === 465,
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
      })
    : null;
  return transport;
}

export interface Courriel {
  a: string;
  sujet: string;
  texte: string;
  lien?: { libelle: string; url: string };
  /** Lien de désinscription en un clic, en bas de l'e-mail et dans l'en-tête List-Unsubscribe. */
  desinscription?: string;
  repondreA?: string;
}

const echapper = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function enHtml(c: Courriel): string {
  const paragraphes = c.texte
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px">${echapper(p)}</p>`)
    .join("");
  const bouton = c.lien
    ? `<p style="margin:24px 0"><a href="${echapper(c.lien.url)}" style="background:#2A2622;color:#F7F4EE;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">${echapper(c.lien.libelle)}</a></p>`
    : "";
  return `<div style="background:#F7F4EE;padding:32px 16px;font-family:Arial,sans-serif;color:#2A2622;font-size:16px;line-height:1.5">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-weight:700;letter-spacing:.08em;color:#7A5B21">SERENO</p>${paragraphes}${bouton}
<p style="margin:24px 0 0;font-size:13px;color:#665E56">Votre mariage, l’esprit léger.</p>${
    c.desinscription
      ? `<p style="margin:12px 0 0;font-size:12px;color:#665E56">Vous recevez cet e-mail car vous organisez votre mariage sur Sereno. <a href="${echapper(c.desinscription)}" style="color:#7A5B21">Ne plus recevoir ces e-mails</a>.</p>`
      : ""
  }</div></div>`;
}

export async function envoyer(c: Courriel): Promise<void> {
  const t = transporteur();
  const texte = [c.texte, c.lien && `${c.lien.libelle} : ${c.lien.url}`, c.desinscription && `Ne plus recevoir ces e-mails : ${c.desinscription}`].filter(Boolean).join("\n\n");
  if (!t) {
    console.info(`[e-mail non envoyé, SMTP non configuré] À : ${c.a} · ${c.sujet}\n${texte}`);
    return;
  }
  await t.sendMail({
    from: env().MAIL_FROM,
    to: c.a,
    replyTo: c.repondreA,
    subject: c.sujet,
    text: texte,
    html: enHtml(c),
    headers: c.desinscription ? { "List-Unsubscribe": `<${c.desinscription}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
  });
}
