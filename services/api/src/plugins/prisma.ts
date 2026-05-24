import fp from "fastify-plugin";
import { PrismaClient } from "@edtech/db";

export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}, { name: "prisma" });

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
