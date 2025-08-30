import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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

    if (!isLoading && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin access required for this dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === 'admin',
  });

  const { data: revenueAnalytics, isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/admin/analytics/revenue"],
    enabled: !!user && user.role === 'admin',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dashboardMetrics = metrics as DashboardMetrics;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="admin-dashboard-title">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management tools</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Admin Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-3">
                    <Shield className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">System Admin</div>
                    <div className="text-sm text-muted-foreground">Super Admin</div>
                  </div>
                </div>
                
                <nav className="space-y-2">
                  <div className="flex items-center px-3 py-2 text-primary bg-primary/10 rounded-md">
                    <BarChart3 className="h-5 w-5 mr-3" />
                    <span>Overview</span>
                  </div>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <Users className="h-5 w-5 mr-3" />
                    <span>User Management</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <CreditCard className="h-5 w-5 mr-3" />
                    <span>Subscriptions</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <TrendingUp className="h-5 w-5 mr-3" />
                    <span>Analytics</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <Home className="h-5 w-5 mr-3" />
                    <span>Properties</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <Settings className="h-5 w-5 mr-3" />
                    <span>Settings</span>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Key Metrics */}
            {metricsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-8 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold" data-testid="admin-total-users">
                          {dashboardMetrics?.totalUsers?.toLocaleString() || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">Total Users</div>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div className="mt-2 text-sm text-green-600">
                      <ArrowUp className="h-3 w-3 inline mr-1" />
                      {dashboardMetrics?.monthlyGrowth || 0}% from last month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold" data-testid="admin-mrr">
                          ${dashboardMetrics?.totalRevenue?.toLocaleString() || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">Monthly Recurring Revenue</div>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2 text-sm text-green-600">
                      <ArrowUp className="h-3 w-3 inline mr-1" />
                      8% from last month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold" data-testid="admin-active-listings">
                          {dashboardMetrics?.activeListings?.toLocaleString() || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">Active Listings</div>
                      </div>
                      <Home className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2 text-sm text-green-600">
                      <ArrowUp className="h-3 w-3 inline mr-1" />
                      5% from last month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold" data-testid="admin-conversion-rate">
                          {dashboardMetrics?.conversionRate || 0}%
                        </div>
                        <div className="text-muted-foreground text-sm">Conversion Rate</div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="mt-2 text-sm text-red-600">
                      <ArrowDown className="h-3 w-3 inline mr-1" />
                      0.3% from last month
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Real Revenue Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
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
                            ${revenueAnalytics?.totalRevenue?.toLocaleString() || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Revenue</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-blue-600" data-testid="monthly-revenue">
                            ${revenueAnalytics?.monthlyRevenue?.toLocaleString() || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-purple-600" data-testid="arpu">
                            ${revenueAnalytics?.arpu?.toFixed(2) || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">ARPU</div>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold text-orange-600" data-testid="churn-rate">
                            {revenueAnalytics?.churnRate?.toFixed(1) || 0}%
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

            {/* User Management Section */}
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users?.slice(0, 10).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`user-${user.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground font-semibold">
                              {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.firstName && user.lastName ? 
                                `${user.firstName} ${user.lastName}` : 
                                user.email || 'Unknown User'
                              }
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={user.stripeSubscriptionId ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                          <Badge variant={user.status === 'active' ? "default" : "destructive"}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {users?.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No users found
                      </div>
                    )}
                    {users && users.length > 10 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" data-testid="view-all-users">
                          View All {users.length} Users
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
