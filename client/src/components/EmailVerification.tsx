import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, RefreshCw, CheckCircle } from "lucide-react";

interface EmailVerificationProps {
  userId: string;
  email: string;
  tier: string;
  onVerificationSuccess: (user: any) => void;
}

export default function EmailVerification({ 
  userId, 
  email, 
  tier, 
  onVerificationSuccess 
}: EmailVerificationProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Email verification mutation (production database)
  const verifyEmailMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('POST', '/api/auth/verify-email', {
        userId,
        code: code.trim(),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified. You can now proceed to payment.",
        duration: 5000,
      });
      setIsVerified(true);
      onVerificationSuccess(data.user);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      setVerificationCode("");
    },
  });

  // Resend verification code mutation (production database)
  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/resend-verification', {
        email,
      });
    },
    onSuccess: () => {
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Code",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }
    verifyEmailMutation.mutate(verificationCode);
  };

  const handleResendCode = () => {
    resendCodeMutation.mutate();
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(cleanValue);
  };

  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="verification-success-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified. You can now proceed to payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Badge variant="outline" className="text-sm" data-testid="verified-email-badge">
              {email}
            </Badge>
          </div>
          <div className="text-center">
            <Badge variant="default" data-testid="tier-badge">
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="email-verification-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Mail className="h-16 w-16 text-blue-600" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to:
          <br />
          <strong data-testid="verification-email">{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="verification-code" className="text-sm font-medium">
            Verification Code
          </label>
          <Input
            id="verification-code"
            data-testid="input-verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            maxLength={6}
            className="text-center text-2xl tracking-wider font-mono"
            disabled={verifyEmailMutation.isPending}
          />
          <p className="text-xs text-muted-foreground text-center">
            Enter the 6-digit code from your email
          </p>
        </div>

        <Button
          data-testid="button-verify-email"
          onClick={handleVerify}
          disabled={verificationCode.length !== 6 || verifyEmailMutation.isPending}
          className="w-full"
        >
          {verifyEmailMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          <Button
            data-testid="button-resend-code"
            variant="outline"
            size="sm"
            onClick={handleResendCode}
            disabled={resendCodeMutation.isPending}
          >
            {resendCodeMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Code'
            )}
          </Button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg" data-testid="verification-info">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-medium">What's next?</p>
              <p>After verification, you'll proceed to payment for your {tier} subscription.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Badge variant="outline" className="text-xs" data-testid="selected-tier-badge">
            Selected: {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}