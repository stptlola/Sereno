import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PiedDePage } from "@/components/page-legale";
import { sessionCourante } from "@/lib/session";
import { FormulaireContact } from "./formulaire";

export const metadata: Metadata = { title: "Contact · Sereno" };
export const dynamic = "force-dynamic";

export default async function PageContact() {
  const session = await sessionCourante();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-6 py-10">
      <Link href={session ? "/tableau-de-bord" : "/"} aria-label="Sereno" className="text-ink">
        <Logo className="h-7 w-auto" />
      </Link>
      <div>
        <h1 className="font-display text-3xl">Nous écrire</h1>
        <p className="mt-1 text-ink-muted">Une question, une idée, un souci ? On lit tout, et on vous répond, en général sous deux jours ouvrés.</p>
      </div>
      <FormulaireContact nom={session?.user.name ?? ""} email={session?.user.email ?? ""} />
      <PiedDePage />
    </main>
  );
}
