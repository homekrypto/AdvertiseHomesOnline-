import { useState } from 'react';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import PricingCard from "@/components/PricingCard";

export default function Subscribe() {
  const [isAnnual, setIsAnnual] = useState(false);

  const handlePlanSelect = (planId: string) => {
    // Convert current billing interval state to URL parameter format
    const billingInterval = isAnnual ? 'yearly' : 'monthly';
    
    // Redirect to registration with tier and billing interval parameters
    window.location.href = `/register?tier=${planId}&billingInterval=${billingInterval}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="subscribe-title">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Upgrade your real estate experience with powerful tools and insights
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              data-testid="billing-toggle"
            />
            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {isAnnual && (
              <Badge className="ml-2 bg-green-100 text-green-800">
                Save 20%
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PricingCard
                title="Free"
                price="$0"
                period="Always Free"
                features={[
                  "Browse properties",
                  "Save favorites",
                  "Contact agents directly",
                  "Basic search filters",
                  "Property insights",
                ]}
                buttonText="Get Started Free"
                buttonVariant="outline"
                popular={false}
                onSelect={() => handlePlanSelect('free')}
              />
              <PricingCard
                title="Agent"
                price={isAnnual ? "$39.20" : "$49"}
                period={isAnnual ? "per month, billed annually" : "per month"}
                features={[
                  "All Free features",
                  "Create 5 listings",
                  "Featured listings (5/month)",
                  "Basic analytics",
                  "Lead management",
                  "Email marketing tools",
                ]}
                buttonText="Select Agent"
                buttonVariant="default"
                popular={true}
                onSelect={() => handlePlanSelect('agent')}
              />
              <PricingCard
                title="Agency"
                price={isAnnual ? "$79.20" : "$99"}
                period={isAnnual ? "per month, billed annually" : "per month"}
                features={[
                  "All Agent features",
                  "Create 20 listings",
                  "2 team seats",
                  "Advanced CRM",
                  "Lead routing",
                  "White-label branding",
                  "Bulk import tools",
                  "Advanced analytics",
                ]}
                buttonText="Select Agency"
                buttonVariant="secondary"
                popular={false}
                onSelect={() => handlePlanSelect('agency')}
              />
              <PricingCard
                title="Expert"
                price={isAnnual ? "$239.20" : "$299"}
                period={isAnnual ? "per month, billed annually" : "per month"}
                features={[
                  "All Agency features",
                  "Create 100 listings",
                  "5 team seats",
                  "AI pricing suggestions",
                  "AI comparable selection",
                  "AI blog writing",
                  "1-click social media",
                  "API access",
                  "Priority support",
                ]}
                buttonText="Select Expert"
                buttonVariant="secondary"
                popular={false}
                onSelect={() => handlePlanSelect('expert')}
              />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
