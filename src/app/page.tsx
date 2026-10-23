import Link from "next/link";

export default function Accueil() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-semibold tracking-widest text-bronze uppercase">sereno</p>
      <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
        Votre mariage, l’esprit léger.
      </h1>
      <p className="max-w-xl text-lg text-ink-muted">
        Un planning qui s’adapte à votre date, votre budget sous contrôle et vos invités au même endroit.
        Vraiment gratuit pour commencer, sans pub ni démarchage.
      </p>
      <div>
        <Link
          href="/commencer"
          className="inline-flex items-center rounded-full bg-ink px-6 py-3 font-semibold text-surface transition hover:bg-bronze"
        >
          Commencer
        </Link>
      </div>
    </main>
  );
}
