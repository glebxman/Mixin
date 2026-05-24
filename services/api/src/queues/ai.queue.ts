import { Queue } from "bullmq";

export const aiQueue = new Queue("ai-tasks", {
  connection: { url: process.env.REDIS_URL },
});

export const AI_JOB_TYPES = {
  CHAT: "chat",
  GENERATE_QUEST: "generate-quest",
  CAREER_RECOMMEND: "career-recommend",
} as const;
