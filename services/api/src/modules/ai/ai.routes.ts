import { Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
import { findStudentByUserId } from "../students/students.service.js";
import {
  AIServiceResponse,
  STREAM_CHUNK_SIZE,
  STREAM_DELAY_MS,
  callAIService,
  chatSchema,
  consumeChatCredits,
  encodeStreamEvent,
  enforceChatRateLimit,
  getStudentFirstName,
  loadOrCreateSession,
  persistChatTurn,
  resolveStudentAndUser,
  sessionIdParamSchema,
  sleep,
} from "./ai.shared.js";

export async function aiRoutes(app: FastifyInstance) {
  // ─── POST /chat — non-streaming endpoint ───
  app.post(
    "/chat",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const parse = chatSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          success: false,
          error: parse.error.errors[0]?.message ?? "Invalid payload",
        });
      }
      const payload = parse.data;
      const userId = request.authUser!.userId;

      const su = await resolveStudentAndUser(app, request, reply);
      if (!su) return;

      if (!(await enforceChatRateLimit(app, userId, su.subscriptionPlan, reply))) return;
      if (!(await consumeChatCredits(app, userId, su.subscriptionPlan, reply))) return;

      const sessionResult = await loadOrCreateSession(app, su.studentId, payload);
      if (!sessionResult.ok) {
        return reply.status(sessionResult.status).send({
          success: false,
          error: sessionResult.error,
        });
      }
      const { session, storedMessages, history } = sessionResult.ctx;

      let aiResult: AIServiceResponse;
      try {
        const studentFirstName = await getStudentFirstName(app, userId);
        aiResult = await callAIService({
          studentId: su.studentId,
          sessionId: session.id,
          payload,
          history,
          studentFirstName,
        });
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        const message = err instanceof Error ? err.message : "unknown";
        if (status && status >= 400 && status < 500) {
          app.log.warn({ status, message }, "ai-service responded with error");
        } else {
          app.log.error({ message }, "failed to call ai-service");
        }
        return reply.status(502).send({
          success: false,
          error: status
            ? "AI-сервис временно недоступен. Попробуйте позже."
            : "Не удалось связаться с AI-сервисом.",
        });
      }

      await persistChatTurn(app, {
        sessionId: session.id,
        studentId: su.studentId,
        storedMessages,
        payload,
        aiReply: aiResult.reply,
        tokensUsed: aiResult.tokens_used ?? 0,
      });

      return {
        success: true,
        data: {
          reply: aiResult.reply,
          tokensUsed: aiResult.tokens_used ?? 0,
          sessionId: session.id,
          actions: aiResult.actions,
          state: aiResult.state,
        },
      };
    },
  );

  // ─── POST /chat/stream — streaming endpoint ───
  app.post(
    "/chat/stream",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const parse = chatSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          success: false,
          error: parse.error.errors[0]?.message ?? "Invalid payload",
        });
      }
      const payload = parse.data;
      const userId = request.authUser!.userId;

      const su = await resolveStudentAndUser(app, request, reply);
      if (!su) return;

      if (!(await enforceChatRateLimit(app, userId, su.subscriptionPlan, reply))) return;

      const sessionResult = await loadOrCreateSession(app, su.studentId, payload);
      if (!sessionResult.ok) {
        return reply.status(sessionResult.status).send({
          success: false,
          error: sessionResult.error,
        });
      }
      const { session, storedMessages, history } = sessionResult.ctx;

      if (!(await consumeChatCredits(app, userId, su.subscriptionPlan, reply))) return;

      const studentFirstName = await getStudentFirstName(app, userId);
      const sessionId = session.id;
      const studentId = su.studentId;

      async function* streamEvents() {
        yield encodeStreamEvent({ type: "session", sessionId });

        try {
          const aiResult = await callAIService({
            studentId,
            sessionId,
            payload,
            history,
            studentFirstName,
          });
          const finalReply = aiResult.reply || "";

          for (let index = 0; index < finalReply.length; index += STREAM_CHUNK_SIZE) {
            const chunk = finalReply.slice(index, index + STREAM_CHUNK_SIZE);
            yield encodeStreamEvent({ type: "delta", content: chunk });
            await sleep(STREAM_DELAY_MS);
          }

          await persistChatTurn(app, {
            sessionId,
            studentId,
            storedMessages,
            payload,
            aiReply: finalReply,
            tokensUsed: aiResult.tokens_used ?? 0,
          });

          yield encodeStreamEvent({
            type: "done",
            sessionId,
            reply: finalReply,
            tokensUsed: aiResult.tokens_used ?? 0,
            actions: aiResult.actions,
            state: aiResult.state,
          });
        } catch (err) {
          const status = (err as Error & { status?: number }).status;
          const message = err instanceof Error ? err.message : "unknown";
          if (status && status >= 400 && status < 500) {
            app.log.warn({ status, message }, "ai-service responded with error");
          } else {
            app.log.error({ message }, "failed to stream ai-service response");
          }
          yield encodeStreamEvent({
            type: "error",
            error: status
              ? "AI-сервис временно недоступен. Попробуйте позже."
              : "Не удалось связаться с AI-сервисом.",
          });
        }
      }

      return reply
        .type("application/x-ndjson; charset=utf-8")
        .headers({
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        })
        .send(Readable.from(streamEvents()));
    },
  );

  // ─── GET /sessions — список сессий для сайдбара ───
  app.get(
    "/sessions",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply
          .status(404)
          .send({ success: false, error: "Student profile not found" });
      }

      // Достаём только title (первое user-сообщение) через SQL,
      // не загружая весь messages JSON для всех 50 сессий.
      const sessions = await app.prisma.$queryRaw<
        Array<{ id: string; title: string; createdAt: Date; updatedAt: Date }>
      >`
        SELECT
          id,
          COALESCE(
            LEFT(
              TRIM(
                (messages -> 0 ->> 'content')
              ),
              64
            ),
            'Новый чат'
          ) AS title,
          "createdAt",
          "updatedAt"
        FROM "AiSession"
        WHERE "studentId" = ${student.id}
        ORDER BY "updatedAt" DESC
        LIMIT 50
      `;

      const data = sessions.map((s) => ({
        id: s.id,
        title: s.title || "Новый чат",
        createdAt:
          s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt:
          s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      }));

      return { success: true, data };
    },
  );

  // ─── GET /sessions/:sessionId ───
  app.get<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const params = sessionIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply
          .status(404)
          .send({ success: false, error: "Student profile not found" });
      }

      const session = await app.prisma.aiSession.findUnique({
        where: { id: params.data.sessionId },
        select: {
          id: true,
          studentId: true,
          messages: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!session) {
        return reply
          .status(404)
          .send({ success: false, error: "Session not found" });
      }
      if (session.studentId !== student.id) {
        return reply.status(403).send({ success: false, error: "Forbidden" });
      }

      return { success: true, data: session };
    },
  );

  // ─── DELETE /sessions/:sessionId ───
  app.delete<{ Params: { sessionId: string } }>(
    "/sessions/:sessionId",
    { preHandler: [app.authenticate, app.requireRole("STUDENT")] },
    async (request, reply) => {
      const params = sessionIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ success: false, error: "Invalid id" });
      }

      const student = await findStudentByUserId(app.prisma, request.authUser!.userId);
      if (!student) {
        return reply
          .status(404)
          .send({ success: false, error: "Student profile not found" });
      }

      const deleted = await app.prisma.aiSession.deleteMany({
        where: { id: params.data.sessionId, studentId: student.id },
      });

      if (deleted.count === 0) {
        return reply
          .status(404)
          .send({ success: false, error: "Session not found" });
      }

      return { success: true, data: null };
    },
  );
}
