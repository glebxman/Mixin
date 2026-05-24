import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok" }));


const port = parseInt(process.env.INTEGRATIONS_SERVICE_PORT || "3003", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Integrations service running on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
