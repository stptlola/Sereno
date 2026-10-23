"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Message } from "@/components/ui";
import { CLE_STOCKAGE_DEMARRAGE } from "@/domain/mariage/reponses";
import { creerMariageDepuisDemarrage } from "../actions/mariage";

export function Enregistrement() {
  const router = useRouter();
  const lance = useRef(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    let reponses: unknown = null;
    try {
      reponses = JSON.parse(localStorage.getItem(CLE_STOCKAGE_DEMARRAGE) ?? "null");
    } catch {
      reponses = null;
    }
    if (!reponses) {
      router.replace("/commencer");
      return;
    }
    creerMariageDepuisDemarrage(reponses).then((r) => {
      if (r.ok) {
        localStorage.removeItem(CLE_STOCKAGE_DEMARRAGE);
        router.replace("/tableau-de-bord");
      } else setErreur(r.message);
    });
  }, [router]);

  return erreur ? <Message>{erreur}</Message> : <p className="text-ink-muted">Nous préparons votre planning…</p>;
}
