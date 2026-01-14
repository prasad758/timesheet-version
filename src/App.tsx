import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Layout } from "./components/Layout";
import Auth from "./pages/Auth";
import Timesheet from "./pages/Timesheet";
import SharedTimesheet from "./pages/SharedTimesheet";
import Issues from "./pages/Issues";
import IssueDetail from "./pages/IssueDetail";
import Users from "./pages/Users";
import Profiles from "./pages/Profiles";
import TimeClock from "./pages/TimeClock";
import Monitoring from "./pages/Monitoring";
import LeaveCalendar from "./pages/LeaveCalendar";
import Projects from "./pages/Projects";
import Git from "./pages/Git";
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
          <Route path="/auth/verify" element={<Auth />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout>
                  <Timesheet />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <Layout>
                  <Projects />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/issues"
            element={
              <AuthGuard>
                <Layout>
                  <Issues />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/issues/:id"
            element={
              <AuthGuard>
                <Layout>
                  <IssueDetail />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/users"
            element={
              <AuthGuard>
                <Layout>
                  <Users />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/profiles"
            element={
              <AuthGuard>
                <Layout>
                  <Profiles />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/time-clock"
            element={
              <AuthGuard>
                <Layout>
                  <TimeClock />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/monitoring"
            element={
              <AuthGuard>
                <Layout>
                  <Monitoring />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/leave-calendar"
            element={
              <AuthGuard>
                <Layout>
                  <LeaveCalendar />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/git"
            element={
              <AuthGuard>
                <Layout>
                  <Git />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/profiles/:id"
            element={
              <AuthGuard>
                <Layout>
                  <Profiles />
                </Layout>
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

