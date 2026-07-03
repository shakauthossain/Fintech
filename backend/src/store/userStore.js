import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import logger from "../lib/logger.js";
import { prisma } from "../lib/db.js";

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

class UserStore {
  async findByEmail(email) {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async findById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  toPublic(user) {
    return publicUser({
      ...user,
      createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
    });
  }

  async listPublic() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return users.map(publicUser);
  }

  async createUser(email, password, role = "user") {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      throw Object.assign(new Error("Email and password required"), { status: 400 });
    }
    if (password.length < 8) {
      throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
    }
    if (role !== "user") {
      throw Object.assign(new Error("Only member accounts can be created"), { status: 400 });
    }
    if (await this.findByEmail(normalized)) {
      throw Object.assign(new Error("Email already registered"), { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        id: nanoid(),
        email: normalized,
        passwordHash: await bcrypt.hash(password, 12),
        role,
      },
    });
    logger.info({ email: normalized, role }, "user created");
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async load() {
    // kept for bootstrap compatibility
  }
}

export const userStore = new UserStore();
export default userStore;
