import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";
import { Heart, MapPin, Bed, Bath, Square } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(false);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await apiRequest("DELETE", `/api/favorites/${property.id}`, undefined);
      } else {
        await apiRequest("POST", "/api/favorites", { propertyId: property.id });
      }
    },
    onSuccess: () => {
      setIsFavorited(!isFavorited);
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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save properties to your favorites",
      });
      return;
    }
    
    favoriteMutation.mutate();
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canViewContactInfo = isAuthenticated && user && ['premium', 'agent', 'agency', 'expert', 'admin'].includes(user.role);
    
    if (!canViewContactInfo) {
      toast({
        title: "Upgrade required",
        description: "Upgrade to Premium to view agent contact information",
      });
      window.location.href = '/subscribe';
      return;
    }
    
    // Navigate to property detail page
    window.location.href = `/properties/${property.slug}`;
  };

  const handleCardClick = () => {
    window.location.href = `/properties/${property.slug}`;
  };

  const images = Array.isArray(property.images) ? property.images : [];
  const primaryImage = images[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

  return (
    <Card 
      className="property-card bg-card rounded-lg shadow-md overflow-hidden border border-border cursor-pointer"
      onClick={handleCardClick}
      data-testid={`property-card-${property.id}`}
    >
      <div className="relative">
        <img 
          src={primaryImage}
          alt={property.title}
          className="w-full h-48 object-cover"
          data-testid={`property-image-${property.id}`}
        />
        {property.featured && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={handleFavoriteClick}
          disabled={favoriteMutation.isPending}
          data-testid={`button-favorite-${property.id}`}
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </Button>
      </div>
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-2xl font-bold text-primary mb-1" data-testid={`property-price-${property.id}`}>
              ${parseInt(property.price.toString()).toLocaleString()}
            </div>
            <div className="text-muted-foreground text-sm flex items-center space-x-2">
              {property.bedrooms && (
                <span className="flex items-center">
                  <Bed className="h-3 w-3 mr-1" />
                  {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                </span>
              )}
              {property.bathrooms && (
                <span className="flex items-center">
                  <Bath className="h-3 w-3 mr-1" />
                  {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                </span>
              )}
              {property.sqft && (
                <span className="flex items-center">
                  <Square className="h-3 w-3 mr-1" />
                  {property.sqft.toLocaleString()} sqft
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-foreground font-medium mb-2" data-testid={`property-title-${property.id}`}>
          {property.title}
        </div>
        <div className="text-muted-foreground mb-4 flex items-center">
          <MapPin className="h-4 w-4 mr-1" />
          <span data-testid={`property-address-${property.id}`}>
            {property.address}, {property.city}, {property.state}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <i className="fas fa-user text-primary text-sm"></i>
            </div>
            <span className="text-sm text-muted-foreground">Professional Agent</span>
          </div>
          <Button 
            size="sm"
            onClick={handleContactClick}
            data-testid={`button-contact-${property.id}`}
          >
            Contact Agent
          </Button>
        </div>
        
        {/* Property Stats */}
        <div className="flex justify-between mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            <span data-testid={`property-views-${property.id}`}>{property.views || 0} views</span>
          </div>
          <div className="flex items-center">
            <Heart className="h-4 w-4 mr-1" />
            <span data-testid={`property-saves-${property.id}`}>{property.saves || 0} saves</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
