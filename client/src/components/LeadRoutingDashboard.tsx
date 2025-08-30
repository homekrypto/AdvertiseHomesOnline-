import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Settings, 
  Users, 
  TrendingUp, 
  Clock, 
  Target, 
  RotateCw,
  AlertCircle,
  CheckCircle,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LeadRoutingConfig {
  organizationId: string;
  routingType: string;
  isActive: boolean;
  settings: {
    maxLeadsPerAgent?: number;
    workingHours?: {
      start: string;
      end: string;
    };
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  status: string;
  agentId: string;
  assignedAt?: string;
  priority?: string;
  source: string;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalLeads?: number;
  lastAssignment?: string;
  isAvailable?: boolean;
}

export function LeadRoutingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoutingType, setSelectedRoutingType] = useState('round_robin');
  const [maxLeadsPerAgent, setMaxLeadsPerAgent] = useState(10);

  // Fetch lead routing configuration
  const { data: routingConfig, isLoading: configLoading } = useQuery<LeadRoutingConfig>({
    queryKey: [`/api/organizations/${user?.organizationId}/lead-routing`],
    enabled: !!user?.organizationId,
  });

  // Fetch organization leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: [`/api/leads/organization/${user?.organizationId}`],
    enabled: !!user?.organizationId,
  });

  // Fetch organization members (agents)
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: [`/api/organizations/${user?.organizationId}/members`],
    enabled: !!user?.organizationId,
  });

  // Update routing configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<LeadRoutingConfig>) => {
      return apiRequest("POST", `/api/organizations/${user?.organizationId}/lead-routing`, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${user?.organizationId}/lead-routing`] });
      toast({
        title: "Configuration Updated",
        description: "Lead routing settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update lead routing configuration.",
        variant: "destructive",
      });
    }
  });

  // Manual lead assignment mutation
  const assignLeadMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      return apiRequest("POST", `/api/leads/${leadId}/assign`, { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/organization/${user?.organizationId}`] });
      toast({
        title: "Lead Assigned",
        description: "Lead has been successfully assigned to the agent.",
      });
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign lead to agent.",
        variant: "destructive",
      });
    }
  });

  const handleConfigUpdate = () => {
    updateConfigMutation.mutate({
      routingType: selectedRoutingType,
      isActive: true,
      settings: {
        maxLeadsPerAgent,
        workingHours: { start: '09:00', end: '17:00' }
      }
    });
  };

  const getAgentLeadCount = (agentId: string) => {
    return leads.filter((lead: Lead) => lead.agentId === agentId).length;
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status).length;
  };

  const totalLeads = leads.length;
  const activeAgents = agents.filter((agent) => agent.isAvailable !== false);

  if (configLoading || leadsLoading || agentsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="lead-routing-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Routing System</h2>
          <p className="text-muted-foreground">
            Manage automated lead assignment and distribution
          </p>
        </div>
        <Badge variant={routingConfig?.isActive ? "default" : "secondary"} data-testid="routing-status">
          <Activity className="w-3 h-3 mr-1" />
          {routingConfig?.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-total-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-leads">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {getLeadsByStatus('new')} new leads
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-agents">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-agents">{activeAgents.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for assignment
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-routing-type">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routing Method</CardTitle>
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize" data-testid="text-routing-method">
              {routingConfig?.routingType?.replace('_', ' ') || 'Round Robin'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current assignment method
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-conversion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">
              {totalLeads > 0 ? Math.round((getLeadsByStatus('converted') / totalLeads) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {getLeadsByStatus('converted')} converted leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList data-testid="tabs-navigation">
          <TabsTrigger value="configuration" data-testid="tab-configuration">Configuration</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Agent Assignments</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card data-testid="card-routing-config">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Routing Configuration
              </CardTitle>
              <CardDescription>
                Configure how leads are automatically assigned to agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="routing-type">Routing Method</Label>
                  <Select value={selectedRoutingType} onValueChange={setSelectedRoutingType}>
                    <SelectTrigger data-testid="select-routing-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="weighted">Weighted Distribution</SelectItem>
                      <SelectItem value="availability">Availability Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Round Robin distributes leads evenly across all agents
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-leads">Max Leads per Agent</Label>
                  <Input
                    id="max-leads"
                    type="number"
                    value={maxLeadsPerAgent}
                    onChange={(e) => setMaxLeadsPerAgent(parseInt(e.target.value))}
                    data-testid="input-max-leads"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum leads assigned per agent per day
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-routing"
                  checked={routingConfig?.isActive || false}
                  data-testid="switch-enable-routing"
                />
                <Label htmlFor="enable-routing">Enable Automatic Routing</Label>
              </div>

              <Button 
                onClick={handleConfigUpdate}
                disabled={updateConfigMutation.isPending}
                data-testid="button-save-config"
              >
                {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card data-testid="card-agent-workload">
            <CardHeader>
              <CardTitle>Agent Workload Distribution</CardTitle>
              <CardDescription>Current lead assignments across your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAgents.map((agent: Agent) => {
                  const leadCount = getAgentLeadCount(agent.id);
                  const workloadPercentage = totalLeads > 0 ? (leadCount / totalLeads) * 100 : 0;
                  
                  return (
                    <div key={agent.id} className="space-y-2" data-testid={`agent-workload-${agent.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {agent.firstName} {agent.lastName}
                          </div>
                          <Badge variant={leadCount > maxLeadsPerAgent ? "destructive" : "secondary"}>
                            {leadCount} leads
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {workloadPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <Progress value={workloadPercentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-lead-sources">
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where your leads are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['website', 'referral', 'social', 'other'].map(source => {
                    const sourceLeads = leads.filter((lead) => lead.source === source).length;
                    const percentage = totalLeads > 0 ? (sourceLeads / totalLeads) * 100 : 0;
                    
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <div className="capitalize font-medium">{source}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{sourceLeads}</div>
                          <div className="w-16 text-right text-sm">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-routing-performance">
              <CardHeader>
                <CardTitle>Routing Performance</CardTitle>
                <CardDescription>System efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Assignment Success</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">98.5%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Response Time</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">2.3 min</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Load Balance Score</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}