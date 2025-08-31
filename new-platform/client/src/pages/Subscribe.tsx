import { useState, useEffect } from "react";
import { Link } from "wouter";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  features: string[];
  limits: {
    properties?: number;
    seats?: number;
    leads?: number;
  };
  stripePriceId?: string;
  popular?: boolean;
}

const defaultPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "0",
    billingCycle: "monthly",
    features: [
      "Browse properties",
      "Save favorites",
      "Basic search filters",
      "Contact agents"
    ],
    limits: {
      properties: 0,
      leads: 5
    }
  },
  {
    id: "premium",
    name: "Premium",
    price: "9.99",
    billingCycle: "monthly",
    features: [
      "All Free features",
      "Advanced search filters",
      "Property analytics",
      "Saved searches with alerts",
      "Priority customer support"
    ],
    limits: {
      properties: 0,
      leads: 50
    }
  },
  {
    id: "agent",
    name: "Agent",
    price: "49",
    billingCycle: "monthly",
    features: [
      "All Premium features",
      "Create property listings",
      "Lead management dashboard",
      "Property performance analytics",
      "Custom agent profile"
    ],
    limits: {
      properties: 25,
      leads: 200
    },
    popular: true
  },
  {
    id: "agency",
    name: "Agency",
    price: "199",
    billingCycle: "monthly",
    features: [
      "All Agent features",
      "Team management (up to 10 agents)",
      "Advanced lead routing",
      "White-label branding",
      "Bulk property import",
      "Team analytics dashboard"
    ],
    limits: {
      properties: 500,
      seats: 10,
      leads: 1000
    }
  },
  {
    id: "expert",
    name: "Expert",
    price: "299",
    billingCycle: "monthly",
    features: [
      "All Agency features",
      "AI-powered pricing suggestions",
      "Predictive market analytics",
      "Automated marketing campaigns",
      "API access",
      "Custom integrations",
      "Dedicated account manager"
    ],
    limits: {
      properties: 1000,
      seats: 25,
      leads: 5000
    }
  }
];

export default function Subscribe() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    fetch("/api/auth/user")
      .then((res) => res.ok ? res.json() : null)
      .then((userData) => setUser(userData))
      .catch(() => setUser(null));

    // Fetch subscription plans from backend
    fetch("/api/subscription-plans")
      .then((res) => res.ok ? res.json() : [])
      .then((backendPlans) => {
        if (backendPlans.length > 0) {
          setPlans(backendPlans);
        }
      })
      .catch(() => {
        // Use default plans if backend fails
        console.log("Using default subscription plans");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = `/login?redirect=${encodeURIComponent('/subscribe')}`;
      return;
    }

    if (planId === "free") {
      // For free plan, just update user role
      try {
        const response = await fetch("/api/auth/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "free" }),
        });
        
        if (response.ok) {
          alert("Successfully upgraded to Free plan!");
          window.location.href = "/";
        }
      } catch (error) {
        alert("Failed to upgrade plan");
      }
      return;
    }

    setSelectedPlan(planId);
    
    // For paid plans, redirect to Stripe or handle payment
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      } else {
        alert("Failed to create subscription");
        setSelectedPlan(null);
      }
    } catch (error) {
      alert("Network error. Please try again.");
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              AdvertiseHomes.Online
            </Link>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-600">Welcome, {user.firstName}!</span>
                  <Link href="/" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-600 hover:text-gray-900">
                    Sign In
                  </Link>
                  <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your real estate needs. Upgrade or downgrade at any time.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden relative ${
                plan.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <div className={`p-6 ${plan.popular ? 'pt-12' : ''}`}>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-gray-600">/{plan.billingCycle}</span>
                  )}
                </div>

                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limits */}
                {(plan.limits.properties || plan.limits.seats || plan.limits.leads) && (
                  <div className="mb-4 text-xs text-gray-500 border-t pt-4">
                    {plan.limits.properties && (
                      <div>Properties: {plan.limits.properties}</div>
                    )}
                    {plan.limits.seats && (
                      <div>Team seats: {plan.limits.seats}</div>
                    )}
                    {plan.limits.leads && (
                      <div>Monthly leads: {plan.limits.leads}</div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan === plan.id}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : plan.price === "0"
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : plan.price === "0" ? (
                    "Get Started Free"
                  ) : user?.role === plan.id ? (
                    "Current Plan"
                  ) : (
                    `Subscribe for $${plan.price}`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Need help choosing? <Link href="/contact" className="text-blue-600 hover:underline">Contact our sales team</Link>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}