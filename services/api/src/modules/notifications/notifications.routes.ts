import type { FastifyInstance } from "fastify";
import { z } from "zod";

const idParamSchema = z.object({ id: z.string().uuid() });

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, async (request) => {
    const list = await app.prisma.notification.findMany({
      where: { userId: request.authUser!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true, data: list };
  });

  app.patch<{ Params: { id: string } }>(
    "/:id/read",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      // Атомарный update с проверкой владения — без race condition между
      // findUnique и update. Если запись не моя — updateMany вернёт count=0.
      const result = await app.prisma.notification.updateMany({
        where: { id: params.data.id, userId: request.authUser!.userId },
        data: { isRead: true },
      });

      if (result.count === 0) {
        // Не различаем "не найдено" и "чужое" — защита от ID enumeration.
        return reply.status(404).send({ success: false, error: "Not found" });
      }

      return { success: true };
    },
  );
}
