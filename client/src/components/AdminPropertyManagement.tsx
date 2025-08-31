import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Copy,
  UserCheck,
  BarChart3,
  RefreshCw,
  Archive,
  Star,
  Calendar,
  Home,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PropertyFilter {
  search: string;
  agentId: string;
  organizationId: string;
  status: string;
  featured: string;
  propertyType: string;
  city: string;
  state: string;
  minPrice: string;
  maxPrice: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export default function AdminPropertyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [filters, setFilters] = useState<PropertyFilter>({
    search: '',
    agentId: '',
    organizationId: '',
    status: '',
    featured: '',
    propertyType: '',
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
  });
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<any>(null);

  // Fetch property analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/properties/analytics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: any; isLoading: boolean };

  // Fetch properties with filters
  const { data: propertiesData, isLoading: propertiesLoading, refetch: refetchProperties } = useQuery({
    queryKey: ['/api/admin/properties', filters],
  }) as { data: any; isLoading: boolean; refetch: () => void };

  // Fetch all users for agent filter
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
  }) as { data: any[] };

  // Mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { propertyIds: string[], updates: any }) =>
      apiRequest('PATCH', '/api/admin/properties/bulk-update', data),
    onSuccess: () => {
      toast({ title: "Properties updated successfully" });
      setSelectedProperties([]);
      refetchProperties();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/properties/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating properties",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (propertyIds: string[]) =>
      apiRequest('DELETE', '/api/admin/properties/bulk-delete', { propertyIds }),
    onSuccess: () => {
      toast({ title: "Properties deleted successfully" });
      setSelectedProperties([]);
      refetchProperties();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/properties/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting properties",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (data: { propertyId: string, archive: boolean }) =>
      apiRequest('PATCH', `/api/admin/properties/${data.propertyId}/archive`, { archive: data.archive }),
    onSuccess: () => {
      toast({ title: "Property status updated" });
      refetchProperties();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (data: { propertyId: string, assignToAgentId?: string }) =>
      apiRequest('POST', `/api/admin/properties/${data.propertyId}/duplicate`, { assignToAgentId: data.assignToAgentId }),
    onSuccess: () => {
      toast({ title: "Property duplicated successfully" });
      refetchProperties();
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: { propertyId: string, newAgentId: string, newOrganizationId?: string }) =>
      apiRequest('PATCH', `/api/admin/properties/${data.propertyId}/transfer`, data),
    onSuccess: () => {
      toast({ title: "Property transferred successfully" });
      refetchProperties();
    },
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof PropertyFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset to first page when filtering
    }));
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  // Handle property selection
  const handlePropertySelect = (propertyId: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, propertyId]);
    } else {
      setSelectedProperties(prev => prev.filter(id => id !== propertyId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPropertyIds = propertiesData?.properties?.map((p: any) => p.id) || [];
      setSelectedProperties(allPropertyIds);
    } else {
      setSelectedProperties([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select properties to perform bulk actions",
        variant: "destructive",
      });
      return;
    }

    switch (bulkAction) {
      case 'delete':
        setShowBulkDialog(true);
        break;
      case 'activate':
        bulkUpdateMutation.mutate({
          propertyIds: selectedProperties,
          updates: { status: 'active' }
        });
        break;
      case 'deactivate':
        bulkUpdateMutation.mutate({
          propertyIds: selectedProperties,
          updates: { status: 'inactive' }
        });
        break;
      case 'feature':
        bulkUpdateMutation.mutate({
          propertyIds: selectedProperties,
          updates: { featured: true }
        });
        break;
      case 'unfeature':
        bulkUpdateMutation.mutate({
          propertyIds: selectedProperties,
          updates: { featured: false }
        });
        break;
      default:
        toast({
          title: "Please select an action",
          variant: "destructive",
        });
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedProperties);
    setShowBulkDialog(false);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-property-management">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-properties">
              {analyticsLoading ? '...' : analytics?.totals?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totals?.active || 0} active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Properties</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="featured-properties">
              {analyticsLoading ? '...' : analytics?.totals?.featured || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Premium listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="average-price">
              {analyticsLoading ? '...' : formatCurrency(analytics?.averages?.price || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="average-views">
              {analyticsLoading ? '...' : analytics?.averages?.views || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per property
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Property Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
                data-testid="search-input"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.propertyType} onValueChange={(value) => handleFilterChange('propertyType', value)}>
              <SelectTrigger data-testid="type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.featured} onValueChange={(value) => handleFilterChange('featured', value)}>
              <SelectTrigger data-testid="featured-filter">
                <SelectValue placeholder="Featured status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Properties</SelectItem>
                <SelectItem value="true">Featured Only</SelectItem>
                <SelectItem value="false">Not Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              data-testid="city-filter"
            />

            <Input
              placeholder="State"
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              data-testid="state-filter"
            />

            <Input
              type="number"
              placeholder="Min price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              data-testid="min-price-filter"
            />

            <Input
              type="number"
              placeholder="Max price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              data-testid="max-price-filter"
            />

            <Select value={filters.agentId} onValueChange={(value) => handleFilterChange('agentId', value)}>
              <SelectTrigger data-testid="agent-filter">
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Agents</SelectItem>
                {users?.filter((user: any) => ['agent', 'agency', 'expert'].includes(user.role))
                  .map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName} ({agent.email})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedProperties.length} selected
              </span>
            </div>

            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-48" data-testid="bulk-action-select">
                <SelectValue placeholder="Bulk actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate Properties</SelectItem>
                <SelectItem value="deactivate">Deactivate Properties</SelectItem>
                <SelectItem value="feature">Feature Properties</SelectItem>
                <SelectItem value="unfeature">Remove Featured</SelectItem>
                <SelectItem value="delete">Delete Properties</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleBulkAction}
              disabled={selectedProperties.length === 0 || !bulkAction}
              data-testid="apply-bulk-action"
            >
              Apply Action
            </Button>

            <Button
              variant="outline"
              onClick={() => refetchProperties()}
              disabled={propertiesLoading}
              data-testid="refresh-properties"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${propertiesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Properties Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Properties ({propertiesData?.pagination?.total || 0})</span>
            <Button
              variant="outline"
              size="sm"
              data-testid="export-properties"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading properties...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedProperties.length === propertiesData?.properties?.length &&
                          propertiesData?.properties?.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertiesData?.properties?.map((property: any) => (
                    <TableRow key={property.id} data-testid={`property-row-${property.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={(checked) => handlePropertySelect(property.id, checked as boolean)}
                          data-testid={`property-checkbox-${property.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{property.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.bedrooms}br • {property.bathrooms}ba • {property.sqft} sqft
                            </div>
                          </div>
                          {property.featured && <Star className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(parseInt(property.price))}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{property.city}, {property.state}</div>
                          <div className="text-sm text-muted-foreground">
                            {property.address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.propertyType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{property.agentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {property.agentEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(property.status)}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {property.views}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(property.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPropertyForDetails(property)}
                            data-testid={`view-property-${property.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate({ propertyId: property.id })}
                            data-testid={`duplicate-property-${property.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveMutation.mutate({ 
                              propertyId: property.id, 
                              archive: property.status !== 'archived' 
                            })}
                            data-testid={`archive-property-${property.id}`}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {propertiesData?.pagination && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {propertiesData.pagination.offset + 1} to{' '}
                {Math.min(
                  propertiesData.pagination.offset + propertiesData.pagination.limit,
                  propertiesData.pagination.total
                )}{' '}
                of {propertiesData.pagination.total} properties
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                  disabled={filters.offset === 0}
                  data-testid="previous-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.offset + filters.limit)}
                  disabled={filters.offset + filters.limit >= propertiesData.pagination.total}
                  data-testid="next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent data-testid="bulk-delete-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProperties.length} selected properties?
              This action cannot be undone and will also delete all related leads and favorites.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              data-testid="confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedProperties.length} Properties`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Property Details Dialog */}
      {selectedPropertyForDetails && (
        <Dialog 
          open={!!selectedPropertyForDetails} 
          onOpenChange={() => setSelectedPropertyForDetails(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="property-details-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {selectedPropertyForDetails.title}
                {selectedPropertyForDetails.featured && <Star className="h-4 w-4 text-yellow-500" />}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Property Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Price:</strong> {formatCurrency(parseInt(selectedPropertyForDetails.price))}</div>
                      <div><strong>Bedrooms:</strong> {selectedPropertyForDetails.bedrooms}</div>
                      <div><strong>Bathrooms:</strong> {selectedPropertyForDetails.bathrooms}</div>
                      <div><strong>Square Feet:</strong> {selectedPropertyForDetails.sqft?.toLocaleString()}</div>
                      <div><strong>Type:</strong> {selectedPropertyForDetails.propertyType}</div>
                      <div><strong>Status:</strong> 
                        <Badge className={`ml-2 ${getStatusBadgeColor(selectedPropertyForDetails.status)}`}>
                          {selectedPropertyForDetails.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Location & Agent</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Address:</strong> {selectedPropertyForDetails.address}</div>
                      <div><strong>City:</strong> {selectedPropertyForDetails.city}</div>
                      <div><strong>State:</strong> {selectedPropertyForDetails.state}</div>
                      <div><strong>Agent:</strong> {selectedPropertyForDetails.agentName}</div>
                      <div><strong>Agent Email:</strong> {selectedPropertyForDetails.agentEmail}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Statistics</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{selectedPropertyForDetails.views} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span>{selectedPropertyForDetails.saves} saves</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(selectedPropertyForDetails.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="performance">
                <div className="text-center py-8 text-muted-foreground">
                  Performance metrics will be loaded here
                </div>
              </TabsContent>
              
              <TabsContent value="activity">
                <div className="text-center py-8 text-muted-foreground">
                  Activity log will be loaded here
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}