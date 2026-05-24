import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ROLE_COOKIE,
} from "@edtech/config";
import { clearSessionCookie } from "../../plugins/auth.js";

/**
 * Эндпоинты текущего пользователя:
 *   GET    /me — профиль
 *   PATCH  /me — обновить firstName/lastName/language
 *   DELETE /me — soft-delete аккаунта (deletedAt = now)
 *
 * Живут отдельно от auth.routes, чтобы фронт мог проверять текущего пользователя
 * без редиректа.
 */

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(64).optional(),
  lastName: z.string().min(1).max(64).optional(),
  language: z.enum(["ru", "uz", "en"]).optional(),
});

function clearAuthCookies(reply: import("fastify").FastifyReply) {
  clearSessionCookie(reply, ACCESS_TOKEN_COOKIE);
  clearSessionCookie(reply, REFRESH_TOKEN_COOKIE);
  clearSessionCookie(reply, ROLE_COOKIE);
}

export async function authMeRoute(app: FastifyInstance) {
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.authUser!.userId },
        include: {
          profile: true,
          studentProfile: true,
          parentProfile: true,
        },
      });

      if (!user || user.deletedAt) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      const { passwordHash: _omit, ...safeUser } = user;
      return { success: true, data: safeUser };
    },
  );

  app.patch(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parse = updateMeSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          success: false,
          error: parse.error.errors[0]?.message ?? "Invalid payload",
        });
      }

      const userId = request.authUser!.userId;
      const data = parse.data;

      // SECURITY: профиль обновляем только если поле есть в payload.
      if (data.firstName || data.lastName || data.language) {
        await app.prisma.profile.update({
          where: { userId },
          data: {
            ...(data.firstName !== undefined && { firstName: data.firstName }),
            ...(data.lastName !== undefined && { lastName: data.lastName }),
            ...(data.language !== undefined && { language: data.language }),
          },
        });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }
      const { passwordHash: _omit, ...safeUser } = user;
      return { success: true, data: safeUser };
    },
  );

  app.delete(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.authUser!.userId;

      // Soft-delete: сохраняем данные, но помечаем deletedAt.
      await app.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: `deleted-${userId}@deleted.local`,
        },
      });

      clearAuthCookies(reply);
      return { success: true, data: null };
    },
  );
}
