import type { FastifyInstance } from "fastify";
import { z, ZodError } from "zod";

const idParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * SECURITY: Body-схема ОБЯЗАТЕЛЬНО whitelist.
 * Нельзя позволить изменение role/passwordHash/subscriptionPlan через этот endpoint
 * — это привело бы к privilege escalation.
 */
const patchUserSchema = z.object({
  isActive: z.boolean().optional(),
});

/**
 * Users — только для SUPER_ADMIN. Обычные пользователи читают/обновляют
 * свой профиль через /api/auth/me и /api/students/me.
 */
export async function usersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async () => {
      const users = await app.prisma.user.findMany({
        where: { deletedAt: null },
        include: { profile: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return {
        success: true,
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt.toISOString(),
          profile: u.profile
            ? { firstName: u.profile.firstName, lastName: u.profile.lastName }
            : null,
        })),
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: params.data.id },
        include: {
          profile: true,
          studentProfile: true,
          parentProfile: true,
        },
      });
      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }
      const { passwordHash: _omit, ...safe } = user;
      return { success: true, data: safe };
    },
  );

  app.patch<{ Params: { id: string }; Body: { isActive?: boolean } }>(
    "/:id",
    { preHandler: [app.authenticate, app.requireRole("SUPER_ADMIN")] },
    async (request, reply) => {
      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      let body;
      try {
        body = patchUserSchema.parse(request.body);
      } catch (err) {
        const msg =
          err instanceof ZodError ? err.errors[0]?.message : "Invalid payload";
        return reply.status(400).send({ success: false, error: msg });
      }

      // Нельзя задеактивировать самого себя — защита от случайного lockout.
      if (
        params.data.id === request.authUser!.userId &&
        body.isActive === false
      ) {
        return reply
          .status(400)
          .send({ success: false, error: "Cannot deactivate yourself" });
      }

      const updated = await app.prisma.user.update({
        where: { id: params.data.id },
        data: { isActive: body.isActive },
      });
      const { passwordHash: _omit, ...safe } = updated;
      return reply.send({ success: true, data: safe });
    },
  );
}
