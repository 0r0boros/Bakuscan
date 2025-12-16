import { db } from "./db";
import { bakuganCatalog } from "@shared/schema";
import catalogData from "../shared/bakugan_catalog.json";

export async function seedCatalog() {
  console.log("[Seed] Starting catalog seed...");
  
  try {
    const existingCount = await db.select().from(bakuganCatalog);
    if (existingCount.length > 0) {
      console.log(`[Seed] Catalog already has ${existingCount.length} entries, skipping seed`);
      return;
    }

    console.log(`[Seed] Inserting ${catalogData.length} Bakugan entries...`);
    
    for (const item of catalogData) {
      await db.insert(bakuganCatalog).values({
        name: item.name,
        generation: item.generation,
        series: item.series,
        description: item.description,
      }).onConflictDoNothing();
    }
    
    console.log("[Seed] Catalog seeded successfully!");
  } catch (error) {
    console.error("[Seed] Error seeding catalog:", error);
    throw error;
  }
}
