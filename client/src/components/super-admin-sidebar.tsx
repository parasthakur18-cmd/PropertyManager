import {
  Building2,
  Home,
  Users,
  AlertCircle,
  Settings,
  Shield,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

// Super Admin only sees system-level features, not property operations
const systemMenuItems = [
  { title: "Dashboard", tab: "users", icon: Home },
  { title: "All Properties", tab: "properties", icon: Building2 },
  { title: "All Users", tab: "users", icon: Users },
  { title: "Contact Leads", tab: "enquiries", icon: MessageSquare },
  { title: "Issue Reports", tab: "reports", icon: AlertCircle },
];

export function SuperAdminSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  // Get current active tab from URL
  const currentTab = new URLSearchParams(window.location.search).get('tab') || 'users';

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

      {/* System Management Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* System Operations - Only super admin level features */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">System Management</h3>
          <div className="space-y-1">
            {systemMenuItems.map((item) => {
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.title}
                  onClick={() => setLocation(`/super-admin?tab=${item.tab}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                    isActive
                      ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  data-testid={`button-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="mx-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-900 dark:text-blue-300">
            <span className="font-semibold">Super Admin:</span> Manage all properties and users. Each property admin handles their own operations.
          </p>
        </div>

        {/* Settings */}
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Configuration</h3>
          <div className="space-y-1">
            <Link
              href="/settings"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left block ${
                location === "/settings"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
              data-testid="button-nav-settings"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
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
