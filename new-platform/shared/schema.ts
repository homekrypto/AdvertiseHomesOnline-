import { sql } from 'drizzle-orm';
import { pgTable, varchar, text, decimal, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with subscription tiers
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  role: varchar("role").notNull().default("free"), // free, premium, agent, agency, expert, admin
  organizationId: varchar("organization_id"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table for agency management
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull().default("agency"), // agency, expert
  ownerId: varchar("owner_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  seatLimit: integer("seat_limit").notNull().default(1),
  usedSeats: integer("used_seats").notNull().default(0),
  logoUrl: varchar("logo_url"),
  website: varchar("website"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code"),
  country: varchar("country").notNull().default("US"),
  propertyType: varchar("property_type").notNull(), // house, condo, townhouse, land
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  lotSize: integer("lot_size"),
  yearBuilt: integer("year_built"),
  images: varchar("images").array(),
  agentId: varchar("agent_id").notNull(),
  organizationId: varchar("organization_id"),
  status: varchar("status").notNull().default("active"), // active, pending, sold, archived
  featured: boolean("featured").notNull().default(false),
  featuredUntil: timestamp("featured_until"),
  views: integer("views").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  slug: varchar("slug").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads table for lead management
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  organizationId: varchar("organization_id"),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  message: text("message"),
  source: varchar("source").notNull().default("website"), // website, email, phone, referral
  status: varchar("status").notNull().default("new"), // new, contacted, qualified, converted, lost
  assignedTo: varchar("assigned_to"),
  priority: varchar("priority").notNull().default("medium"), // low, medium, high
  tags: varchar("tags").array(),
  notes: text("notes"),
  lastContact: timestamp("last_contact"),
  nextFollowUp: timestamp("next_follow_up"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans and limits
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle").notNull(), // monthly, yearly
  features: jsonb("features").notNull(),
  limits: jsonb("limits").notNull(),
  stripePriceId: varchar("stripe_price_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorites/saved properties
export const userFavorites = pgTable("user_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  views: true,
  saves: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  usedSeats: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Lead = typeof leads.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;