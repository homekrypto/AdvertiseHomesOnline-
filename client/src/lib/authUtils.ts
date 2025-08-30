export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Permission checking utilities for frontend role-based access control
export type UserRole = 'free' | 'registered' | 'premium' | 'agent' | 'agency' | 'expert' | 'admin';

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

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: UserRole;
  status: string;
  organizationId?: string;
  featureFlags?: FeatureFlags;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// Check if user has access to a specific feature
export function hasFeatureAccess(user: User | undefined, featureName: keyof FeatureFlags): boolean {
  if (!user || !user.featureFlags) return false;
  
  const flag = user.featureFlags[featureName];
  
  if (typeof flag === 'boolean') return flag;
  if (typeof flag === 'number') return flag > 0;
  if (typeof flag === 'string') return flag !== 'none';
  
  return false;
}

// Check if user has minimum required role
export function hasMinimumRole(user: User | undefined, minimumRole: UserRole): boolean {
  if (!user) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    'free': 0,
    'registered': 1,
    'premium': 2,
    'agent': 3,
    'agency': 4,
    'expert': 5,
    'admin': 6
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[minimumRole];
}

// Check if user has specific role(s)
export function hasRole(user: User | undefined, roles: UserRole | UserRole[]): boolean {
  if (!user) return false;
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role);
}

// Check if user can create more listings
export function canCreateMoreListings(user: User | undefined, currentListings: number = 0): boolean {
  if (!user || !user.featureFlags) return false;
  
  const maxListings = user.featureFlags.agent_max_active_listings || user.featureFlags.org_max_active_listings;
  
  // If maxListings is 0, it means unlimited
  if (maxListings === 0) return true;
  
  return currentListings < maxListings;
}

// Check if user can access admin features
export function canAccessAdmin(user: User | undefined): boolean {
  return hasRole(user, ['admin']);
}

// Check if user can access analytics with specific level
export function canAccessAnalytics(user: User | undefined, level: 'limited' | 'full' = 'limited'): boolean {
  if (!user || !user.featureFlags) return false;
  
  const analyticsLevel = user.featureFlags.can_view_analytics;
  
  if (level === 'limited') {
    return analyticsLevel === 'limited' || analyticsLevel === 'full';
  }
  
  return analyticsLevel === 'full';
}

// Check if user can manage organization
export function canManageOrganization(user: User | undefined): boolean {
  return hasRole(user, ['agency', 'expert', 'admin']);
}

// Get user-friendly role display name
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    'free': 'Free Browser',
    'registered': 'Registered User',
    'premium': 'Premium Subscriber',
    'agent': 'Real Estate Agent',
    'agency': 'Agency Member',
    'expert': 'Expert User',
    'admin': 'Administrator'
  };
  
  return roleNames[role] || role;
}

// Get available upgrade path for user
export function getUpgradePath(user: User | undefined): UserRole | null {
  if (!user) return 'registered';
  
  const upgradePaths: Record<UserRole, UserRole | null> = {
    'free': 'registered',
    'registered': 'premium',
    'premium': 'agent',
    'agent': 'agency',
    'agency': 'expert',
    'expert': null,
    'admin': null
  };
  
  return upgradePaths[user.role];
}