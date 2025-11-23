import {
  Building2,
  Home,
  Hotel,
  Calendar,
  Users,
  MessageSquare,
  Briefcase,
  UtensilsCrossed,
  ChefHat,
  Phone,
  Receipt,
  IndianRupee,
  FileText,
  TrendingUp,
  BarChart3,
  Plus,
  UserCog,
  QrCode,
  Settings,
  Shield,
  Clock,
  DollarSign,
  ClipboardCheck,
  CalendarDays,
  FileBarChart,
  MenuSquare,
  LogOut,
  BookOpen,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const adminMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Rooms", url: "/rooms", icon: Hotel },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Active Bookings", url: "/active-bookings", icon: ClipboardCheck },
  { title: "Room Calendar", url: "/room-calendar", icon: CalendarDays },
  { title: "Guests", url: "/guests", icon: Users },
  { title: "Enquiries", url: "/enquiries", icon: MessageSquare },
  { title: "Contact Leads", url: "/contact-enquiries", icon: Plus },
  { title: "Travel Agents", url: "/travel-agents", icon: Briefcase },
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat },
  { title: "Quick Order", url: "/quick-order", icon: Phone },
  { title: "Menu Management", url: "/enhanced-menu", icon: MenuSquare },
  { title: "Food Orders Report", url: "/food-orders-report", icon: FileBarChart },
  { title: "Booking Analytics", url: "/booking-analytics", icon: BarChart3 },
  { title: "Add-ons", url: "/addons", icon: Plus },
  { title: "Users", url: "/users", icon: UserCog },
  { title: "QR Codes", url: "/qr-codes", icon: QrCode },
];

const financeMenuItems = [
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "Leases", url: "/leases", icon: IndianRupee },
  { title: "Expenses", url: "/expenses", icon: FileText },
  { title: "Financials", url: "/financials", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Salaries", url: "/salaries", icon: DollarSign },
];

export function SuperAdminSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold font-serif text-slate-900 dark:text-white">Hostezee</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Super Admin</p>
      </div>

      {/* Admin Features Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Admin Operations */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Admin Features</h3>
          <div className="space-y-1">
            {adminMenuItems.map((item) => {
              const isActive = location === item.url;
              return (
                <button
                  key={item.title}
                  onClick={() => window.location.href = item.url}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                    isActive
                      ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Finance Operations */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Finance</h3>
          <div className="space-y-1">
            {financeMenuItems.map((item) => {
              const isActive = location === item.url;
              return (
                <button
                  key={item.title}
                  onClick={() => window.location.href = item.url}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                    isActive
                      ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* System */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">System</h3>
          <div className="space-y-1">
            <button
              onClick={() => window.location.href = "/settings"}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                location === "/settings"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer - User Info & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Super Admin</p>
          </div>
        </div>
        <a
          href="/api/logout"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </a>
      </div>
    </div>
  );
}
