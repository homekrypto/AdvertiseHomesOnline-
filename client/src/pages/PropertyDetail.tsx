import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Property, InsertLead } from "@shared/schema";
import { useState } from "react";
import { Heart, MapPin, Bed, Bath, Square, Phone, Mail } from "lucide-react";

export default function PropertyDetail() {
  const [, params] = useRoute("/properties/:slug");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showContactForm, setShowContactForm] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: user?.firstName || '',
    email: user?.email || '',
    phone: '',
    message: '',
  });

  const { data: property, isLoading } = useQuery({
    queryKey: ["/api/properties/slug", params?.slug],
    queryFn: async () => {
      const response = await fetch(`/api/properties/slug/${params?.slug}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Property not found');
        throw new Error('Failed to fetch property');
      }
      return response.json() as Promise<Property>;
    },
    enabled: !!params?.slug,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ["/api/favorites", property?.id, "check"],
    queryFn: async () => {
      const response = await fetch(`/api/favorites/${property?.id}/check`);
      return response.ok;
    },
    enabled: !!property?.id && isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (isFavorited) {
        await apiRequest("DELETE", `/api/favorites/${propertyId}`, undefined);
      } else {
        await apiRequest("POST", "/api/favorites", { propertyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited ? "Property removed from your favorites" : "Property saved to your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leadMutation = useMutation({
    mutationFn: async (leadData: InsertLead) => {
      const response = await apiRequest("POST", "/api/leads", leadData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "Your message has been sent to the agent. They will contact you soon.",
      });
      setShowContactForm(false);
      setLeadForm({ name: '', email: '', phone: '', message: '' });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save properties to your favorites",
      });
      return;
    }
    
    if (!property) return;
    favoriteMutation.mutate(property.id);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    
    leadMutation.mutate({
      name: leadForm.name,
      email: leadForm.email,
      phone: leadForm.phone,
      message: leadForm.message,
      propertyId: property.id,
      agentId: property.agentId,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-lg mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-8 bg-muted rounded mb-4"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-6"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
              <div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-8">The property you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => window.location.href = '/properties'}>
            Browse Other Properties
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = Array.isArray(property.images) ? property.images : [];
  const primaryImage = images[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

  const canViewContactInfo = isAuthenticated && user && ['premium', 'agent', 'agency', 'expert', 'admin'].includes(user.role);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Images */}
        <div className="mb-8">
          <img 
            src={primaryImage} 
            alt={property.title}
            className="w-full h-96 object-cover rounded-lg"
            data-testid="property-image-main"
          />
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {images.slice(1, 5).map((image, index) => (
                <img 
                  key={index}
                  src={image} 
                  alt={`${property.title} - Image ${index + 2}`}
                  className="h-24 w-full object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                  data-testid={`property-image-${index + 2}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2" data-testid="property-title">{property.title}</h1>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span data-testid="property-address">{property.address}, {property.city}, {property.state} {property.zipCode}</span>
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="property-price">
                  ${parseInt(property.price.toString()).toLocaleString()}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFavoriteClick}
                disabled={favoriteMutation.isPending}
                data-testid="button-favorite"
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            </div>

            {/* Property Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Bed className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold" data-testid="property-bedrooms">{property.bedrooms || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Bedrooms</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Bath className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold" data-testid="property-bathrooms">{property.bathrooms || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Bathrooms</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Square className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="font-semibold" data-testid="property-sqft">{property.sqft?.toLocaleString() || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Sq Ft</div>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Description</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="property-description">
                  {property.description || "No description available for this property."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Agent Sidebar */}
          <div>
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Contact Agent</h3>
                
                {canViewContactInfo ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary"></i>
                      </div>
                      <div>
                        <div className="font-semibold">Professional Agent</div>
                        <div className="text-sm text-muted-foreground">Licensed Real Estate Agent</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-primary" />
                        <span data-testid="agent-phone">(555) 123-4567</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-primary" />
                        <span data-testid="agent-email">agent@example.com</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => setShowContactForm(true)}
                      data-testid="button-contact-agent"
                    >
                      Send Message
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to Premium to view agent contact information and access advanced features.
                      </p>
                      <Button 
                        className="w-full"
                        onClick={() => window.location.href = '/subscribe'}
                        data-testid="button-upgrade-premium"
                      >
                        Upgrade to Premium
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowContactForm(true)}
                      data-testid="button-contact-form"
                    >
                      Contact via Form
                    </Button>
                  </div>
                )}

                {/* Contact Form */}
                {showContactForm && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold mb-4">Send a Message</h4>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={leadForm.name}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          data-testid="input-contact-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                          data-testid="input-contact-phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={leadForm.message}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="I'm interested in this property..."
                          rows={4}
                          data-testid="input-contact-message"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          disabled={leadMutation.isPending}
                          className="flex-1"
                          data-testid="button-send-message"
                        >
                          {leadMutation.isPending ? "Sending..." : "Send Message"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setShowContactForm(false)}
                          data-testid="button-cancel-message"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
