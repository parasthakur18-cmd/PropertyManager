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
  LogOut,
  QrCode,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const adminMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Guests", url: "/guests", icon: Users },
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/menu-management", icon: BookOpen },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
  { title: "Booking Analytics", url: "/booking-analytics", icon: BarChart3 },
  { title: "Add-ons", url: "/addons", icon: Plus },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Leases", url: "/leases", icon: IndianRupee },
  { title: "Expenses", url: "/expenses", icon: FileText },
  { title: "Financials", url: "/financials", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Users", url: "/users", icon: UserCog },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Settings", url: "/settings", icon: Settings },
];

const managerMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/menu-management", icon: BookOpen },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
  { title: "Add-ons", url: "/addons", icon: Plus },
  { title: "Expenses", url: "/expenses", icon: FileText },
];

const staffMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/menu-management", icon: BookOpen },
];

const kitchenMenuItems = [
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { setOpen, isMobile } = useSidebar();

  const menuItems =
    user?.role === "admin"
      ? adminMenuItems
      : user?.role === "manager"
      ? managerMenuItems
      : user?.role === "kitchen"
      ? kitchenMenuItems
      : staffMenuItems;

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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
