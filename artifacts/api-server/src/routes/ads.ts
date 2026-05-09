import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, adsTable } from "@workspace/db";
import {
  CreateAdBody,
  DeleteAdParams,
  UpdateAdParams,
  UpdateAdBody,
} from "@workspace/api-zod";
import { verifyToken, ADMIN_EMAIL } from "./auth";

const router: IRouter = Router();

function requireAdmin(req: any, res: any): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload || payload.email !== ADMIN_EMAIL) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function serializeAd(a: any) {
  return {
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

router.get("/ads", async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(adsTable)
    .where(eq(adsTable.isActive, true))
    .orderBy(asc(adsTable.order));

  res.json(results.map(serializeAd));
});

router.post("/ads", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const parsed = CreateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ad] = await db.insert(adsTable).values(parsed.data).returning();
  res.status(201).json(serializeAd(ad));
});

router.patch("/ads/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = UpdateAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ad] = await db
    .update(adsTable)
    .set(parsed.data)
    .where(eq(adsTable.id, params.data.id))
    .returning();

  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  res.json(serializeAd(ad));
});

router.delete("/ads/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = DeleteAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ad] = await db
    .delete(adsTable)
    .where(eq(adsTable.id, params.data.id))
    .returning();

  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
