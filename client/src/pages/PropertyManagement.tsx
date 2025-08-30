import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PropertyForm } from '@/components/PropertyForm';
import { BulkPropertyImport } from '@/components/BulkPropertyImport';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Home, 
  Upload, 
  Star, 
  Eye, 
  Edit, 
  Trash2, 
  TrendingUp,
  Users,
  Crown,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  Settings,
  AlertCircle
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  city: string;
  state: string;
  featured: boolean;
  views: number;
  createdAt: string;
  status: string;
}

interface PropertyFormConfig {
  role: string;
  features: any;
  bulkImportEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  featuredCreditsAvailable: number;
  listingCap: number;
  usedListings: number;
  availableListings: number;
  advancedAnalytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export default function PropertyManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Get user's properties and configuration
  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    enabled: !!user,
  });

  const { data: config, isLoading: configLoading } = useQuery<PropertyFormConfig>({
    queryKey: ['/api/properties/form-config'],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !['agent', 'agency', 'expert', 'admin'].includes(user.role)) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Property management requires Agent tier or higher. Please upgrade your account to access this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load property management configuration. Please refresh and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'sold': return 'bg-blue-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const canCreateMore = config.availableListings > 0 || config.listingCap === 0;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-property-management">
            Property Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your property listings, track performance, and grow your business
          </p>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="secondary" className="px-3 py-1" data-testid="badge-user-tier">
            <Crown className="w-4 h-4 mr-1" />
            {config.role.toUpperCase()} TIER
          </Badge>
          
          {config.featuredCreditsAvailable > 0 && (
            <Badge variant="outline" className="px-3 py-1" data-testid="badge-featured-credits">
              <Star className="w-4 h-4 mr-1" />
              {config.featuredCreditsAvailable} Credits
            </Badge>
          )}
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-listings">
              {properties.filter(p => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.listingCap > 0 ? `of ${config.listingCap} available` : 'unlimited'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-views">
              {properties.reduce((sum, p) => sum + (p.views || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              across all properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Properties</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-featured-properties">
              {properties.filter(p => p.featured).length}
            </div>
            <p className="text-xs text-muted-foreground">
              premium placement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-price">
              ${properties.length > 0 ? Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length).toLocaleString() : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              market positioning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      {config.listingCap > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Listing Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used Listings</span>
                <span>{config.usedListings} / {config.listingCap}</span>
              </div>
              <Progress 
                value={(config.usedListings / config.listingCap) * 100} 
                className="h-2"
                data-testid="progress-listing-usage"
              />
              <p className="text-xs text-muted-foreground">
                {config.availableListings} listings remaining in your {config.role} plan
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="listings" data-testid="tab-listings">Listings</TabsTrigger>
          <TabsTrigger value="create" data-testid="tab-create">Create</TabsTrigger>
          <TabsTrigger value="tools" data-testid="tab-tools">Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for managing your properties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full justify-start" 
                      disabled={!canCreateMore}
                      data-testid="button-create-property"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Property
                      {!canCreateMore && ' (Limit Reached)'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Property</DialogTitle>
                      <DialogDescription>
                        Add a new property listing to your portfolio
                      </DialogDescription>
                    </DialogHeader>
                    <PropertyForm
                      onSuccess={() => setShowCreateForm(false)}
                      mode="create"
                    />
                  </DialogContent>
                </Dialog>

                {config.bulkImportEnabled && (
                  <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" data-testid="button-bulk-import">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Bulk Import Properties
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Bulk Property Import</DialogTitle>
                        <DialogDescription>
                          Import multiple properties at once using CSV
                        </DialogDescription>
                      </DialogHeader>
                      <BulkPropertyImport
                        userRole={config.role}
                        onComplete={() => setShowBulkImport(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}

                {config.aiSuggestionsEnabled && (
                  <Button variant="outline" className="w-full justify-start" data-testid="button-ai-tools">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Property Tools
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Tier Features */}
            <Card>
              <CardHeader>
                <CardTitle>Available Features</CardTitle>
                <CardDescription>
                  Features included in your {config.role} tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-2 border rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Property listings & management</span>
                  </div>
                  
                  {config.advancedAnalytics && (
                    <div className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Advanced analytics & reporting</span>
                    </div>
                  )}

                  {config.bulkImportEnabled && (
                    <div className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Bulk property import</span>
                    </div>
                  )}

                  {config.aiSuggestionsEnabled && (
                    <div className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">AI pricing & optimization</span>
                    </div>
                  )}

                  {config.customBranding && (
                    <div className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Custom branding & pages</span>
                    </div>
                  )}

                  {config.prioritySupport && (
                    <div className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Priority customer support</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Listings</CardTitle>
              <CardDescription>
                Manage your active property listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {propertiesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : properties.length === 0 ? (
                <div className="text-center py-8">
                  <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No properties yet</p>
                  <Button 
                    onClick={() => setShowCreateForm(true)} 
                    className="mt-4"
                    disabled={!canCreateMore}
                    data-testid="button-create-first-property"
                  >
                    Create Your First Property
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property) => (
                        <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {property.featured && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                              <div>
                                <div className="font-medium">{property.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {property.city}, {property.state}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {property.propertyType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ${property.price.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(property.status)}`} />
                              <span className="capitalize">{property.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                              {property.views || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedProperty(property)}
                                data-testid={`button-edit-${property.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                data-testid={`button-delete-${property.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-6">
          {canCreateMore ? (
            <PropertyForm onSuccess={() => setActiveTab('listings')} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your listing limit ({config.usedListings}/{config.listingCap}). 
                    Upgrade your {config.role} plan to create more listings.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Bulk Import Tool */}
            {config.bulkImportEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Bulk Import
                  </CardTitle>
                  <CardDescription>
                    Import multiple properties at once using CSV format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkPropertyImport userRole={config.role} />
                </CardContent>
              </Card>
            )}

            {/* AI Tools */}
            {config.aiSuggestionsEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Assistant
                  </CardTitle>
                  <CardDescription>
                    Smart recommendations for pricing and optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" data-testid="button-ai-pricing">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    AI Pricing Analysis
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-ai-description">
                    <Edit className="w-4 h-4 mr-2" />
                    Description Optimizer
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-ai-photos">
                    <Eye className="w-4 h-4 mr-2" />
                    Photo Recommendations
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Analytics Tools */}
            {config.advancedAnalytics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analytics & Reports
                  </CardTitle>
                  <CardDescription>
                    Advanced insights and performance tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" data-testid="button-property-analytics">
                    <Eye className="w-4 h-4 mr-2" />
                    Property Performance
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-market-trends">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Market Trends
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-lead-analytics">
                    <Users className="w-4 h-4 mr-2" />
                    Lead Analytics
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Management Settings
                </CardTitle>
                <CardDescription>
                  Configure your property management preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" data-testid="button-notification-settings">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Notification Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-auto-features">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-Feature Settings
                </Button>
                {config.customBranding && (
                  <Button variant="outline" className="w-full justify-start" data-testid="button-branding">
                    <Crown className="w-4 h-4 mr-2" />
                    Custom Branding
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Property Dialog */}
      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update {selectedProperty.title} details
              </DialogDescription>
            </DialogHeader>
            <PropertyForm
              initialData={selectedProperty}
              propertyId={selectedProperty.id}
              mode="edit"
              onSuccess={() => {
                setSelectedProperty(null);
                setActiveTab('listings');
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}