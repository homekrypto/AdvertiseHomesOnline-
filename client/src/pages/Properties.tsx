import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import SearchBar from "@/components/SearchBar";
import type { Property } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Properties() {
  const [filters, setFilters] = useState({
    search: "",
    city: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    bathrooms: "",
    propertyType: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "desc" | "asc",
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["/api/properties", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('limit', '20');
      
      const response = await fetch(`/api/properties?${params}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json() as Promise<Property[]>;
    }
  });

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      city: "",
      minPrice: "",
      maxPrice: "",
      bedrooms: "",
      bathrooms: "",
      propertyType: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Search Header */}
      <section className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8 text-center" data-testid="properties-title">
            Browse Properties
          </h1>
          <SearchBar onSearch={(searchTerm) => updateFilter('search', searchTerm)} />
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => updateFilter('city', e.target.value)}
              data-testid="filter-city"
            />
            <Input
              placeholder="Min Price"
              type="number"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', e.target.value)}
              data-testid="filter-min-price"
            />
            <Input
              placeholder="Max Price"
              type="number"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              data-testid="filter-max-price"
            />
            <Select value={filters.bedrooms} onValueChange={(value) => updateFilter('bedrooms', value)}>
              <SelectTrigger data-testid="filter-bedrooms">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.propertyType} onValueChange={(value) => updateFilter('propertyType', value)}>
              <SelectTrigger data-testid="filter-property-type">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Type</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${filters.sortBy}-${filters.sortOrder}`} onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              updateFilter('sortBy', sortBy);
              updateFilter('sortOrder', sortOrder);
            }}>
              <SelectTrigger data-testid="filter-sort">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="views-desc">Most Popular</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
                  <div className="h-48 bg-muted rounded-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-8">
                <p className="text-muted-foreground" data-testid="results-count">
                  Found {properties.length} properties
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-muted-foreground text-lg mb-4">No properties found</div>
              <p className="text-muted-foreground">Try adjusting your search criteria</p>
              <Button 
                onClick={clearFilters} 
                className="mt-4"
                data-testid="button-reset-search"
              >
                Reset Search
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
