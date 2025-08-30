import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserCheck, Building, TrendingUp, DollarSign, BarChart3,
  Settings, Filter, Search, Edit, Trash2, UserX, CheckCircle, 
  AlertTriangle, Crown, Shield, Eye, Download, CreditCard,
  Activity, Zap, Target, AlertCircle, RefreshCw
} from "lucide-react";
import type { User, Property, Organization, UserRole, SubscriptionStatus } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface DashboardMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  conversionRate: number;
  totalProperties: number;
  activeAgents: number;
  totalLeads: number;
  subscriptionsByTier: Record<string, number>;
}

interface UserManagementFilters {
  role: string;
  status: string;
  search: string;
  organization: string;
}

export default function ComprehensiveAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userFilters, setUserFilters] = useState<UserManagementFilters>({ 
    role: "all", 
    status: "all", 
    search: "", 
    organization: "all" 
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comprehensive dashboard data
  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: subscriptionAnalytics } = useQuery({
    queryKey: ["/api/admin/subscription-analytics"],
    retry: false,
  });

  const { data: revenueAnalytics } = useQuery({
    queryKey: ["/api/admin/revenue-analytics"],
    retry: false,
  });

  const { data: adminActions } = useQuery({
    queryKey: ["/api/admin/actions"],
    retry: false,
  });

  // Mutations for user management
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    }
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User suspended successfully" });
    },
  });

  const changeUserTierMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/change-tier`, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User tier changed successfully" });
    },
  });

  // Filter users based on search and filter criteria
  const filteredUsers = users?.filter((user: User) => {
    const matchesRole = userFilters.role === "all" || user.role === userFilters.role;
    const matchesStatus = userFilters.status === "all" || user.status === userFilters.status;
    const matchesSearch = !userFilters.search || 
      user.email?.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(userFilters.search.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  }) || [];

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      registered: "bg-blue-100 text-blue-800",
      premium: "bg-purple-100 text-purple-800",
      agent: "bg-green-100 text-green-800",
      agency: "bg-orange-100 text-orange-800",
      expert: "bg-red-100 text-red-800",
      admin: "bg-yellow-100 text-yellow-800"
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800", 
      cancelled: "bg-yellow-100 text-yellow-800",
      expired: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (metricsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive subscription management and platform analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {dashboardMetrics?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-subscriptions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-subscriptions">
                  {dashboardMetrics?.activeSubscriptions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-monthly-revenue">
                  ${dashboardMetrics?.monthlyRevenue?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +15% from last month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-conversion-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-conversion-rate">
                  {dashboardMetrics?.conversionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.3% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>Active subscriptions by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dashboardMetrics?.subscriptionsByTier || {}).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(tier)}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Admin Actions</CardTitle>
                <CardDescription>Latest administrative activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {adminActions?.slice(0, 5).map((action: any) => (
                    <div key={action.id} className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">
                        {action.actionType} on {action.targetType}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* User Filters */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, filter, and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by email or name..."
                    value={userFilters.search}
                    onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={userFilters.role} onValueChange={(value) => setUserFilters({ ...userFilters, role: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userFilters.status} onValueChange={(value) => setUserFilters({ ...userFilters, status: value })}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl ? (
                            <img 
                              src={user.profileImageUrl} 
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                                <DialogDescription>
                                  Modify user role, status, and subscription details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Change Role</label>
                                  <Select 
                                    onValueChange={(value) => {
                                      changeUserTierMutation.mutate({ 
                                        userId: user.id, 
                                        newRole: value as UserRole 
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={user.role} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="registered">Registered</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                      <SelectItem value="agent">Agent</SelectItem>
                                      <SelectItem value="agency">Agency</SelectItem>
                                      <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => suspendUserMutation.mutate(user.id)}
                            data-testid={`button-suspend-${user.id}`}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>Monitor and manage subscription status and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{subscriptionAnalytics?.activeSubscriptions || 0}</div>
                        <div className="text-sm text-muted-foreground">Active Subscriptions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-yellow-500" />
                      <div>
                        <div className="text-2xl font-bold">{subscriptionAnalytics?.trialSubscriptions || 0}</div>
                        <div className="text-sm text-muted-foreground">Trial Users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                      <div>
                        <div className="text-2xl font-bold">{subscriptionAnalytics?.cancelledSubscriptions || 0}</div>
                        <div className="text-sm text-muted-foreground">Cancelled Subscriptions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Monthly recurring revenue and growth metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Revenue</span>
                    <span className="font-bold">${revenueAnalytics?.totalRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Monthly Revenue</span>
                    <span className="font-bold">${revenueAnalytics?.monthlyRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ARPU</span>
                    <span className="font-bold">${revenueAnalytics?.arpu?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Churn Rate</span>
                    <span className="font-bold">{revenueAnalytics?.churnRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User progression through subscription tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <span>Free Visitors</span>
                    <span className="ml-auto font-medium">10,000</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                    <span>Registered Users</span>
                    <span className="ml-auto font-medium">2,500</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span>Premium Subscribers</span>
                    <span className="ml-auto font-medium">750</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Agent Plans</span>
                    <span className="ml-auto font-medium">200</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Property Management</CardTitle>
              <CardDescription>Manage property listings and featured placements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Property management features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure platform settings and feature flags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">System settings coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}