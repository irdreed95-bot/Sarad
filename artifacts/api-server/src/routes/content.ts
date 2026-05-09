import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import { db, contentTable } from "@workspace/db";
import {
  ListContentQueryParams,
  GetContentParams,
  CreateContentBody,
  UpdateContentBody,
  UpdateContentParams,
  DeleteContentParams,
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

function serializeContent(c: any) {
  return {
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

router.get("/content", async (req, res): Promise<void> => {
  const params = ListContentQueryParams.safeParse(req.query);
  const { type, featured, category, limit = 50, offset = 0 } = params.success ? params.data : {} as any;

  let query = db.select().from(contentTable).where(eq(contentTable.isActive, true));

  const conditions = [eq(contentTable.isActive, true)];
  if (type && type !== "all") {
    conditions.push(eq(contentTable.type, type));
  }
  if (featured === true || featured === "true") {
    conditions.push(eq(contentTable.isFeatured, true));
  }
  if (category) {
    conditions.push(ilike(contentTable.genres, `%${category}%`));
  }

  const results = await db
    .select()
    .from(contentTable)
    .where(and(...conditions))
    .orderBy(desc(contentTable.createdAt))
    .limit(Number(limit) || 50)
    .offset(Number(offset) || 0);

  res.json(results.map(serializeContent));
});

router.post("/content", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const parsed = CreateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(contentTable).values(parsed.data).returning();
  res.status(201).json(serializeContent(item));
});

router.get("/content/featured", async (_req, res): Promise<void> => {
  const results = await db
    .select()
    .from(contentTable)
    .where(and(eq(contentTable.isFeatured, true), eq(contentTable.isActive, true)))
    .orderBy(desc(contentTable.createdAt))
    .limit(10);

  res.json(results.map(serializeContent));
});

router.get("/content/categories", async (_req, res): Promise<void> => {
  const items = await db
    .select({ genres: contentTable.genres })
    .from(contentTable)
    .where(eq(contentTable.isActive, true));

  const categoryMap = new Map<string, number>();
  for (const item of items) {
    if (item.genres) {
      const genres = item.genres.split(",").map((g) => g.trim());
      for (const genre of genres) {
        if (genre) {
          categoryMap.set(genre, (categoryMap.get(genre) || 0) + 1);
        }
      }
    }
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json(categories);
});

router.get("/content/:id", async (req, res): Promise<void> => {
  const params = GetContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(serializeContent(item));
});

router.patch("/content/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = UpdateContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(contentTable)
    .set(parsed.data)
    .where(eq(contentTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(serializeContent(item));
});

router.delete("/content/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const params = DeleteContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(contentTable)
    .where(eq(contentTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
