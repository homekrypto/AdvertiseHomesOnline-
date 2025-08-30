import {
  users,
  organizations,
  properties,
  leads,
  favorites,
  savedSearches,
  subscriptionPlans,
  type User,
  type UpsertUser,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type Property,
  type InsertProperty,
  type Lead,
  type InsertLead,
  type Favorite,
  type InsertFavorite,
  type SavedSearch,
  type InsertSavedSearch,
  type SubscriptionPlan,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  getUsersByOrganization(orgId: string): Promise<User[]>;
  
  // Property operations
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyBySlug(slug: string): Promise<Property | undefined>;
  updateProperty(id: string, updates: Partial<Property>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  getProperties(filters?: PropertyFilters): Promise<Property[]>;
  getPropertiesByAgent(agentId: string): Promise<Property[]>;
  getPropertiesByOrganization(orgId: string): Promise<Property[]>;
  incrementPropertyViews(id: string): Promise<void>;
  incrementPropertySaves(id: string): Promise<void>;
  
  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByAgent(agentId: string): Promise<Lead[]>;
  getLeadsByOrganization(orgId: string): Promise<Lead[]>;
  updateLeadStatus(id: string, status: string): Promise<Lead>;
  
  // Favorites operations
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, propertyId: string): Promise<void>;
  getUserFavorites(userId: string): Promise<Property[]>;
  isFavorited(userId: string, propertyId: string): Promise<boolean>;
  
  // Saved searches operations
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  getUserSavedSearches(userId: string): Promise<SavedSearch[]>;
  deleteSavedSearch(id: string): Promise<void>;
  
  // Subscription plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  
  // Analytics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getAgentMetrics(agentId: string): Promise<AgentMetrics>;
}

export interface PropertyFilters {
  search?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  featured?: boolean;
  agentId?: string;
  organizationId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardMetrics {
  totalUsers: number;
  totalRevenue: number;
  activeListings: number;
  conversionRate: number;
  usersByRole: Record<string, number>;
  monthlyGrowth: number;
}

export interface AgentMetrics {
  activeListings: number;
  totalViews: number;
  totalSaves: number;
  newLeads: number;
  featuredCredits: number;
  listingCap: number;
  usedListings: number;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Organization operations
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(orgData).returning();
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async getUsersByOrganization(orgId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, orgId));
  }

  // Property operations
  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(propertyData).returning();
    return property;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getPropertyBySlug(slug: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.slug, slug));
    return property;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const [property] = await db
      .update(properties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getProperties(filters: PropertyFilters = {}): Promise<Property[]> {
    let query = db.select().from(properties);

    const conditions = [];
    
    if (filters.status) {
      conditions.push(eq(properties.status, filters.status));
    } else {
      conditions.push(eq(properties.status, "active"));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(properties.title, `%${filters.search}%`),
          like(properties.address, `%${filters.search}%`),
          like(properties.city, `%${filters.search}%`)
        )
      );
    }

    if (filters.city) {
      conditions.push(like(properties.city, `%${filters.city}%`));
    }

    if (filters.state) {
      conditions.push(eq(properties.state, filters.state));
    }

    if (filters.minPrice) {
      conditions.push(sql`${properties.price} >= ${filters.minPrice}`);
    }

    if (filters.maxPrice) {
      conditions.push(sql`${properties.price} <= ${filters.maxPrice}`);
    }

    if (filters.bedrooms) {
      conditions.push(eq(properties.bedrooms, filters.bedrooms));
    }

    if (filters.bathrooms) {
      conditions.push(sql`${properties.bathrooms} >= ${filters.bathrooms}`);
    }

    if (filters.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType));
    }

    if (filters.featured) {
      conditions.push(eq(properties.featured, true));
    }

    if (filters.agentId) {
      conditions.push(eq(properties.agentId, filters.agentId));
    }

    if (filters.organizationId) {
      conditions.push(eq(properties.organizationId, filters.organizationId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sorting
    if (filters.sortBy) {
      const sortField = properties[filters.sortBy as keyof typeof properties];
      if (sortField) {
        query = query.orderBy(filters.sortOrder === 'desc' ? desc(sortField) : asc(sortField));
      }
    } else {
      query = query.orderBy(desc(properties.createdAt));
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  async getPropertiesByAgent(agentId: string): Promise<Property[]> {
    return db.select().from(properties)
      .where(and(eq(properties.agentId, agentId), eq(properties.status, "active")))
      .orderBy(desc(properties.createdAt));
  }

  async getPropertiesByOrganization(orgId: string): Promise<Property[]> {
    return db.select().from(properties)
      .where(and(eq(properties.organizationId, orgId), eq(properties.status, "active")))
      .orderBy(desc(properties.createdAt));
  }

  async incrementPropertyViews(id: string): Promise<void> {
    await db.update(properties)
      .set({ views: sql`${properties.views} + 1` })
      .where(eq(properties.id, id));
  }

  async incrementPropertySaves(id: string): Promise<void> {
    await db.update(properties)
      .set({ saves: sql`${properties.saves} + 1` })
      .where(eq(properties.id, id));
  }

  // Lead operations
  async createLead(leadData: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(leadData).returning();
    return lead;
  }

  async getLeadsByAgent(agentId: string): Promise<Lead[]> {
    return db.select().from(leads)
      .where(eq(leads.agentId, agentId))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByOrganization(orgId: string): Promise<Lead[]> {
    return db.select()
      .from(leads)
      .leftJoin(users, eq(leads.agentId, users.id))
      .where(eq(users.organizationId, orgId))
      .orderBy(desc(leads.createdAt));
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ status })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  // Favorites operations
  async addFavorite(favoriteData: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(favoriteData).returning();
    await this.incrementPropertySaves(favoriteData.propertyId);
    return favorite;
  }

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
  }

  async getUserFavorites(userId: string): Promise<Property[]> {
    return db.select({ 
      id: properties.id,
      title: properties.title,
      description: properties.description,
      price: properties.price,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      country: properties.country,
      zipCode: properties.zipCode,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      sqft: properties.sqft,
      propertyType: properties.propertyType,
      images: properties.images,
      slug: properties.slug,
      agentId: properties.agentId,
      organizationId: properties.organizationId,
      status: properties.status,
      featured: properties.featured,
      featuredUntil: properties.featuredUntil,
      views: properties.views,
      saves: properties.saves,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
    })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async isFavorited(userId: string, propertyId: string): Promise<boolean> {
    const [favorite] = await db.select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
      .limit(1);
    return !!favorite;
  }

  // Saved searches operations
  async createSavedSearch(searchData: InsertSavedSearch): Promise<SavedSearch> {
    const [search] = await db.insert(savedSearches).values(searchData).returning();
    return search;
  }

  async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    return db.select().from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await db.delete(savedSearches).where(eq(savedSearches.id, id));
  }

  // Subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.price));
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  // Analytics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [activeListingsResult] = await db.select({ count: count() }).from(properties)
      .where(eq(properties.status, "active"));

    const usersByRoleResults = await db.select({
      role: users.role,
      count: count()
    }).from(users).groupBy(users.role);

    const usersByRole: Record<string, number> = {};
    usersByRoleResults.forEach(result => {
      usersByRole[result.role] = result.count;
    });

    return {
      totalUsers: totalUsersResult.count,
      totalRevenue: 124750, // This would come from Stripe API or payment records
      activeListings: activeListingsResult.count,
      conversionRate: 3.2, // Would be calculated from actual conversion data
      usersByRole,
      monthlyGrowth: 12, // Would be calculated from time-based user data
    };
  }

  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const agentProperties = await this.getPropertiesByAgent(agentId);
    const agent = await this.getUser(agentId);
    
    const totalViews = agentProperties.reduce((sum, prop) => sum + (prop.views || 0), 0);
    const totalSaves = agentProperties.reduce((sum, prop) => sum + (prop.saves || 0), 0);
    
    const [newLeadsResult] = await db.select({ count: count() }).from(leads)
      .where(and(eq(leads.agentId, agentId), eq(leads.status, "new")));

    // Determine listing cap based on role
    let listingCap = 0;
    switch (agent?.role) {
      case "agent":
        listingCap = 5;
        break;
      case "agency":
        listingCap = 25;
        break;
      case "expert":
        listingCap = 9999; // Unlimited
        break;
    }

    return {
      activeListings: agentProperties.length,
      totalViews,
      totalSaves,
      newLeads: newLeadsResult.count,
      featuredCredits: 5, // This would come from subscription or organization data
      listingCap,
      usedListings: agentProperties.length,
    };
  }
}

export const storage = new DatabaseStorage();
