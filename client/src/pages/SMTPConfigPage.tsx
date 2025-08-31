import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Settings, Mail, CheckCircle } from "lucide-react";

export default function SMTPConfigPage() {
  const { toast } = useToast();
  const [smtpPassword, setSMTPPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // Test SMTP connection mutation
  const testSMTPMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest('POST', '/api/admin/test-smtp', {
        password,
      });
    },
    onSuccess: () => {
      toast({
        title: "SMTP Connection Successful!",
        description: "Email service is now working properly.",
      });
      setSMTPPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "SMTP Connection Failed",
        description: error.message || "Please check your password and try again.",
        variant: "destructive",
      });
    },
  });

  const handlePromptPassword = () => {
    const password = window.prompt("Enter SMTP password for support@advertisehomes.online:");
    if (password) {
      setSMTPPassword(password);
      testSMTPMutation.mutate(password);
    }
  };

  const handleDirectTest = () => {
    if (!smtpPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the SMTP password.",
        variant: "destructive",
      });
      return;
    }
    testSMTPMutation.mutate(smtpPassword.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <Card data-testid="smtp-config-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Settings className="h-16 w-16 text-blue-600" />
            </div>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Configure email service for AdvertiseHomes.Online
              <br />
              <strong>Account: support@advertisehomes.online</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg" data-testid="smtp-info">
              <div className="flex items-start space-x-2">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Current SMTP Settings:</p>
                  <p>Host: smtp.hostinger.com</p>
                  <p>Port: 465 (SSL)</p>
                  <p>User: support@advertisehomes.online</p>
                  <p>Status: Authentication Failed (535 Error)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                data-testid="button-prompt-password"
                onClick={handlePromptPassword}
                disabled={testSMTPMutation.isPending}
                className="w-full"
                variant="default"
              >
                {testSMTPMutation.isPending ? (
                  <>
                    <Mail className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  'Enter SMTP Password (Window Prompt)'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                - OR -
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Enter SMTP password manually"
                  value={smtpPassword}
                  onChange={(e) => setSMTPPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-smtp-password"
                />
                <Button
                  data-testid="button-test-smtp"
                  onClick={handleDirectTest}
                  disabled={testSMTPMutation.isPending || !smtpPassword.trim()}
                  className="w-full"
                  variant="outline"
                >
                  Test SMTP Connection
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg" data-testid="smtp-warning">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-700">
                  <p className="font-medium">Note:</p>
                  <p>This will test the SMTP connection and update the password if successful. The password must match your Hostinger email account password.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}