import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import PricingCard from "@/components/PricingCard";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed!",
      });
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          <Button 
            type="submit" 
            disabled={!stripe} 
            className="w-full"
            data-testid="button-complete-subscription"
          >
            Subscribe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("agent");
  const [isAnnual, setIsAnnual] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    try {
      const response = await apiRequest("POST", "/api/create-subscription", { 
        planId, 
        billingInterval: isAnnual ? 'yearly' : 'monthly' 
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
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

        {!clientSecret ? (
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
        ) : (
          <div className="max-w-2xl mx-auto">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm />
            </Elements>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
