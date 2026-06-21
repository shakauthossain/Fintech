import { Router } from "express";
import config from "../config/env.js";
import invoiceStore from "../store/invoiceStore.js";
import { emitNewFile } from "../detection/index.js";

export const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({
    ok: true,
    mockMode: config.mockMode,
    detectionMode: config.mockMode ? "mock" : config.detectionMode,
    capabilities: config.capabilities,
    model: config.openrouter.model,
  });
});

apiRouter.get("/stats", async (req, res, next) => {
  try {
    res.json(await invoiceStore.stats());
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/invoices", async (req, res, next) => {
  try {
    const { status } = req.query;
    res.json(await invoiceStore.listInvoices({ status }));
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceStore.getInvoice(req.params.id);
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
    const updated = await invoiceStore.updateInvoice(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "not_found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * Mock-mode helper: inject a synthetic upload so the full pipeline runs without
 * Google Drive. Accepts optional { name, mimeType }.
 */
apiRouter.post("/simulate-upload", async (req, res, next) => {
  try {
    if (!config.mockMode) {
      return res.status(400).json({ error: "simulate-upload is only available in mock mode" });
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
