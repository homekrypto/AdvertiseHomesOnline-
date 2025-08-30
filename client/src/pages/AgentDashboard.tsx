import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Property } from "@shared/schema";
import { Home, Eye, Mail, Star, Plus, Settings, BarChart3, Inbox } from "lucide-react";

interface AgentMetrics {
  activeListings: number;
  totalViews: number;
  totalSaves: number;
  newLeads: number;
  featuredCredits: number;
  listingCap: number;
  usedListings: number;
}

export default function AgentDashboard() {
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

    if (!isLoading && user && !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
      toast({
        title: "Access Denied",
        description: "You need an agent plan to access this dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/subscribe";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/agent/metrics"],
    enabled: !!user && ['agent', 'agency', 'expert', 'admin'].includes(user?.role || ''),
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", { agentId: user?.id }],
    queryFn: async () => {
      const params = new URLSearchParams({ agentId: user?.id || '' });
      const response = await fetch(`/api/properties?${params}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json() as Promise<Property[]>;
    },
    enabled: !!user,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["/api/leads"],
    enabled: !!user && ['agent', 'agency', 'expert', 'admin'].includes(user?.role || ''),
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/organizations", user?.organizationId, "members"],
    queryFn: async () => {
      if (!user?.organizationId) return [];
      const response = await fetch(`/api/organizations/${user.organizationId}/members`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
    enabled: !!user?.organizationId && ['agency', 'expert'].includes(user?.role || ''),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const agentMetrics = metrics as AgentMetrics;
  const listingCapPercentage = agentMetrics ? (agentMetrics.usedListings / agentMetrics.listingCap) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="dashboard-title">Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and track performance</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold" data-testid="agent-name">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {user?.role} Plan
                    </div>
                  </div>
                </div>
                
                <nav className="space-y-2">
                  <div className="flex items-center px-3 py-2 text-primary bg-primary/10 rounded-md">
                    <Home className="h-5 w-5 mr-3" />
                    <span>My Listings</span>
                  </div>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <Inbox className="h-5 w-5 mr-3" />
                    <span>Inbox</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <BarChart3 className="h-5 w-5 mr-3" />
                    <span>Analytics</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    <Star className="h-5 w-5 mr-3" />
                    <span>Featured Credits</span>
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-primary/10 rounded-lg mr-4">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="stat-active-listings">
                        {agentMetrics?.activeListings || 0}
                      </div>
                      <div className="text-muted-foreground text-sm">Active Listings</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Listing Cap</span>
                      <span data-testid="listing-cap-text">
                        {agentMetrics?.usedListings || 0}/{agentMetrics?.listingCap || 0}
                      </span>
                    </div>
                    <Progress value={listingCapPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg mr-4">
                      <Eye className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="stat-total-views">
                        {agentMetrics?.totalViews || 0}
                      </div>
                      <div className="text-muted-foreground text-sm">Total Views</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg mr-4">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="stat-new-leads">
                        {agentMetrics?.newLeads || 0}
                      </div>
                      <div className="text-muted-foreground text-sm">New Leads</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-lg mr-4">
                      <Star className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold" data-testid="stat-featured-credits">
                        {agentMetrics?.featuredCredits || 0}
                      </div>
                      <div className="text-muted-foreground text-sm">Featured Credits</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Lead Management Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Lead Inbox</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center p-4 border rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded-full mr-4"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : leads && leads.length > 0 ? (
                  <div className="space-y-4">
                    {leads.slice(0, 5).map((lead: any) => (
                      <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`lead-${lead.id}`}>
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground font-semibold">
                              {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold">{lead.name}</div>
                            <div className="text-sm text-muted-foreground">{lead.email}</div>
                            <div className="text-sm text-muted-foreground">
                              {lead.message && lead.message.length > 50 
                                ? `${lead.message.substring(0, 50)}...` 
                                : lead.message
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
                            {lead.status}
                          </Badge>
                          <Button size="sm" variant="outline" data-testid={`contact-lead-${lead.id}`}>
                            Contact
                          </Button>
                        </div>
                      </div>
                    ))}
                    {leads.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" data-testid="view-all-leads">
                          View All {leads.length} Leads
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4" />
                    <div>No leads yet</div>
                    <div className="text-sm">New leads will appear here</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Management (Agency/Expert Only) */}
            {user?.organizationId && ['agency', 'expert'].includes(user?.role || '') && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Team Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {teamLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : teamMembers && teamMembers.length > 0 ? (
                    <div className="space-y-4">
                      {teamMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`team-member-${member.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground font-semibold">
                                {(member.firstName?.[0] || member.email?.[0] || 'T').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {member.firstName && member.lastName ? 
                                  `${member.firstName} ${member.lastName}` : 
                                  member.email || 'Team Member'
                                }
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="secondary">{member.role}</Badge>
                            <Button size="sm" variant="outline" data-testid={`assign-leads-${member.id}`}>
                              Assign Leads
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div>No team members yet</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Listings Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Listings</CardTitle>
                <Button data-testid="button-add-listing">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Listing
                </Button>
              </CardHeader>
              <CardContent>
                {propertiesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center p-4 border border-border rounded-lg animate-pulse">
                        <div className="w-20 h-16 bg-muted rounded-md mr-4"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties && properties.length > 0 ? (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="flex items-center p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <img 
                          src={Array.isArray(property.images) && property.images.length > 0 
                            ? property.images[0] 
                            : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=80"
                          } 
                          alt={property.title}
                          className="w-20 h-16 object-cover rounded-md mr-4"
                          data-testid={`property-image-${property.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-semibold mb-1" data-testid={`property-title-${property.id}`}>
                            {property.title}
                          </div>
                          <div className="text-muted-foreground text-sm mb-1">
                            {property.address}, {property.city}
                          </div>
                          <div className="text-primary font-semibold" data-testid={`property-price-${property.id}`}>
                            ${parseInt(property.price.toString()).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center mr-6">
                          <div className="text-lg font-semibold" data-testid={`property-views-${property.id}`}>
                            {property.views || 0}
                          </div>
                          <div className="text-muted-foreground text-sm">Views</div>
                        </div>
                        <div className="text-center mr-6">
                          <div className="text-lg font-semibold" data-testid={`property-saves-${property.id}`}>
                            {property.saves || 0}
                          </div>
                          <div className="text-muted-foreground text-sm">Saves</div>
                        </div>
                        <div className="text-center mr-6">
                          <Badge 
                            variant={property.featured ? "default" : property.status === "active" ? "secondary" : "outline"}
                            data-testid={`property-status-${property.id}`}
                          >
                            {property.featured ? "Featured" : property.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" data-testid={`button-property-menu-${property.id}`}>
                          <i className="fas fa-ellipsis-v" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                    <p className="text-muted-foreground mb-6">Start by adding your first property listing</p>
                    <Button data-testid="button-add-first-listing">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Listing
                    </Button>
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
