import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Utilisé par le healthcheck Docker et par Coolify : 200 si l'application et la base répondent. */
export async function GET() {
  const debut = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ statut: "ok", base: "ok", dureeMs: Date.now() - debut });
  } catch {
    return Response.json({ statut: "degrade", base: "injoignable" }, { status: 503 });
  }
}
