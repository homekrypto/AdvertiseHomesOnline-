import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, RefreshCw, CheckCircle, AlertCircle, Crown, Users, BarChart3 } from "lucide-react";

// Initialize Stripe with production publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: any;
  listingCap: number;
  seats: number;
}

interface User {
  id: string;
  email: string;
  verified: boolean;
  tier: string;
}

interface SubscriptionPaymentProps {
  user: User;
  selectedPlan?: SubscriptionPlan;
  onPaymentSuccess: () => void;
}

// Payment form component (inside Stripe Elements context)
function PaymentForm({ 
  user, 
  selectedPlan, 
  onPaymentSuccess, 
  clientSecret, 
  subscriptionId 
}: {
  user: User;
  selectedPlan?: SubscriptionPlan;
  onPaymentSuccess: () => void;
  clientSecret: string;
  subscriptionId: string;
}) {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  // Confirm subscription after payment
  const confirmSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/confirm-subscription', {
        userId: user.id,
        subscriptionId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful!",
        description: `Welcome to ${selectedPlan?.name}! Redirecting to your dashboard...`,
        duration: 5000,
      });
      
      // Redirect to appropriate dashboard
      setTimeout(() => {
        window.location.href = data.dashboardUrl || '/agent/dashboard';
      }, 2000);
      
      onPaymentSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to confirm subscription. Please contact support.",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm payment with Stripe
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Please check your payment details and try again.",
          variant: "destructive",
        });
      } else {
        // Payment succeeded, confirm subscription
        confirmSubscriptionMutation.mutate();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePaymentSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium">Payment Information</h3>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <Button
        data-testid="button-complete-payment"
        type="submit"
        disabled={!stripe || isProcessing || confirmSubscriptionMutation.isPending}
        className="w-full"
        size="lg"
      >
        {isProcessing || confirmSubscriptionMutation.isPending ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Payment - ${selectedPlan?.price}/month
          </>
        )}
      </Button>
    </form>
  );
}

export default function SubscriptionPayment({ 
  user, 
  selectedPlan, 
  onPaymentSuccess 
}: SubscriptionPaymentProps) {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string>("");
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Create subscription and get payment intent from production Stripe
  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/create-subscription', {
        userId: user.id,
        planId: selectedPlan?.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret || '');
      setSubscriptionId(data.subscriptionId || '');
      setIsLoading(false);
      
      if (data.existingSubscription) {
        toast({
          title: "Existing Subscription",
          description: "You already have an active subscription.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up payment. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (selectedPlan && user.verified) {
      createSubscriptionMutation.mutate();
    }
  }, [selectedPlan, user.verified]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getPlanFeatures = (planId: string) => {
    const features = {
      premium: [
        'Up to 10 property listings',
        'Basic analytics dashboard',
        'Email support',
        'Mobile app access',
      ],
      agent: [
        'Up to 50 property listings',
        'Advanced analytics',
        'Priority email support',
        'CRM integration',
        'Lead management tools',
      ],
      agency: [
        'Up to 200 property listings',
        'Team collaboration (10 seats)',
        'Advanced CRM features',
        'Bulk property import',
        'Custom branding',
        'API access',
      ],
      expert: [
        'Unlimited property listings',
        'Enterprise team management (25 seats)',
        'White-label solutions',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced reporting',
      ],
    };
    return features[planId as keyof typeof features] || [];
  };

  if (!selectedPlan) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <CardTitle className="text-red-600">Plan Not Found</CardTitle>
          <CardDescription>
            The selected subscription plan could not be found.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-lg mx-auto" data-testid="payment-loading-card">
        <CardHeader className="text-center">
          <RefreshCw className="mx-auto h-16 w-16 text-blue-600 animate-spin mb-4" />
          <CardTitle>Setting Up Payment</CardTitle>
          <CardDescription>
            Preparing your subscription with Stripe...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
          <CardTitle className="text-red-600">Payment Setup Failed</CardTitle>
          <CardDescription>
            Unable to initialize payment. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => createSubscriptionMutation.mutate()}
            className="w-full"
            disabled={createSubscriptionMutation.isPending}
          >
            {createSubscriptionMutation.isPending ? 'Retrying...' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto" data-testid="subscription-payment-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Crown className="h-16 w-16 text-amber-600" />
        </div>
        <CardTitle>Complete Your Subscription</CardTitle>
        <CardDescription>
          Secure payment powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg" data-testid="plan-summary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">{selectedPlan.name} Plan</h3>
            <Badge variant="default" className="text-lg px-3 py-1">
              {formatPrice(selectedPlan.price)}/month
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 mx-auto text-blue-600 mb-1" />
              <p className="text-sm font-medium">{selectedPlan.listingCap}</p>
              <p className="text-xs text-muted-foreground">Listings</p>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto text-green-600 mb-1" />
              <p className="text-sm font-medium">{selectedPlan.seats}</p>
              <p className="text-xs text-muted-foreground">User{selectedPlan.seats > 1 ? 's' : ''}</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-6 w-6 mx-auto text-purple-600 mb-1" />
              <p className="text-sm font-medium">Full</p>
              <p className="text-xs text-muted-foreground">Features</p>
            </div>
          </div>

          <Separator className="my-3" />
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">What's included:</p>
            <ul className="text-xs space-y-1">
              {getPlanFeatures(selectedPlan.id).map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Information */}
        <div className="bg-gray-50 p-3 rounded-lg" data-testid="user-info">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Account</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </div>

        {/* Stripe Payment Form */}
        <Elements 
          stripe={stripePromise} 
          options={{ clientSecret, appearance: { theme: 'stripe' } }}
        >
          <PaymentForm
            user={user}
            selectedPlan={selectedPlan}
            onPaymentSuccess={onPaymentSuccess}
            clientSecret={clientSecret}
            subscriptionId={subscriptionId}
          />
        </Elements>

        {/* Security Info */}
        <div className="bg-green-50 p-3 rounded-lg" data-testid="security-info">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="text-xs text-green-700">
              <p className="font-medium">Secure Payment</p>
              <p>Your payment is processed securely by Stripe. We never store your card details.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}