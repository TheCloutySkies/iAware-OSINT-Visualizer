import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthUiProvider } from "@/contexts/auth-ui-context";
import MapPage from "@/pages/map-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthUiProvider>
          <Toaster />
          <Router />
        </AuthUiProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
