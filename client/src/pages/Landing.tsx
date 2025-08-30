import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import PricingCard from "@/components/PricingCard";
import { useQuery } from "@tanstack/react-query";
import type { Property } from "@shared/schema";

interface PlatformStats {
  totalProperties: number;
  activeAgents: number;
  totalValueSold: number;
  newThisMonth: number;
}

export default function Landing() {
  const { data: featuredProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/properties", { featured: true, limit: 6 }],
    queryFn: async () => {
      const params = new URLSearchParams({ featured: 'true', limit: '6' });
      const response = await fetch(`/api/properties?${params}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json() as Promise<Property[]>;
    }
  });

  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/platform/stats"],
    queryFn: async () => {
      const response = await fetch('/api/platform/stats');
      if (!response.ok) throw new Error('Failed to fetch platform stats');
      return response.json() as Promise<PlatformStats>;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="gradient-hero text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6" data-testid="hero-title">Find Your Perfect Home</h1>
          <p className="text-xl mb-8 opacity-90" data-testid="hero-subtitle">
            Search millions of properties, connect with top agents, and discover market insights
          </p>
          
          <SearchBar />
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="stats-card p-6 rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-2" data-testid="stat-properties">
                {statsLoading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
                ) : (
                  platformStats?.totalProperties.toLocaleString() || '0'
                )}
              </div>
              <div className="text-muted-foreground">Active Properties</div>
            </div>
            <div className="stats-card p-6 rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-2" data-testid="stat-agents">
                {statsLoading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
                ) : (
                  platformStats?.activeAgents.toLocaleString() || '0'
                )}
              </div>
              <div className="text-muted-foreground">Active Agents</div>
            </div>
            <div className="stats-card p-6 rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-2" data-testid="stat-sold">
                {statsLoading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full inline-block" />
                ) : (
                  `$${(platformStats?.totalValueSold || 0).toLocaleString()}`
                )}
              </div>
              <div className="text-muted-foreground">Total Value Sold</div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" data-testid="pricing-title">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">
              From browsing to professional tools, we have the right plan for you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <PricingCard
              title="Free Browser"
              price="$0"
              period="Forever"
              features={[
                "Unlimited property browsing",
                "High-resolution photos",
                "Basic property details",
                "Contact info hidden",
                "No favorites or alerts",
              ]}
              buttonText="Current Plan"
              buttonVariant="outline"
              popular={false}
            />
            <PricingCard
              title="Premium"
              price="$29"
              period="per month"
              features={[
                "Direct agent contact info",
                "Full property analytics", 
                "Advanced filters",
                "Market trend reports",
                "Virtual tours",
              ]}
              buttonText="Start Free Trial"
              buttonVariant="default"
              popular={true}
            />
            <PricingCard
              title="Agent"
              price="$99"
              period="per month"
              features={[
                "5 active listings",
                "Lead generation tools",
                "Performance analytics",
                "Featured credits included",
                "Agent profile page",
              ]}
              buttonText="Choose Agent"
              buttonVariant="secondary"
              popular={false}
            />
            <PricingCard
              title="Agency"
              price="$299"
              period="per month"
              features={[
                "25 active listings",
                "10 team seats",
                "Lead routing",
                "CRM-lite tools",
                "Bulk CSV import",
              ]}
              buttonText="Choose Agency"
              buttonVariant="accent"
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2" data-testid="featured-title">Featured Properties</h2>
              <p className="text-muted-foreground">Discover homes in your area</p>
            </div>
          </div>
          
          {propertiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
                  <div className="h-48 bg-muted rounded-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : featuredProperties && featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">No featured properties available</div>
            </div>
          )}
          
          <div className="text-center mt-12">
            <button 
              className="bg-secondary text-secondary-foreground px-8 py-3 rounded-md hover:bg-secondary/90 transition-colors"
              data-testid="button-view-all"
              onClick={() => window.location.href = '/properties'}
            >
              View All Properties
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
