import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPropertySchema, type InsertProperty } from '@shared/schema';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ObjectUploader } from '@/components/ObjectUploader';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Home, 
  DollarSign, 
  MapPin, 
  Camera, 
  Star, 
  Lightbulb, 
  Upload, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Crown,
  Sparkles
} from 'lucide-react';
import type { UploadResult } from '@uppy/core';

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

interface AISuggestions {
  pricing: {
    suggestedPrice: number;
    marketAnalysis: string;
    confidence: number;
  };
  description: {
    keyFeatures: string[];
    marketingTips: string[];
  };
  photography: {
    recommendedAngles: string[];
    stagingTips: string[];
  };
}

interface PropertyFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertProperty>;
  mode?: 'create' | 'edit';
  propertyId?: string;
}

export function PropertyForm({ onSuccess, initialData, mode = 'create', propertyId }: PropertyFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get property form configuration based on user tier
  const { data: config, isLoading: configLoading } = useQuery<PropertyFormConfig>({
    queryKey: ['/api/properties/form-config'],
    retry: false,
  });

  // Create form schema without required server fields
  const formSchema = insertPropertySchema.omit({ 
    agentId: true, 
    organizationId: true, 
    slug: true,
    id: true,
    createdAt: true,
    updatedAt: true
  }).extend({
    // Make some fields optional for form
    description: z.string().optional(),
    sqft: z.number().optional(),
    zipCode: z.string().optional(),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      propertyType: initialData?.propertyType || 'house',
      bedrooms: initialData?.bedrooms || 1,
      bathrooms: initialData?.bathrooms || 1,
      sqft: initialData?.sqft || undefined,
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || '',
      featured: initialData?.featured || false,
    }
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (mode === 'edit' && propertyId) {
        const response = await apiRequest('PUT', `/api/properties/${propertyId}`, data);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/properties', data);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: mode === 'edit' ? "Property Updated" : "Property Created",
        description: `Property ${mode === 'edit' ? 'updated' : 'created'} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode} property`,
        variant: "destructive",
      });
    }
  });

  const featurePropertyMutation = useMutation({
    mutationFn: async (data: { propertyId: string; duration: number }) => {
      return apiRequest('POST', `/api/properties/${data.propertyId}/feature`, { duration: data.duration });
    },
    onSuccess: () => {
      toast({
        title: "Property Featured",
        description: "Property has been featured successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to feature property",
        variant: "destructive",
      });
    }
  });

  const getAISuggestionsMutation = useMutation({
    mutationFn: async (propertyData: Partial<FormData>) => {
      const response = await apiRequest('POST', '/api/properties/ai-suggestions', { propertyData });
      return response.json();
    },
    onSuccess: (data: AISuggestions) => {
      setAiSuggestions(data);
      setShowAISuggestions(true);
      toast({
        title: "AI Suggestions Generated",
        description: "Smart recommendations are ready to help optimize your listing!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Suggestions Error",
        description: error.message || "Failed to generate AI suggestions",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    const propertyData = {
      ...data,
      images: uploadedImages
    };
    createPropertyMutation.mutate(propertyData);
  };

  const handleImageUpload = async () => {
    return {
      method: 'PUT' as const,
      url: await apiRequest('POST', '/api/objects/upload').then(res => res.json().then(data => data.uploadURL)),
    };
  };

  const handleImageComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const imageURL = result.successful[0].uploadURL;
      if (imageURL) {
        try {
          const response = await apiRequest('PUT', '/api/property-images', { imageURL });
          const data = await response.json();
          setUploadedImages(prev => [...prev, data.objectPath]);
          toast({
            title: "Image Uploaded",
            description: "Property image uploaded successfully!",
          });
        } catch (error) {
          console.error('Error setting image ACL:', error);
        }
      }
    }
  };

  const generateAISuggestions = () => {
    const currentFormData = form.getValues();
    getAISuggestionsMutation.mutate(currentFormData);
  };

  const applyAISuggestion = (field: keyof FormData, value: any) => {
    form.setValue(field, value);
    toast({
      title: "Suggestion Applied",
      description: "AI suggestion has been applied to your form!",
    });
  };

  const featureProperty = (duration: number = 30) => {
    if (propertyId) {
      featurePropertyMutation.mutate({ propertyId, duration });
    } else {
      toast({
        title: "Error",
        description: "Property must be created before it can be featured",
        variant: "destructive",
      });
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load form configuration. Please refresh and try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Check if user can create more properties
  if (mode === 'create' && config.availableListings <= 0 && config.listingCap > 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You've reached your listing limit ({config.usedListings}/{config.listingCap}). 
          Upgrade your {config.role} plan to create more listings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with tier information */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold" data-testid="form-title">
            {mode === 'edit' ? 'Edit Property' : 'Create New Property'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create' ? 'Add a new property listing' : 'Update property details'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary" data-testid="badge-user-tier">
            <Crown className="w-3 h-3 mr-1" />
            {config.role.toUpperCase()} TIER
          </Badge>
          
          {config.listingCap > 0 && (
            <Badge variant="outline" data-testid="badge-listings-usage">
              {config.usedListings}/{config.listingCap} Listings
            </Badge>
          )}
          
          {config.featuredCreditsAvailable > 0 && (
            <Badge variant="outline" data-testid="badge-featured-credits">
              <Star className="w-3 h-3 mr-1" />
              {config.featuredCreditsAvailable} Credits
            </Badge>
          )}
        </div>
      </div>

      {/* Usage progress bar */}
      {config.listingCap > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Listing Usage</span>
            <span>{config.usedListings}/{config.listingCap}</span>
          </div>
          <Progress 
            value={(config.usedListings / config.listingCap) * 100} 
            className="h-2"
            data-testid="progress-listing-usage"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media">Media</TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-advanced">Advanced</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Basic Property Information
                  </CardTitle>
                  <CardDescription>
                    Enter the essential details about your property
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Property Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Beautiful 3BR Home in Downtown"
                            data-testid="input-title"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-property-type">
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="condo">Condo</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="land">Land</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="450000"
                            data-testid="input-price"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            data-testid="input-bedrooms"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            data-testid="input-bathrooms"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location & Details
                    {config.aiSuggestionsEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAISuggestions}
                        disabled={getAISuggestionsMutation.isPending}
                        data-testid="button-ai-suggestions"
                        className="ml-auto"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {getAISuggestionsMutation.isPending ? 'Generating...' : 'AI Suggestions'}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Main Street"
                            data-testid="input-address"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="San Francisco"
                              data-testid="input-city"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="CA"
                              data-testid="input-state"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="94102"
                              data-testid="input-zip"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="sqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2500"
                            data-testid="input-sqft"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the property features, location benefits, and unique selling points..."
                            className="min-h-[120px]"
                            data-testid="textarea-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Property Images
                  </CardTitle>
                  <CardDescription>
                    Upload high-quality images to showcase your property
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={10485760} // 10MB
                    onGetUploadParameters={handleImageUpload}
                    onComplete={handleImageComplete}
                    data-testid="uploader-images"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload Property Images</span>
                    </div>
                  </ObjectUploader>

                  {uploadedImages.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-3">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`Property ${index + 1}`}
                            className="w-full h-full object-cover"
                            data-testid={`image-preview-${index}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Advanced Features
                  </CardTitle>
                  <CardDescription>
                    Premium features available to your tier
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Featured listing option */}
                  {config.featuredCreditsAvailable > 0 && mode === 'edit' && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Feature This Property</h4>
                        <p className="text-sm text-muted-foreground">
                          Use 1 featured credit to boost visibility for 30 days
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => featureProperty(30)}
                        disabled={featurePropertyMutation.isPending}
                        data-testid="button-feature-property"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Feature Property
                      </Button>
                    </div>
                  )}

                  {/* Tier-specific features */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Analytics Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          {config.advancedAnalytics ? 'Advanced analytics enabled' : 'Basic analytics enabled'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Priority Support</p>
                        <p className="text-sm text-muted-foreground">
                          {config.prioritySupport ? 'Available 24/7' : 'Standard support'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Form Actions */}
            <div className="flex justify-between">
              <div>
                {config.availableListings > 0 && config.listingCap > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {config.availableListings} listings remaining in your plan
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  data-testid="button-reset"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={createPropertyMutation.isPending}
                  data-testid="button-submit"
                >
                  {createPropertyMutation.isPending 
                    ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
                    : (mode === 'edit' ? 'Update Property' : 'Create Property')
                  }
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </Tabs>

      {/* AI Suggestions Panel */}
      {showAISuggestions && aiSuggestions && config.aiSuggestionsEnabled && (
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Lightbulb className="w-5 h-5" />
              AI-Powered Suggestions
            </CardTitle>
            <CardDescription>
              Smart recommendations to optimize your property listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Pricing suggestions */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pricing Analysis
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">${aiSuggestions.pricing.suggestedPrice.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {aiSuggestions.pricing.marketAnalysis} 
                    (Confidence: {Math.round(aiSuggestions.pricing.confidence * 100)}%)
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => applyAISuggestion('price', aiSuggestions.pricing.suggestedPrice)}
                  data-testid="button-apply-price"
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Description suggestions */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-2">Key Features to Highlight</h4>
              <div className="space-y-2">
                {aiSuggestions.description.keyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{feature}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentDesc = form.getValues('description');
                        applyAISuggestion('description', `${currentDesc}\n• ${feature}`);
                      }}
                      data-testid={`button-apply-feature-${index}`}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Photography tips */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-2">Photography Recommendations</h4>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Recommended Angles:</p>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {aiSuggestions.photography.recommendedAngles.map((angle, index) => (
                      <li key={index}>• {angle}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium">Staging Tips:</p>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {aiSuggestions.photography.stagingTips.map((tip, index) => (
                      <li key={index}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAISuggestions(false)}
              className="w-full"
              data-testid="button-hide-suggestions"
            >
              Hide Suggestions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}