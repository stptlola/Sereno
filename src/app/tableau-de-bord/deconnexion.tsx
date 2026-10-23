"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Deconnexion() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-ink-muted underline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
