import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, real, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(512)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value.replace(/^\[/, '[').replace(/\]$/, ']'));
  },
});

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

export const bakuganCatalog = pgTable("bakugan_catalog", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  generation: text("generation").notNull(),
  series: text("series").notNull(),
  attribute: text("attribute"),
  moldType: text("mold_type"),
  specialTreatment: text("special_treatment"),
  description: text("description"),
  notes: text("notes"),
  referenceCount: integer("reference_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referenceImages = pgTable("reference_images", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bakuganId: varchar("bakugan_id")
    .notNull()
    .references(() => bakuganCatalog.id, { onDelete: "cascade" }),
  imageData: text("image_data").notNull(),
  angle: text("angle"),
  lighting: text("lighting"),
  source: text("source"),
  isApproved: boolean("is_approved").default(false).notNull(),
  embedding: vector("embedding"),
  embeddingModel: text("embedding_model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBakuganCatalogSchema = createInsertSchema(bakuganCatalog).omit({
  id: true,
  referenceCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferenceImageSchema = createInsertSchema(referenceImages).omit({
  id: true,
  isApproved: true,
  embedding: true,
  embeddingModel: true,
  createdAt: true,
});

export type InsertBakuganCatalog = z.infer<typeof insertBakuganCatalogSchema>;
export type BakuganCatalog = typeof bakuganCatalog.$inferSelect;
export type InsertReferenceImage = z.infer<typeof insertReferenceImageSchema>;
export type ReferenceImage = typeof referenceImages.$inferSelect;
