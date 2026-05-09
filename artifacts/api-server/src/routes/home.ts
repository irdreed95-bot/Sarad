import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, contentTable, adsTable, announcementsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/home/stats", async (_req, res): Promise<void> => {
  const [movieCount] = await db
    .select({ count: count() })
    .from(contentTable)
    .where(and(eq(contentTable.type, "movie"), eq(contentTable.isActive, true)));

  const [seriesCount] = await db
    .select({ count: count() })
    .from(contentTable)
    .where(and(eq(contentTable.type, "series"), eq(contentTable.isActive, true)));

  const [featuredCount] = await db
    .select({ count: count() })
    .from(contentTable)
    .where(and(eq(contentTable.isFeatured, true), eq(contentTable.isActive, true)));

  const [adsCount] = await db
    .select({ count: count() })
    .from(adsTable)
    .where(eq(adsTable.isActive, true));

  const [announcementsCount] = await db
    .select({ count: count() })
    .from(announcementsTable)
    .where(eq(announcementsTable.isActive, true));

  res.json({
    totalMovies: Number(movieCount?.count ?? 0),
    totalSeries: Number(seriesCount?.count ?? 0),
    featuredCount: Number(featuredCount?.count ?? 0),
    totalAds: Number(adsCount?.count ?? 0),
    totalAnnouncements: Number(announcementsCount?.count ?? 0),
  });
});

export default router;
