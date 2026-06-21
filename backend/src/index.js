import express from "express";
import cors from "cors";
import config from "./config/env.js";
import logger from "./lib/logger.js";
import { startDetection } from "./detection/index.js";
import { driveWebhookRouter } from "./detection/pushWebhook.js";
import { apiRouter } from "./api/routes.js";
import { processFile } from "./pipeline.js";
import invoiceStore from "./store/invoiceStore.js";

const app = express();
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "5mb" }));

app.use("/api", apiRouter);
app.use("/", driveWebhookRouter);

// Centralised error handler
app.use((err, req, res, next) => {
  logger.error({ err }, "request failed");
  res.status(500).json({ error: "internal_error", message: err.message });
});

async function bootstrap() {
  await invoiceStore.load();

  // Wire detection -> pipeline. (A small concurrency cap could wrap this later.)
  await startDetection(async (file) => processFile(file));

  app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        mockMode: config.mockMode,
        detectionMode: config.mockMode ? "mock" : config.detectionMode,
        model: config.openrouter.model,
      },
      "Invoice pipeline backend started"
    );
    if (config.mockMode) {
      logger.info("Running in MOCK mode - no Google/OpenRouter calls. Use POST /api/simulate-upload to add invoices.");
    }
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to start backend");
  process.exit(1);
});
