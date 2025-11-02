import { db } from "./db";
import { auditLog, type InsertAuditLog, type User } from "@shared/schema";
import { emitDomainEvent } from "./eventBus";

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

    emitDomainEvent({
      type: 'audit_log',
      predicates: [
        `entity:${context.entityType}`,
        `entity:${context.entityType}:${context.entityId}`,
        `user:${context.user.id}`,
        `action:${context.action}`,
      ],
      data: {
        ...auditEntry,
        timestamp: new Date().toISOString(),
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
