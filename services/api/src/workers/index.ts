/**
 * Central registry of BullMQ queues and their worker handlers (R9).
 *
 * ``registerWorkers(redisUrl)`` instantiates one Worker per Queue
 * created in ``services/api/src/queues/`` and returns the registry so
 * the test harness (F.5) and runtime assertion can verify that every
 * Worker_Queue has a matching worker handler.
 */

import type { Worker } from "bullmq";
import { aiQueue } from "../queues/ai.queue.js";
import { createAiWorker } from "./ai.worker.js";

export type WorkerRegistry = {
  queues: string[];
  workers: string[];
  handles: Worker[];
};

let registry: WorkerRegistry = { queues: [], workers: [], handles: [] };

export function registerWorkers(redisUrl: string): WorkerRegistry {
  const handles: Worker[] = [createAiWorker(redisUrl)];
  registry = {
    queues: [aiQueue.name],
    workers: handles.map((w) => w.name),
    handles,
  };
  return registry;
}

export function getWorkerRegistry(): WorkerRegistry {
  return registry;
}

export async function shutdownWorkers(): Promise<void> {
  for (const w of registry.handles) {
    await w.close();
  }
  registry = { queues: [], workers: [], handles: [] };
}
