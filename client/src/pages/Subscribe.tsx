import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [selectedPlan, setSelectedPlan] = useState("premium");

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    try {
      const response = await apiRequest("POST", "/api/create-subscription", { planId });
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
          <p className="text-xl text-muted-foreground">
            Upgrade your real estate experience with powerful tools and insights
          </p>
        </div>

        {!clientSecret ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              buttonText="Select Premium"
              buttonVariant="default"
              popular={true}
              onSelect={() => handlePlanSelect('premium')}
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
              buttonText="Select Agent"
              buttonVariant="secondary"
              popular={false}
              onSelect={() => handlePlanSelect('agent')}
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
              buttonText="Select Agency"
              buttonVariant="accent"
              popular={false}
              onSelect={() => handlePlanSelect('agency')}
            />
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
