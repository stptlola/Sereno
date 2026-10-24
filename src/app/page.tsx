import Link from "next/link";
import { PiedDePage } from "@/components/page-legale";

export default async function Accueil({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { compte } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      {compte === "supprime" && (
        <p role="status" className="rounded-md bg-surface-soft p-4 text-sm">
          Votre compte a bien été supprimé. Merci d’avoir organisé votre mariage avec Sereno, et tous nos vœux de bonheur.
        </p>
      )}
      <p className="text-sm font-semibold tracking-widest text-bronze uppercase">sereno</p>
      <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
        Votre mariage, l’esprit léger.
      </h1>
      <p className="max-w-xl text-lg text-ink-muted">
        Un planning qui s’adapte à votre date, votre budget sous contrôle et vos invités au même endroit.
        Vraiment gratuit pour commencer, sans pub ni démarchage.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/commencer"
          className="inline-flex items-center rounded-full bg-ink px-6 py-3 font-semibold text-surface transition hover:bg-bronze"
        >
          Commencer
        </Link>
        <Link href="/connexion" className="text-sm font-semibold text-bronze underline">
          J’ai déjà un compte
        </Link>
      </div>
      <PiedDePage />
    </main>
  );
}
