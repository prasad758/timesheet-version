import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import Auth from "./pages/Auth";
import Timesheet from "./pages/Timesheet";
import SharedTimesheet from "./pages/SharedTimesheet";
import Issues from "./pages/Issues";
import IssueDetail from "./pages/IssueDetail";
import Users from "./pages/Users";
import TimeClock from "./pages/TimeClock";
import Monitoring from "./pages/Monitoring";
import LeaveCalendar from "./pages/LeaveCalendar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Timesheet />
              </AuthGuard>
            }
          />
          <Route
            path="/issues"
            element={
              <AuthGuard>
                <Issues />
              </AuthGuard>
            }
          />
          <Route
            path="/issues/:id"
            element={
              <AuthGuard>
                <IssueDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/users"
            element={
              <AuthGuard>
                <Users />
              </AuthGuard>
            }
          />
          <Route
            path="/time-clock"
            element={
              <AuthGuard>
                <TimeClock />
              </AuthGuard>
            }
          />
          <Route
            path="/monitoring"
            element={
              <AuthGuard>
                <Monitoring />
              </AuthGuard>
            }
          />
          <Route
            path="/leave-calendar"
            element={
              <AuthGuard>
                <LeaveCalendar />
              </AuthGuard>
            }
          />
          <Route path="/timesheet/:id" element={<SharedTimesheet />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

