import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import type { FeatureFlags, UserRole } from '@/lib/authUtils';

interface BaseGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

interface RoleGuardProps extends BaseGuardProps {
  allowedRoles: UserRole | UserRole[];
  requireMinimum?: boolean;
}

interface FeatureGuardProps extends BaseGuardProps {
  feature: keyof FeatureFlags;
  checkLevel?: string | number;
}

interface AuthGuardProps extends BaseGuardProps {
  requireAuth?: boolean;
}

// Default upgrade prompt component
function DefaultUpgradePrompt({ requiredRole, feature }: { requiredRole?: UserRole; feature?: string }) {
  const { upgradePath, roleDisplayName } = useAuth();
  
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/10">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-800 dark:text-amber-300">Upgrade Required</CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-400">
          {feature ? `Access to ${feature} requires` : `This feature requires`} {requiredRole ? `${requiredRole} tier` : 'a higher subscription'} or above.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Plan:</span>
            <Badge variant="secondary">{roleDisplayName}</Badge>
          </div>
          {upgradePath && (
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/subscribe'}
              data-testid="button-upgrade"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Upgrade to {upgradePath.charAt(0).toUpperCase() + upgradePath.slice(1)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Guard that checks for specific roles
export function RoleGuard({ 
  children, 
  allowedRoles, 
  requireMinimum = false, 
  fallback, 
  showUpgradePrompt = true 
}: RoleGuardProps) {
  const { hasRole, hasMinRole, user } = useAuth();
  
  const hasAccess = requireMinimum 
    ? (Array.isArray(allowedRoles) ? allowedRoles.some(role => hasMinRole(role)) : hasMinRole(allowedRoles))
    : hasRole(allowedRoles);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgradePrompt && user) {
    const requiredRole = Array.isArray(allowedRoles) ? allowedRoles[0] : allowedRoles;
    return <DefaultUpgradePrompt requiredRole={requiredRole} />;
  }
  
  return null;
}

// Guard that checks for specific features
export function FeatureGuard({ 
  children, 
  feature, 
  checkLevel, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGuardProps) {
  const { hasFeature, user } = useAuth();
  
  const hasAccess = hasFeature(feature);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgradePrompt && user) {
    return <DefaultUpgradePrompt feature={feature} />;
  }
  
  return null;
}

// Guard that checks authentication status
export function AuthGuard({ 
  children, 
  requireAuth = true, 
  fallback, 
  showUpgradePrompt = true 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showUpgradePrompt) {
      return (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-800 dark:text-blue-300">Sign In Required</CardTitle>
            </div>
            <CardDescription className="text-blue-700 dark:text-blue-400">
              You need to sign in to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-sign-in"
            >
              <Shield className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  }
  
  return <>{children}</>;
}

// Admin-only guard
export function AdminGuard({ children, fallback, showUpgradePrompt = false }: BaseGuardProps) {
  return (
    <RoleGuard 
      allowedRoles="admin" 
      fallback={fallback} 
      showUpgradePrompt={showUpgradePrompt}
    >
      {children}
    </RoleGuard>
  );
}

// Agent+ guard (agent, agency, expert, admin)
export function AgentGuard({ children, fallback, showUpgradePrompt = true }: BaseGuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['agent', 'agency', 'expert', 'admin']} 
      fallback={fallback} 
      showUpgradePrompt={showUpgradePrompt}
    >
      {children}
    </RoleGuard>
  );
}

// Premium+ guard (premium, agent, agency, expert, admin)
export function PremiumGuard({ children, fallback, showUpgradePrompt = true }: BaseGuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['premium', 'agent', 'agency', 'expert', 'admin']} 
      fallback={fallback} 
      showUpgradePrompt={showUpgradePrompt}
    >
      {children}
    </RoleGuard>
  );
}

// Conditional component wrapper for simple permission checks
export function ProtectedComponent({
  children,
  when,
  fallback,
  showUpgradePrompt = true
}: {
  children: ReactNode;
  when: boolean;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}) {
  if (when) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return null;
}

// Usage limit indicator
export function UsageLimitIndicator({ 
  current, 
  limit, 
  label = "Usage",
  showUpgradePrompt = true 
}: {
  current: number;
  limit: number;
  label?: string;
  showUpgradePrompt?: boolean;
}) {
  const { upgradePath } = useAuth();
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={`font-mono ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {current}/{limit === 0 ? '∞' : limit}
        </span>
      </div>
      
      {limit > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      )}
      
      {isAtLimit && showUpgradePrompt && upgradePath && (
        <Alert className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You've reached your {label.toLowerCase()} limit.</span>
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/subscribe'}>
              Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}