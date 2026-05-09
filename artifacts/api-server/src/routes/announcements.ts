import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import {
  CreateAnnouncementBody,
  DeleteAnnouncementParams,
  UpdateAnnouncementParams,
  UpdateAnnouncementBody,
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

function serializeAnnouncement(a: any) {
  return {
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

router.get("/announcements", async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(desc(announcementsTable.createdAt));

  res.json(results.map(serializeAnnouncement));
});

router.post("/announcements", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ann] = await db.insert(announcementsTable).values(parsed.data).returning();
  res.status(201).json(serializeAnnouncement(ann));
});

router.patch("/announcements/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = UpdateAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ann] = await db
    .update(announcementsTable)
    .set(parsed.data)
    .where(eq(announcementsTable.id, params.data.id))
    .returning();

  if (!ann) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  res.json(serializeAnnouncement(ann));
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = DeleteAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ann] = await db
    .delete(announcementsTable)
    .where(eq(announcementsTable.id, params.data.id))
    .returning();

  if (!ann) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
