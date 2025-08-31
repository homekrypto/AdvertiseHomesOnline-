import type { FeatureFlags, UserRole, User } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

// Default feature flags based on subscription tiers (as per specification)
export function getFeatureFlagsForRole(role: UserRole, organizationTier?: string): FeatureFlags {
  const baseFlags: FeatureFlags = {
    // Basic access permissions
    can_view_listings: false,
    can_view_contact_info: false,
    can_save_favorites: false,
    can_view_analytics: 'none',
    can_contact_via_form: false,
    can_advanced_filters: false,
    can_virtual_tours: false,
    
    // Agent-specific features
    agent_max_active_listings: 0,
    agent_featured_credits_monthly: 0,
    agent_analytics: 'none',
    
    // Organization features
    org_max_active_listings: 0,
    org_seats: 0,
    org_crm: false,
    org_lead_routing: false,
    org_bulk_import: false,
    org_branding_page: false,
    
    // AI and automation features
    ai_pricing_suggestions: false,
    ai_comp_selection: false,
    ai_automation: false,
    ai_blog_writing: false, // New: AI blog writing from property listings
    ai_social_media_integration: false, // New: 1-button social media posting
    integrations_api: false,
    priority_rank_boost: false,
    priority_support: false,
  };

  switch (role) {
    case 'free':
      // 🏠 FREE TIER ($0 - Always Free)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true, // Direct agent contact
        can_advanced_filters: true, // Basic search filters included
      };

    case 'agent':
      // 🧑‍💼 AGENT PLAN (Individual)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 5,
        agent_featured_credits_monthly: 5,
        agent_analytics: 'basic',
      };

    case 'agency':
      // 🏢 AGENCY PLAN ($99/$79.20 monthly - Small Team)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 20, // Updated to 20 listings
        agent_featured_credits_monthly: 10,
        agent_analytics: 'advanced',
        org_max_active_listings: 20, // Updated to 20 listings
        org_seats: 2, // Updated to 2 team seats
        org_crm: true,
        org_lead_routing: true,
        org_bulk_import: true,
        org_branding_page: true, // White-label branding
      };

    case 'expert':
      // 🚀 EXPERT PLAN ($299/$239.20 monthly - Enterprise + AI)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 100, // Updated to 100 listings
        agent_featured_credits_monthly: 50,
        agent_analytics: 'advanced',
        org_max_active_listings: 100, // Updated to 100 listings
        org_seats: 5, // Updated to 5 team seats
        org_crm: true,
        org_lead_routing: true,
        org_bulk_import: true,
        org_branding_page: true,
        ai_pricing_suggestions: true,
        ai_comp_selection: true,
        ai_automation: true,
        ai_blog_writing: true, // AI blog writing from property listings
        ai_social_media_integration: true, // 1-button social media posting
        integrations_api: true, // API access & integrations
        priority_rank_boost: true,
        priority_support: true, // Dedicated account manager
      };

    case 'admin':
      // 👑 ADMIN (Full access)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 999999,
        agent_featured_credits_monthly: 999999,
        agent_analytics: 'advanced',
        org_max_active_listings: 999999,
        org_seats: 999999,
        org_crm: true,
        org_lead_routing: true,
        org_bulk_import: true,
        org_branding_page: true,
        ai_pricing_suggestions: true,
        ai_comp_selection: true,
        ai_automation: true,
        integrations_api: true,
        priority_rank_boost: true,
        priority_support: true,
      };

    default:
      return baseFlags;
  }
}

// Check if user can perform specific actions
export function canUserPerformAction(user: User, action: keyof FeatureFlags): boolean {
  const featureFlags = user.featureFlags as FeatureFlags || getFeatureFlagsForRole(user.role as UserRole);
  const flag = featureFlags[action];
  
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'number') return flag > 0;
  if (typeof flag === 'string') return flag !== 'none';
  
  return false;
}

// Check if user has reached listing cap
export function hasReachedListingCap(user: User, currentListings: number): boolean {
  const featureFlags = user.featureFlags as FeatureFlags || getFeatureFlagsForRole(user.role as UserRole);
  const cap = featureFlags.agent_max_active_listings || featureFlags.org_max_active_listings;
  return currentListings >= cap;
}

// Check if organization has reached seat cap
export function hasReachedSeatCap(organization: any): boolean {
  return organization.seatsUsed >= organization.seatsTotal;
}

// Comprehensive listing cap enforcement functions
export async function enforceListingCaps(userId: string, storage: any): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');

  const userProperties = await storage.getPropertiesByAgent(userId);
  const currentCount = userProperties.length;
  const flags = getFeatureFlagsForRole(user.role as UserRole);
  const maxListings = flags.agent_max_active_listings || flags.org_max_active_listings;

  if (maxListings > 0 && currentCount >= maxListings) {
    throw new Error(`Listing limit exceeded. Your ${user.role} plan allows ${maxListings} listings. Current: ${currentCount}`);
  }
}

export async function checkListingUsage(userId: string, storage: any): Promise<{
  current: number;
  limit: number;
  percentage: number;
  canCreateMore: boolean;
  tier: string;
}> {
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');

  const userProperties = await storage.getPropertiesByAgent(userId);
  const current = userProperties.length;
  const flags = getFeatureFlagsForRole(user.role as UserRole);
  const limit = flags.agent_max_active_listings || flags.org_max_active_listings || -1;
  const percentage = limit === -1 || limit === 0 ? 0 : (current / limit) * 100;
  const canCreateMore = limit === -1 || limit === 0 || current < limit;

  return {
    current,
    limit,
    percentage,
    canCreateMore,
    tier: user.role
  };
}

export async function enforceSeatLimits(organizationId: string, storage: any): Promise<void> {
  const organization = await storage.getOrganization(organizationId);
  if (!organization) throw new Error('Organization not found');

  const members = await storage.getOrganizationMembers(organizationId);
  const currentSeats = members.length;
  const maxSeats = organization.seatLimit || 1;

  if (currentSeats >= maxSeats) {
    throw new Error(`Seat limit exceeded. Your plan allows ${maxSeats} seats. Current: ${currentSeats}`);
  }
}

export async function checkSeatUsage(organizationId: string, storage: any): Promise<{
  current: number;
  limit: number;
  percentage: number;
  canAddMore: boolean;
}> {
  const organization = await storage.getOrganization(organizationId);
  if (!organization) throw new Error('Organization not found');

  const members = await storage.getOrganizationMembers(organizationId);
  const current = members.length;
  const limit = organization.seatLimit || 1;
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const canAddMore = current < limit;

  return {
    current,
    limit,
    percentage,
    canAddMore
  };
}

// Enhanced feature flag helpers for new property management system

// Consume a featured credit for a user
export async function consumeFeaturedCredit(userId: string, storage: any): Promise<void> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentFlags = (user.featureFlags as any) || {};
  const featuredCredits = currentFlags.featuredCredits || 0;
  
  if (featuredCredits <= 0) {
    throw new Error('No featured credits available. Upgrade your plan or purchase additional credits.');
  }

  // Consume one featured credit - update feature flags instead
  const updatedFlags = { 
    ...currentFlags, 
    featuredCredits: Math.max(0, featuredCredits - 1) 
  };
  
  await db.update(users)
    .set({ featureFlags: updatedFlags })
    .where(eq(users.id, userId));
}

// Get user's feature configuration for property forms
export async function getPropertyFormConfig(userId: string, storage: any) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');

  const flags = getFeatureFlagsForRole(user.role as UserRole);
  const userProperties = await storage.getPropertiesByAgent(userId);
  
  return {
    role: user.role,
    features: flags,
    bulkImportEnabled: flags.org_bulk_import,
    aiSuggestionsEnabled: flags.ai_pricing_suggestions,
    featuredCreditsAvailable: ((user.featureFlags as any)?.featuredCredits) || flags.agent_featured_credits_monthly || 0,
    listingCap: flags.agent_max_active_listings || flags.org_max_active_listings || 0,
    usedListings: userProperties.length,
    availableListings: Math.max(0, (flags.agent_max_active_listings || flags.org_max_active_listings || 0) - userProperties.length),
    advancedAnalytics: flags.can_view_analytics === 'full',
    customBranding: flags.org_branding_page || false,
    prioritySupport: flags.priority_support || false,
  };
}

// Check if user can access AI features
export function canAccessAIFeatures(user: User): boolean {
  const flags = getFeatureFlagsForRole(user.role as UserRole);
  return flags.ai_pricing_suggestions && flags.ai_comp_selection;
}

// Check if user can perform bulk operations  
export function canPerformBulkOperations(user: User): boolean {
  const flags = getFeatureFlagsForRole(user.role as UserRole);
  return flags.org_bulk_import;
}

// Get feature flags using new format for compatibility
export function getFeatureFlags(role: string): FeatureFlags {
  return getFeatureFlagsForRole(role as UserRole);
}