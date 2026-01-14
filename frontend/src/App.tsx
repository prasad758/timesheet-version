import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Layout } from "./components/Layout";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Feature pages - LAD Architecture
import Timesheet, { SharedTimesheet } from "@features/timesheet";
import Projects from "@features/projects";
import Issues from "@features/issues";
import { IssueDetail } from "@features/issues";
import Profiles from "@features/profiles";
import ResourceManagement from "@features/resource-management";
import Users from "@features/users";
import Monitoring from "@features/monitoring";
import TimeClock from "@features/time-clock";
import LeaveCalendar from "@features/leave-calendar";
import Git from "@features/git";
import HRDocumentsPage from "@features/hr-documents";
import TemplatesPage from "@features/hr-documents/templates-page";
// HRDocumentGenerator removed

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
            path="/resource-management"
            element={
              <AuthGuard>
                <Layout>
                  <ResourceManagement />
                </Layout>
              </AuthGuard>
            }
          />
          {/* Legacy routes - kept for backward compatibility */}
          <Route
            path="/profiles"
            element={
              <AuthGuard>
                <Layout>
                  <ResourceManagement />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/exit-formalities"
            element={
              <AuthGuard>
                <Layout>
                  <ResourceManagement />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/payslips"
            element={
              <AuthGuard>
                <Layout>
                  <ResourceManagement />
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
            path="/hr-documents"
            element={
              <AuthGuard>
                <Layout>
                  <ResourceManagement />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/hr-templates"
            element={
              <AuthGuard>
                <Layout>
                  <TemplatesPage />
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

