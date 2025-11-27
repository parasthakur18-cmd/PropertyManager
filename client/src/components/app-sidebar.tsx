import { useEffect } from "react";
import {
  Building2,
  Home,
  Hotel,
  Calendar,
  CalendarDays,
  Users,
  UtensilsCrossed,
  Receipt,
  BarChart3,
  Settings,
  ChefHat,
  Phone,
  MessageSquarePlus,
  MessageSquare,
  IndianRupee,
  FileText,
  TrendingUp,
  Plus,
  UserCog,
  ClipboardCheck,
  FileBarChart,
  BookOpen,
  MenuSquare,
  LogOut,
  QrCode,
  DollarSign,
  Briefcase,
  ClockAlert,
  Search,
  Shield,
  Clock,
  HelpCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
  SidebarGroupAction,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// Admin menu items grouped by category
const adminMainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Properties", url: "/properties", icon: Building2 },
];

const adminBookingItems = [
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Booking Analytics", url: "/booking-analytics", icon: BarChart3 },
];

const adminRoomItems = [
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Add-ons", url: "/addons", icon: Plus },
];

const adminRestaurantItems = [
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
];

const adminAdminItems = [
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Travel Agents", url: "/travel-agents", icon: Briefcase },
  { title: "Users", url: "/users", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminFinanceItems = [
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Leases", url: "/leases", icon: IndianRupee },
  { title: "Expenses", url: "/expenses", icon: FileText },
  { title: "Financials", url: "/financials", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Salaries", url: "/salaries", icon: DollarSign },
];

// Manager menu items grouped by category
const managerMainItems = [
  { title: "Dashboard", url: "/", icon: Home },
];

const managerBookingItems = [
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
];

const managerRoomItems = [
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Add-ons", url: "/addons", icon: Plus },
];

const managerRestaurantItems = [
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
];

const managerAdminItems = [
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Travel Agents", url: "/travel-agents", icon: Briefcase },
];

const managerFinanceItems = [
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Expenses", url: "/expenses", icon: FileText },
];

// Staff menu items
const staffMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare },
];

// Kitchen staff menu items
const kitchenMenuItems = [
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
];

// Super admin menu items
const superAdminMenuItems = [
  { title: "System Dashboard", url: "/super-admin", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Get menu items based on role
  const getMenuConfig = () => {
    if (user?.role === "admin") {
      return {
        mainItems: adminMainItems,
        bookingItems: adminBookingItems,
        roomItems: adminRoomItems,
        restaurantItems: adminRestaurantItems,
        adminItems: adminAdminItems,
        financeItems: adminFinanceItems,
      };
    } else if (user?.role === "manager") {
      return {
        mainItems: managerMainItems,
        bookingItems: managerBookingItems,
        roomItems: managerRoomItems,
        restaurantItems: managerRestaurantItems,
        adminItems: managerAdminItems,
        financeItems: managerFinanceItems,
      };
    } else if (user?.role === "kitchen") {
      return {
        mainItems: [],
        bookingItems: [],
        roomItems: [],
        restaurantItems: kitchenMenuItems,
        adminItems: [],
        financeItems: [],
      };
    } else {
      // Staff
      return {
        mainItems: staffMenuItems,
        bookingItems: [],
        roomItems: [],
        restaurantItems: [],
        adminItems: [],
        financeItems: [],
      };
    }
  };

  const menuConfig = getMenuConfig();

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const handleNavClick = () => {
    // Close sidebar on navigation (especially useful on mobile/tablet)
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold font-serif">Hostezee</h2>
            <p className="text-xs text-muted-foreground">Property Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Super Admin Section */}
        {user?.role === "super-admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>System Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminMenuItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link 
                          href={item.url} 
                          data-testid={`link-${item.title.toLowerCase()}`}
                          onClick={handleNavClick}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Section */}
        {user?.role !== "kitchen" && user?.role !== "super-admin" && menuConfig.mainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuConfig.mainItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link 
                          href={item.url} 
                          data-testid={`link-${item.title.toLowerCase()}`}
                          onClick={handleNavClick}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Bookings Section */}
        {user?.role !== "kitchen" && user?.role !== "super-admin" && menuConfig.bookingItems.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Bookings
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuConfig.bookingItems.map((item) => {
                      const isActive = location === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link 
                              href={item.url} 
                              data-testid={`link-${item.title.toLowerCase()}`}
                              onClick={handleNavClick}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Rooms Section */}
        {user?.role !== "kitchen" && user?.role !== "super-admin" && menuConfig.roomItems.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Rooms
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuConfig.roomItems.map((item) => {
                      const isActive = location === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link 
                              href={item.url} 
                              data-testid={`link-${item.title.toLowerCase()}`}
                              onClick={handleNavClick}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Restaurant Section */}
        {menuConfig.restaurantItems.length > 0 && (
          <Collapsible defaultOpen={user?.role === "kitchen"} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Restaurant
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuConfig.restaurantItems.map((item) => {
                      const isActive = location === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link 
                              href={item.url} 
                              data-testid={`link-${item.title.toLowerCase()}`}
                              onClick={handleNavClick}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Admin Section */}
        {user?.role !== "kitchen" && user?.role !== "super-admin" && menuConfig.adminItems.length > 0 && (
          <Collapsible className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Admin
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuConfig.adminItems.map((item) => {
                      const isActive = location === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link 
                              href={item.url} 
                              data-testid={`link-${item.title.toLowerCase()}`}
                              onClick={handleNavClick}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Accounts & Finance Section */}
        {menuConfig.financeItems.length > 0 && (
          <Collapsible className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Accounts & Finance
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuConfig.financeItems.map((item) => {
                      const isActive = location === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild data-active={isActive}>
                            <Link 
                              href={item.url} 
                              data-testid={`link-${item.title.toLowerCase()}`}
                              onClick={handleNavClick}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role || "Staff"}</p>
              {(user as any)?.assignedPropertyName && (
                <p className="text-xs text-muted-foreground truncate" title={(user as any).assignedPropertyName}>
                  📍 {(user as any).assignedPropertyName}
                </p>
              )}
            </div>
          </div>
          <a
            href="/api/logout"
            className="flex items-center justify-center h-8 w-8 rounded-md hover-elevate active-elevate-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
