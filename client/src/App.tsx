import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import Rooms from "@/pages/rooms";
import Bookings from "@/pages/bookings";
import Guests from "@/pages/guests";
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
import RoomCalendar from "@/pages/room-calendar";
import FoodOrdersReport from "@/pages/food-orders-report";
import MenuManagement from "@/pages/menu-management";
import BookingAnalytics from "@/pages/booking-analytics";
import QRCodes from "@/pages/qr-codes";

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
      <Route path="/qr-codes" component={QRCodes} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/properties" component={Properties} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/active-bookings" component={ActiveBookings} />
          <Route path="/room-calendar" component={RoomCalendar} />
          <Route path="/guests" component={Guests} />
          <Route path="/restaurant" component={Kitchen} />
          <Route path="/kitchen" component={Kitchen} />
          <Route path="/quick-order" component={QuickOrder} />
          <Route path="/menu-management" component={MenuManagement} />
          <Route path="/food-orders-report" component={FoodOrdersReport} />
          <Route path="/booking-analytics" component={BookingAnalytics} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/new-enquiry" component={NewEnquiry} />
          <Route path="/billing" component={Billing} />
          <Route path="/leases" component={Leases} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/financials" component={Financials} />
          <Route path="/addons" component={AddOnServices} />
          <Route path="/analytics" component={Analytics} />
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
          <SidebarProvider style={style}>
            <AuthWrapper>
              <Toaster />
            </AuthWrapper>
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          <Router />
        </main>
      </div>
      {children}
    </div>
  );
}
