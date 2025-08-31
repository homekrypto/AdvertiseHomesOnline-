import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import AgentDashboard from "@/pages/AgentDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import ComprehensiveAdminDashboard from "@/pages/ComprehensiveAdminDashboard";
import PropertyManagement from "@/pages/PropertyManagement";
import Subscribe from "@/pages/Subscribe";
import SMTPConfigPage from "@/pages/SMTPConfigPage";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/properties" component={Properties} />
          <Route path="/properties/:slug" component={PropertyDetail} />
          <Route path="/subscribe" component={Subscribe} />

        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/register" component={Register} />
          <Route path="/properties" component={Properties} />
          <Route path="/properties/:slug" component={PropertyDetail} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/agent/dashboard" component={AgentDashboard} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/comprehensive" component={ComprehensiveAdminDashboard} />
          <Route path="/admin/smtp" component={SMTPConfigPage} />
          <Route path="/manage/properties" component={PropertyManagement} />

        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
