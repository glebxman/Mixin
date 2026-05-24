import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findStudentByUserId } from "../students/students.service.js";

const subjectIdParamSchema = z.object({ subjectId: z.string().uuid() });

export async function progressRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }
      const list = await app.prisma.subjectProgress.findMany({
        where: { studentId: student.id },
        include: { subject: true },
      });
      return {
        success: true,
        data: list.map((p) => ({
          subjectId: p.subjectId,
          subject: p.subject.nameRu,
          score: p.score,
          weakTopics: p.weakTopics,
          lastSyncedAt: p.lastSyncedAt,
        })),
      };
    },
  );

  app.get<{ Params: { subjectId: string } }>(
    "/:subjectId",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const params = subjectIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid subjectId" });
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply.status(404).send({ success: false, error: "Student profile not found" });
      }
      const progress = await app.prisma.subjectProgress.findUnique({
        where: {
          studentId_subjectId: {
            studentId: student.id,
            subjectId: params.data.subjectId,
          },
        },
        include: { subject: true },
      });
      if (!progress) {
        return reply.status(404).send({ success: false, error: "Progress not found" });
      }
      return { success: true, data: progress };
    },
  );
}
