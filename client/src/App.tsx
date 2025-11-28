import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { connectToEventStream } from "@/lib/eventHandlers";
import { useEffect, useRef, useState } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import Rooms from "@/pages/rooms";
import Bookings from "@/pages/bookings";
import Guests from "@/pages/guests/page";
import Kitchen from "@/pages/restaurant";
import Billing from "@/pages/billing";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Menu from "@/pages/menu";
import QuickOrder from "@/pages/quick-order";
import NewEnquiry from "@/pages/new-enquiry";
import Enquiries from "@/pages/enquiries";
import Leases from "@/pages/leases";
import Expenses from "@/pages/expenses";
import Financials from "@/pages/financials";
import AddOnServices from "@/pages/addons";
import UsersManagement from "@/pages/users";
import ActiveBookings from "@/pages/active-bookings";
import CheckIns from "@/pages/check-ins";
import CalendarView from "@/pages/calendar-view";
import FoodOrdersReport from "@/pages/food-orders-report";
import MenuManagement from "@/pages/menu-management";
import EnhancedMenu from "@/pages/enhanced-menu";
import CustomerMenu from "@/pages/customer-menu";
import BookingAnalytics from "@/pages/booking-analytics";
import QRCodes from "@/pages/qr-codes";
import Salaries from "@/pages/salaries";
import Attendance from "@/pages/attendance";
import TravelAgents from "@/pages/travel-agents";
import PendingPayments from "@/pages/pending-payments";
import SuperAdmin from "@/pages/super-admin";
import SuperAdminLogin from "@/pages/super-admin-login";
import Features from "@/pages/features";
import Security from "@/pages/security";
import About from "@/pages/about";
import Blog from "@/pages/blog";
import ContactPage from "@/pages/contact";
import Pricing from "@/pages/pricing";
import ForgotPassword from "@/pages/forgot-password";
import VerifyOTP from "@/pages/verify-otp";
import ResetPassword from "@/pages/reset-password";
import GuestSelfCheckin from "@/pages/guest-self-checkin";
import AdminPortalLogin from "@/pages/admin-portal-login";
import AdminPortalDashboard from "@/pages/admin-portal-dashboard";
import AdminPortalPropertyDetails from "@/pages/admin-portal-property-details";
import Onboarding from "@/pages/onboarding";
import FAQ from "@/pages/faq";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import ContactEnquiries from "@/pages/contact-enquiries";
import Register from "@/pages/register";
import ReportIssue from "@/pages/report-issue";
import OtaIntegrations from "@/pages/ota-integrations";
import Notifications from "@/pages/notifications";
import AuditLogs from "@/pages/audit-logs";
import Architecture from "@/pages/architecture";
import { ErrorBoundary } from "@/components/error-boundary";
import { Chatbot } from "@/components/chatbot";
import { PendingNotifications } from "@/components/pending-notifications";
import { CompletionNotifications } from "@/components/completion-notifications";
import { NotificationCenter } from "@/components/notification-center";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Routes - No Auth Required */}
      <Route path="/menu" component={Menu} />
      <Route path="/customer-menu" component={CustomerMenu} />
      <Route path="/qr-codes" component={QRCodes} />
      <Route path="/guest-self-checkin" component={GuestSelfCheckin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify-otp" component={VerifyOTP} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin-portal" component={AdminPortalLogin} />
      <Route path="/admin-portal/dashboard" component={AdminPortalDashboard} />
      <Route path="/admin-portal/property" component={AdminPortalPropertyDetails} />
      <Route path="/super-admin-login" component={SuperAdminLogin} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route path="/contact-enquiries" component={ContactEnquiries} />
      <Route path="/features" component={Features} />
      <Route path="/security" component={Security} />
      <Route path="/about" component={About} />
      <Route path="/blog" component={Blog} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/faq" component={FAQ} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/login" component={Landing} />
      <Route path="/signup" component={Register} />
      <Route path="/register" component={Register} />
      <Route path="/report-issue" component={ReportIssue} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Home} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/architecture" component={Architecture} />
          <Route path="/properties" component={Properties} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/check-ins" component={CheckIns} />
          <Route path="/active-bookings" component={ActiveBookings} />
          <Route path="/calendar" component={CalendarView} />
          <Route path="/room-calendar" component={CalendarView} />
          <Route path="/guests" component={Guests} />
          <Route path="/restaurant" component={Kitchen} />
          <Route path="/kitchen" component={Kitchen} />
          <Route path="/quick-order" component={QuickOrder} />
          <Route path="/menu-management" component={MenuManagement} />
          <Route path="/enhanced-menu" component={EnhancedMenu} />
          <Route path="/food-orders-report" component={FoodOrdersReport} />
          <Route path="/booking-analytics" component={BookingAnalytics} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/new-enquiry" component={NewEnquiry} />
          <Route path="/billing" component={Billing} />
          <Route path="/pending-payments" component={PendingPayments} />
          <Route path="/leases" component={Leases} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/financials" component={Financials} />
          <Route path="/addons" component={AddOnServices} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/salaries" component={Salaries} />
          <Route path="/attendance" component={Attendance} />
          <Route path="/travel-agents" component={TravelAgents} />
          <Route path="/ota-integrations" component={OtaIntegrations} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/audit-logs" component={AuditLogs} />
          <Route path="/users" component={UsersManagement} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style} defaultOpen={true}>
            <ErrorBoundary>
              <AuthWrapper>
                <Toaster />
              </AuthWrapper>
            </ErrorBoundary>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [, setForceUpdate] = useState(0);

  // MUST be before any early returns to maintain hook order
  useEffect(() => {
    if (isAuthenticated && !eventSourceRef.current) {
      console.log('[App] Connecting to event stream...');
      eventSourceRef.current = connectToEventStream();
    }

    return () => {
      if (eventSourceRef.current) {
        console.log('[App] Disconnecting from event stream');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // MUST be before any early returns to maintain hook order
  useEffect(() => {
    const handleNavigation = () => {
      setForceUpdate(prev => prev + 1);
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Router />
        {children}
      </>
    );
  }

  // Hide main sidebar on super admin pages (they have their own sidebar)
  // Use window.location.pathname instead of wouter location to get real-time updates
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isSuperAdminPage = currentPath.startsWith('/super-admin');

  return (
    <div className="flex h-screen w-full">
      {!isSuperAdminPage && <AppSidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between p-2 border-b bg-background sticky top-0 z-40">
          <div className="flex items-center gap-1 min-w-max">
            {!isSuperAdminPage && (
              <SidebarTrigger data-testid="button-sidebar-toggle" className="h-10 w-10" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          <Router />
        </main>
      </div>
      {children}
      <Chatbot />
      <PendingNotifications />
      <CompletionNotifications />
    </div>
  );
}
