import { PrismaClient } from "@prisma/client";

// Singleton: в Next dev (HMR) и при множественных импортах из workspace мы
// не плодим клиентов — иначе быстро упрёмся в pool_exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "info"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type { Prisma } from "@prisma/client";
