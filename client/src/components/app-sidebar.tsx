import { useEffect } from "react";
import hostezeeLogo from "@assets/hostezee_logo_transparent_1773119386285.png";
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
  MessageSquare,
  IndianRupee,
  FileText,
  TrendingUp,
  Plus,
  UserCog,
  ClipboardCheck,
  FileBarChart,
  MenuSquare,
  LogOut,
  QrCode,
  DollarSign,
  Briefcase,
  Search,
  Shield,
  Clock,
  Settings2,
  Globe,
  Bell,
  Store,
  ListTodo,
  Wallet,
  ArrowUpDown,
  Package,
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// ── ADMIN menus ──────────────────────────────────────────────────────────────

const adminMainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

const adminBookingItems = [
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Booking Analytics", url: "/booking-analytics", icon: BarChart3 },
];

const adminRoomItems = [
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Add-ons", url: "/addons", icon: Plus },
];

const adminGuestItems = [
  { title: "Guests", url: "/guests", icon: Users },
];

const adminRestaurantItems = [
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
];

const adminFinanceItems = [
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Leases", url: "/leases", icon: ClipboardCheck },
  { title: "Expenses", url: "/expenses", icon: FileText },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Wallets", url: "/wallets", icon: Wallet },
  { title: "Financials", url: "/financials", icon: TrendingUp },
  { title: "Monthly Income Report", url: "/monthly-report", icon: CalendarDays },
  { title: "Services Report", url: "/services-report", icon: Package },
  { title: "P&L Statement", url: "/pnl-statement", icon: FileText },
];

const adminStaffItems = [
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Salaries", url: "/salaries", icon: DollarSign },
];

const adminAnalyticsItems = [
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

const adminAdminItems = [
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Travel Agents", url: "/travel-agents", icon: Briefcase },
  { title: "OTA Integrations", url: "/ota-integrations", icon: Globe },
  { title: "Channel Manager", url: "/channel-manager", icon: ArrowUpDown },
  { title: "Users", url: "/users", icon: UserCog },
  { title: "Audit Trail", url: "/audit-logs", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Feature Settings", url: "/feature-settings", icon: Settings2 },
];

// ── KITCHEN menu ─────────────────────────────────────────────────────────────

const kitchenMenuItems = [
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
];

// ── SUPER-ADMIN menu ──────────────────────────────────────────────────────────

const superAdminMenuItems = [
  { title: "System Dashboard", url: "/super-admin", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

// ── Sidebar component ─────────────────────────────────────────────────────────

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { hasAccess } = usePermissions();

  const getMenuConfig = () => {
    if (user?.role === "admin" || user?.role === "super-admin") {
      return {
        mainItems: adminMainItems,
        bookingItems: adminBookingItems,
        roomItems: adminRoomItems,
        guestItems: adminGuestItems,
        restaurantItems: adminRestaurantItems,
        financeItems: adminFinanceItems,
        staffItems: adminStaffItems,
        analyticsItems: adminAnalyticsItems,
        adminItems: adminAdminItems,
      };
    }

    if (user?.role === "kitchen") {
      return {
        mainItems: [],
        bookingItems: [],
        roomItems: [],
        guestItems: [],
        restaurantItems: kitchenMenuItems,
        financeItems: [],
        staffItems: [],
        analyticsItems: [],
        adminItems: [],
      };
    }

    // Staff / manager — permission-filtered
    const mainItems = [
      { title: "Dashboard", url: "/", icon: Home },
      ...(hasAccess("tasks") ? [{ title: "Tasks", url: "/tasks", icon: ListTodo }] : []),
      { title: "Notifications", url: "/notifications", icon: Bell },
    ];

    const bookingItems = hasAccess("bookings")
      ? [
          { title: "Bookings", url: "/bookings", icon: Calendar },
          { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
          ...(hasAccess("calendar") ? [{ title: "Room Calendar", url: "/calendar", icon: CalendarDays }] : []),
        ]
      : [];

    const roomItems = hasAccess("rooms")
      ? [
          { title: "Rooms", url: "/rooms", icon: Hotel },
          { title: "QR Codes", url: "/qr-codes", icon: QrCode },
          { title: "Add-ons", url: "/addons", icon: Plus },
        ]
      : [];

    const guestItems = hasAccess("guests") ? [{ title: "Guests", url: "/guests", icon: Users }] : [];

    const restaurantItems = [
      ...(hasAccess("foodOrders")
        ? [
            { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
            { title: "Kitchen", url: "/kitchen", icon: ChefHat },
            { title: "Quick Order", url: "/quick-order", icon: Phone },
            { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
          ]
        : []),
      ...(hasAccess("menuManagement") ? [{ title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare }] : []),
    ];

    const financeItems = hasAccess("payments")
      ? [
          { title: "Billing", url: "/billing", icon: Receipt },
          ...(user?.role === "manager" ? [{ title: "Vendors", url: "/vendors", icon: Store }] : []),
          ...(hasAccess("reports")
            ? [
                { title: "Monthly Income Report", url: "/monthly-report", icon: CalendarDays },
                { title: "Services Report", url: "/services-report", icon: Package },
                { title: "P&L Statement", url: "/pnl-statement", icon: FileText },
              ]
            : []),
        ]
      : [];

    const staffItems = user?.role === "manager"
      ? [{ title: "Attendance", url: "/attendance", icon: Clock }]
      : [];

    const adminItems = [
      ...(hasAccess("staff") ? [{ title: "Users", url: "/users", icon: UserCog }] : []),
      ...(hasAccess("settings") ? [{ title: "Settings", url: "/settings", icon: Settings }] : []),
    ];

    return {
      mainItems,
      bookingItems,
      roomItems,
      guestItems,
      restaurantItems,
      financeItems,
      staffItems,
      analyticsItems: [],
      adminItems,
    };
  };

  const menuConfig = getMenuConfig();

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderSection = (
    label: string,
    items: { title: string; url: string; icon: any }[],
    defaultOpen = false,
  ) => {
    if (!items.length) return null;
    return (
      <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              {label}
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(item => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link
                          href={item.url}
                          data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
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
    );
  };

  const isNotKitchenOrSuper = user?.role !== "kitchen" && user?.role !== "super-admin";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={hostezeeLogo} alt="Hostezee" className="h-9 w-auto object-contain" data-testid="img-logo-sidebar" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Super Admin */}
        {user?.role === "super-admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>System Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminMenuItems.map(item => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`} onClick={handleNavClick}>
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

        {/* 1. Main */}
        {isNotKitchenOrSuper && menuConfig.mainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuConfig.mainItems.map(item => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={isActive}>
                        <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`} onClick={handleNavClick}>
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

        {/* 2. Bookings */}
        {isNotKitchenOrSuper && renderSection("Bookings", menuConfig.bookingItems, true)}

        {/* 3. Rooms & Inventory */}
        {isNotKitchenOrSuper && renderSection("Rooms & Inventory", menuConfig.roomItems, true)}

        {/* 4. Guest Management */}
        {isNotKitchenOrSuper && renderSection("Guest Management", menuConfig.guestItems, true)}

        {/* 5. Restaurant */}
        {renderSection("Restaurant", menuConfig.restaurantItems, user?.role === "kitchen")}

        {/* 6. Finance */}
        {isNotKitchenOrSuper && renderSection("Finance", menuConfig.financeItems)}

        {/* 7. Staff / HR */}
        {isNotKitchenOrSuper && renderSection("Staff / HR", menuConfig.staffItems)}

        {/* 8. Analytics */}
        {isNotKitchenOrSuper && renderSection("Analytics", menuConfig.analyticsItems)}

        {/* 9. Admin / Control */}
        {isNotKitchenOrSuper && renderSection("Admin / Control", menuConfig.adminItems)}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">{user?.role}</p>
            </div>
          </div>
          <Link href="/api/logout" data-testid="link-logout">
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
