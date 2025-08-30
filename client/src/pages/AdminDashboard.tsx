import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminSubscriptionManagement from "@/components/AdminSubscriptionManagement";
import AdminAnalytics from "@/components/AdminAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  DollarSign, 
  Home, 
  TrendingUp, 
  Shield,
  Settings,
  BarChart3,
  CreditCard,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface DashboardMetrics {
  totalUsers: number;
  totalRevenue: number;
  activeListings: number;
  conversionRate: number;
  usersByRole: Record<string, number>;
  monthlyGrowth: number;
}

interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  arpu: number;
  churnRate: number;
  subscriptionsByTier: Record<string, number>;
  revenueGrowth: number;
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!user || user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/admin/dashboard-metrics"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: revenueAnalytics, isLoading: revenueLoading } = useQuery<RevenueAnalytics>({
    queryKey: ["/api/admin/revenue-analytics"],
    enabled: !!user && user.role === 'admin',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Platform management and analytics
              </p>
            </div>
            <Badge variant="destructive" className="ml-auto">
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </Badge>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="admin-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="admin-users-count">
                  {metrics?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{(metrics?.monthlyGrowth || 0).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="admin-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="admin-revenue-amount">
                  ${(metrics?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground text-green-600">
                  <ArrowUp className="h-4 w-4 mr-1 inline" />
                  12.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="admin-active-listings">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="admin-listings-count">
                  {metrics?.activeListings || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total property listings
                </p>
              </CardContent>
            </Card>

            <Card data-testid="admin-conversion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="admin-conversion-percent">
                  {(metrics?.conversionRate || 0).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Free to paid conversion
                </p>
              </CardContent>
            </Card>
          </div>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution by Role</CardTitle>
              <CardDescription>Breakdown of users by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(metrics?.usersByRole || {}).map(([role, count]) => (
                    <div key={role} className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{role}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Analytics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Financial performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600" data-testid="total-revenue">
                          ${(revenueAnalytics?.totalRevenue || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Revenue</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600" data-testid="monthly-revenue">
                          ${(revenueAnalytics?.monthlyRevenue || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600" data-testid="arpu">
                          ${(revenueAnalytics?.arpu || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">ARPU</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600" data-testid="churn-rate">
                          {(revenueAnalytics?.churnRate || 0).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Churn Rate</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Users by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(revenueAnalytics?.subscriptionsByTier || {}).map(([tier, count]) => (
                      <div key={tier} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="capitalize font-medium">{tier}</span>
                        <Badge variant="secondary" data-testid={`tier-${tier}`}>{count} users</Badge>
                      </div>
                    ))}
                    {Object.keys(revenueAnalytics?.subscriptionsByTier || {}).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No active subscriptions yet
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-16 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Manage Users</span>
                </Button>
                <Button variant="outline" className="h-16 flex flex-col">
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span>View Payments</span>
                </Button>
                <Button variant="outline" className="h-16 flex flex-col">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Analytics</span>
                </Button>
                <Button variant="outline" className="h-16 flex flex-col">
                  <Settings className="h-6 w-6 mb-2" />
                  <span>Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Tabs */}
          <div className="mt-8">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="properties">Properties</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">System Overview</h3>
                  <p className="text-muted-foreground">
                    Platform metrics and system status displayed above
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="users">
                <AdminUserManagement />
              </TabsContent>

              <TabsContent value="subscriptions">
                <AdminSubscriptionManagement />
              </TabsContent>

              <TabsContent value="analytics">
                <AdminAnalytics />
              </TabsContent>

              <TabsContent value="properties" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">Property Management</p>
                      <p className="text-muted-foreground">
                        Advanced property management tools will be available here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}