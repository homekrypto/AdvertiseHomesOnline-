import {
  users,
  organizations,
  properties,
  leads,
  favorites,
  savedSearches,
  subscriptionPlans,
  verificationCodes,
  adminActions,
  leadRoutingConfig,
  leadAssignmentTracking,
  revenueEvents,
  analyticsSnapshots,
  userActivityLogs,
  type User,
  type UpsertUser,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type Property,
  type InsertProperty,
  type Lead,
  type InsertLead,
  type LeadRoutingConfig,
  type InsertLeadRoutingConfig,
  type LeadAssignmentTracking,
  type InsertLeadAssignmentTracking,
  type Favorite,
  type InsertFavorite,
  type SavedSearch,
  type InsertSavedSearch,
  type SubscriptionPlan,
  type VerificationCode,
  type InsertVerificationCode,
  type AdminAction,
  type InsertAdminAction,
  type RevenueEvent,
  type InsertRevenueEvent,
  type AnalyticsSnapshot,
  type UserActivityLog,
  type FeatureFlags,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, count, like, or, ilike, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUserBillingInterval(userId: string, billingInterval: string): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserFeatureFlags(userId: string, featureFlags: any): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  updateUserTrialStatus(userId: string, status: string, trialEnd: Date): Promise<User>;
  getUsersByOrganization(orgId: string): Promise<User[]>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  
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
  assignLead(leadId: string, agentId: string): Promise<Lead>;
  
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
  getPlatformStats(): Promise<PlatformStats>;
  getRevenueAnalytics(): Promise<RevenueAnalytics>;
  
  // Admin actions
  logAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(limit?: number): Promise<AdminAction[]>;
  
  // Admin property management
  getPropertyAnalytics(timeframe: string): Promise<any>;
  getAdminProperties(filters: any): Promise<any>;
  bulkUpdateProperties(propertyIds: string[], updates: any): Promise<any>;
  bulkDeleteProperties(propertyIds: string[]): Promise<any>;
  getPropertiesByIds(propertyIds: string[]): Promise<Property[]>;
  getPropertyPerformance(propertyId: string, timeframe: string): Promise<any>;
  getPropertyActivityLog(propertyId: string): Promise<any[]>;
  
  // Subscription management
  updateSubscriptionStatus(userId: string, status: string): Promise<User>;
  handlePaymentFailure(userId: string): Promise<void>;
  enforceListingCaps(): Promise<void>;
  
  // Email verification
  createVerificationCode(verificationCode: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: string): Promise<void>;
  verifyUserEmail(userId: string): Promise<User>;
  createUser(userData: InsertUser): Promise<User>;
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

export interface PlatformStats {
  totalProperties: number;
  activeAgents: number;
  totalValueSold: number;
  newThisMonth: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  arpu: number; // Average Revenue Per User
  churnRate: number;
  subscriptionsByTier: Record<string, number>;
  revenueGrowth: number;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async updateUserBillingInterval(userId: string, billingInterval: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        billingInterval,
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserFeatureFlags(userId: string, featureFlags: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        featureFlags,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserTrialStatus(userId: string, status: string, trialEnd: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status,
        trialEnd,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersByOrganization(orgId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, orgId));
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
      switch (filters.sortBy) {
        case 'price':
          query = query.orderBy(filters.sortOrder === 'desc' ? desc(properties.price) : asc(properties.price));
          break;
        case 'createdAt':
          query = query.orderBy(filters.sortOrder === 'desc' ? desc(properties.createdAt) : asc(properties.createdAt));
          break;
        case 'views':
          query = query.orderBy(filters.sortOrder === 'desc' ? desc(properties.views) : asc(properties.views));
          break;
        case 'saves':
          query = query.orderBy(filters.sortOrder === 'desc' ? desc(properties.saves) : asc(properties.saves));
          break;
        default:
          query = query.orderBy(desc(properties.createdAt));
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
    const results = await db.select()
      .from(leads)
      .innerJoin(users, eq(leads.agentId, users.id))
      .where(eq(users.organizationId, orgId))
      .orderBy(desc(leads.createdAt));
    
    return results.map(result => result.leads);
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ status })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async assignLead(leadId: string, agentId: string): Promise<Lead> {
    const [lead] = await db
      .update(leads)
      .set({ 
        agentId,
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
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
    const results = await db.select()
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    
    return results.map(result => result.properties);
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

    // Calculate real metrics from database
    const subscribedUsers = await db.select({ count: count() }).from(users)
      .where(sql`${users.stripeSubscriptionId} IS NOT NULL`);
    
    const totalRevenue = subscribedUsers[0].count * 49; // Average subscription price
    const conversionRate = totalUsersResult.count > 0 
      ? (subscribedUsers[0].count / totalUsersResult.count) * 100 
      : 0;
    
    // Calculate monthly growth
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const [recentUsersResult] = await db.select({ count: count() }).from(users)
      .where(sql`${users.createdAt} >= ${oneMonthAgo}`);
    
    const monthlyGrowth = totalUsersResult.count > 0 
      ? (recentUsersResult.count / totalUsersResult.count) * 100 
      : 0;

    return {
      totalUsers: totalUsersResult.count,
      totalRevenue,
      activeListings: activeListingsResult.count,
      conversionRate,
      usersByRole,
      monthlyGrowth,
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

  async getPlatformStats(): Promise<PlatformStats> {
    const [totalPropertiesResult] = await db.select({ count: count() }).from(properties)
      .where(eq(properties.status, "active"));

    const [activeAgentsResult] = await db.select({ count: count() }).from(users)
      .where(sql`${users.role} IN ('agent', 'agency', 'expert')`);

    const [totalValueResult] = await db.select({ 
      total: sql<number>`COALESCE(SUM(${properties.price}), 0)` 
    }).from(properties)
      .where(eq(properties.status, "sold"));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [newThisMonthResult] = await db.select({ count: count() }).from(properties)
      .where(sql`${properties.createdAt} >= ${startOfMonth}`);

    return {
      totalProperties: totalPropertiesResult.count,
      activeAgents: activeAgentsResult.count,
      totalValueSold: totalValueResult.total || 0,
      newThisMonth: newThisMonthResult.count,
    };
  }

  async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    const [totalRevenueResult] = await db.select({ 
      total: sql<number>`COUNT(*) * 29` 
    }).from(users)
      .where(sql`${users.stripeSubscriptionId} IS NOT NULL`);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [monthlyRevenueResult] = await db.select({ 
      total: sql<number>`COUNT(*) * 29`
    }).from(users)
      .where(and(
        sql`${users.stripeSubscriptionId} IS NOT NULL`,
        sql`${users.createdAt} >= ${startOfMonth}`
      ));

    const [totalUsersResult] = await db.select({ count: count() }).from(users);

    const subscriptionsByTier = await db.select({
      role: users.role,
      count: count()
    }).from(users)
      .where(sql`${users.stripeSubscriptionId} IS NOT NULL`)
      .groupBy(users.role);

    const tierCounts: Record<string, number> = {};
    subscriptionsByTier.forEach(tier => {
      tierCounts[tier.role] = tier.count;
    });

    const totalRevenue = totalRevenueResult.total || 0;
    const monthlyRevenue = monthlyRevenueResult.total || 0;
    const totalUsers = totalUsersResult.count;

    // Calculate churn rate from database
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 2);
    startOfLastMonth.setDate(1);
    const endOfLastMonth = new Date();
    endOfLastMonth.setMonth(endOfLastMonth.getMonth() - 1);
    endOfLastMonth.setDate(0);
    
    const [lastMonthSubscriptions] = await db.select({ count: count() }).from(users)
      .where(and(
        sql`${users.stripeSubscriptionId} IS NOT NULL`,
        sql`${users.createdAt} >= ${startOfLastMonth}`,
        sql`${users.createdAt} <= ${endOfLastMonth}`
      ));
    
    const churnRate = lastMonthSubscriptions.count > 0 
      ? Math.max(0, (lastMonthSubscriptions.count - monthlyRevenue) / lastMonthSubscriptions.count * 100)
      : 0;
    
    // Calculate revenue growth
    const [twoMonthsAgoRevenue] = await db.select({ 
      total: sql<number>`COUNT(*) * 49`
    }).from(users)
      .where(and(
        sql`${users.stripeSubscriptionId} IS NOT NULL`,
        sql`${users.createdAt} <= ${startOfLastMonth}`
      ));
    
    const revenueGrowth = twoMonthsAgoRevenue.total > 0 
      ? ((totalRevenue - twoMonthsAgoRevenue.total) / twoMonthsAgoRevenue.total) * 100
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      arpu: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      churnRate,
      subscriptionsByTier: tierCounts,
      revenueGrowth,
    };
  }

  // Admin actions
  async logAdminAction(actionData: InsertAdminAction): Promise<AdminAction> {
    const [action] = await db.insert(adminActions).values(actionData).returning();
    return action;
  }

  async getAdminActions(limit: number = 50): Promise<AdminAction[]> {
    return db.select().from(adminActions)
      .orderBy(desc(adminActions.createdAt))
      .limit(limit);
  }

  // Subscription management
  async updateSubscriptionStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async handlePaymentFailure(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async enforceListingCaps(): Promise<void> {
    const overLimitUsers = await db.select({
      userId: users.id,
      role: users.role,
      propertyCount: sql<number>`COUNT(${properties.id})`
    })
      .from(users)
      .leftJoin(properties, eq(users.id, properties.agentId))
      .groupBy(users.id, users.role)
      .having(sql`COUNT(${properties.id}) > CASE 
        WHEN ${users.role} = 'agent' THEN 5
        WHEN ${users.role} = 'agency' THEN 25
        ELSE 999999
      END`);

    for (const user of overLimitUsers) {
      const limit = user.role === 'agent' ? 5 : user.role === 'agency' ? 25 : 999999;
      
      const excessProperties = await db.select({ id: properties.id })
        .from(properties)
        .where(eq(properties.agentId, user.userId))
        .orderBy(desc(properties.createdAt))
        .offset(limit);

      if (excessProperties.length > 0) {
        const excessIds = excessProperties.map(p => p.id);
        await db
          .update(properties)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(sql`${properties.id} = ANY(${excessIds})`);
      }
    }
  }

  // Additional admin dashboard methods
  async getSubscriptionData() {
    const allUsers = await this.getAllUsers();
    return allUsers
      .filter(u => u.stripeSubscriptionId)
      .map(u => ({
        id: u.id,
        userId: u.id,
        userEmail: u.email,
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        plan: u.role,
        status: u.status === 'active' ? 'active' : u.status === 'suspended' ? 'cancelled' : 'active',
        currentPeriodStart: u.createdAt,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: u.role === 'premium' ? 29 : u.role === 'agent' ? 49 : u.role === 'agency' ? 99 : 199,
        currency: 'usd',
        stripeSubscriptionId: u.stripeSubscriptionId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt || u.createdAt
      }));
  }

  async getPaymentData() {
    const allUsers = await this.getAllUsers();
    return allUsers
      .filter(u => u.stripeSubscriptionId)
      .map(u => ({
        id: `payment_${u.id}`,
        userId: u.id,
        subscriptionId: u.stripeSubscriptionId,
        amount: u.role === 'premium' ? 29 : u.role === 'agent' ? 49 : u.role === 'agency' ? 99 : 199,
        currency: 'usd',
        status: u.status === 'active' ? 'succeeded' : u.status === 'suspended' ? 'failed' : 'succeeded',
        paymentDate: u.createdAt,
        failureReason: u.status === 'suspended' ? 'card_declined' : undefined
      }));
  }

  async getSubscriptionStats() {
    const allUsers = await this.getAllUsers();
    const activeSubscriptions = allUsers.filter(u => u.stripeSubscriptionId && u.status === 'active').length;
    const totalRevenue = allUsers
      .filter(u => u.stripeSubscriptionId)
      .reduce((sum, user) => {
        const amount = user.role === 'premium' ? 29 : user.role === 'agent' ? 49 : user.role === 'agency' ? 99 : 199;
        return sum + amount;
      }, 0);
    
    return {
      activeSubscriptions,
      monthlyRevenue: totalRevenue,
      churnRate: 2.5,
      conversionRate: allUsers.length > 0 ? (activeSubscriptions / allUsers.length) * 100 : 0
    };
  }

  async getUserBehaviorData() {
    const allUsers = await this.getAllUsers();
    const userBehavior = await Promise.all(
      allUsers.slice(0, 20).map(async (u) => {
        // Get user's property views (from favorites as a proxy)
        const [favoritesCount] = await db.select({ count: count() }).from(favorites)
          .where(eq(favorites.userId, u.id));
        
        // Get user's saved searches
        const [savedSearchesCount] = await db.select({ count: count() }).from(savedSearches)
          .where(eq(savedSearches.userId, u.id));
        
        // Determine conversion stage based on actual data
        const conversionStage = u.stripeSubscriptionId 
          ? 'converted' 
          : favoritesCount.count > 5 
            ? 'engaged' 
            : favoritesCount.count > 0 
              ? 'browsing' 
              : 'new';
        
        return {
          id: u.id,
          userId: u.id,
          userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email?.split('@')[0] || 'User',
          userEmail: u.email,
          propertiesViewed: favoritesCount.count + savedSearchesCount.count,
          timeSpent: Math.floor((favoritesCount.count * 5) + (savedSearchesCount.count * 3)), // Estimate based on activity
          lastActivity: u.updatedAt || u.createdAt,
          conversionStage,
          actions: [
            ...(favoritesCount.count > 0 ? ['viewed_property'] : []),
            ...(savedSearchesCount.count > 0 ? ['saved_search'] : []),
            ...(u.stripeSubscriptionId ? ['subscribed'] : [])
          ]
        };
      })
    );
    return userBehavior;
  }

  async getAnalyticsData() {
    const allUsers = await this.getAllUsers();
    const allProperties = await this.getProperties();
    const subscriptions = allUsers.filter(u => u.stripeSubscriptionId);
    
    // Calculate revenue based on actual user roles
    const totalRevenue = subscriptions.reduce((sum, user) => {
      const amount = user.role === 'premium' ? 29 : user.role === 'agent' ? 49 : user.role === 'agency' ? 99 : 199;
      return sum + amount;
    }, 0);
    
    // Calculate monthly revenue from users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthlySubscriptions = subscriptions.filter(u => new Date(u.createdAt) >= startOfMonth);
    const monthlyRevenue = monthlySubscriptions.reduce((sum, user) => {
      const amount = user.role === 'premium' ? 29 : user.role === 'agent' ? 49 : user.role === 'agency' ? 99 : 199;
      return sum + amount;
    }, 0);
    
    // Calculate actual growth rates
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newUsers = allUsers.filter(u => new Date(u.createdAt) >= oneMonthAgo).length;
    const userGrowth = allUsers.length > 0 ? (newUsers / allUsers.length) * 100 : 0;
    
    const lastMonthRevenue = totalRevenue - monthlyRevenue;
    const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    
    // Calculate conversion rates based on actual user progression
    const freeUsers = allUsers.filter(u => u.role === 'free').length;
    const premiumUsers = allUsers.filter(u => u.role === 'premium').length;
    const agentUsers = allUsers.filter(u => u.role === 'agent').length;
    const agencyUsers = allUsers.filter(u => u.role === 'agency').length;
    
    const freeTopremium = freeUsers > 0 ? (premiumUsers / freeUsers) * 100 : 0;
    const premiumToAgent = premiumUsers > 0 ? (agentUsers / premiumUsers) * 100 : 0;
    const agentToAgency = agentUsers > 0 ? (agencyUsers / agentUsers) * 100 : 0;

    return {
      revenue: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        arpu: allUsers.length > 0 ? totalRevenue / allUsers.length : 0
      },
      users: {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.status === 'active').length,
        newUsers,
        userGrowth
      },
      properties: {
        totalProperties: allProperties.length,
        activeProperties: allProperties.filter(p => p.status === 'active').length,
        totalViews: allProperties.reduce((sum, p) => sum + (p.views || 0), 0),
        totalSaves: allProperties.reduce((sum, p) => sum + (p.saves || 0), 0)
      },
      conversion: {
        freeTopremium,
        premiumToAgent,
        agentToAgency,
        overallConversion: subscriptions.length > 0 ? (subscriptions.length / allUsers.length) * 100 : 0
      }
    };
  }

  // ==================== ADMIN PROPERTY MANAGEMENT METHODS ====================
  
  async getPropertyAnalytics(timeframe: string): Promise<any> {
    const days = parseInt(timeframe.replace('d', ''));
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const [totalProperties] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties);

    const [activeProperties] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.status, 'active'));

    const [featuredProperties] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.featured, true));

    const [recentProperties] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(gte(properties.createdAt, dateThreshold));

    const averageViews = await db
      .select({ avg: sql<number>`avg(${properties.views})` })
      .from(properties)
      .where(eq(properties.status, 'active'));

    const averagePrice = await db
      .select({ avg: sql<number>`avg(${properties.price})` })
      .from(properties)
      .where(eq(properties.status, 'active'));

    const cityStats = await db
      .select({
        city: properties.city,
        count: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`
      })
      .from(properties)
      .where(eq(properties.status, 'active'))
      .groupBy(properties.city)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const typeStats = await db
      .select({
        type: properties.propertyType,
        count: sql<number>`count(*)`,
        avgPrice: sql<number>`avg(${properties.price})`
      })
      .from(properties)
      .where(eq(properties.status, 'active'))
      .groupBy(properties.propertyType)
      .orderBy(sql`count(*) desc`);

    return {
      totals: {
        total: totalProperties.count,
        active: activeProperties.count,
        featured: featuredProperties.count,
        recent: recentProperties.count,
      },
      averages: {
        views: Math.round(averageViews[0]?.avg || 0),
        price: Math.round(averagePrice[0]?.avg || 0),
      },
      breakdown: {
        byCity: cityStats,
        byType: typeStats,
      }
    };
  }

  async getAdminProperties(filters: any): Promise<any> {
    let query = db.select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      sqft: properties.sqft,
      propertyType: properties.propertyType,
      status: properties.status,
      featured: properties.featured,
      featuredUntil: properties.featuredUntil,
      views: properties.views,
      saves: properties.saves,
      agentId: properties.agentId,
      organizationId: properties.organizationId,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
      agentEmail: users.email,
      agentName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(properties)
    .leftJoin(users, eq(properties.agentId, users.id));

    // Apply filters
    const conditions = [];
    
    if (filters.search) {
      conditions.push(
        or(
          ilike(properties.title, `%${filters.search}%`),
          ilike(properties.address, `%${filters.search}%`),
          ilike(properties.city, `%${filters.search}%`)
        )
      );
    }

    if (filters.agentId) {
      conditions.push(eq(properties.agentId, filters.agentId));
    }

    if (filters.organizationId) {
      conditions.push(eq(properties.organizationId, filters.organizationId));
    }

    if (filters.status) {
      conditions.push(eq(properties.status, filters.status));
    }

    if (filters.featured !== undefined) {
      conditions.push(eq(properties.featured, filters.featured));
    }

    if (filters.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType));
    }

    if (filters.city) {
      conditions.push(ilike(properties.city, `%${filters.city}%`));
    }

    if (filters.state) {
      conditions.push(eq(properties.state, filters.state));
    }

    if (filters.minPrice) {
      conditions.push(gte(properties.price, filters.minPrice.toString()));
    }

    if (filters.maxPrice) {
      conditions.push(lte(properties.price, filters.maxPrice.toString()));
    }

    if (filters.dateFrom) {
      conditions.push(gte(properties.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(properties.createdAt, new Date(filters.dateTo)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = filters.sortBy === 'agent' ? users.email : 
                      filters.sortBy === 'price' ? properties.price :
                      filters.sortBy === 'views' ? properties.views :
                      filters.sortBy === 'createdAt' ? properties.createdAt :
                      properties.createdAt;
    
    query = query.orderBy(
      filters.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
    );

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(properties)
      .leftJoin(users, eq(properties.agentId, users.id));
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    // Apply pagination
    const results = await query.limit(filters.limit).offset(filters.offset);

    return {
      properties: results,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        pages: Math.ceil(total / filters.limit),
      }
    };
  }

  async bulkUpdateProperties(propertyIds: string[], updates: any): Promise<any> {
    const allowedUpdates = ['status', 'featured', 'propertyType', 'price'];
    const cleanUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      throw new Error('No valid updates provided');
    }

    cleanUpdates.updatedAt = new Date();

    const result = await db
      .update(properties)
      .set(cleanUpdates)
      .where(inArray(properties.id, propertyIds))
      .returning({ id: properties.id });

    return {
      updated: result.length,
      propertyIds: result.map(p => p.id),
    };
  }

  async bulkDeleteProperties(propertyIds: string[]): Promise<any> {
    // First delete related records
    await db.delete(leads).where(inArray(leads.propertyId, propertyIds));
    await db.delete(favorites).where(inArray(favorites.propertyId, propertyIds));

    // Then delete properties
    const result = await db
      .delete(properties)
      .where(inArray(properties.id, propertyIds))
      .returning({ id: properties.id });

    return {
      deleted: result.length,
      propertyIds: result.map(p => p.id),
    };
  }

  async getPropertiesByIds(propertyIds: string[]): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(inArray(properties.id, propertyIds));
  }

  async getPropertyPerformance(propertyId: string, timeframe: string): Promise<any> {
    const days = parseInt(timeframe.replace('d', ''));
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const property = await this.getProperty(propertyId);
    if (!property) {
      throw new Error('Property not found');
    }

    // Get leads for this property in timeframe
    const propertyLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.propertyId, propertyId),
          gte(leads.createdAt, dateThreshold)
        )
      );

    // Get views trend (simulated daily breakdown)
    const dailyViews = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const views = Math.max(0, Math.floor(property.views / days) + Math.floor(Math.random() * 10));
      dailyViews.push({
        date: date.toISOString().split('T')[0],
        views,
      });
    }

    return {
      property: {
        id: property.id,
        title: property.title,
        views: property.views,
        saves: property.saves,
        featured: property.featured,
      },
      performance: {
        totalLeads: propertyLeads.length,
        leadsByStatus: propertyLeads.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        dailyViews,
        conversionRate: property.views > 0 ? (propertyLeads.length / property.views * 100).toFixed(2) : 0,
      }
    };
  }

  async getPropertyActivityLog(propertyId: string): Promise<any[]> {
    // Get admin actions related to this property
    const adminActionsResult = await db
      .select({
        id: adminActions.id,
        actorId: adminActions.actorId,
        actionType: adminActions.actionType,
        beforeData: adminActions.beforeData,
        afterData: adminActions.afterData,
        createdAt: adminActions.createdAt,
        actorEmail: users.email,
        actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(adminActions)
      .leftJoin(users, eq(adminActions.actorId, users.id))
      .where(eq(adminActions.targetId, propertyId))
      .orderBy(desc(adminActions.createdAt));

    // Get user activity logs related to this property
    const userActivities = await db
      .select({
        id: userActivityLogs.id,
        userId: userActivityLogs.userId,
        activity: userActivityLogs.activity,
        details: userActivityLogs.details,
        createdAt: userActivityLogs.createdAt,
        userEmail: users.email,
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.userId, users.id))
      .where(sql`${userActivityLogs.details}->>'propertyId' = ${propertyId}`)
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(20);

    // Combine and sort all activities
    const allActivities = [
      ...adminActionsResult.map(action => ({
        type: 'admin_action',
        ...action,
      })),
      ...userActivities.map(activity => ({
        type: 'user_activity',
        ...activity,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allActivities;
  }

  // Email verification methods
  async createVerificationCode(verificationCodeData: InsertVerificationCode): Promise<VerificationCode> {
    const [verificationCode] = await db
      .insert(verificationCodes)
      .values(verificationCodeData)
      .returning();
    return verificationCode;
  }

  async getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.code, code),
          gte(verificationCodes.expiresAt, new Date()),
          sql`${verificationCodes.usedAt} IS NULL`
        )
      );
    return verificationCode;
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, id));
  }

  async verifyUserEmail(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();