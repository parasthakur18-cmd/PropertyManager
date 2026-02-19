import { User } from "@shared/schema";

export interface TenantContext {
  userId: string;
  role: string;
  assignedPropertyIds: number[];
  isSuperAdmin: boolean;
  hasUnlimitedAccess: boolean;
  verificationStatus: string;
}

function parsePropertyIds(ids: string[] | number[] | null | undefined): number[] {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
  return ids.map((id: string | number) => typeof id === "number" ? id : parseInt(String(id), 10)).filter(id => !isNaN(id));
}

export function getTenantContext(user: User): TenantContext {
  const isSuperAdmin = user.role === "super-admin";
  
  return {
    userId: user.id,
    role: user.role,
    assignedPropertyIds: parsePropertyIds(user.assignedPropertyIds),
    isSuperAdmin,
    hasUnlimitedAccess: isSuperAdmin,
    verificationStatus: user.verificationStatus || "pending",
  };
}

export function canAccessProperty(tenant: TenantContext, propertyId: number): boolean {
  if (tenant.hasUnlimitedAccess) {
    return true;
  }
  
  if (tenant.assignedPropertyIds.length === 0) {
    return false;
  }
  
  return tenant.assignedPropertyIds.includes(propertyId);
}

export function filterByPropertyAccess<T extends { propertyId: number }>(
  tenant: TenantContext,
  items: T[]
): T[] {
  if (tenant.hasUnlimitedAccess) {
    return items;
  }
  
  if (tenant.assignedPropertyIds.length === 0) {
    return [];
  }
  
  return items.filter(item => tenant.assignedPropertyIds.includes(item.propertyId));
}

export function filterPropertiesByAccess<T extends { id: number }>(
  tenant: TenantContext,
  properties: T[]
): T[] {
  if (tenant.hasUnlimitedAccess) {
    return properties;
  }
  
  if (tenant.assignedPropertyIds.length === 0) {
    return [];
  }
  
  return properties.filter(property => tenant.assignedPropertyIds.includes(property.id));
}

export function requirePropertyAccess(tenant: TenantContext, propertyId: number): void {
  if (!canAccessProperty(tenant, propertyId)) {
    throw new TenantAccessError(
      "You do not have access to this property",
      tenant.userId,
      propertyId
    );
  }
}

export function requireVerifiedUser(tenant: TenantContext): void {
  if (tenant.verificationStatus !== "verified" && !tenant.isSuperAdmin) {
    throw new TenantAccessError(
      "Your account is pending verification",
      tenant.userId,
      null
    );
  }
}

export class TenantAccessError extends Error {
  public readonly userId: string;
  public readonly propertyId: number | null;
  public readonly statusCode: number = 403;
  
  constructor(message: string, userId: string, propertyId: number | null) {
    super(message);
    this.name = "TenantAccessError";
    this.userId = userId;
    this.propertyId = propertyId;
  }
}

export function getAccessiblePropertyIds(tenant: TenantContext): number[] | "all" {
  if (tenant.hasUnlimitedAccess) {
    return "all";
  }
  
  return tenant.assignedPropertyIds;
}
