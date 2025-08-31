import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, UserPlus, Mail, Lock, User, Crown, CheckCircle } from "lucide-react";
import EmailVerification from "./EmailVerification";
import SubscriptionPayment from "@/components/SubscriptionPayment";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: any;
  listingCap: number;
  seats: number;
}

interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  tier: string;
}

type RegistrationStep = 'register' | 'verify' | 'payment' | 'complete';

export default function UserRegistration() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('register');
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    tier: 'premium'
  });

  // Show message for already authenticated users
  if (isAuthenticated && user) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="already-registered-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Already Registered!</CardTitle>
          <CardDescription>
            You're already logged in with an active account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-sm" data-testid="current-user-email">
              {user.email}
            </Badge>
            <br />
            <Badge variant="default" data-testid="current-user-tier">
              {user.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Plan` : 'Active Plan'}
            </Badge>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/'} 
              className="w-full"
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/api/logout'} 
              variant="outline" 
              className="w-full"
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch subscription plans from production database
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  // User registration mutation (production database)
  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const { confirmPassword, ...submitData } = data;
      return apiRequest('POST', '/api/auth/register', submitData);
    },
    onSuccess: (data) => {
      toast({
        title: "Registration Successful!",
        description: "Please check your email for a verification code.",
        duration: 5000,
      });
      setUserData(data);
      setCurrentStep('verify');
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const handleRegistration = () => {
    // Validate form
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleVerificationSuccess = (user: any) => {
    setUserData(user);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('complete');
  };

  const getSelectedPlan = () => {
    return subscriptionPlans.find(plan => plan.id === formData.tier);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return <User className="h-4 w-4" />;
      case 'agent':
        return <Crown className="h-4 w-4" />;
      case 'agency':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'expert':
        return <Crown className="h-4 w-4 text-amber-600" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Render different steps
  if (currentStep === 'verify' && userData) {
    return (
      <EmailVerification
        userId={userData.userId}
        email={userData.email}
        tier={userData.tier}
        onVerificationSuccess={handleVerificationSuccess}
      />
    );
  }

  if (currentStep === 'payment' && userData) {
    return (
      <SubscriptionPayment
        user={userData}
        selectedPlan={getSelectedPlan()}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }

  if (currentStep === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="registration-complete-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <UserPlus className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Welcome to AdvertiseHomes.Online!</CardTitle>
          <CardDescription>
            Your account has been created and your subscription is active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            data-testid="button-go-to-dashboard"
            onClick={() => window.location.href = '/dashboard'} 
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Registration form
  return (
    <Card className="w-full max-w-lg mx-auto" data-testid="registration-form-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <UserPlus className="h-16 w-16 text-blue-600" />
        </div>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Join AdvertiseHomes.Online and start listing properties today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              data-testid="input-first-name"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              disabled={registerMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              data-testid="input-last-name"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={registerMutation.isPending}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              data-testid="input-email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10"
              disabled={registerMutation.isPending}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              data-testid="input-password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="pl-10"
              disabled={registerMutation.isPending}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              data-testid="input-confirm-password"
              type="password"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="pl-10"
              disabled={registerMutation.isPending}
              required
            />
          </div>
        </div>

        {/* Subscription Tier Selection */}
        <div className="space-y-3">
          <Label htmlFor="tier">Subscription Plan *</Label>
          {plansLoading ? (
            <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
          ) : (
            <Select 
              value={formData.tier} 
              onValueChange={(value) => setFormData({ ...formData, tier: value })}
              disabled={registerMutation.isPending}
            >
              <SelectTrigger data-testid="select-tier">
                <SelectValue placeholder="Choose your plan" />
              </SelectTrigger>
              <SelectContent>
                {subscriptionPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id} data-testid={`option-tier-${plan.id}`}>
                    <div className="flex items-center space-x-2">
                      {getTierIcon(plan.id)}
                      <span>{plan.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {formatPrice(plan.price)}/{plan.interval}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Show selected plan details */}
          {getSelectedPlan() && (
            <div className="bg-blue-50 p-3 rounded-lg" data-testid="selected-plan-details">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">
                  {getSelectedPlan()?.name} Plan
                </h4>
                <Badge variant="default">
                  {formatPrice(getSelectedPlan()?.price || 0)}/month
                </Badge>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Up to {getSelectedPlan()?.listingCap} active listings</p>
                <p>• {getSelectedPlan()?.seats} user seat(s)</p>
                <p>• Advanced analytics and reporting</p>
                <p>• Priority customer support</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          data-testid="button-create-account"
          onClick={handleRegistration}
          disabled={registerMutation.isPending || !formData.email || !formData.password}
          className="w-full"
          size="lg"
        >
          {registerMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardContent>
    </Card>
  );
}