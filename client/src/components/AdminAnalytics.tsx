import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Eye,
  Heart,
  Calendar,
  Download,
  Filter
} from "lucide-react";

interface AnalyticsData {
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth: number;
    arpu: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
  };
  properties: {
    totalProperties: number;
    activeProperties: number;
    totalViews: number;
    totalSaves: number;
  };
  conversion: {
    freeTopremium: number;
    premiumToAgent: number;
    agentToAgency: number;
    overallConversion: number;
  };
}

interface UserBehaviorData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  propertiesViewed: number;
  timeSpent: number; // in minutes
  lastActivity: Date;
  conversionStage: string;
  actions: string[];
}

interface GeographicData {
  region: string;
  userCount: number;
  revenue: number;
  averageSessionTime: number;
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics', timeRange],
  });

  const { data: userBehavior = [], isLoading: behaviorLoading } = useQuery<UserBehaviorData[]>({
    queryKey: ['/api/admin/user-behavior', timeRange],
  });

  const { data: geographic = [], isLoading: geoLoading } = useQuery<GeographicData[]>({
    queryKey: ['/api/admin/geographic-data', timeRange],
  });

  const { data: cohortData, isLoading: cohortLoading } = useQuery({
    queryKey: ['/api/admin/cohort-analysis', timeRange],
  });

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const exportData = (type: string) => {
    // Implement export functionality
    console.log(`Exporting ${type} data for ${timeRange}`);
  };

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
          <p className="text-muted-foreground">Platform insights and user behavior analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportData('analytics')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="analytics-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analytics?.revenue.totalRevenue || 0).toLocaleString()}
            </div>
            <p className={`text-xs flex items-center ${getGrowthColor(analytics?.revenue.revenueGrowth || 0)}`}>
              {getGrowthIcon(analytics?.revenue.revenueGrowth || 0)}
              <span className="ml-1">
                {Math.abs(analytics?.revenue.revenueGrowth || 0)}% from last period
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="analytics-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.users.totalUsers || 0).toLocaleString()}
            </div>
            <p className={`text-xs flex items-center ${getGrowthColor(analytics?.users.userGrowth || 0)}`}>
              {getGrowthIcon(analytics?.users.userGrowth || 0)}
              <span className="ml-1">
                {Math.abs(analytics?.users.userGrowth || 0)}% from last period
              </span>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="analytics-arpu">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analytics?.revenue.arpu || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average Revenue Per User
            </p>
          </CardContent>
        </Card>

        <Card data-testid="analytics-conversion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.conversion.overallConversion || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-analytics-overview">Overview</TabsTrigger>
          <TabsTrigger value="user-behavior" data-testid="tab-user-behavior">User Behavior</TabsTrigger>
          <TabsTrigger value="conversion" data-testid="tab-conversion-funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="geographic" data-testid="tab-geographic">Geographic</TabsTrigger>
          <TabsTrigger value="cohorts" data-testid="tab-cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue distribution by subscription tier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${(analytics?.revenue.monthlyRevenue || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {(analytics?.revenue.revenueGrowth || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Growth Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Metrics</CardTitle>
                <CardDescription>User growth and engagement statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {(analytics?.users.activeUsers || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {(analytics?.users.newUsers || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">New Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Engagement</CardTitle>
              <CardDescription>How users interact with property listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {(analytics?.properties.totalProperties || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Properties</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {(analytics?.properties.activeProperties || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Listings</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold flex items-center justify-center">
                    <Eye className="h-5 w-5 mr-1" />
                    {(analytics?.properties.totalViews || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Views</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold flex items-center justify-center">
                    <Heart className="h-5 w-5 mr-1" />
                    {(analytics?.properties.totalSaves || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Saves</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Behavior Analysis</CardTitle>
              <CardDescription>
                Detailed user activity and engagement patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {behaviorLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Properties Viewed</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Conversion Stage</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userBehavior.map((user) => (
                      <TableRow key={user.id} data-testid={`behavior-row-${user.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.propertiesViewed}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.timeSpent}m</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.conversionStage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.lastActivity).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                User journey from free to paid subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {(analytics?.conversion.freeTopremium || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-blue-800">Free → Premium</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {(analytics?.conversion.premiumToAgent || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-green-800">Premium → Agent</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {(analytics?.conversion.agentToAgency || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-purple-800">Agent → Agency</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {(analytics?.conversion.overallConversion || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-orange-800">Overall Conversion</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>
                User distribution and revenue by region
              </CardDescription>
            </CardHeader>
            <CardContent>
              {geoLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg. Session Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geographic.map((region, index) => (
                      <TableRow key={index} data-testid={`geographic-row-${region.region}`}>
                        <TableCell className="font-medium">{region.region}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{region.userCount}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${region.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{region.averageSessionTime}m</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Analysis</CardTitle>
              <CardDescription>
                User retention and behavior patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Cohort Analysis</p>
                  <p className="text-muted-foreground">
                    Detailed cohort analysis will be displayed here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}