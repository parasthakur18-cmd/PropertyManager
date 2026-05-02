import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface UserPermissions {
  userId: string;
  bookings: "none" | "view" | "edit";
  calendar: "none" | "view" | "edit";
  rooms: "none" | "view" | "edit";
  guests: "none" | "view" | "edit";
  foodOrders: "none" | "view" | "edit";
  menuManagement: "none" | "view" | "edit";
  payments: "none" | "view" | "edit";
  reports: "none" | "view" | "edit";
  settings: "none" | "view" | "edit";
  tasks: "none" | "view" | "edit";
  staff: "none" | "view" | "edit";
}

const PERMISSION_KEYS: Array<keyof Omit<UserPermissions, "userId">> = [
  "bookings", "calendar", "rooms", "guests", "foodOrders",
  "menuManagement", "payments", "reports", "settings", "tasks", "staff",
];

const fullAccessPermissions = (userId: string): UserPermissions => ({
  userId,
  bookings: "edit",
  calendar: "edit",
  rooms: "edit",
  guests: "edit",
  foodOrders: "edit",
  menuManagement: "edit",
  payments: "edit",
  reports: "edit",
  settings: "edit",
  tasks: "edit",
  staff: "edit",
});

const defaultPermissions: Omit<UserPermissions, "userId"> = {
  bookings: "none",
  calendar: "none",
  rooms: "none",
  guests: "none",
  foodOrders: "none",
  menuManagement: "none",
  payments: "none",
  reports: "none",
  settings: "none",
  tasks: "none",
  staff: "none",
};

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  // Fetch permissions for everyone except super-admin (who always has full access)
  const { data: permissions, isLoading } = useQuery<UserPermissions>({
    queryKey: ["/api/user-permissions"],
    enabled: isAuthenticated && !!user?.id && user?.role !== "super-admin",
  });

  // Super-admin: unconditional full access, never restricted
  if (user?.role === "super-admin") {
    const perms = fullAccessPermissions(user.id);
    return {
      permissions: perms,
      isLoading: false,
      isFullAccess: true,
      hasAccess: (_module: keyof Omit<UserPermissions, "userId">) => true,
      canEdit: (_module: keyof Omit<UserPermissions, "userId">) => true,
      canView: (_module: keyof Omit<UserPermissions, "userId">) => true,
    };
  }

  // Check whether granular permissions have been explicitly configured
  // (at least one non-"none" value = intentional restriction was set by an admin)
  const hasConfiguredPermissions = permissions
    ? PERMISSION_KEYS.some((k) => permissions[k] !== "none")
    : false;

  // Admin with NO configured permissions → full access (default behaviour)
  if (user?.role === "admin" && !hasConfiguredPermissions) {
    const perms = fullAccessPermissions(user?.id || "");
    return {
      permissions: perms,
      isLoading,
      isFullAccess: true,
      hasAccess: (_module: keyof Omit<UserPermissions, "userId">) => true,
      canEdit: (_module: keyof Omit<UserPermissions, "userId">) => true,
      canView: (_module: keyof Omit<UserPermissions, "userId">) => true,
    };
  }

  // Manager role always gets menu management access regardless of DB setting
  const managerOverrides = user?.role === "manager"
    ? { menuManagement: "edit" as const }
    : {};

  const effectivePermissions: UserPermissions = {
    ...(permissions || { userId: user?.id || "", ...defaultPermissions }),
    ...managerOverrides,
  };

  const hasAccess = (module: keyof Omit<UserPermissions, "userId">) =>
    effectivePermissions[module] !== "none";

  const canEdit = (module: keyof Omit<UserPermissions, "userId">) =>
    effectivePermissions[module] === "edit";

  const canView = (module: keyof Omit<UserPermissions, "userId">) =>
    effectivePermissions[module] === "view" || effectivePermissions[module] === "edit";

  return {
    permissions: effectivePermissions,
    isLoading,
    isFullAccess: false,
    hasAccess,
    canEdit,
    canView,
  };
}
