import { Router } from "express";
import multer from "multer";
import config from "../config/env.js";
import invoiceStore from "../store/invoiceStore.js";
import * as invoiceSource from "../lib/invoiceSource.js";
import { emitNewFile } from "../detection/index.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import { processUpload } from "../pipeline.js";
import { selectNormalizer } from "../normalization/index.js";

export const apiRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

apiRouter.get("/health", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    res.json({
      ok: true,
      mockMode: !caps.canProcess,
      detectionMode: caps.hasGoogle ? config.detectionMode : "upload_only",
      capabilities: {
        hasGoogle: caps.hasGoogle,
        hasOpenRouter: caps.hasOpenRouter,
        canProcess: caps.canProcess,
        oauthConfigured: caps.oauthConfigured,
      },
      setup: caps.setup,
      model: config.openrouter.model,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "invalid_request", message: "No file uploaded" });
    }

    const mimeType = req.file.mimetype;
    if (!selectNormalizer(mimeType)) {
      return res.status(400).json({
        error: "unsupported_format",
        message: "Supported formats: PDF, images, XLSX, DOCX",
      });
    }

    const result = await processUpload(req.file.buffer, req.file.originalname, mimeType);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/stats", async (req, res, next) => {
  try {
    res.json(await invoiceSource.getStats());
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/invoices", async (req, res, next) => {
  try {
    const { status } = req.query;
    res.json(await invoiceSource.listInvoices({ status }));
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceSource.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "not_found" });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

apiRouter.patch("/invoices/:id", async (req, res, next) => {
  try {
    const allowed = ["status"];
    const patch = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
    let updated = await invoiceStore.updateInvoice(req.params.id, patch);
    if (!updated) {
      const fromSheet = await invoiceSource.getInvoice(req.params.id);
      if (!fromSheet) return res.status(404).json({ error: "not_found" });
      const { line_items = [], ...row } = fromSheet;
      updated = { ...row, ...patch };
      await invoiceStore.addInvoice(updated, line_items);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

apiRouter.post("/simulate-upload", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    if (caps.canProcess) {
      return res.status(400).json({
        error: "not_available",
        message: "Use the upload button or connect Google Drive instead",
      });
    }
    const name = req.body?.name || `invoice-${Date.now()}.pdf`;
    const mimeType = req.body?.mimeType || "application/pdf";
    const fileId = `mock-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const result = await emitNewFile({ fileId, name, mimeType, __mockBuffer: Buffer.from("mock") });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default apiRouter;
