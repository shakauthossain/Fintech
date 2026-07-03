import { Router } from "express";
import userStore from "../store/userStore.js";
import {
  clearAuthCookie,
  requireAuth,
  requireSuperadmin,
  setAuthCookie,
  signToken,
} from "./authMiddleware.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "invalid_request", message: "Email and password required" });
    }

    const user = await userStore.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ ok: true, user: userStore.toPublic(user), token });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get("/users", requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    res.json({ users: await userStore.listPublic() });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/users", requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    const user = await userStore.createUser(email, password, "user");
    res.status(201).json({ ok: true, user: userStore.toPublic(user) });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: "invalid_request", message: err.message });
    }
    next(err);
  }
});

export default authRouter;
