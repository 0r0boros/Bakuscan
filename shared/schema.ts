import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scans = pgTable("scans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imageUri: text("image_uri").notNull(),
  name: text("name").notNull(),
  series: text("series"),
  attribute: text("attribute"),
  gPower: integer("g_power"),
  releaseYear: text("release_year"),
  rarity: text("rarity"),
  specialFeatures: text("special_features").array(),
  estimatedValue: jsonb("estimated_value"),
  confidence: text("confidence"),
  correction: jsonb("correction"),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  displayName: true,
  avatarUrl: true,
  provider: true,
  providerId: true,
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  scannedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;
