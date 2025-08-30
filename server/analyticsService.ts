import { db } from './db';
import { 
  users, 
  properties, 
  leads, 
  revenueEvents, 
  analyticsSnapshots,
  userActivityLogs,
  type AnalyticsSnapshot,
  type InsertAnalyticsSnapshot,
  type InsertRevenueEvent,
  type InsertUserActivityLog
} from "@shared/schema";
import { eq, desc, gte, lte, count, sum, sql, and } from "drizzle-orm";

export interface AnalyticsMetrics {
  totalUsers: number;
  totalSubscribers: number;
  totalProperties: number;
  totalLeads: number;
  mrr: number;
  arr: number;
  churnRate: number;
  conversionRate: number;
  avgRevenuePerUser: number;
  tierBreakdown: Record<string, number>;
  revenueGrowth: number;
  userGrowth: number;
  leadConversionRate: number;
}

export interface ChartData {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueAnalytics {
  monthly: ChartData[];
  quarterly: ChartData[];
  yearly: ChartData[];
  byTier: ChartData[];
}

export class AnalyticsService {
  // Track revenue events for MRR/ARR calculations
  async trackRevenueEvent(event: InsertRevenueEvent): Promise<void> {
    try {
      await db.insert(revenueEvents).values({
        ...event,
        processedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to track revenue event:', error);
      throw error;
    }
  }

  // Track user activity for engagement analytics
  async trackUserActivity(activity: InsertUserActivityLog): Promise<void> {
    try {
      await db.insert(userActivityLogs).values(activity);
    } catch (error) {
      console.error('Failed to track user activity:', error);
    }
  }

  // Calculate current MRR
  async calculateMRR(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const revenueResult = await db
      .select({ totalRevenue: sum(revenueEvents.amount) })
      .from(revenueEvents)
      .where(
        and(
          gte(revenueEvents.createdAt, thirtyDaysAgo),
          eq(revenueEvents.eventType, 'subscription_renewed')
        )
      );

    const monthlyRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    return monthlyRevenue;
  }

  // Calculate current ARR
  async calculateARR(): Promise<number> {
    const mrr = await this.calculateMRR();
    return mrr * 12;
  }

  // Calculate churn rate (subscribers who cancelled in last 30 days / total subscribers at start of period)
  async calculateChurnRate(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const churned = await db
      .select({ count: count() })
      .from(revenueEvents)
      .where(
        and(
          gte(revenueEvents.createdAt, thirtyDaysAgo),
          eq(revenueEvents.eventType, 'subscription_cancelled')
        )
      );

    const totalSubscribers = await this.getTotalSubscribers();
    
    if (totalSubscribers === 0) return 0;
    return (churned[0]?.count || 0) / totalSubscribers;
  }

  // Get total active subscribers
  async getTotalSubscribers(): Promise<number> {
    const subscribers = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.role} != 'free_browser'`);

    return subscribers[0]?.count || 0;
  }

  // Calculate conversion rate (registered users -> paid subscribers)
  async calculateConversionRate(): Promise<number> {
    const totalRegistered = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.role} != 'free_browser'`);

    const totalSubscribers = await this.getTotalSubscribers();
    const registered = totalRegistered[0]?.count || 0;
    
    if (registered === 0) return 0;
    return totalSubscribers / registered;
  }

  // Get tier breakdown
  async getTierBreakdown(): Promise<Record<string, number>> {
    const tiers = await db
      .select({ 
        role: users.role, 
        count: count() 
      })
      .from(users)
      .groupBy(users.role);

    const breakdown: Record<string, number> = {};
    tiers.forEach(tier => {
      breakdown[tier.role] = tier.count;
    });

    return breakdown;
  }

  // Get comprehensive analytics metrics
  async getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
    const [
      totalUsers,
      totalSubscribers, 
      totalProperties,
      totalLeads,
      mrr,
      arr,
      churnRate,
      conversionRate,
      tierBreakdown
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getTotalSubscribers(),
      this.getTotalProperties(),
      this.getTotalLeads(),
      this.calculateMRR(),
      this.calculateARR(),
      this.calculateChurnRate(),
      this.calculateConversionRate(),
      this.getTierBreakdown()
    ]);

    const avgRevenuePerUser = totalSubscribers > 0 ? mrr / totalSubscribers : 0;
    const revenueGrowth = await this.getRevenueGrowth();
    const userGrowth = await this.getUserGrowth();
    const leadConversionRate = await this.getLeadConversionRate();

    return {
      totalUsers,
      totalSubscribers,
      totalProperties,
      totalLeads,
      mrr,
      arr,
      churnRate,
      conversionRate,
      avgRevenuePerUser,
      tierBreakdown,
      revenueGrowth,
      userGrowth,
      leadConversionRate
    };
  }

  // Get revenue analytics for charts
  async getRevenueAnalytics(): Promise<RevenueAnalytics> {
    const [monthly, quarterly, yearly, byTier] = await Promise.all([
      this.getMonthlyRevenue(),
      this.getQuarterlyRevenue(),
      this.getYearlyRevenue(),
      this.getRevenueByTier()
    ]);

    return { monthly, quarterly, yearly, byTier };
  }

  // Get monthly revenue data for last 12 months
  async getMonthlyRevenue(): Promise<ChartData[]> {
    const result = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue
      FROM revenue_events 
      WHERE 
        event_type IN ('subscription_created', 'subscription_renewed')
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    return (result.rows as any[]).map((row: any) => ({
      date: new Date(row.month).toISOString().split('T')[0],
      value: Number(row.revenue || 0)
    }));
  }

  // Create daily analytics snapshot
  async createDailySnapshot(): Promise<void> {
    const metrics = await this.getAnalyticsMetrics();
    
    const snapshot: InsertAnalyticsSnapshot = {
      snapshotDate: new Date(),
      totalUsers: metrics.totalUsers,
      totalSubscribers: metrics.totalSubscribers,
      totalProperties: metrics.totalProperties,
      totalLeads: metrics.totalLeads,
      mrr: metrics.mrr.toString(),
      arr: metrics.arr.toString(),
      churnRate: metrics.churnRate.toString(),
      conversionRate: metrics.conversionRate.toString(),
      avgRevenuePerUser: metrics.avgRevenuePerUser.toString(),
      tierBreakdown: metrics.tierBreakdown,
    };

    await db.insert(analyticsSnapshots).values(snapshot);
  }

  // Helper methods for detailed calculations
  private async getTotalUsers(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  }

  private async getTotalProperties(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(properties)
      .where(eq(properties.status, 'active'));
    return result[0]?.count || 0;
  }

  private async getTotalLeads(): Promise<number> {
    const result = await db.select({ count: count() }).from(leads);
    return result[0]?.count || 0;
  }

  private async getRevenueGrowth(): Promise<number> {
    const currentMRR = await this.calculateMRR();
    
    const lastMonthStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const lastMonthEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const lastMonthRevenue = await db
      .select({ totalRevenue: sum(revenueEvents.amount) })
      .from(revenueEvents)
      .where(
        and(
          gte(revenueEvents.createdAt, lastMonthStart),
          lte(revenueEvents.createdAt, lastMonthEnd),
          eq(revenueEvents.eventType, 'subscription_renewed')
        )
      );

    const previousMRR = Number(lastMonthRevenue[0]?.totalRevenue || 0);
    if (previousMRR === 0) return 0;
    
    return ((currentMRR - previousMRR) / previousMRR) * 100;
  }

  private async getUserGrowth(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const totalUsers = await this.getTotalUsers();
    if (totalUsers === 0) return 0;
    
    return ((newUsers[0]?.count || 0) / totalUsers) * 100;
  }

  private async getLeadConversionRate(): Promise<number> {
    // This is a simplified calculation - in reality you'd track leads through to sales
    const totalLeads = await this.getTotalLeads();
    if (totalLeads === 0) return 0;
    
    // Assume 15% of leads convert (placeholder - should be based on actual data)
    return 15;
  }

  private async getQuarterlyRevenue(): Promise<ChartData[]> {
    const result = await db.execute(sql`
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        EXTRACT(QUARTER FROM created_at) as quarter,
        SUM(amount) as revenue
      FROM revenue_events 
      WHERE 
        event_type IN ('subscription_created', 'subscription_renewed')
        AND created_at >= NOW() - INTERVAL '2 years'
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
      ORDER BY year, quarter
    `);

    return (result.rows as any[]).map((row: any) => ({
      date: `${row.year} Q${row.quarter}`,
      value: Number(row.revenue || 0)
    }));
  }

  private async getYearlyRevenue(): Promise<ChartData[]> {
    const result = await db.execute(sql`
      SELECT 
        EXTRACT(YEAR FROM created_at) as year,
        SUM(amount) as revenue
      FROM revenue_events 
      WHERE 
        event_type IN ('subscription_created', 'subscription_renewed')
        AND created_at >= NOW() - INTERVAL '5 years'
      GROUP BY EXTRACT(YEAR FROM created_at)
      ORDER BY year
    `);

    return (result.rows as any[]).map((row: any) => ({
      date: String(row.year),
      value: Number(row.revenue || 0)
    }));
  }

  private async getRevenueByTier(): Promise<ChartData[]> {
    const result = await db.execute(sql`
      SELECT 
        u.role as tier,
        SUM(re.amount) as revenue
      FROM revenue_events re
      JOIN users u ON re.user_id = u.id
      WHERE 
        re.event_type IN ('subscription_created', 'subscription_renewed')
        AND re.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY u.role
      ORDER BY revenue DESC
    `);

    return (result.rows as any[]).map((row: any) => ({
      date: row.tier,
      value: Number(row.revenue || 0),
      label: row.tier
    }));
  }
}

export const analyticsService = new AnalyticsService();