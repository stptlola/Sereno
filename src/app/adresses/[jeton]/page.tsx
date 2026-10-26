import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FormulaireAdresse } from "./formulaire";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Votre adresse", robots: { index: false, follow: false } };

/** Formulaire public de collecte d'adresses (M4-11), ouvert par le lien que le couple partage. */
export default async function PageAdresse({ params, searchParams }: { params: Promise<{ jeton: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { jeton } = await params;
  const { merci } = await searchParams;
  const mariage = await db.wedding.findUnique({ where: { addressToken: jeton } });
  if (!mariage) notFound();
  const prenoms = [mariage.partner1Name, mariage.partner2Name].filter(Boolean).join(" & ");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-2 rounded-md bg-ink px-6 py-10 text-center text-surface">
        <p className="text-sm tracking-widest text-or uppercase">Bientôt dans votre boîte aux lettres</p>
        <h1 className="font-display text-4xl">{prenoms}</h1>
        <p className="text-grege">préparent leurs faire-part. Laissez-leur votre adresse, cela prend une minute.</p>
      </div>
      {merci ? (
        <p role="status" className="rounded-md bg-surface-soft p-5 text-center">
          <span className="block font-display text-2xl">Merci !</span>
          Votre adresse est bien arrivée. Si quelqu’un d’autre de votre foyer reçoit ce lien, inutile de la renvoyer.
        </p>
      ) : (
        <FormulaireAdresse jeton={jeton} />
      )}
    </main>
  );
}
