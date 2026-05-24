import { assertRequiredSecrets, API_REQUIRED_SECRETS } from "./bootstrap/required-secrets.js";
import { buildApp } from "./app.js";
import { validateEnv } from "./config.js";
import { registerWorkers } from "./workers/index.js";

assertRequiredSecrets(API_REQUIRED_SECRETS, process.env);

const env = validateEnv();

async function start() {
  const app = await buildApp();

  const workers = registerWorkers(env.REDIS_URL);
  app.log.info(
    { queues: workers.queues, workers: workers.workers },
    "BullMQ workers registered",
  );
  if (
    workers.queues.length !== workers.workers.length ||
    workers.queues.some((q, i) => q !== workers.workers[i])
  ) {
    app.log.error(
      { queues: workers.queues, workers: workers.workers },
      "Worker registry invariant violated: queues != workers",
    );
    process.exit(1);
  }

  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    app.log.info({ port: env.API_PORT }, "API server running");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
