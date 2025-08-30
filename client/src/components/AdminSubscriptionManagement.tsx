import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  CreditCard, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number;
  currency: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  paymentDate: Date;
  failureReason?: string;
  refundAmount?: number;
  refundDate?: Date;
}

export default function AdminSubscriptionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'cancel' | 'refund' | 'retry' | null>(null);

  // Fetch subscriptions and payment data
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions'],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<PaymentRecord[]>({
    queryKey: ['/api/admin/payments'],
  });

  const { data: subscriptionStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/subscription-stats'],
  });

  // Mutations
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return apiRequest('POST', `/api/admin/subscriptions/${subscriptionId}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Subscription cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setIsActionDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: async (data: { paymentId: string; amount?: number }) => {
      return apiRequest('POST', `/api/admin/payments/${data.paymentId}/refund`, { amount: data.amount });
    },
    onSuccess: () => {
      toast({ title: "Refund processed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payments'] });
      setIsActionDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Refund failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return apiRequest('POST', `/api/admin/subscriptions/${subscriptionId}/retry-payment`);
    },
    onSuccess: () => {
      toast({ title: "Payment retry initiated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setIsActionDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch = !searchTerm || 
      subscription.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Filter payments for failed payments view
  const failedPayments = payments.filter(payment => payment.status === 'failed');
  const recentPayments = payments.slice(0, 50);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'secondary';
      case 'past_due':
        return 'destructive';
      case 'unpaid':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600" />;
      case 'refunded':
        return <TrendingDown className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleAction = (type: 'cancel' | 'refund' | 'retry', subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const executeAction = () => {
    if (!selectedSubscription || !actionType) return;

    switch (actionType) {
      case 'cancel':
        cancelSubscriptionMutation.mutate(selectedSubscription.id);
        break;
      case 'retry':
        retryPaymentMutation.mutate(selectedSubscription.id);
        break;
      // Note: refund would need payment ID, not subscription ID
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="subscription-stats-active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptionStats?.activeSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="subscription-stats-mrr">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(subscriptionStats?.monthlyRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="subscription-stats-failed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="subscription-stats-churn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(subscriptionStats?.churnRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              -0.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="failed-payments" data-testid="tab-failed-payments">Failed Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>
                    Manage user subscriptions and billing
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {filteredSubscriptions.length} subscriptions
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscriptions..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-subscription-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-40" data-testid="select-plan-filter">
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscriptions Table */}
              {subscriptionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Current Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id} data-testid={`subscription-row-${subscription.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{subscription.userName}</div>
                            <div className="text-sm text-muted-foreground">{subscription.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {subscription.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(subscription.status)} className="capitalize">
                            {subscription.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${subscription.amount}/mo
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{new Date(subscription.currentPeriodStart).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            to {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {subscription.status === 'past_due' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction('retry', subscription)}
                                data-testid={`button-retry-${subscription.id}`}
                              >
                                Retry Payment
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction('cancel', subscription)}
                              disabled={subscription.status === 'cancelled'}
                              data-testid={`button-cancel-${subscription.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredSubscriptions.length === 0 && !subscriptionsLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No subscriptions match the current filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Recent payment transactions and billing history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                        <TableCell>
                          <div className="font-medium">{payment.userId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPaymentStatusIcon(payment.status)}
                            <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {payment.status === 'succeeded' && !payment.refundAmount && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Handle refund
                                refundPaymentMutation.mutate({ paymentId: payment.id });
                              }}
                              data-testid={`button-refund-${payment.id}`}
                            >
                              Refund
                            </Button>
                          )}
                          {payment.refundAmount && (
                            <Badge variant="secondary">
                              Refunded: ${payment.refundAmount.toFixed(2)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed-payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span>Failed Payments</span>
              </CardTitle>
              <CardDescription>
                Payments that require immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium">No failed payments</p>
                  <p className="text-muted-foreground">All payments are processing successfully</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead>Failed Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedPayments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`failed-payment-row-${payment.id}`}>
                        <TableCell>
                          <div className="font-medium">{payment.userId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-destructive">
                            {payment.failureReason || 'Payment declined'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-contact-customer-${payment.id}`}
                          >
                            Contact Customer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent data-testid="dialog-confirm-subscription-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'cancel' && 'Cancel Subscription'}
              {actionType === 'retry' && 'Retry Payment'}
              {actionType === 'refund' && 'Process Refund'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'cancel' && 'Are you sure you want to cancel this subscription? This action cannot be undone.'}
              {actionType === 'retry' && 'This will attempt to charge the customer again for their failed payment.'}
              {actionType === 'refund' && 'This will process a full refund for the customer.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsActionDialogOpen(false)}
              variant="outline"
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              variant={actionType === 'cancel' ? 'destructive' : 'default'}
              disabled={
                cancelSubscriptionMutation.isPending || 
                retryPaymentMutation.isPending || 
                refundPaymentMutation.isPending
              }
              data-testid="button-confirm-subscription-action"
            >
              {(cancelSubscriptionMutation.isPending || 
                retryPaymentMutation.isPending || 
                refundPaymentMutation.isPending) 
                ? "Processing..." 
                : "Confirm"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}