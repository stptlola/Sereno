import type { Metadata } from "next";
import Link from "next/link";
import { Demarrage } from "./demarrage";

export const metadata: Metadata = { title: "Commencer · Sereno" };

export default function PageCommencer() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-6 py-10">
      <Link href="/" className="text-sm font-semibold tracking-widest text-bronze uppercase">
        sereno
      </Link>
      <Demarrage />
    </main>
  );
}
