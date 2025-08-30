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
            
            {/* Analytics Charts Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                      <div>Revenue Chart</div>
                      <div className="text-sm">Analytics implementation pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2" />
                      <div>User Growth Chart</div>
                      <div className="text-sm">Analytics implementation pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
