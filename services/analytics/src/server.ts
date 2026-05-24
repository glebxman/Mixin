import Fastify from "fastify";
import cors from "@fastify/cors";
import { clickhouse } from "./clickhouse.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok" }));

app.get("/api/analytics/overview", async () => {
  // TODO: implement analytics queries
  return { totalStudents: 0, activeToday: 0, questsCompleted: 0 };
});

const port = parseInt(process.env.ANALYTICS_SERVICE_PORT || "3002", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Analytics service running on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
