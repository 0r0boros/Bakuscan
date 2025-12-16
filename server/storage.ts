import { type User, type InsertUser, type Scan, type InsertScan, users, scans } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  getScans(userId: string): Promise<Scan[]>;
  getScan(id: string, userId: string): Promise<Scan | undefined>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: string, userId: string, updates: Partial<InsertScan>): Promise<Scan | undefined>;
  deleteScan(id: string, userId: string): Promise<boolean>;
  createScans(scanList: InsertScan[]): Promise<Scan[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.provider, provider), eq(users.providerId, providerId))
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getScans(userId: string): Promise<Scan[]> {
    return db.select().from(scans).where(eq(scans.userId, userId));
  }

  async getScan(id: string, userId: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(
      and(eq(scans.id, id), eq(scans.userId, userId))
    );
    return scan;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db.insert(scans).values(scan).returning();
    return newScan;
  }

  async updateScan(id: string, userId: string, updates: Partial<InsertScan>): Promise<Scan | undefined> {
    const [scan] = await db.update(scans)
      .set(updates)
      .where(and(eq(scans.id, id), eq(scans.userId, userId)))
      .returning();
    return scan;
  }

  async deleteScan(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(scans)
      .where(and(eq(scans.id, id), eq(scans.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async createScans(scanList: InsertScan[]): Promise<Scan[]> {
    if (scanList.length === 0) return [];
    return db.insert(scans).values(scanList).returning();
  }
}

export const storage = new DatabaseStorage();
