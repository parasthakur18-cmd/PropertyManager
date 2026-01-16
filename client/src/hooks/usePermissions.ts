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
  
  const { data: permissions, isLoading } = useQuery<UserPermissions>({
    queryKey: ["/api/user-permissions"],
    enabled: isAuthenticated && !!user?.id && user?.role !== "admin" && user?.role !== "super-admin",
  });

  // Admin and super-admin have full access to everything
  if (user?.role === "admin" || user?.role === "super-admin") {
    return {
      permissions: {
        userId: user.id,
        bookings: "edit" as const,
        calendar: "edit" as const,
        rooms: "edit" as const,
        guests: "edit" as const,
        foodOrders: "edit" as const,
        menuManagement: "edit" as const,
        payments: "edit" as const,
        reports: "edit" as const,
        settings: "edit" as const,
        tasks: "edit" as const,
        staff: "edit" as const,
      },
      isLoading: false,
      hasAccess: (module: keyof Omit<UserPermissions, "userId">) => true,
      canEdit: (module: keyof Omit<UserPermissions, "userId">) => true,
      canView: (module: keyof Omit<UserPermissions, "userId">) => true,
    };
  }

  const effectivePermissions = permissions || { userId: user?.id || "", ...defaultPermissions };

  const hasAccess = (module: keyof Omit<UserPermissions, "userId">) => {
    return effectivePermissions[module] !== "none";
  };

  const canEdit = (module: keyof Omit<UserPermissions, "userId">) => {
    return effectivePermissions[module] === "edit";
  };

  const canView = (module: keyof Omit<UserPermissions, "userId">) => {
    return effectivePermissions[module] === "view" || effectivePermissions[module] === "edit";
  };

  return {
    permissions: effectivePermissions,
    isLoading,
    hasAccess,
    canEdit,
    canView,
  };
}
