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
import Vendors from "@/pages/vendors";
import Financials from "@/pages/financials";
import PnLStatement from "@/pages/pnl-statement";
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
import Performance from "@/pages/performance";
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
import GuestPreBill from "@/pages/guest-prebill";
import AdminPortalLogin from "@/pages/admin-portal-login";
import AdminPortalDashboard from "@/pages/admin-portal-dashboard";
import AdminPortalPropertyDetails from "@/pages/admin-portal-property-details";
import Onboarding from "@/pages/onboarding";
import FAQ from "@/pages/faq";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import ContactEnquiries from "@/pages/contact-enquiries";
import Register from "@/pages/register";
import Login from "@/pages/login";
import ReportIssue from "@/pages/report-issue";
import OtaIntegrations from "@/pages/ota-integrations";
import Notifications from "@/pages/notifications";
import AuditLogs from "@/pages/audit-logs";
import Architecture from "@/pages/architecture";
import AdvancedFeatures from "@/pages/advanced-features";
import FeatureSettings from "@/pages/feature-settings";
import WhatsappSettings from "@/pages/whatsapp-settings";
import AnalyticsChat from "@/pages/analytics-chat";
import { ErrorBoundary } from "@/components/error-boundary";
import { Chatbot } from "@/components/chatbot";
import { CompletionNotifications } from "@/components/completion-notifications";
import { NotificationCenter } from "@/components/notification-center";

function Router({ showDashboard }: { showDashboard: boolean }) {
  return (
    <Switch>
      {/* Public Routes - No Auth Required */}
      <Route path="/menu" component={Menu} />
      <Route path="/customer-menu" component={CustomerMenu} />
      <Route path="/qr-codes" component={QRCodes} />
      <Route path="/guest-self-checkin" component={GuestSelfCheckin} />
      <Route path="/guest/prebill/:token" component={GuestPreBill} />
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
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Register} />
      <Route path="/register" component={Register} />
      <Route path="/report-issue" component={ReportIssue} />
      
      {showDashboard ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/architecture" component={Architecture} />
          <Route path="/advanced-features" component={AdvancedFeatures} />
          <Route path="/properties" component={Properties} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/bookings/:id" component={Bookings} />
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
          <Route path="/vendors" component={Vendors} />
          <Route path="/financials" component={Financials} />
          <Route path="/pnl-statement" component={PnLStatement} />
          <Route path="/addons" component={AddOnServices} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/analytics-chat" component={AnalyticsChat} />
          <Route path="/salaries" component={Salaries} />
          <Route path="/attendance" component={Attendance} />
          <Route path="/performance" component={Performance} />
          <Route path="/travel-agents" component={TravelAgents} />
          <Route path="/ota-integrations" component={OtaIntegrations} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/audit-logs" component={AuditLogs} />
          <Route path="/users" component={UsersManagement} />
          <Route path="/settings" component={Settings} />
          <Route path="/feature-settings" component={FeatureSettings} />
          <Route path="/whatsapp-settings" component={WhatsappSettings} />
        </>
      ) : (
        <Route path="/" component={Home} />
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
  const { isAuthenticated, isLoading, verificationStatus, pendingUser, message, isViewingAsUser, user } = useAuth();
  const [isReturningToAdmin, setIsReturningToAdmin] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [, setForceUpdate] = useState(0);
  const [, setLocation] = useLocation();

  // Development: Auto-login disabled - use normal login flow
  // To enable, uncomment and the app will auto-login in dev mode

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

  // Calculate showDashboard once here to pass to Router
  const showDashboard = isAuthenticated && !isLoading;

  // Show pending approval screen for users awaiting verification
  if (verificationStatus === "pending" && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-950 dark:to-orange-950/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-lg shadow-lg">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Pending Approval</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {message || "Your account is waiting for Super Admin approval."}
            </p>
            {pendingUser && (
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                Logged in as: <span className="font-medium">{pendingUser.email}</span>
              </p>
            )}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">What happens next?</h4>
              <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1 text-left">
                <li>1. Our team will review your application</li>
                <li>2. You will receive a WhatsApp notification once approved</li>
                <li>3. Once approved, you can login and manage your property</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  fetch("/api/logout", { method: "POST", credentials: "include" })
                    .then(() => setLocation("/"));
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Sign Out
              </button>
              <button
                onClick={() => setLocation("/")}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show rejected screen
  if (verificationStatus === "rejected" && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-950 dark:to-red-950/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg shadow-lg">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Not Approved</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {message || "Your account application was not approved."}
            </p>
            {pendingUser && (
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                Email: <span className="font-medium">{pendingUser.email}</span>
              </p>
            )}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Need Help?</h4>
              <p className="text-sm text-red-700 dark:text-red-400">
                If you believe this was a mistake, please contact our support team at{" "}
                <a href="mailto:support@hostezee.in" className="underline">support@hostezee.in</a>
              </p>
            </div>
            <button
              onClick={() => {
                fetch("/api/logout", { method: "POST", credentials: "include" })
                  .then(() => setLocation("/"));
              }}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // When not authenticated, show public routes with Home page
  if (!isAuthenticated) {
    return (
      <>
        <Router showDashboard={false} />
        {children}
      </>
    );
  }

  // Hide main sidebar on super admin pages (they have their own sidebar)
  // Use window.location.pathname instead of wouter location to get real-time updates
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isSuperAdminPage = currentPath.startsWith('/super-admin');

  // Return to super admin function
  const handleReturnToAdmin = async () => {
    setIsReturningToAdmin(true);
    try {
      const response = await fetch("/api/super-admin/return-to-admin", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        // Force full page refresh to clear all state
        window.location.href = "/super-admin";
      } else {
        console.error("Failed to return to admin");
        setIsReturningToAdmin(false);
      }
    } catch (error) {
      console.error("Error returning to admin:", error);
      setIsReturningToAdmin(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {!isSuperAdminPage && <AppSidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Super Admin Viewing Banner */}
        {isViewingAsUser && (
          <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Viewing as: <strong>{user?.email || "User"}</strong></span>
            </div>
            <button
              onClick={handleReturnToAdmin}
              disabled={isReturningToAdmin}
              className="bg-white text-orange-600 px-3 py-1 rounded text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
              data-testid="button-return-to-admin"
            >
              {isReturningToAdmin ? "Returning..." : "Return to Super Admin"}
            </button>
          </div>
        )}
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
          <Router showDashboard={showDashboard} />
        </main>
      </div>
      {children}
      <Chatbot />
      <CompletionNotifications />
    </div>
  );
}
