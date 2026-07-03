import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/env.js";
import logger from "./lib/logger.js";
import { startDetection } from "./detection/index.js";
import { driveWebhookRouter } from "./detection/pushWebhook.js";
import { apiRouter } from "./api/routes.js";
import { authRouter } from "./api/authRoutes.js";
import { setupPublicRouter, setupRouter } from "./api/setupRoutes.js";
import { requireAuth } from "./api/authMiddleware.js";
import { processFile } from "./pipeline.js";
import invoiceStore from "./store/invoiceStore.js";
import userStore from "./store/userStore.js";
import setupStore from "./store/setupStore.js";
import { getRuntimeCapabilities } from "./lib/capabilities.js";
import { initDatabase } from "./lib/dbInit.js";

const app = express();
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authRouter);
app.use("/api/setup", setupPublicRouter);
app.use("/api/setup", requireAuth, setupRouter);
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  return requireAuth(req, res, next);
}, apiRouter);
app.use("/", driveWebhookRouter);

// Centralised error handler
app.use((err, req, res, next) => {
  logger.error({ err }, "request failed");
  res.status(500).json({ error: "internal_error", message: err.message });
});

async function bootstrap() {
  await initDatabase();
  await userStore.load();
  await setupStore.load();
  await invoiceStore.load();

  await startDetection(async (file) => processFile(file));

  app.listen(config.port, async () => {
    const caps = await getRuntimeCapabilities();
    logger.info(
      {
        port: config.port,
        canProcess: caps.canProcess,
        hasGoogle: caps.hasGoogle,
        detectionMode: caps.hasGoogle ? config.detectionMode : "upload_only",
        model: config.openrouter.model,
      },
      "Invoice pipeline backend started"
    );
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "failed to start backend");
  process.exit(1);
});
