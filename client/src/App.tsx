import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReportIssueButton } from "@/components/report-issue";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { connectToEventStream } from "@/lib/eventHandlers";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// Eager — always needed immediately (small / public / auth pages)
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import VerifyOTP from "@/pages/verify-otp";
import ResetPassword from "@/pages/reset-password";
import GuestSelfCheckin from "@/pages/guest-self-checkin";
import GuestPreBill from "@/pages/guest-prebill";
import Menu from "@/pages/menu";
import CustomerMenu from "@/pages/customer-menu";

// Lazy — only loaded when the user navigates to that page
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Properties = lazy(() => import("@/pages/properties"));
const Rooms = lazy(() => import("@/pages/rooms"));
const Bookings = lazy(() => import("@/pages/bookings"));
const Guests = lazy(() => import("@/pages/guests/page"));
const Kitchen = lazy(() => import("@/pages/restaurant"));
const DynamicPricing = lazy(() => import("@/pages/dynamic-pricing"));
const Billing = lazy(() => import("@/pages/billing"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Settings = lazy(() => import("@/pages/settings"));
const WhatsappAlerts = lazy(() => import("@/pages/whatsapp-alerts"));
const QuickOrder = lazy(() => import("@/pages/quick-order"));
const NewEnquiry = lazy(() => import("@/pages/new-enquiry"));
const Enquiries = lazy(() => import("@/pages/enquiries"));
const Leases = lazy(() => import("@/pages/leases"));
const Expenses = lazy(() => import("@/pages/expenses"));
const Wallets = lazy(() => import("@/pages/wallets"));
const Vendors = lazy(() => import("@/pages/vendors"));
const Financials = lazy(() => import("@/pages/financials"));
const PnLStatement = lazy(() => import("@/pages/pnl-statement"));
const AddOnServices = lazy(() => import("@/pages/addons"));
const ServicesReport = lazy(() => import("@/pages/services-report"));
const MonthlyReport = lazy(() => import("@/pages/monthly-report"));
const UsersManagement = lazy(() => import("@/pages/users"));
const ActiveBookings = lazy(() => import("@/pages/active-bookings"));
const CheckIns = lazy(() => import("@/pages/check-ins"));
const CalendarView = lazy(() => import("@/pages/calendar-view"));
const FoodOrdersReport = lazy(() => import("@/pages/food-orders-report"));
const MenuManagement = lazy(() => import("@/pages/menu-management"));
const EnhancedMenu = lazy(() => import("@/pages/enhanced-menu"));
const BookingAnalytics = lazy(() => import("@/pages/booking-analytics"));
const QRCodes = lazy(() => import("@/pages/qr-codes"));
const RestaurantTables = lazy(() => import("@/pages/restaurant-tables"));
const RestaurantLive = lazy(() => import("@/pages/restaurant-live"));
const Reservations = lazy(() => import("@/pages/reservations"));
const ZReport = lazy(() => import("@/pages/z-report"));
const Salaries = lazy(() => import("@/pages/salaries"));
const Attendance = lazy(() => import("@/pages/attendance"));
const TravelAgents = lazy(() => import("@/pages/travel-agents"));
const PendingPayments = lazy(() => import("@/pages/pending-payments"));
const Performance = lazy(() => import("@/pages/performance"));
const SuperAdmin = lazy(() => import("@/pages/super-admin"));
const SuperAdminLogin = lazy(() => import("@/pages/super-admin-login"));
const Features = lazy(() => import("@/pages/features"));
const Security = lazy(() => import("@/pages/security"));
const About = lazy(() => import("@/pages/about"));
const Blog = lazy(() => import("@/pages/blog"));
const ContactPage = lazy(() => import("@/pages/contact"));
const Pricing = lazy(() => import("@/pages/pricing"));
const AdminPortalLogin = lazy(() => import("@/pages/admin-portal-login"));
const AdminPortalDashboard = lazy(() => import("@/pages/admin-portal-dashboard"));
const AdminPortalPropertyDetails = lazy(() => import("@/pages/admin-portal-property-details"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const FAQ = lazy(() => import("@/pages/faq"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const ContactEnquiries = lazy(() => import("@/pages/contact-enquiries"));
const ReportIssue = lazy(() => import("@/pages/report-issue"));
const ChannelManager = lazy(() => import("@/pages/channel-manager"));
const AcceptInvite = lazy(() => import("@/pages/accept-invite"));
const Notifications = lazy(() => import("@/pages/notifications"));
const AuditLogs = lazy(() => import("@/pages/audit-logs"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Architecture = lazy(() => import("@/pages/architecture"));
const AdvancedFeatures = lazy(() => import("@/pages/advanced-features"));
const FeatureSettings = lazy(() => import("@/pages/feature-settings"));
const WhatsAppTemplates = lazy(() => import("@/pages/whatsapp-templates"));
const AnalyticsChat = lazy(() => import("@/pages/analytics-chat"));
import { ErrorBoundary } from "@/components/error-boundary";

import { CompletionNotifications } from "@/components/completion-notifications";
import { NotificationCenter } from "@/components/notification-center";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

// Route-level gate: synchronously redirect restaurant-only users away from
// the admin dashboard so there is zero flash of financial UI. Mirrors the
// same logic used in App's useEffect below.
function DashboardGate() {
  const { user } = useAuth();
  const { permissions, isFullAccess, isLoading } = usePermissions();
  const role = (user as any)?.role;
  if (role === 'super-admin' || role === 'super_admin') return <Dashboard />;
  if (role === 'kitchen') return <Redirect to="/restaurant" />;
  if (isFullAccess) return <Dashboard />;
  if (isLoading || !permissions) return null;
  const restaurantOnly =
    (permissions.foodOrders !== 'none' || permissions.menuManagement !== 'none') &&
    permissions.bookings === 'none' &&
    permissions.calendar === 'none' &&
    permissions.rooms === 'none' &&
    permissions.guests === 'none' &&
    permissions.payments === 'none' &&
    permissions.reports === 'none' &&
    permissions.staff === 'none' &&
    permissions.tasks === 'none' &&
    permissions.settings === 'none';
  if (restaurantOnly) return <Redirect to="/restaurant" />;
  return <Dashboard />;
}

function Router({ showDashboard }: { showDashboard: boolean }) {
  return (
    <Suspense fallback={<PageLoader />}>
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
      <Route path="/accept-invite" component={AcceptInvite} />
      
      {showDashboard ? (
        <>
          <Route path="/" component={DashboardGate} />
          <Route path="/dashboard" component={DashboardGate} />
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
          <Route path="/dynamic-pricing" component={DynamicPricing} />
          <Route path="/kitchen" component={Kitchen} />
          <Route path="/quick-order" component={QuickOrder} />
          <Route path="/menu-management" component={MenuManagement} />
          <Route path="/enhanced-menu" component={EnhancedMenu} />
          <Route path="/restaurant-tables" component={RestaurantTables} />
          <Route path="/restaurant-live" component={RestaurantLive} />
          <Route path="/reservations" component={Reservations} />
          <Route path="/z-report" component={ZReport} />
          <Route path="/food-orders-report" component={FoodOrdersReport} />
          <Route path="/booking-analytics" component={BookingAnalytics} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/new-enquiry" component={NewEnquiry} />
          <Route path="/billing" component={Billing} />
          <Route path="/pending-payments" component={PendingPayments} />
          <Route path="/leases" component={Leases} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/wallets" component={Wallets} />
          <Route path="/vendors" component={Vendors} />
          <Route path="/financials" component={Financials} />
          <Route path="/pnl-statement" component={PnLStatement} />
          <Route path="/addons" component={AddOnServices} />
          <Route path="/services-report" component={ServicesReport} />
          <Route path="/monthly-report" component={MonthlyReport} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/analytics-chat" component={AnalyticsChat} />
          <Route path="/salaries" component={Salaries} />
          <Route path="/attendance" component={Attendance} />
          <Route path="/performance" component={Performance} />
          <Route path="/travel-agents" component={TravelAgents} />
          <Route path="/channel-manager" component={ChannelManager} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/audit-logs" component={AuditLogs} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/users" component={UsersManagement} />
          <Route path="/whatsapp-alerts" component={WhatsappAlerts} />
          <Route path="/whatsapp-templates" component={WhatsAppTemplates} />
          <Route path="/settings" component={Settings} />
          <Route path="/feature-settings" component={FeatureSettings} />
        </>
      ) : (
        <Route path="/" component={Home} />
      )}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
  const { isAuthenticated, isLoading, verificationStatus, isDeactivated, pendingUser, message, isViewingAsUser, user } = useAuth();
  const [isReturningToAdmin, setIsReturningToAdmin] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [, setForceUpdate] = useState(0);
  const [, setLocation] = useLocation();

  // Register service worker and re-subscribe to push if already subscribed.
  // This runs once on login and keeps subscriptions alive across sessions.
  usePushNotifications(isAuthenticated);

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

  // Restaurant-only users (kitchen role, OR staff/manager with foodOrders
  // permission and nothing else) must not see the admin dashboard. We
  // bounce them to /restaurant whenever they hit / or /dashboard. No
  // sessionStorage one-shot — running every render is cheap and prevents
  // them from typing the URL back in to bypass the redirect.
  const { permissions: dashPerms } = usePermissions();
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    const path = window.location.pathname;
    if (path !== '/' && path !== '/dashboard') return;
    const role = (user as any).role;
    // Super-admin always sees the full dashboard.
    if (role === 'super-admin' || role === 'super_admin') return;
    // Kitchen role: hard redirect.
    if (role === 'kitchen') { setLocation('/restaurant'); return; }
    // Everyone else (admin / manager / staff) — check granular permissions.
    // If the only granted module is foodOrders/menuManagement, bounce them
    // to /restaurant. This catches property-scoped admins who were given
    // restaurant-only access.
    if (!dashPerms) return;
    const restaurantOnly =
      (dashPerms.foodOrders !== 'none' || dashPerms.menuManagement !== 'none') &&
      dashPerms.bookings === 'none' &&
      dashPerms.calendar === 'none' &&
      dashPerms.rooms === 'none' &&
      dashPerms.guests === 'none' &&
      dashPerms.payments === 'none' &&
      dashPerms.reports === 'none' &&
      dashPerms.staff === 'none' &&
      dashPerms.tasks === 'none' &&
      dashPerms.settings === 'none';
    if (restaurantOnly) setLocation('/restaurant');
  }, [isLoading, isAuthenticated, user, setLocation, dashPerms]);

  // Save intended URL when unauthenticated user hits a protected route,
  // then redirect to login so they land on the right page after signing in.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.removeItem('hostezee_role_redirect_done');
      const publicPaths = [
        '/', '/login', '/signup', '/register', '/forgot-password',
        '/verify-otp', '/reset-password', '/accept-invite', '/report-issue',
        '/menu', '/customer-menu', '/qr-codes',
        '/guest-self-checkin', '/guest/prebill',
        '/admin-portal', '/super-admin-login', '/super-admin',
        '/features', '/security', '/about', '/blog', '/contact',
        '/pricing', '/onboarding', '/faq', '/terms', '/privacy',
        '/contact-enquiries',
      ];
      const path = window.location.pathname;
      const isPublic = publicPaths.some(p => path === p || path.startsWith(p + '/'));
      if (!isPublic && path !== '/') {
        // Save full URL (including query string like ?order=63) for post-login redirect
        sessionStorage.setItem('hostezee_intended_url', window.location.pathname + window.location.search);
        setLocation('/login');
      }
    }
  }, [isLoading, isAuthenticated, setLocation]);

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

  // Show deactivated account screen
  if (isDeactivated && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Deactivated</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {message || "Your account has been deactivated by an administrator."}
            </p>
            <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-300 mb-2">Need Help?</h4>
              <p className="text-sm text-gray-700 dark:text-gray-400">
                Please contact your property administrator to reactivate your account.
              </p>
            </div>
            <button
              onClick={() => setLocation("/")}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  // Hide main sidebar on super admin pages (they have their own sidebar) and public pages
  // Use window.location.pathname instead of wouter location to get real-time updates
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isSuperAdminPage = currentPath.startsWith('/super-admin');
  const isPublicGuestPage = currentPath === '/menu' || currentPath === '/customer-menu' || 
    currentPath.startsWith('/guest-self-checkin') || currentPath.startsWith('/guest/prebill');

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

  // For public guest pages, render without sidebar/header
  if (isPublicGuestPage) {
    return (
      <>
        <Router showDashboard={showDashboard} />
        {children}
      </>
    );
  }

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
      <CompletionNotifications />
      <ReportIssueButton />
    </div>
  );
}
