/**
 * BullMQ worker for the ``ai-tasks`` queue.
 *
 * The queue currently has no production producer; we still register a
 * worker so the runtime invariant — every Worker_Queue has a matching
 * worker handler at startup (R9.1, R9.4) — holds. The handler dispatches
 * by ``AI_JOB_TYPES`` and is intentionally a no-op for unknown job
 * names so future producers can be added without re-wiring the bootstrap.
 */

import { Worker } from "bullmq";
import { AI_JOB_TYPES, aiQueue } from "../queues/ai.queue.js";

export function createAiWorker(redisUrl: string): Worker {
  return new Worker(
    aiQueue.name,
    async (job) => {
      switch (job.name) {
        case AI_JOB_TYPES.CHAT:
        case AI_JOB_TYPES.GENERATE_QUEST:
        case AI_JOB_TYPES.CAREER_RECOMMEND:
          // No production producer enqueues these jobs yet. The worker
          // exists to satisfy the registered-handler invariant; when a
          // producer lands, replace this branch with the real dispatch.
          return { skipped: true, reason: "no-op handler" };
        default:
          return { skipped: true, reason: `unknown job ${job.name}` };
      }
    },
    {
      connection: { url: redisUrl },
    },
  );
}
