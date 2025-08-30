import { useQuery } from "@tanstack/react-query";
import type { User as DBUser } from "@shared/schema";
import { 
  hasFeatureAccess, 
  hasMinimumRole, 
  hasRole, 
  canCreateMoreListings,
  canAccessAdmin,
  canAccessAnalytics,
  canManageOrganization,
  getRoleDisplayName,
  getUpgradePath,
  type FeatureFlags,
  type UserRole,
  type User
} from "@/lib/authUtils";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<DBUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Convert DB user to frontend user type for permission checking
  const authUser: User | undefined = user ? {
    id: user.id,
    email: user.email || undefined,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    profileImageUrl: user.profileImageUrl || undefined,
    role: user.role as UserRole,
    status: user.status,
    organizationId: user.organizationId || undefined,
    featureFlags: user.featureFlags as FeatureFlags || undefined,
    stripeCustomerId: user.stripeCustomerId || undefined,
    stripeSubscriptionId: user.stripeSubscriptionId || undefined,
  } : undefined;

  return {
    user: authUser,
    isLoading,
    isAuthenticated: !!user,
    error,
    
    // Permission checking methods
    hasFeature: (featureName: keyof FeatureFlags) => hasFeatureAccess(authUser, featureName),
    hasMinRole: (minimumRole: UserRole) => hasMinimumRole(authUser, minimumRole),
    hasRole: (roles: UserRole | UserRole[]) => hasRole(authUser, roles),
    canCreateListings: (currentListings?: number) => canCreateMoreListings(authUser, currentListings),
    canAccessAdmin: () => canAccessAdmin(authUser),
    canAccessAnalytics: (level?: 'limited' | 'full') => canAccessAnalytics(authUser, level),
    canManageOrg: () => canManageOrganization(authUser),
    
    // User display utilities
    roleDisplayName: authUser ? getRoleDisplayName(authUser.role) : 'Guest',
    upgradePath: getUpgradePath(authUser),
    
    // Quick role checks
    isFree: () => hasRole(authUser, 'free'),
    isRegistered: () => hasRole(authUser, 'registered'),
    isPremium: () => hasRole(authUser, 'premium'),
    isAgent: () => hasRole(authUser, 'agent'),
    isAgency: () => hasRole(authUser, 'agency'),
    isExpert: () => hasRole(authUser, 'expert'),
    isAdmin: () => hasRole(authUser, 'admin'),
  };
}
