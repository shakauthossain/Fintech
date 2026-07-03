import jwt from "jsonwebtoken";
import config from "../config/env.js";
import userStore from "../store/userStore.js";

const COOKIE_NAME = "auth_token";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.auth.cookieSecure,
    maxAge: config.auth.cookieMaxAgeMs,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.auth.cookieSecure,
    path: "/",
  });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "unauthorized", message: "Login required" });
    }

    const payload = jwt.verify(token, config.auth.jwtSecret);
    const user = await userStore.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "Invalid session" });
    }

    req.user = userStore.toPublic(user);
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or expired session" });
  }
}

export function requireSuperadmin(req, res, next) {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden", message: "Superadmin access required" });
  }
  next();
}

export { COOKIE_NAME };
