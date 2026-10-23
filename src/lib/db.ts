import "server-only";
import { PrismaClient } from "@prisma/client";

// Une seule instance, réutilisée entre les rechargements à chaud en développement.
const globale = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globale.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globale.prisma = db;
