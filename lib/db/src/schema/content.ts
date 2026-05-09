import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  type: text("type").notNull().default("movie"), // movie | series
  description: text("description"),
  descriptionAr: text("description_ar"),
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  videoUrl: text("video_url"),
  trailerUrl: text("trailer_url"),
  tmdbId: integer("tmdb_id"),
  rating: real("rating"),
  year: integer("year"),
  duration: integer("duration"),
  genres: text("genres"),
  language: text("language").default("ar"),
  quality: text("quality").default("HD"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contentTable.$inferSelect;
