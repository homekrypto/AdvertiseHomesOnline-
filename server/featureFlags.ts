import type { FeatureFlags, UserRole, User } from "@shared/schema";

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
    integrations_api: false,
    priority_rank_boost: false,
    priority_support: false,
  };

  switch (role) {
    case 'free':
      // 🏠 FREE BROWSERS (Unauthenticated)
      return {
        ...baseFlags,
        can_view_listings: true,
      };

    case 'registered':
      // 🔑 REGISTERED USERS (Free Account)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_analytics: 'limited',
      };

    case 'premium':
      // 💎 PREMIUM SUBSCRIBERS (Buyers/Investors)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
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
      // 🏢 AGENCY PLAN (Small Team)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 25,
        agent_featured_credits_monthly: 10,
        agent_analytics: 'advanced',
        org_max_active_listings: 25,
        org_seats: 10,
        org_crm: true,
        org_lead_routing: true,
        org_bulk_import: true,
        org_branding_page: true,
      };

    case 'expert':
      // 🚀 EXPERT PLAN (Enterprise + AI)
      return {
        ...baseFlags,
        can_view_listings: true,
        can_save_favorites: true,
        can_contact_via_form: true,
        can_view_contact_info: true,
        can_view_analytics: 'full',
        can_advanced_filters: true,
        can_virtual_tours: true,
        agent_max_active_listings: 999999, // Unlimited
        agent_featured_credits_monthly: 50,
        agent_analytics: 'advanced',
        org_max_active_listings: 999999, // Unlimited
        org_seats: 50,
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