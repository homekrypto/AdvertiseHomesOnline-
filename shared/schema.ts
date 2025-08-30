import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with subscription fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("free"), // free, registered, premium, agent, agency, expert, admin
  status: varchar("status").notNull().default("active"), // active, trial, cancelled, expired, suspended
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  organizationId: varchar("organization_id"),
  featureFlags: jsonb("feature_flags").default('{}'), // Feature access control
  trialEnd: timestamp("trial_end"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations for agency/expert plans
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  tier: varchar("tier").notNull(), // agency, expert
  seatsTotal: integer("seats_total").notNull().default(10),
  seatsUsed: integer("seats_used").notNull().default(0),
  listingCap: integer("listing_cap").notNull().default(25),
  featuredCredits: integer("featured_credits").notNull().default(0),
  rankBoost: decimal("rank_boost", { precision: 3, scale: 2 }).default('1.00'),
  integrations: jsonb("integrations").default('{}'),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: varchar("interval").notNull(), // monthly, yearly
  features: jsonb("features").notNull(), // JSON object with feature flags
  listingCap: integer("listing_cap"),
  seats: integer("seats"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Actions for audit logging
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull(),
  actionType: varchar("action_type").notNull(),
  targetType: varchar("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Properties
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  country: varchar("country").notNull().default("USA"),
  zipCode: varchar("zip_code"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  sqft: integer("sqft"),
  propertyType: varchar("property_type"), // house, condo, townhouse, etc.
  images: jsonb("images"), // Array of image URLs
  slug: varchar("slug").notNull().unique(),
  agentId: varchar("agent_id").notNull(),
  organizationId: varchar("organization_id"),
  status: varchar("status").notNull().default("active"), // active, sold, archived
  featured: boolean("featured").notNull().default(false),
  featuredUntil: timestamp("featured_until"),
  views: integer("views").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  message: text("message"),
  propertyId: varchar("property_id"),
  agentId: varchar("agent_id").notNull(),
  organizationId: varchar("organization_id"),
  status: varchar("status").notNull().default("new"), // new, contacted, qualified, converted, closed
  source: varchar("source").notNull().default("website"), // website, referral, social, etc.
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  assignedBy: varchar("assigned_by"), // Who assigned this lead
  assignedAt: timestamp("assigned_at"),
  followupDate: timestamp("followup_date"),
  score: integer("score").default(0), // Lead scoring 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead routing configuration for organizations
export const leadRoutingConfig = pgTable("lead_routing_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  routingType: varchar("routing_type").notNull().default("round_robin"), // round_robin, weighted, availability
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // Configuration for routing rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assignment tracking for round-robin
export const leadAssignmentTracking = pgTable("lead_assignment_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  agentId: varchar("agent_id").notNull(),
  lastAssignedAt: timestamp("last_assigned_at"),
  totalAssigned: integer("total_assigned").default(0),
  isAvailable: boolean("is_available").default(true),
  maxLeadsPerDay: integer("max_leads_per_day"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved searches
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  filters: jsonb("filters").notNull(), // Search criteria as JSON
  alertEnabled: boolean("alert_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  properties: many(properties),
  leads: many(leads),
  favorites: many(favorites),
  savedSearches: many(savedSearches),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(users),
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [properties.organizationId],
    references: [organizations.id],
  }),
  leads: many(leads),
  favorites: many(favorites),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  property: one(properties, {
    fields: [leads.propertyId],
    references: [properties.id],
  }),
  agent: one(users, {
    fields: [leads.agentId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),
  assignedByUser: one(users, {
    fields: [leads.assignedBy],
    references: [users.id],
  }),
}));

export const leadRoutingConfigRelations = relations(leadRoutingConfig, ({ one }) => ({
  organization: one(organizations, {
    fields: [leadRoutingConfig.organizationId],
    references: [organizations.id],
  }),
}));

export const leadAssignmentTrackingRelations = relations(leadAssignmentTracking, ({ one }) => ({
  organization: one(organizations, {
    fields: [leadAssignmentTracking.organizationId],
    references: [organizations.id],
  }),
  agent: one(users, {
    fields: [leadAssignmentTracking.agentId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
  }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  saves: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadRoutingConfigSchema = createInsertSchema(leadRoutingConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadAssignmentTrackingSchema = createInsertSchema(leadAssignmentTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadRoutingConfig = typeof leadRoutingConfig.$inferSelect;
export type InsertLeadRoutingConfig = z.infer<typeof insertLeadRoutingConfigSchema>;
export type LeadAssignmentTracking = typeof leadAssignmentTracking.$inferSelect;
export type InsertLeadAssignmentTracking = z.infer<typeof insertLeadAssignmentTrackingSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

// Feature Flag System - Based on Subscription Tiers
export interface FeatureFlags {
  // Basic access permissions
  can_view_listings: boolean;
  can_view_contact_info: boolean;
  can_save_favorites: boolean;
  can_view_analytics: 'none' | 'limited' | 'full';
  can_contact_via_form: boolean;
  can_advanced_filters: boolean;
  can_virtual_tours: boolean;
  
  // Agent-specific features
  agent_max_active_listings: number;
  agent_featured_credits_monthly: number;
  agent_analytics: 'none' | 'basic' | 'advanced';
  
  // Organization features
  org_max_active_listings: number;
  org_seats: number;
  org_crm: boolean;
  org_lead_routing: boolean;
  org_bulk_import: boolean;
  org_branding_page: boolean;
  
  // AI and automation features
  ai_pricing_suggestions: boolean;
  ai_comp_selection: boolean;
  ai_automation: boolean;
  integrations_api: boolean;
  priority_rank_boost: boolean;
  priority_support: boolean;
}

// Subscription Status Types
export type SubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended';

// User Role Types
export type UserRole = 'free' | 'registered' | 'premium' | 'agent' | 'agency' | 'expert' | 'admin';

// Admin Permission Types
export type AdminRole = 'super_admin' | 'billing_admin' | 'user_support' | 'content_admin' | 'analytics_viewer';
