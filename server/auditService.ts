import { db } from "./db";
import { auditLog, type InsertAuditLog, type User } from "@shared/schema";
import { eventBus } from "./eventBus";

export interface AuditContext {
  entityType: string;
  entityId: string;
  action: string;
  user: User;
  changeSet?: {
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>;
}

export class AuditService {
  private static async logAudit(context: AuditContext): Promise<void> {
    const auditEntry: InsertAuditLog = {
      entityType: context.entityType,
      entityId: context.entityId,
      action: context.action,
      userId: context.user.id,
      userRole: context.user.role,
      propertyContext: context.user.assignedPropertyIds || null,
      changeSet: context.changeSet || null,
      metadata: context.metadata || null,
    };

    await db.insert(auditLog).values(auditEntry);

    eventBus.publish({
      type: 'audit_log',
      userId: context.user.id.toString(),
      propertyId: context.user.assignedPropertyIds?.[0] ? Number(context.user.assignedPropertyIds[0]) : undefined,
      data: {
        ...auditEntry,
        entityType: context.entityType,
        entityId: context.entityId,
        action: context.action,
      },
      metadata: {
        predicates: [
          `entity:${context.entityType}`,
          `entity:${context.entityType}:${context.entityId}`,
          `user:${context.user.id}`,
          `action:${context.action}`,
        ],
      },
    });
  }

  static async logCreate(
    entityType: string,
    entityId: string,
    user: User,
    afterData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAudit({
      entityType,
      entityId,
      action: 'create',
      user,
      changeSet: { after: afterData },
      metadata,
    });
  }

  static async logUpdate(
    entityType: string,
    entityId: string,
    user: User,
    beforeData: any,
    afterData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAudit({
      entityType,
      entityId,
      action: 'update',
      user,
      changeSet: { before: beforeData, after: afterData },
      metadata,
    });
  }

  static async logDelete(
    entityType: string,
    entityId: string,
    user: User,
    beforeData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAudit({
      entityType,
      entityId,
      action: 'delete',
      user,
      changeSet: { before: beforeData },
      metadata,
    });
  }

  static async logCustomAction(
    entityType: string,
    entityId: string,
    action: string,
    user: User,
    changeSet?: { before?: any; after?: any },
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAudit({
      entityType,
      entityId,
      action,
      user,
      changeSet,
      metadata,
    });
  }
}
