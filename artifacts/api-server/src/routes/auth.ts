import { Router, type IRouter } from "express";
import crypto from "crypto";
import { AdminLoginBody, AdminLoginResponse, VerifyAdminResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const TOKEN_SECRET = process.env.SESSION_SECRET || "sarad-secret-key-2024";

function generateToken(email: string): string {
  const payload = JSON.stringify({ email, ts: Date.now() });
  const b64 = Buffer.from(payload).toString("base64");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

function verifyToken(token: string): { email: string } | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(b64).digest("hex");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    return { email: payload.email };
  } catch {
    return null;
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    req.log.warn({ email }, "Failed admin login attempt");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(email);
  req.log.info({ email }, "Admin login successful");
  res.json(AdminLoginResponse.parse({ token, isAdmin: true }));
});

router.get("/auth/verify", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload || payload.email !== ADMIN_EMAIL) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  res.json(VerifyAdminResponse.parse({ isAdmin: true }));
});

export { verifyToken, ADMIN_EMAIL };
export default router;
