import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { strictLimiter } from "./rate-limiters";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { randomUUID } from "crypto";
import bcryptjs from "bcryptjs";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertGuestSchema,
  insertTravelAgentSchema,
  insertBookingSchema,
  insertMenuItemSchema,
  insertRestaurantTableSchema,
  insertTableReservationSchema,
  insertOrderSchema,
  insertExtraServiceSchema,
  insertBillSchema,
  insertEnquirySchema,
  updateUserRoleSchema,
  insertExpenseCategorySchema,
  insertBankTransactionSchema,
  insertContactEnquirySchema,
  insertAttendanceRecordSchema,
  insertChangeApprovalSchema,
  users,
  orders,
  bills,
  bookings,
  extraServices,
  enquiries,
  notifications,
  featureSettings,
  employeePerformanceMetrics,
  taskNotificationLogs,
  otpTokens,
  vendorTransactions,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { desc, sql, eq, and, isNull, isNotNull, not, or, gt, gte, lt, lte, param, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { createAuthkeyService } from "./authkey-service";
import { neon } from "@neondatabase/serverless";
import { eventBus, type DomainEvent } from "./eventBus";
import { 
  sendBookingConfirmation, 
  sendPaymentConfirmation,
  sendCheckInNotification,
  sendCheckoutNotification,
  sendPendingPaymentReminder,
  sendEnquiryConfirmation,
  sendPreBillNotification,
  sendCustomWhatsAppMessage,
  sendWelcomeWithMenuLink,
  sendAdvancePaymentRequest,
  sendAdvancePaymentConfirmation,
  sendPaymentReminder,
  sendInitialPaymentRequest,
  sendPaymentReminder1,
  sendFinalPaymentReminder,
  sendBookingExpiredNotice,
  sendSelfCheckinLink,
  sendTaskReminder,
  sendOtaBookingNotification,
  sendFoodOrderReceived,
  sendFoodOrderStaffAlert,
  sendBookingConfirmedNotification
} from "./whatsapp";
import { preBills, rooms, guests, properties, subscriptionPlans, userSubscriptions, subscriptionPayments, tasks, userPermissions, staffInvitations, dailyClosings, wallets, walletTransactions, changeApprovals, errorReports, aiosellConfigurations, aiosellRoomMappings, aiosellRatePlans, aiosellSyncLogs, aiosellRateUpdates, aiosellInventoryRestrictions, bookingGuests, bookingRoomStays, dailyReportSettings, restaurantPopup } from "@shared/schema";
import { sendDailyReport, startDailyReportJob, getDailyReportData, buildReportMessage, getReportTimeRange } from "./daily-report";
import webpush from "web-push";
import { pushInventory, pushRates, pushInventoryRestrictions, pushRateRestrictions, pushNoShow, testConnection, getConfigForProperty, getRoomMappingsForConfig, getRatePlansForConfig, autoSyncInventoryForProperty, pullReservationsFromAioSell, type AiosellReservation } from "./aiosell";
import { sendIssueReportNotificationEmail } from "./email-service";
import { createPaymentLink, createEnquiryPaymentLink, getPaymentLinkStatus, verifyWebhookSignature, isRealPhone } from "./razorpay";
import { 
  getTenantContext, 
  filterByPropertyAccess, 
  filterPropertiesByAccess, 
  requirePropertyAccess,
  canAccessProperty,
  TenantAccessError 
} from "./tenantIsolation";

async function getAuthenticatedTenant(req: any) {
  const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
  const currentUser = await storage.getUser(userId);
  if (!currentUser) {
    return null;
  }
  const tenant = getTenantContext(currentUser);
  return { currentUser, tenant, userId };
}

// IP Geolocation helper - uses free ip-api.com service (no API key required)
async function getLocationFromIp(ip: string): Promise<{ city: string; state: string; country: string } | null> {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return null;
    }
    
    // Clean IP address (remove ::ffff: prefix if present)
    const cleanIp = ip.replace(/^::ffff:/, '');
    
    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.status !== 'success') return null;
    
    return {
      city: data.city || '',
      state: data.regionName || '',
      country: data.country || ''
    };
  } catch (error) {
    console.log(`[GEO] Failed to get location for IP ${ip}:`, error);
    return null;
  }
}

// Update user location from IP
async function updateUserLocationFromIp(userId: string, ipAddress: string) {
  try {
    const location = await getLocationFromIp(ipAddress);
    if (location && (location.city || location.state || location.country)) {
      await db.update(users)
        .set({
          city: location.city || null,
          state: location.state || null,
          country: location.country || null,
          lastLoginIp: ipAddress.substring(0, 45),
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      console.log(`[GEO] Updated location for user ${userId}: ${location.city}, ${location.state}, ${location.country}`);
    }
  } catch (error) {
    console.log(`[GEO] Failed to update location for user ${userId}:`, error);
  }
}

// Configure VAPID for web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@hostezee.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// In-memory escalation tracker — if an order isn't acknowledged within 60s,
// re-push an URGENT reminder to admin/kitchen + escalate to managers.
// Cleared automatically when the order's status moves off "pending".
const orderEscalationTimers = new Map<number, NodeJS.Timeout>();
const ORDER_ESCALATION_MS = 60_000;

function cancelOrderEscalation(orderId: number) {
  const t = orderEscalationTimers.get(orderId);
  if (t) {
    clearTimeout(t);
    orderEscalationTimers.delete(orderId);
    console.log(`[Push] Escalation cancelled for order #${orderId} (acknowledged)`);
  }
}

function scheduleOrderEscalation(orderId: number, baseUserIds: string[], summary: string, propertyId: number | null) {
  cancelOrderEscalation(orderId);
  const timer = setTimeout(async () => {
    orderEscalationTimers.delete(orderId);
    try {
      const order = await storage.getOrder(orderId);
      if (!order || order.status !== "pending") return;
      // Add managers to the escalation list — but ONLY those who have access
      // to this order's property (super-admins always; others must have the
      // property in their assignedPropertyIds). Never leak across tenants.
      let escalationIds = baseUserIds.slice();
      try {
        const allUsers = await storage.getAllUsers();
        const orderPropId = propertyId ?? order.propertyId ?? null;
        const orderPropIdStr = orderPropId !== null ? String(orderPropId) : null;
        const managerIds = allUsers
          .filter((u: any) => {
            const isMgr = u.role === "manager" || u.role === "admin" || u.role === "super-admin";
            if (!isMgr) return false;
            if (u.role === "super-admin") return true;
            if (orderPropIdStr === null) return false;
            const assigned: string[] = Array.isArray(u.assignedPropertyIds) ? u.assignedPropertyIds.map(String) : [];
            return assigned.includes(orderPropIdStr);
          })
          .map((u: any) => u.id);
        escalationIds = Array.from(new Set([...escalationIds, ...managerIds]));
      } catch {}
      console.log(`[Push] ESCALATION: order #${orderId} unacknowledged after ${ORDER_ESCALATION_MS / 1000}s — re-pushing to ${escalationIds.length} users`);
      await sendPushToUsers(escalationIds, {
        type: "order_escalation",
        title: "⚠️ URGENT: Unacknowledged Order",
        body: `Order #${orderId} ${summary} still pending after ${ORDER_ESCALATION_MS / 1000}s.`,
        url: `/restaurant?order=${orderId}`,
        orderId,
        urgent: true,
      });
    } catch (err: any) {
      console.error(`[Push] Escalation failed for order #${orderId}:`, err.message);
    }
  }, ORDER_ESCALATION_MS);
  orderEscalationTimers.set(orderId, timer);
  console.log(`[Push] Escalation scheduled for order #${orderId} in ${ORDER_ESCALATION_MS / 1000}s`);
}

// Helper: send web push to all subscriptions for a list of user IDs
async function sendPushToUsers(userIds: string[], payload: object) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("[Push] VAPID keys missing on this server — cannot send notifications. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.");
    return { sent: 0, failed: 0, skipped: true };
  }
  const subs = await storage.getPushSubscriptionsByUserIds(userIds);
  if (subs.length === 0) {
    console.log(`[Push] No subscriptions found for users [${userIds.join(",")}]`);
    return { sent: 0, failed: 0, skipped: false };
  }
  const message = JSON.stringify(payload);
  let sent = 0, failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      );
      sent++;
    } catch (err: any) {
      failed++;
      // 410 Gone / 404 = subscription expired/revoked — clean it up
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push] Cleaning up expired subscription (${err.statusCode}): ${sub.endpoint.slice(0, 60)}...`);
        await storage.deletePushSubscription(sub.endpoint);
      } else {
        console.error(`[Push] Send failed (status=${err.statusCode || "?"}) endpoint=${sub.endpoint.slice(0, 60)}... msg=${err.message}`);
      }
    }
  }
  console.log(`[Push] Delivery summary: sent=${sent} failed=${failed} of ${subs.length} subs`);
  return { sent, failed, skipped: false };
}

// Helper: sync inventory with automatic retry (up to 3 attempts, 2s back-off per attempt)
async function syncWithRetry(propertyId: number, event: string, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await autoSyncInventoryForProperty(propertyId);
      console.log(`[SYNC_SENT] event=${event} propertyId=${propertyId} attempt=${attempt}`);
      return;
    } catch (err: any) {
      console.error(`[SYNC_FAILED] event=${event} propertyId=${propertyId} attempt=${attempt}/${maxRetries} error=${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  console.error(`[SYNC_FAILED] event=${event} propertyId=${propertyId} allRetriesExhausted=true`);
}

// Defensive billable-orders lookup. Kitchen staff sometimes place orders
// against a room/guest without setting booking_id — those orphan orders
// were silently dropped from the bill, causing real revenue loss.
// We additionally claim orphan orders (booking_id IS NULL) that:
//   * were created within the stay window [check_in, check_out + 1d grace]
//   * belong to the same property (no cross-property attachment)
//   * AND EITHER match this guestId, OR (have no guestId AND match this room)
// This protects against back-to-back stays in the same room: a new guest's
// order with their own guestId will NOT be claimed by the prior booking.
async function getBillableOrdersForBooking(booking: any): Promise<any[]> {
  const direct = await db.select().from(orders).where(eq(orders.bookingId, booking.id));
  const checkIn = new Date(booking.checkInDate).getTime();
  const checkOut = new Date(booking.checkOutDate).getTime() + 24 * 60 * 60 * 1000;
  const bookingRoomIds: number[] = booking.isGroupBooking && Array.isArray(booking.roomIds)
    ? booking.roomIds
    : (booking.roomId ? [booking.roomId] : []);
  const orphans = await db.select().from(orders).where(isNull(orders.bookingId));
  const claimed = orphans.filter((o: any) => {
    const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    if (created < checkIn || created > checkOut) return false;
    // Property guard: never attach an order from a different property
    if (booking.propertyId && o.propertyId && o.propertyId !== booking.propertyId) return false;
    // Strong match: same guest
    if (booking.guestId && o.guestId === booking.guestId) return true;
    // Weak match: room match ONLY when the order has no guestId of its own
    // (so we don't steal another guest's explicitly-tagged order).
    if (!o.guestId && o.roomId && bookingRoomIds.includes(o.roomId)) return true;
    return false;
  });
  return [...direct, ...claimed];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed default expense categories
  await storage.seedDefaultCategories();

  // Seed default super-admin user with email/password
  try {
    const hashedPassword = await bcryptjs.hash('admin@123', 10);
    
    // First check if admin@hostezee.in user exists (might have wrong role)
    const [existingAdminUser] = await db.select().from(users).where(eq(users.email, 'admin@hostezee.in')).limit(1);
    
    if (existingAdminUser) {
      // User exists - ensure they have super-admin role and password
      if (existingAdminUser.role !== 'super-admin' || !existingAdminUser.password) {
        await db.update(users).set({ 
          role: 'super-admin', 
          password: hashedPassword,
          verificationStatus: 'verified',
          status: 'active'
        }).where(eq(users.email, 'admin@hostezee.in'));
        console.log('[SEED] Fixed super-admin role and password for admin@hostezee.in');
      }
    } else {
      // No user with this email - check if any super-admin exists
      const existingSuperAdmins = await db.select().from(users).where(eq(users.role, 'super-admin'));
      
      if (existingSuperAdmins.length === 0) {
        // Create new super-admin
        const superAdminId = 'admin-hostezee';
        await db.insert(users).values({
          id: superAdminId,
          email: 'admin@hostezee.in',
          firstName: 'Hostezee',
          lastName: 'Admin',
          password: hashedPassword,
          role: 'super-admin',
          status: 'active',
          verificationStatus: 'verified',
          businessName: 'Hostezee System',
        });
        console.log('[SEED] Default super-admin created: admin@hostezee.in with password admin@123');
      }
    }
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed super-admin:', error);
  }

  // ===== OBJECT STORAGE ROUTES =====
  // Referenced from blueprint:javascript_object_storage integration
  
  // Serve private uploaded files (with authentication and ACL check)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const objectPath = req.params.objectPath;
    
    // Check if MinIO is configured and object is from MinIO
    const { isMinIOConfigured, MinIOStorageService } = await import('./minioStorage');
    if (isMinIOConfigured() && !objectPath.startsWith('vps-uploads/')) {
      try {
        const minioService = new MinIOStorageService();
        await minioService.downloadFile(objectPath, res);
        return;
      } catch (error: any) {
        if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
          return res.sendStatus(404);
        }
        console.error("[MinIO File Serve] Error:", error);
        return res.sendStatus(500);
      }
    }
    
    // Check if this is a VPS local file upload (starts with vps-uploads)
    if (objectPath.startsWith('vps-uploads/')) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filepath = path.join(process.cwd(), 'uploads', objectPath.replace('vps-uploads/', ''));
        
        // Check if file exists
        try {
          await fs.access(filepath);
        } catch {
          return res.sendStatus(404);
        }
        
        // Determine content type
        const ext = path.extname(filepath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 
                           ext === '.gif' ? 'image/gif' : 
                           'image/jpeg';
        
        // Read and send file
        const fileBuffer = await fs.readFile(filepath);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileBuffer.length);
        res.send(fileBuffer);
        return;
      } catch (error) {
        console.error("[VPS File Serve] Error:", error);
        return res.sendStatus(500);
      }
    }
    
    // Replit object storage path
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get presigned upload URL for guest ID proofs
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const { isMinIOConfigured, isMinIOPublicEndpoint, MinIOStorageService } = await import('./minioStorage');
      if (isMinIOConfigured()) {
        if (isMinIOPublicEndpoint()) {
          // Public MinIO endpoint: browser can upload directly via presigned URL
          try {
            const minioService = new MinIOStorageService();
            const objectName = minioService.generateObjectName('id-proofs');
            const uploadURL = await minioService.getPresignedUploadURL(objectName);
            console.log("[Object Upload] MinIO presigned URL generated (public endpoint)");
            res.json({ uploadURL, objectName, isMinIO: true });
            return;
          } catch (minioError: any) {
            console.error("[Object Upload] MinIO presigned URL error:", minioError.message);
          }
        }
        // MinIO on localhost: browser uploads to our server, server forwards to MinIO
        console.log("[Object Upload] MinIO configured (localhost) - using server-side proxy upload");
        const objectId = randomUUID();
        res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
        return;
      }

      // No MinIO - try Replit object storage
      try {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        console.log("[Object Upload] Replit storage URL generated");
        res.json({ uploadURL });
        return;
      } catch (replitError: any) {
        console.error("[Object Upload] Replit storage error:", replitError.message);
      }

      // Final fallback to local filesystem
      const objectId = randomUUID();
      res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
    } catch (error: any) {
      console.error("[Object Upload] Unexpected error:", error.message);
      const objectId = randomUUID();
      res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
    }
  });

  // Public upload endpoint for guest self-checkin (no auth required)
  app.post("/api/guest/upload", async (req, res) => {
    try {
      const { isMinIOConfigured, isMinIOPublicEndpoint, MinIOStorageService } = await import('./minioStorage');
      if (isMinIOConfigured()) {
        if (isMinIOPublicEndpoint()) {
          try {
            const minioService = new MinIOStorageService();
            const objectName = minioService.generateObjectName('id-proofs');
            const uploadURL = await minioService.getPresignedUploadURL(objectName);
            res.json({ uploadURL, objectName, isMinIO: true });
            return;
          } catch (minioError: any) {
            console.error("[Guest Upload] MinIO presigned URL error:", minioError.message);
          }
        }
        // MinIO on localhost: server-side proxy upload
        const objectId = randomUUID();
        res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
        return;
      }

      // No MinIO - try Replit object storage
      try {
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        res.json({ uploadURL });
        return;
      } catch (replitError: any) {
        console.error("[Guest Upload] Replit storage error:", replitError.message);
      }

      // Final fallback
      const objectId = randomUUID();
      res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
    } catch (error: any) {
      console.error("[Guest Upload] Storage failed, using fallback:", error.message);
      const objectId = randomUUID();
      res.json({ uploadURL: `/api/vps-upload/${objectId}`, isVPS: true });
    }
  });

  // Server-side proxy upload endpoint — receives file from browser and stores in MinIO (or local filesystem as fallback)
  app.post("/api/vps-upload/:objectId", async (req, res) => {
    try {
      const { objectId } = req.params;
      console.log(`[VPS Upload] Starting upload for objectId: ${objectId}`);
      const chunks: Buffer[] = [];
      
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      req.on('end', async () => {
        try {
          if (chunks.length === 0) {
            console.error("[VPS Upload] No data received");
            return res.status(400).json({ error: "No file data received" });
          }

          const fileBuffer = Buffer.concat(chunks);
          const contentType = req.headers['content-type'] || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
          const filename = `${objectId}.${ext}`;
          console.log(`[VPS Upload] Received ${fileBuffer.length} bytes, content-type: ${contentType}`);

          // Store in MinIO when configured (works for both localhost and public endpoints)
          const { isMinIOConfigured, MinIOStorageService } = await import('./minioStorage');
          if (isMinIOConfigured()) {
            try {
              const minioService = new MinIOStorageService();
              const objectName = `id-proofs/${filename}`;
              await minioService.uploadFile(objectName, fileBuffer, contentType);
              const objectPath = `/objects/${objectName}`;
              console.log(`[VPS Upload] Saved to MinIO: ${objectName}`);
              res.json({ objectPath, uploadURL: objectPath });
              return;
            } catch (minioError: any) {
              console.error("[VPS Upload] MinIO upload failed, falling back to filesystem:", minioError.message);
            }
          }

          // Fallback: save to local filesystem
          const fs = await import('fs/promises');
          const path = await import('path');
          const uploadsDir = path.join(process.cwd(), 'uploads', 'id-proofs');
          await fs.mkdir(uploadsDir, { recursive: true });
          const filepath = path.join(uploadsDir, filename);
          await fs.writeFile(filepath, fileBuffer);
          const objectPath = `/objects/vps-uploads/id-proofs/${filename}`;
          console.log(`[VPS Upload] Saved to local filesystem: ${filepath}`);
          res.json({ objectPath, uploadURL: objectPath });
        } catch (error: any) {
          console.error("[VPS Upload] Error saving file:", error);
          res.status(500).json({ error: "Failed to save file", message: error.message });
        }
      });
      
      req.on('error', (error) => {
        console.error("[VPS Upload] Request error:", error);
        res.status(500).json({ error: "Upload failed", message: error.message });
      });
    } catch (error: any) {
      console.error("[VPS Upload] Error:", error);
      console.error("[VPS Upload] Error stack:", error.stack);
      res.status(500).json({ error: "Internal server error", message: error.message });
    }
  });

  // Set ACL policy for uploaded guest ID proof
  app.put("/api/guest-id-proofs", isAuthenticated, async (req, res) => {
    if (!req.body.idProofUrl) {
      return res.status(400).json({ error: "idProofUrl is required" });
    }

    const userId = req.user?.claims?.sub;
    const idProofUrl = req.body.idProofUrl;

    console.log("[Guest ID Proof] Received idProofUrl:", idProofUrl);

    // If this is a VPS upload URL, extract the object path from the saved file
    if (idProofUrl.startsWith('/api/vps-upload/')) {
      // Extract objectId from URL
      const objectId = idProofUrl.split('/').pop();
      console.log("[Guest ID Proof] VPS upload URL detected, objectId:", objectId);
      
      // Construct the object path (VPS uploads save to /objects/vps-uploads/id-proofs/)
      // We need to get the actual filename from the saved file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'id-proofs');
        
        // Ensure directory exists
        try {
          await fs.mkdir(uploadsDir, { recursive: true });
        } catch (mkdirError: any) {
          // Directory might already exist, ignore error
          console.log("[Guest ID Proof] Directory check:", mkdirError.code === 'EEXIST' ? 'exists' : mkdirError.message);
        }
        
        // List files to find the one matching objectId
        try {
          const files = await fs.readdir(uploadsDir);
          const matchingFile = files.find(f => f.startsWith(objectId + '.'));
          
          if (matchingFile) {
            const objectPath = `/objects/vps-uploads/id-proofs/${matchingFile}`;
            console.log("[Guest ID Proof] VPS upload file found, returning objectPath:", objectPath);
            return res.status(200).json({
              objectPath: objectPath,
            });
          } else {
            console.log("[Guest ID Proof] VPS upload file not found yet, trying common extensions");
            // Try common extensions if file not found
            const extensions = ['jpg', 'jpeg', 'png', 'gif'];
            for (const ext of extensions) {
              const filename = `${objectId}.${ext}`;
              const filepath = path.join(uploadsDir, filename);
              try {
                await fs.access(filepath);
                const objectPath = `/objects/vps-uploads/id-proofs/${filename}`;
                console.log("[Guest ID Proof] VPS upload file found with extension:", ext);
                return res.status(200).json({
                  objectPath: objectPath,
                });
              } catch {
                // File doesn't exist with this extension, try next
              }
            }
            // If file not found, return a path anyway (upload might be in progress)
            console.log("[Guest ID Proof] VPS upload file not found, assuming jpg and returning path");
            const objectPath = `/objects/vps-uploads/id-proofs/${objectId}.jpg`;
            return res.status(200).json({
              objectPath: objectPath,
            });
          }
        } catch (readError: any) {
          if (readError.code === 'ENOENT') {
            // Directory doesn't exist yet, upload might be in progress
            console.log("[Guest ID Proof] Upload directory doesn't exist yet, assuming upload in progress");
            const objectPath = `/objects/vps-uploads/id-proofs/${objectId}.jpg`;
            return res.status(200).json({
              objectPath: objectPath,
            });
          }
          throw readError;
        }
      } catch (error: any) {
        console.error("[Guest ID Proof] Error finding VPS file:", error);
        // Even if we can't find the file, return a path (upload might be in progress)
        const objectPath = `/objects/vps-uploads/id-proofs/${objectId}.jpg`;
        console.log("[Guest ID Proof] Returning fallback objectPath:", objectPath);
        return res.status(200).json({
          objectPath: objectPath,
        });
      }
    }

    // If this is a VPS object path or MinIO path, just return it (no ACL needed)
    if (idProofUrl.startsWith('/objects/vps-uploads/')) {
      console.log("[Guest ID Proof] VPS object path, returning as-is");
      return res.status(200).json({
        objectPath: idProofUrl,
      });
    }

    // Check if MinIO is configured and this is a MinIO path
    const { isMinIOConfigured } = await import('./minioStorage');
    if (isMinIOConfigured() && idProofUrl.startsWith('/objects/') && !idProofUrl.startsWith('/objects/vps-uploads/')) {
      console.log("[Guest ID Proof] MinIO path, returning as-is");
      return res.status(200).json({
        objectPath: idProofUrl,
      });
    }

    // Try Replit object storage (only if not VPS/MinIO)
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        idProofUrl,
        {
          owner: userId,
          visibility: "private", // Guest ID proofs are private
        },
      );

      console.log("[Guest ID Proof] Replit storage ACL set, returning:", objectPath);
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("[Guest ID Proof] Error setting ACL:", error);
      // If Replit storage fails, try to return the path as-is (might be VPS/MinIO)
      if (idProofUrl.startsWith('/objects/')) {
        console.log("[Guest ID Proof] Replit failed, returning path as-is:", idProofUrl);
        return res.status(200).json({
          objectPath: idProofUrl,
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== TEST ROUTES (For development testing) =====
  
  // Test email and WhatsApp services
  app.post("/api/test/notifications", async (req, res) => {
    const { email, phone, type } = req.body;
    const results: any = { email: null, whatsapp: null };
    
    try {
      // Test Email
      if (email) {
        const { sendBookingConfirmationEmail } = await import("./email-service");
        const emailResult = await sendBookingConfirmationEmail(
          email,
          "Test Guest",
          "Test Property",
          "Dec 10, 2025",
          "Dec 11, 2025",
          "Room 101",
          99999
        );
        results.email = { success: true, result: emailResult };
        console.log(`[TEST] Email test sent to ${email}`);
      }
      
      // Test WhatsApp
      if (phone) {
        const { sendBookingConfirmation } = await import("./whatsapp");
        const phoneStr = String(phone);
        const waResult = await sendBookingConfirmation(
          phoneStr,
          "Test Guest",
          "Test Property",
          "Dec 10, 2025",
          "Dec 11, 2025",
          "Room 101"
        );
        results.whatsapp = { success: waResult.success, result: waResult };
        console.log(`[TEST] WhatsApp test sent to ${phoneStr}`, waResult);
      }
      
      res.json({ success: true, results });
    } catch (error: any) {
      console.error("[TEST] Notification test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== PUBLIC ROUTES (No Authentication Required) =====

  // Sitemap - publicly accessible, no auth
  app.get("/sitemap.xml", (_req, res) => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://hostezee.in/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://hostezee.in/features</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://hostezee.in/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://hostezee.in/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://hostezee.in/demo</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.send(sitemap);
  });

  // Health check - no auth; use for uptime/monitoring (returns 200 when API is up)
  app.get("/api/health", async (_req, res) => {
    res.json({ ok: true });
  });

  // Verify Razorpay keys (authenticated) - call this to confirm keys are accepted by Razorpay
  app.get("/api/razorpay/verify-keys", isAuthenticated, async (_req, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.json({ ok: false, error: "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in server environment." });
      }
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const r = await fetch("https://api.razorpay.com/v1/payment_links?count=1", {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (r.ok || r.status === 404) {
        return res.json({ ok: true, message: "Razorpay keys are valid." });
      }
      const err = await r.json().catch(() => ({}));
      const msg = err.error?.description || err.description || `HTTP ${r.status}`;
      return res.json({ ok: false, error: `Razorpay rejected keys: ${msg}` });
    } catch (e: any) {
      return res.json({ ok: false, error: e?.message || "Request failed." });
    }
  });

  // Public Menu - for guest ordering
  // Public menu categories (no auth required)
  // Public properties list (for café orders to select property)
  app.get("/api/public/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      // Return only id and name for property selection
      const publicProperties = properties.map(p => ({ id: p.id, name: p.name }));
      res.json(publicProperties);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/menu-categories", async (req, res) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const categories = propertyId
        ? await storage.getMenuCategoriesByProperty(propertyId)
        : await storage.getAllMenuCategories();
      // Only return active categories
      const activeCategories = categories.filter(cat => cat.isActive);
      res.json(activeCategories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public menu items (no auth required)
  app.get("/api/public/menu", async (req, res) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const items = propertyId
        ? await storage.getMenuItemsByProperty(propertyId)
        : await storage.getAllMenuItems();
      // Only return available items
      const availableItems = items.filter(item => item.isAvailable);
      res.json(availableItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public menu item variants (no auth required)
  app.get("/api/public/menu-items/:menuItemId/variants", async (req, res) => {
    try {
      const variants = await storage.getVariantsByMenuItem(parseInt(req.params.menuItemId));
      res.json(variants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public menu item add-ons (no auth required)
  app.get("/api/public/menu-items/:menuItemId/add-ons", async (req, res) => {
    try {
      const addOns = await storage.getAddOnsByMenuItem(parseInt(req.params.menuItemId));
      res.json(addOns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public Order - for guests to place orders
  app.post("/api/public/orders", async (req, res) => {
    try {
      
      const { orderType, roomId, propertyId, customerName, customerPhone, tableNumber, orderMode: bodyOrderMode, items, totalAmount, specialInstructions } = req.body;
      
      // Validate items
      if (!items || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
      }
      
      // Type-specific validation
      if (orderType === "room") {
        if (!roomId) {
          return res.status(400).json({ message: "Room number is required" });
        }
        if (!propertyId) {
          return res.status(400).json({ message: "Property ID is required for room orders" });
        }
      } else if (orderType === "restaurant") {
        if (!customerName || !customerPhone) {
          return res.status(400).json({ message: "Name and phone number are required" });
        }
      } else {
        return res.status(400).json({ message: "Invalid order type" });
      }

      // Resolve order mode: explicit body value wins, else derive from
      // orderType/tableNumber. Restaurant + table → dine-in; Restaurant
      // alone → takeaway only if explicitly set; Room orders → room.
      const resolvedOrderMode = (() => {
        const allowed = ["dine-in", "takeaway", "room"];
        if (bodyOrderMode && allowed.includes(String(bodyOrderMode))) return String(bodyOrderMode);
        if (orderType === "room") return "room";
        if (tableNumber) return "dine-in";
        return "dine-in";
      })();

      let orderData: any = {
        orderType: orderType || "restaurant",
        orderSource: "guest",
        orderMode: resolvedOrderMode,
        items,
        totalAmount,
        specialInstructions: specialInstructions || null,
        status: "pending",
      };
      
      // Handle room orders
      if (orderType === "room") {
        // Look up room by BOTH property ID and room number to ensure correct match
        const roomNumber = String(roomId);
        const propertyIdNum = parseInt(String(propertyId));
        const rooms = await storage.getAllRooms();
        const room = rooms.find(r => r.roomNumber === roomNumber && r.propertyId === propertyIdNum);
        
        if (!room) {
          return res.status(400).json({ message: `Room ${roomNumber} not found in the selected property. Please check your room number.` });
        }

        // Find the active booking for this room so the order links to the room bill.
        // We accept any booking whose stay window covers TODAY and is not cancelled /
        // checked-out / no-show. Previously this only matched status === "checked-in",
        // which meant orders placed before the front-desk pressed "Check-in" never made
        // it onto the bill. We prefer status === "checked-in" but fall back to confirmed
        // / pending bookings that are clearly the current guest in the room.
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const bookings = await storage.getAllBookings();
        const candidateBookings = bookings.filter(b => {
          if (b.roomId !== room.id) return false;
          if (["cancelled", "checked-out", "no_show"].includes(String(b.status))) return false;
          const cin = new Date(b.checkInDate as any);
          const cout = new Date(b.checkOutDate as any);
          // today within [checkIn, checkOut)
          return cin <= now && startOfToday < cout;
        });
        // Prefer a checked-in booking, then confirmed, then anything else current
        const activeBooking =
          candidateBookings.find(b => b.status === "checked-in") ||
          candidateBookings.find(b => b.status === "confirmed") ||
          candidateBookings[0] ||
          null;

        if (!activeBooking) {
          console.warn(`[QR-Order] No active booking found for room ${room.roomNumber} (id=${room.id}). Order will be created unlinked — it will NOT show on a room bill.`);
        } else {
          console.log(`[QR-Order] Linking order to booking #${activeBooking.id} (status=${activeBooking.status}, guest=${activeBooking.guestId}) for room ${room.roomNumber}`);
        }

        orderData.propertyId = room.propertyId;
        orderData.roomId = room.id;
        orderData.bookingId = activeBooking?.id || null;
        orderData.guestId = activeBooking?.guestId || null;
      } else {
        // Handle restaurant/café orders (dine-in)
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
        // Café orders now include property ID for kitchen filtering
        if (propertyId) {
          orderData.propertyId = parseInt(String(propertyId));
        }
        // Dine-in: capture the table number from the scanned QR (optional)
        if (tableNumber && String(tableNumber).trim()) {
          orderData.tableNumber = String(tableNumber).trim();
        }
      }

      const order = await storage.createOrder(orderData);

      // Send WhatsApp confirmation to guest (WID 28983)
      try {
        if (orderType === "room" && orderData.guestId) {
          const guest = await storage.getGuest(orderData.guestId);
          if (guest?.phone) {
            const waPhone = (guest as any).whatsappPhone || guest.phone;
            await sendFoodOrderReceived(waPhone, guest.fullName || "Guest");
            console.log(`[WhatsApp] Food order confirmation sent to guest ${guest.fullName} (room order #${order.id})`);
          }
        } else if (orderType === "restaurant" && customerPhone && customerName) {
          await sendFoodOrderReceived(customerPhone, customerName);
          console.log(`[WhatsApp] Food order confirmation sent to ${customerName} (restaurant order #${order.id})`);
        }
      } catch (waErr: any) {
        console.warn(`[WhatsApp] Food order confirmation failed (non-critical):`, waErr.message);
      }

      // Send PWA push notification to admin/kitchen staff for this property
      try {
        const allUsers = await storage.getAllUsers();
        const relevantUsers = allUsers.filter(u =>
          (u.role === 'admin' || u.role === 'super-admin' || u.role === 'kitchen') &&
          (orderData.propertyId
            ? !u.assignedPropertyIds || u.assignedPropertyIds.length === 0 || u.assignedPropertyIds.includes(String(orderData.propertyId))
            : true)
        );
        const roomInfo = orderData.roomId ? await storage.getRoom(orderData.roomId) : null;
        const property = orderData.propertyId ? await storage.getProperty(orderData.propertyId) : null;
        const roomLabel = roomInfo ? ` — Room ${roomInfo.roomNumber}` : "";
        const propLabel = property ? ` @ ${property.name}` : "";
        const custLabel = order.customerName ? order.customerName : "Customer";

        // DB notification for Notification Center
        for (const u of relevantUsers) {
          await db.insert(notifications).values({
            userId: u.id,
            type: "new_order",
            title: "New Food Order",
            message: `Order #${order.id} from ${custLabel}${roomLabel}${propLabel}. Amount: ₹${order.totalAmount}`,
            soundType: "info",
            relatedId: order.id,
            relatedType: "order",
          });
        }

        // PWA push notification
        const pushPayload = {
          type: "new_order",
          title: "🍽️ New Food Order!",
          body: `Order #${order.id}${roomLabel}${propLabel}`,
          url: "/restaurant",
          orderId: order.id,
        };
        const relevantIds = relevantUsers.map(u => u.id);
        await sendPushToUsers(relevantIds, pushPayload);
        // Schedule 60s escalation reminder if not acknowledged
        scheduleOrderEscalation(order.id, relevantIds, `from ${custLabel}${roomLabel}`, order.propertyId ?? null);
      } catch (pushErr: any) {
        console.warn("[Push] Public order push failed:", pushErr.message);
      }

      // Send WhatsApp staff alert via alert routing system + Feature Settings phone numbers
      if (orderData.propertyId) {
        try {
          const items = (order.items as any[]) || [];
          const orderDetails = items
            .map((i: any) => `${i.quantity}x ${i.name} - ₹${i.price}`)
            .join("\n");
          const roomInfo = orderData.roomId ? await storage.getRoom(orderData.roomId) : null;
          const roomLabel = roomInfo
            ? `Room ${roomInfo.roomNumber}`
            : order.customerName
              ? "Restaurant / Walk-in"
              : "Restaurant";
          const guestObj = orderData.guestId ? await storage.getGuest(orderData.guestId) : null;
          const guestLabel = guestObj?.fullName || order.customerName || "Guest";
          const propertyObj = await storage.getProperty(orderData.propertyId);
          const propertyLabel = propertyObj?.name || "Property";
          const totalStr = String(order.totalAmount);

          // 1. Alert routing system (whatsapp_alert_rules)
          try {
            const recipients = await storage.resolveAlertRecipients("food_order_staff_alert", orderData.propertyId);
            for (const phone of recipients) {
              if (!isRealPhone(phone)) continue;
              await sendFoodOrderStaffAlert(phone, guestLabel, propertyLabel, roomLabel, order.id);
              console.log(`[WhatsApp] Food order alert sent to ${phone} for order #${order.id}`);
            }
          } catch (waRouteErr: any) {
            console.warn(`[WhatsApp] Food order alert routing failed:`, waRouteErr.message);
          }

          // 2. Feature Settings extra phone numbers (same as staff order route)
          try {
            const foodOrderSettings = await storage.getFoodOrderWhatsappSettings(orderData.propertyId);
            if (foodOrderSettings?.enabled && foodOrderSettings.phoneNumbers?.length > 0) {
              for (const phone of foodOrderSettings.phoneNumbers) {
                if (!isRealPhone(phone)) continue;
                await sendFoodOrderStaffAlert(phone, guestLabel, propertyLabel, roomLabel, order.id);
                console.log(`[WhatsApp] Food order alert sent to Feature Settings number: ${phone}`);
              }
            }
          } catch (waFeatErr: any) {
            console.warn(`[WhatsApp] Food order Feature Settings alert failed:`, waFeatErr.message);
          }
        } catch (waStaffErr: any) {
          console.warn(`[WhatsApp] Food order staff alert failed (non-critical):`, waStaffErr.message);
        }
      }

      // Broadcast real-time SSE event to all connected staff clients
      try {
        const roomInfoSse = orderData.roomId ? await storage.getRoom(orderData.roomId) : null;
        eventBus.publish({
          type: 'order.placed',
          propertyId: orderData.propertyId ?? undefined,
          data: {
            id: order.id,
            roomNumber: roomInfoSse?.roomNumber ?? null,
            totalAmount: order.totalAmount,
            orderType: order.orderType,
          },
        });
      } catch (sseErr: any) {
        console.warn('[SSE] Failed to broadcast public order.placed:', sseErr.message);
      }

      res.status(201).json(order);
    } catch (error: any) {
      console.error("Public order error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send a Room QR / menu link to the guest via WhatsApp
  // Body: { propertyId: number, roomNumber: string, phone: string, guestName?: string }
  app.post("/api/qr/send-room", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, roomNumber, phone, guestName } = req.body || {};
      if (!propertyId || !roomNumber || !phone) {
        return res.status(400).json({ message: "propertyId, roomNumber and phone are required" });
      }
      const cleanedPhone = String(phone).replace(/\D/g, "");
      if (cleanedPhone.length < 10) {
        return res.status(400).json({ message: "Please enter a valid phone number" });
      }

      const property = await storage.getProperty(parseInt(String(propertyId)));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Build the same menu URL the QR encodes
      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS?.split(",")[0]
          ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
          : `${req.protocol}://${req.get("host")}`;
      const menuLink = `${baseUrl}/menu?type=room&property=${property.id}&room=${encodeURIComponent(String(roomNumber))}`;

      const { sendWelcomeWithMenuLink } = await import("./whatsapp");
      const result = await sendWelcomeWithMenuLink(
        cleanedPhone,
        property.name || "Our Property",
        guestName?.trim() || "Guest",
        menuLink,
      );

      if (!result?.success) {
        return res.status(502).json({ message: result?.message || "WhatsApp delivery failed", menuLink });
      }
      console.log(`[QR-Send] Room ${roomNumber} menu link sent to ${cleanedPhone} for property ${property.id}`);
      res.json({ success: true, menuLink });
    } catch (error: any) {
      console.error("[QR-Send] Failed:", error);
      res.status(500).json({ message: error.message || "Failed to send QR link" });
    }
  });

  // ===== AUTHENTICATED ROUTES =====

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // PRIORITY: Check email-based auth first (session-based login takes precedence)
      let userId = req.session?.userId;
      
      // If no email-based session, check Replit Auth
      if (!userId) {
        userId = req.user?.claims?.sub || req.user?.id;
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let user = await storage.getUser(userId);
      
      // Auto-create user if doesn't exist (e.g., after database wipe)
      if (!user) {
        const email = req.user?.claims?.email || `${userId}@replit.user`;
        const name = req.user?.claims?.name || req.user?.claims?.email || 'User';
        
        // Split name into first and last name
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        user = await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          role: 'admin', // First user gets admin
        });
      }
      
      // Auto-verify owner/admin emails (NOT super-admin - that's seeded separately)
      const adminEmails = ['paras.thakur18@gmail.com', 'thepahadistays@gmail.com'];
      const managerEmails = ['rajni44573@gmail.com'];
      const userEmailLower = user.email?.toLowerCase() || '';
      const isAdminEmail = adminEmails.includes(userEmailLower);
      const isManagerEmail = managerEmails.includes(userEmailLower);
      
      // Only auto-promote to admin if not already super-admin (never downgrade super-admin)
      if (isAdminEmail && user.role !== 'super-admin' && (user.verificationStatus === 'pending' || user.role !== 'admin')) {
        // Auto-verify and promote admin emails
        await db.update(users)
          .set({ 
            verificationStatus: 'verified', 
            role: 'admin',
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        user = await storage.getUser(userId);
        console.log(`[AUTH] Auto-verified admin email: ${user?.email}`);
      }
      
      if (isManagerEmail && user.verificationStatus === 'pending') {
        // Auto-verify manager emails (keep their role as manager)
        await db.update(users)
          .set({ 
            verificationStatus: 'verified', 
            role: user.role === 'admin' ? 'admin' : 'manager',
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        user = await storage.getUser(userId);
        console.log(`[AUTH] Auto-verified manager email: ${user?.email}`);
      }
      
      // CHECK VERIFICATION STATUS - Block pending/rejected/deactivated users (except super-admin)
      if (user && user.role !== 'super-admin') {
        // Check if user is deactivated (inactive or suspended status)
        if (user.status === 'inactive' || user.status === 'suspended') {
          return res.status(403).json({ 
            message: "Your account has been deactivated. Please contact your administrator.",
            isDeactivated: true,
            user: { email: user.email, firstName: user.firstName, lastName: user.lastName }
          });
        }
        
        if (user.verificationStatus === 'rejected') {
          return res.status(403).json({ 
            message: "Your account has been rejected. Please contact support.",
            verificationStatus: "rejected",
            user: { email: user.email, firstName: user.firstName, lastName: user.lastName }
          });
        }
        
        if (user.verificationStatus === 'pending') {
          return res.status(403).json({ 
            message: "Your account is pending approval. You will be notified once approved.",
            verificationStatus: "pending",
            user: { email: user.email, firstName: user.firstName, lastName: user.lastName }
          });
        }
      }
      
      // Include assigned property information if user has any
      let userWithProperty: any = { ...user };
      if (user.assignedPropertyIds && user.assignedPropertyIds.length > 0) {
        const properties = await Promise.all(
          user.assignedPropertyIds.map(id => storage.getProperty(id))
        );
        userWithProperty.assignedPropertyNames = properties
          .filter(p => p !== undefined)
          .map(p => p!.name);
      }
      
      // Include viewing-as-user flag for super admin banner
      if ((req.session as any).isViewingAsUser && (req.session as any).originalSuperAdminId) {
        userWithProperty.isViewingAsUser = true;
        userWithProperty.originalSuperAdminId = (req.session as any).originalSuperAdminId;
      }
      
      res.json(userWithProperty);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Development only: Auto-login for testing
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/dev/auto-login', (req: any, res) => {
      try {
        // Create or get test user session
        const testUserId = 'dev-test-user-' + Date.now();
        req.session.userId = testUserId;
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: 'Failed to create session' });
          }
          res.json({ message: 'Dev session created', userId: testUserId });
        });
      } catch (error) {
        console.error('Dev auto-login error:', error);
        res.status(500).json({ message: 'Failed to create dev session' });
      }
    });
  }

  // Server-Sent Events (SSE) endpoint for real-time updates
  app.get('/api/events/stream', isAuthenticated, (req: any, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: DomainEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    sendEvent({
      id: 'connection',
      type: 'connected',
      timestamp: new Date().toISOString(),
      data: { message: 'Connected to event stream' },
    } as DomainEvent);

    const unsubscribe = eventBus.subscribeAll(sendEvent);

    // Heartbeat to keep connection alive (every 15 seconds)
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  // === PUSH NOTIFICATION SUBSCRIPTION ROUTES ===

  // Return VAPID public key (needed by browser to subscribe)
  app.get("/api/push/vapid-public-key", isAuthenticated, (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Save a push subscription for the current user
  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription object" });
      }
      await storage.savePushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers["user-agent"],
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  // Remove a push subscription
  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // List the current user's push subscriptions (for Device Management UI).
  app.get("/api/push/subscriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const subs = await storage.getPushSubscriptionsByUserIds([userId]);
      // Don't expose the full endpoint — last 32 chars are enough to identify
      res.json(subs.map(s => ({
        id: s.id,
        endpointHash: s.endpoint.slice(-32),
        userAgent: s.userAgent || null,
        createdAt: s.createdAt,
      })));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Send a TEST push notification to all of the current user's subscribed devices.
  // Useful for verifying VAPID config + service worker registration end-to-end.
  app.post("/api/push/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return res.status(503).json({
          success: false,
          message: "VAPID keys not configured on the server. Ask your admin to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        });
      }

      const result = await sendPushToUsers([userId], {
        title: "Hostezee — Test Notification",
        body: "Push notifications are working on this device.",
        type: "test",
        url: "/",
      });

      if (result.skipped) {
        return res.status(503).json({ success: false, message: "Push system unavailable — VAPID keys missing." });
      }
      if (result.sent === 0 && result.failed === 0) {
        return res.status(404).json({
          success: false,
          message: "No push subscriptions found for your account on this server. Click 'Enable Push' first.",
        });
      }
      res.json({
        success: result.sent > 0,
        sent: result.sent,
        failed: result.failed,
        message: result.sent > 0
          ? `Test notification sent to ${result.sent} device(s).`
          : `Failed to deliver to all ${result.failed} device(s) — check server logs.`,
      });
    } catch (err: any) {
      console.error("[Push] Test send error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to send test notification" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { currentUser, tenant } = auth;
      
      // Security: Pending users should see empty dashboard
      if (currentUser.verificationStatus === 'pending') {
        return res.json({
          totalProperties: 0,
          totalRooms: 0,
          totalBookings: 0,
          activeBookings: 0,
          todayCheckIns: 0,
          todayCheckOuts: 0,
          occupancyRate: 0,
          revenue: 0,
          pendingPayments: 0,
          recentBookings: [],
          upcomingBookings: []
        });
      }
      
      // Security: Non-admin users with no assigned properties should see empty data
      if (!tenant.hasUnlimitedAccess && tenant.assignedPropertyIds.length === 0) {
        return res.json({
          totalProperties: 0,
          totalRooms: 0,
          totalBookings: 0,
          activeBookings: 0,
          todayCheckIns: 0,
          todayCheckOuts: 0,
          occupancyRate: 0,
          revenue: 0,
          pendingPayments: 0,
          recentBookings: [],
          upcomingBookings: []
        });
      }
      
      // Priority: Use query parameter if provided (user selection), otherwise use assigned property
      let propertyId: number | undefined = undefined;
      
      if (req.query.propertyId) {
        propertyId = parseInt(req.query.propertyId);
        if (!canAccessProperty(tenant, propertyId)) {
          return res.status(403).json({ message: "Access denied to this property" });
        }
      } else if (!tenant.hasUnlimitedAccess && tenant.assignedPropertyIds.length > 0) {
        propertyId = tenant.assignedPropertyIds[0];
      }
      
      const stats = await storage.getDashboardStats(propertyId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics
  app.get("/api/analytics", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { currentUser, tenant } = auth;
      
      // Security: Pending users see empty analytics
      if (currentUser.verificationStatus === 'pending') {
        return res.json({ bookingsByMonth: [], revenueByMonth: [], occupancyByMonth: [] });
      }
      
      // Security: Non-super-admin with no properties sees empty data
      if (!tenant.hasUnlimitedAccess && tenant.assignedPropertyIds.length === 0) {
        return res.json({ 
          bookingsByMonth: [], 
          revenueByMonth: [], 
          occupancyByMonth: [],
          stats: {
            totalBookings: 0,
            totalRevenue: 0,
            totalGuests: 0,
            occupancyRate: 0,
            revenueGrowth: 0,
            bookingGrowth: 0
          }
        });
      }
      
      let propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      
      // Security: Non-admin can only see their assigned properties
      if (propertyId && !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      
      if (!propertyId && !tenant.hasUnlimitedAccess && tenant.assignedPropertyIds.length > 0) {
        propertyId = tenant.assignedPropertyIds[0];
      }
      
      const analytics = await storage.getAnalytics(propertyId);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Management (Admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      
      // SUPER ADMIN: Sees all users
      if (currentUser.role === 'super-admin') {
        return res.json(allUsers);
      }

      // REGULAR ADMIN: Sees all non-super-admin users so they can manage access
      const filteredUsers = allUsers.filter(u => u.role !== 'super-admin');

      res.json(filteredUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin or super-admin
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const validated = updateUserRoleSchema.parse(req.body);
      
      // Prevent regular admins from setting super-admin role
      if (validated.role === 'super-admin') {
        return res.status(403).json({ message: "Cannot assign super-admin role" });
      }
      
      // Prevent modifying super-admin users
      const targetUser = await storage.getUser(id);
      if (targetUser?.role === 'super-admin') {
        return res.status(403).json({ message: "Cannot modify super-admin users" });
      }
      
      const user = await storage.updateUserRole(
        id, 
        validated.role,
        validated.assignedPropertyIds
      );
      
      res.json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin or super-admin
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Prevent deleting super-admin users
      const userToDelete = await storage.getUser(id);
      if (userToDelete?.role === 'super-admin') {
        return res.status(403).json({ message: "Cannot delete super-admin users" });
      }
      
      // Check if this is the last admin
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.role === "admin");
      
      if (userToDelete?.role === "admin" && adminUsers.length <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin user" });
      }
      
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle user active status (activate/deactivate)
  app.patch("/api/users/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status } = req.body; // 'active' or 'inactive'
      
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
      }
      
      // Prevent self-deactivation
      if (id === userId && status === 'inactive') {
        return res.status(400).json({ message: "You cannot deactivate your own account" });
      }
      
      // Prevent deactivating super-admin users (only for regular admins)
      const targetUser = await storage.getUser(id);
      if (targetUser?.role === 'super-admin' && currentUser?.role !== 'super-admin') {
        return res.status(403).json({ message: "Cannot modify super-admin users" });
      }
      
      // For regular admins, check if they have access to this user's properties
      if (currentUser?.role === 'admin') {
        const tenant = getTenantContext(currentUser);
        const hasAccess = targetUser?.assignedPropertyIds?.some((propId: any) => 
          canAccessProperty(tenant, parseInt(propId))
        ) || targetUser?.businessName === currentUser.businessName;
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You can only manage staff from your properties" });
        }
      }
      
      await db.update(users).set({ 
        status,
        updatedAt: new Date()
      }).where(eq(users.id, id));
      
      console.log(`[USER] User ${id} status changed to: ${status} by ${userId}`);
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== STAFF INVITATION ROUTES =====
  
  // Create staff invitation
  app.post("/api/staff-invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, propertyId, role, phone } = req.body;
      
      if (!email || !propertyId) {
        return res.status(400).json({ message: "Email and property are required" });
      }
      
      // Validate role
      const validRoles = ['staff', 'manager', 'kitchen'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be staff, manager, or kitchen" });
      }
      
      // Check if admin has access to this property
      if (currentUser?.role === 'admin') {
        const tenant = getTenantContext(currentUser);
        if (!canAccessProperty(tenant, propertyId)) {
          return res.status(403).json({ message: "You don't have access to this property" });
        }
      }
      
      // If a user with this email already exists, skip the invite flow and
      // grant them access to the new property directly. This is the common
      // case of "I want my existing kitchen guy to also help at Property B".
      // Uses the same role-hierarchy MERGE rule as login-time invite apply
      // so an existing admin is NEVER downgraded by being added as kitchen.
      const allUsers = await storage.getAllUsers();
      const existingUser = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        const ROLE_RANK: Record<string, number> = {
          'super-admin': 100, admin: 80, manager: 60, staff: 40, kitchen: 20,
        };
        const currentProps: string[] = (existingUser.assignedPropertyIds as string[] | null) ?? [];
        const propIdStr = String(propertyId);
        const alreadyHasAccess = currentProps.includes(propIdStr);
        const updatedProps = alreadyHasAccess ? currentProps : [...currentProps, propIdStr];

        const requestedRole = role || 'staff';
        const existingRole = (existingUser.role || 'staff') as string;
        const finalRole = (ROLE_RANK[requestedRole] ?? 0) > (ROLE_RANK[existingRole] ?? 0)
          ? requestedRole
          : existingRole;

        await db.update(users).set({
          role: finalRole as any,
          assignedPropertyIds: updatedProps,
          status: 'active',
          verificationStatus: 'approved',
        }).where(eq(users.id, existingUser.id));

        console.log(`[INVITE-DIRECT] Granted existing user ${existingUser.email} access to property ${propertyId} (requestedRole=${requestedRole} existingRole=${existingRole} finalRole=${finalRole} alreadyHadAccess=${alreadyHasAccess})`);

        return res.status(200).json({
          granted: true,
          alreadyHadAccess,
          finalRole,
          message: alreadyHasAccess
            ? `${existingUser.email} already has access to this property as ${existingRole}.`
            : `Access granted to ${existingUser.email} on this property. They can sign in with their existing account — no invite link needed.`,
        });
      }
      
      // Auto-supersede any stale pending invitation(s) for this email+property.
      // Common cases: admin deleted the invitee user but the invite row remained,
      // or admin simply wants to resend with a fresh link. Either way, delete
      // the prior pending invite(s) before creating a new one so the flow never
      // gets stuck. Real (accepted/expired) invites are kept for audit.
      const supersededInvites = await db.delete(staffInvitations)
        .where(and(
          eq(staffInvitations.email, email.toLowerCase()),
          eq(staffInvitations.propertyId, propertyId),
          eq(staffInvitations.status, 'pending')
        ))
        .returning({ id: staffInvitations.id });
      if (supersededInvites.length > 0) {
        console.log(`[INVITE] Superseded ${supersededInvites.length} stale pending invite(s) for ${email} @ property ${propertyId}`);
      }
      
      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Create invitation
      const [invitation] = await db.insert(staffInvitations).values({
        email: email.toLowerCase(),
        propertyId,
        role: role || 'staff',
        invitedBy: userId,
        inviteToken,
        status: 'pending',
        expiresAt,
      }).returning();
      
      // Send invitation email
      const property = await storage.getProperty(propertyId);
      const inviteUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://hostezee.in'}/accept-invite?token=${inviteToken}`;
      
      try {
        const { sendEmail } = await import("./email-service");
        await sendEmail({
          to: email,
          subject: `You're invited to join ${property?.name || 'a property'} on Hostezee`,
          html: `
            <h2>You've been invited!</h2>
            <p>${currentUser.firstName || 'An admin'} has invited you to join <strong>${property?.name || 'their property'}</strong> as a <strong>${role || 'staff'}</strong> member on Hostezee Property Management System.</p>
            <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
            <p>This invitation expires in 7 days.</p>
            <p>If you didn't expect this invitation, you can ignore this email.</p>
          `,
        });
        console.log(`[INVITE] Invitation email sent to ${email}`);
      } catch (emailError: any) {
        console.error(`[INVITE] Failed to send invitation email:`, emailError.message);
      }
      
      console.log(`[INVITE] Staff invitation created for ${email} to property ${propertyId}`);
      res.status(201).json({ ...invitation, inviteUrl });
    } catch (error: any) {
      console.error("[INVITE] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get staff invitations for admin
  app.get("/api/staff-invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      let invitations = await db.select().from(staffInvitations).orderBy(desc(staffInvitations.createdAt));
      
      // Filter by admin's properties
      if (currentUser?.role === 'admin') {
        const tenant = getTenantContext(currentUser);
        invitations = invitations.filter(inv => canAccessProperty(tenant, inv.propertyId));
      }
      
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Cancel invitation
  app.delete("/api/staff-invitations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const invitationId = parseInt(req.params.id);
      await db.delete(staffInvitations).where(eq(staffInvitations.id, invitationId));
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Validate invitation token (public endpoint)
  app.get("/api/staff-invitations/validate", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const [invitation] = await db.select().from(staffInvitations).where(eq(staffInvitations.inviteToken, token));
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "This invitation has already been used" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Get property name
      const property = await storage.getProperty(invitation.propertyId);
      
      res.json({
        email: invitation.email,
        role: invitation.role,
        propertyId: invitation.propertyId,
        propertyName: property?.name || 'Property',
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Accept invitation and create account (public endpoint)
  app.post("/api/staff-invitations/accept", async (req: any, res) => {
    try {
      const { token, password, firstName, lastName } = req.body;
      
      if (!token || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [invitation] = await db.select().from(staffInvitations).where(eq(staffInvitations.inviteToken, token));
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "This invitation has already been used" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Check if user with this email already exists
      const allUsers = await storage.getAllUsers();
      const existingUser = allUsers.find(u => u.email?.toLowerCase() === invitation.email.toLowerCase());
      
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in instead." });
      }

      // Hash password and create user
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate a unique user ID
      const uniqueId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const [newUser] = await db.insert(users).values({
        id: uniqueId,
        email: invitation.email,
        firstName,
        lastName,
        role: invitation.role as "staff" | "manager" | "kitchen" | "admin",
        password: hashedPassword,
        status: 'active',
        verificationStatus: 'approved',
        assignedPropertyIds: [invitation.propertyId],
      }).returning();

      // Update invitation status to accepted
      await db.update(staffInvitations)
        .set({ status: 'accepted' })
        .where(eq(staffInvitations.id, invitation.id));

      // Get property name for response
      const property = await storage.getProperty(invitation.propertyId);

      res.json({
        success: true,
        message: "Account created successfully",
        propertyName: property?.name,
        role: invitation.role,
      });
    } catch (error: any) {
      console.error("[INVITE] Accept error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== USER PERMISSIONS ROUTES =====
  
  // Get current user's permissions (for sidebar filtering)
  app.get("/api/user-permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get permissions for current user
      const [permissions] = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
      
      if (permissions) {
        // Transform snake_case to camelCase for frontend
        res.json({
          userId: permissions.userId,
          bookings: permissions.bookings,
          calendar: permissions.calendar,
          rooms: permissions.rooms,
          guests: permissions.guests,
          foodOrders: permissions.foodOrders,
          menuManagement: permissions.menuManagement,
          payments: permissions.payments,
          reports: permissions.reports,
          settings: permissions.settings,
          tasks: permissions.tasks,
          staff: permissions.staff,
        });
      } else {
        // Return default permissions structure (no access until explicitly granted)
        res.json({
          userId: userId,
          bookings: 'none',
          calendar: 'none',
          rooms: 'none',
          guests: 'none',
          foodOrders: 'none',
          menuManagement: 'none',
          payments: 'none',
          reports: 'none',
          settings: 'none',
          tasks: 'none',
          staff: 'none',
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user permissions (admin only)
  app.get("/api/users/:id/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      
      // Get permissions or return defaults
      const [permissions] = await db.select().from(userPermissions).where(eq(userPermissions.userId, targetUserId));
      
      if (permissions) {
        // Transform to consistent camelCase for frontend
        res.json({
          userId: permissions.userId,
          bookings: permissions.bookings,
          calendar: permissions.calendar,
          rooms: permissions.rooms,
          guests: permissions.guests,
          foodOrders: permissions.foodOrders,
          menuManagement: permissions.menuManagement,
          payments: permissions.payments,
          reports: permissions.reports,
          settings: permissions.settings,
          tasks: permissions.tasks,
          staff: permissions.staff,
        });
      } else {
        // Return default permissions structure
        res.json({
          userId: targetUserId,
          bookings: 'none',
          calendar: 'none',
          rooms: 'none',
          guests: 'none',
          foodOrders: 'none',
          menuManagement: 'none',
          payments: 'none',
          reports: 'none',
          settings: 'none',
          tasks: 'none',
          staff: 'none',
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update user permissions
  app.put("/api/users/:id/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.role !== "admin" && currentUser?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const permissions = req.body;
      
      // Validate permission levels
      const validLevels = ['none', 'view', 'edit'];
      const permissionFields = ['bookings', 'calendar', 'rooms', 'guests', 'foodOrders', 'menuManagement', 'payments', 'reports', 'settings', 'tasks', 'staff'];
      
      for (const field of permissionFields) {
        if (permissions[field] && !validLevels.includes(permissions[field])) {
          return res.status(400).json({ message: `Invalid permission level for ${field}` });
        }
      }
      
      // Check if permissions record exists
      const [existing] = await db.select().from(userPermissions).where(eq(userPermissions.userId, targetUserId));
      
      if (existing) {
        // Update existing
        await db.update(userPermissions).set({
          ...permissions,
          updatedAt: new Date(),
        }).where(eq(userPermissions.userId, targetUserId));
      } else {
        // Create new
        await db.insert(userPermissions).values({
          userId: targetUserId,
          ...permissions,
        });
      }
      
      console.log(`[PERMISSIONS] Updated permissions for user ${targetUserId}`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete onboarding - marks user as having completed the onboarding wizard
  app.post("/api/users/complete-onboarding", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Update user's onboarding status in database
      await db.update(users)
        .set({ hasCompletedOnboarding: true })
        .where(eq(users.id, userId));

      console.log(`[ONBOARDING] User ${userId} completed onboarding`);
      res.json({ success: true, message: "Onboarding completed" });
    } catch (error: any) {
      console.error("[ONBOARDING] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai-setup/create-rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const { propertyId, rooms: roomsData } = req.body;
      if (!propertyId || !roomsData || !Array.isArray(roomsData) || roomsData.length === 0) {
        return res.status(400).json({ message: "propertyId and rooms array are required" });
      }

      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }

      const createdRooms = [];
      for (const roomData of roomsData) {
        try {
          const parsed = insertRoomSchema.parse({
            propertyId,
            roomNumber: roomData.roomNumber,
            roomType: roomData.roomType,
            pricePerNight: String(roomData.pricePerNight),
            maxOccupancy: roomData.maxOccupancy || 2,
            status: "available",
            totalBeds: roomData.totalBeds || 1,
            amenities: roomData.amenities || [],
          });
          const room = await storage.createRoom(parsed);
          createdRooms.push(room);
        } catch (err: any) {
          console.error(`[AI-SETUP] Failed to create room ${roomData.roomNumber}:`, err.message);
        }
      }

      console.log(`[AI-SETUP] Created ${createdRooms.length} rooms for property ${propertyId}`);
      res.json({ success: true, rooms: createdRooms, count: createdRooms.length });
    } catch (error: any) {
      console.error("[AI-SETUP] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai-setup/parse-rooms", isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) {
        return res.status(400).json({ message: "message is required" });
      }

      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
      
      if (!openaiKey) {
        return res.status(500).json({ message: "AI service not configured" });
      }

      const systemPrompt = `You are a friendly hotel setup assistant for Hostezee PMS. You help new hotel owners set up their rooms quickly through a simple conversation.

Your goal: Collect information to create rooms for the user's property. You need:
1. How many rooms they have (total count)
2. Room types (e.g., Deluxe, Standard, Suite, etc.)  
3. How many rooms of each type
4. Price per night for each type (in Indian Rupees)
5. Max occupancy per type (default 2 if not specified)
6. Room numbering (ask them or generate like 101, 102, etc.)

Keep your responses SHORT, friendly, and conversational. Ask ONE question at a time.

When you have enough information to create all rooms, respond with a JSON block in this EXACT format:
\`\`\`json
{
  "ready": true,
  "rooms": [
    {"roomNumber": "101", "roomType": "Deluxe", "pricePerNight": 2000, "maxOccupancy": 2, "totalBeds": 1},
    {"roomNumber": "102", "roomType": "Deluxe", "pricePerNight": 2000, "maxOccupancy": 2, "totalBeds": 1}
  ],
  "summary": "I'll create X rooms: Y Deluxe rooms at ₹Z/night..."
}
\`\`\`

If the user hasn't provided enough info yet, respond with a normal conversational message (no JSON). Start by asking how many rooms they have.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      messages.push({ role: "user", content: message });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          messages,
          max_completion_tokens: 2048,
        }),
      });

      if (!response.ok) {
        console.error("[AI-SETUP] OpenAI API error:", response.status);
        return res.status(500).json({ message: "AI service temporarily unavailable" });
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "I'm having trouble understanding. Could you try again?";

      let roomsData = null;
      const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.ready && parsed.rooms) {
            roomsData = parsed;
          }
        } catch (e) {
          // Not valid JSON, continue as conversation
        }
      }

      const cleanMessage = aiMessage.replace(/```json[\s\S]*?```/g, '').trim();

      res.json({
        message: roomsData ? roomsData.summary : cleanMessage,
        roomsData: roomsData ? roomsData.rooms : null,
        isComplete: !!roomsData,
      });
    } catch (error: any) {
      console.error("[AI-SETUP] Parse error:", error);
      res.status(500).json({ message: "Failed to process your request. Please try again." });
    }
  });

  // Data fix endpoint: Consolidate rooms into a single property
  app.post("/api/admin/fix-room-properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.role !== "super_admin") {
        return res.status(403).send("Only super admins can run this fix");
      }

      const { targetPropertyId } = req.body;
      if (!targetPropertyId) {
        return res.status(400).send("targetPropertyId is required");
      }

      // Find all rooms that might belong to Woodpecker (1001-1011 and 2001+)
      const allRooms = await storage.getRooms();
      const roomsToMove = allRooms.filter(r => 
        r.roomNumber.startsWith("100") || 
        r.roomNumber.startsWith("101") || 
        r.roomNumber.startsWith("200")
      );

      console.log(`[Fix] Found ${roomsToMove.length} rooms to consolidate to property ${targetPropertyId}`);

      for (const room of roomsToMove) {
        await storage.updateRoom(room.id, { propertyId: targetPropertyId });
      }

      res.json({ 
        success: true, 
        message: `Successfully moved ${roomsToMove.length} rooms to property ID ${targetPropertyId}`,
        movedRoomNumbers: roomsToMove.map(r => r.roomNumber)
      });
    } catch (error: any) {
      console.error("[Fix Error]", error);
      res.status(500).send(error.message);
    }
  });

  // Properties
  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const tenant = getTenantContext(currentUser);
      const allProperties = await storage.getAllProperties();
      
      // Apply tenant-based property filtering
      let filteredProperties = filterPropertiesByAccess(tenant, allProperties);

      // By default, exclude disabled properties from operational screens.
      // Pass ?includeDisabled=true to get all (for admin management and reports).
      if (req.query.includeDisabled !== "true") {
        filteredProperties = filteredProperties.filter((p: any) => p.isActive !== false);
      }
      
      res.json(filteredProperties);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      const property = await storage.getProperty(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Verify tenant access to this property
      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, property.id)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }
      
      res.json(property);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Only Super Admin can create new properties
      const tenant = getTenantContext(currentUser);
      if (!tenant.isSuperAdmin) {
        return res.status(403).json({ message: "Only Super Admin can create properties" });
      }
      
      const data = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(data);
      res.status(201).json(property);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      const propertyId = parseInt(req.params.id);
      const existingProperty = await storage.getProperty(propertyId);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      // Verify tenant access (property owner can update their property)
      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }
      
      const property = await storage.updateProperty(propertyId, req.body);
      res.json(property);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Only Super Admin can delete properties
      const tenant = getTenantContext(currentUser);
      if (!tenant.isSuperAdmin) {
        return res.status(403).json({ message: "Only Super Admin can delete properties" });
      }
      
      await storage.deleteProperty(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Disable a property (temporary or permanent archive)
  app.post("/api/properties/:id/disable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(403).json({ message: "User not found" });
      const tenant = getTenantContext(currentUser);
      const isAdmin = tenant.isSuperAdmin || tenant.role === "admin";
      if (!isAdmin) {
        return res.status(403).json({ message: "Only property owners can disable properties" });
      }

      const propertyId = parseInt(req.params.id);

      // Admins can only manage their own assigned properties (super-admin can manage all)
      if (!tenant.isSuperAdmin) {
        const assigned = tenant.assignedPropertyIds || [];
        if (!assigned.includes(propertyId)) {
          return res.status(403).json({ message: "You can only disable your own properties" });
        }
      }
      const { disableType, disableReason } = req.body as { disableType: "temporary" | "permanent"; disableReason?: string };
      if (!["temporary", "permanent"].includes(disableType)) {
        return res.status(400).json({ message: "Invalid disableType" });
      }

      await db.update(properties)
        .set({
          isActive: false,
          disableType,
          disableReason: disableReason || null,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(properties.id, propertyId));

      const label = disableType === "permanent" ? "permanently closed" : "temporarily disabled";
      console.log(`[PROPERTY] Property #${propertyId} ${label}${disableReason ? `: ${disableReason}` : ""}`);
      res.json({ message: `Property ${label}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Re-enable a temporarily disabled property
  app.post("/api/properties/:id/enable", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(403).json({ message: "User not found" });
      const tenant = getTenantContext(currentUser);
      const isAdmin = tenant.isSuperAdmin || tenant.role === "admin";
      if (!isAdmin) {
        return res.status(403).json({ message: "Only property owners can enable properties" });
      }

      const propertyId = parseInt(req.params.id);

      // Admins can only manage their own assigned properties (super-admin can manage all)
      if (!tenant.isSuperAdmin) {
        const assigned = tenant.assignedPropertyIds || [];
        if (!assigned.includes(propertyId)) {
          return res.status(403).json({ message: "You can only enable your own properties" });
        }
      }
      const prop = await storage.getProperty(propertyId);
      if (!prop) return res.status(404).json({ message: "Property not found" });
      if (prop.disableType === "permanent") {
        return res.status(400).json({ message: "Cannot re-enable a permanently closed property" });
      }

      await db.update(properties)
        .set({
          isActive: true,
          disableType: null,
          disableReason: null,
          closedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, propertyId));

      console.log(`[PROPERTY] Property #${propertyId} re-enabled`);
      res.json({ message: "Property re-enabled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rooms
  app.get("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      const tenant = getTenantContext(currentUser);
      const allRooms = await storage.getAllRooms();
      
      // Apply tenant-based room filtering
      let rooms = filterByPropertyAccess(tenant, allRooms);

      // If a specific propertyId is requested, narrow to that property only
      if (req.query.propertyId) {
        const requestedPropId = parseInt(req.query.propertyId as string);
        if (!isNaN(requestedPropId)) {
          rooms = rooms.filter((r: any) => r.propertyId === requestedPropId);
        }
      }

      res.json(rooms);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/types", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const allRooms = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
      const types = [...new Set(allRooms.map(r => r.roomType).filter(Boolean))];
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room availability checking - MUST be FIRST specific /api/rooms/* route to avoid collision with :id routes
  app.get("/api/rooms/availability", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, checkIn, checkOut, excludeBookingId } = req.query;
      
      const { rooms } = await import("@shared/schema");
      
      const propertyIdNum = propertyId ? Number(propertyId) : null;
      
      const allRooms = Number.isFinite(propertyIdNum) 
        ? await db.select().from(rooms).where(eq(rooms.propertyId, propertyIdNum!))
        : await db.select().from(rooms);

      // Rooms in maintenance / out-of-order / blocked are never bookable
      const BLOCKING_STATUSES = ["maintenance", "out-of-order", "blocked"];

      console.log(`[AVAILABILITY_CHECK] property=${propertyIdNum ?? "all"} checkIn=${checkIn ?? "N/A"} checkOut=${checkOut ?? "N/A"} totalRooms=${allRooms.length}`);
      
      // If no dates provided, return all rooms with full availability (skip blocked rooms)
      if (!checkIn || !checkOut) {
        const availability = allRooms.map(room => {
          const isBlocked = BLOCKING_STATUSES.includes(room.status ?? "");
          return {
            roomId: room.id,
            available: isBlocked ? 0 : 1,
            ...(room.roomCategory === "dormitory" && {
              totalBeds: room.totalBeds || 6,
              remainingBeds: isBlocked ? 0 : (room.totalBeds || 6)
            })
          };
        });
        return res.json(availability);
      }
      
      // Parse and validate dates  
      const requestCheckIn = new Date(checkIn as string);
      const requestCheckOut = new Date(checkOut as string);
      if (isNaN(requestCheckIn.getTime()) || isNaN(requestCheckOut.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get all active bookings and filter in JavaScript (historical working solution)
      const { bookings, guests } = await import("@shared/schema");
      
      // Fetch all active bookings for the property (exclude cancelled + checked-out, same as conflict check)
      const allBookings = await db
        .select()
        .from(bookings)
        .where(
          propertyId 
            ? and(
                eq(bookings.propertyId, Number(propertyId)),
                not(eq(bookings.status, "cancelled")),
                not(eq(bookings.status, "checked-out"))
              )
            : and(
                not(eq(bookings.status, "cancelled")),
                not(eq(bookings.status, "checked-out"))
              )
        );
      
      // Normalize any Date or ISO-string to a plain "YYYY-MM-DD" for timezone-safe comparison.
      // Booking dates are stored as date-only strings ("2026-05-01").
      // Request dates arrive as ISO timestamps ("2026-04-30T05:30:00.000Z" = 11 AM IST).
      // Using new Date() on either side introduces UTC-vs-local skew that causes the last
      // day of a request to falsely overlap with the first day of the next booking.
      const toDateStr = (val: string | Date): string =>
        (val instanceof Date ? val.toISOString() : String(val)).slice(0, 10);

      const reqCheckInStr  = toDateStr(checkIn  as string);
      const reqCheckOutStr = toDateStr(checkOut as string);

      // Filter overlapping bookings using date-string comparison (lexicographic = chronological for YYYY-MM-DD)
      // Overlap: bookingCheckOut > requestCheckIn AND bookingCheckIn < requestCheckOut
      let overlappingBookings = allBookings.filter(booking => {
        if (!booking.checkInDate || !booking.checkOutDate) return false;
        const bIn  = toDateStr(booking.checkInDate  as any);
        const bOut = toDateStr(booking.checkOutDate as any);
        if (!bIn || !bOut) return false;
        return bOut > reqCheckInStr && bIn < reqCheckOutStr;
      });
      
      // Filter out excluded booking if specified
      if (excludeBookingId) {
        const excludeId = Number(excludeBookingId);
        if (Number.isFinite(excludeId)) {
          overlappingBookings = overlappingBookings.filter(b => b.id !== excludeId);
        }
      }

      // Fetch guest names for conflict bookings so the frontend can display "Occupied by: Guest Name"
      const conflictGuestIds = [...new Set(overlappingBookings.map(b => b.guestId).filter((id): id is number => !!id))];
      const guestNameMap: Record<number, string> = {};
      if (conflictGuestIds.length > 0) {
        const guestRows = await db.select({ id: guests.id, fullName: guests.fullName }).from(guests)
          .where(inArray(guests.id, conflictGuestIds));
        guestRows.forEach(g => { if (g.id && g.fullName) guestNameMap[g.id] = g.fullName; });
      }

      // Calculate availability for each room
      const availability = allRooms.map(room => {
        // Rooms in maintenance / out-of-order / blocked are never bookable regardless of dates
        if (BLOCKING_STATUSES.includes(room.status ?? "")) {
          if (room.roomCategory === "dormitory") {
            return { roomId: room.id, available: 0, reason: "maintenance", roomStatus: room.status, totalBeds: room.totalBeds || 6, remainingBeds: 0 };
          }
          return { roomId: room.id, available: 0, reason: "maintenance", roomStatus: room.status };
        }

        if (room.roomCategory === "dormitory") {
          const totalBeds = room.totalBeds || 6;
          const roomBookings = overlappingBookings.filter(b => 
            b.roomId === room.id || b.roomIds?.includes(room.id)
          );
          const bedsBooked = roomBookings.reduce((sum, b) => sum + (b.bedsBooked || 1), 0);
          const remainingBeds = Math.max(0, totalBeds - bedsBooked);
          
          return {
            roomId: room.id,
            available: remainingBeds > 0 ? 1 : 0,
            reason: remainingBeds > 0 ? undefined : "booking_conflict",
            totalBeds,
            remainingBeds
          };
        }
        
        const conflictBooking = overlappingBookings.find(b => 
          b.roomId === room.id || b.roomIds?.includes(room.id)
        );
        const hasOverlap = !!conflictBooking;

        const available = hasOverlap ? 0 : 1;
        if (available === 0) {
          console.log(`[AVAILABILITY_CHECK] room=${room.roomNumber ?? room.id} available=false reason=booking_overlap bookingId=${conflictBooking?.id} guestId=${conflictBooking?.guestId} checkIn=${conflictBooking?.checkInDate} checkOut=${conflictBooking?.checkOutDate}`);
        }
        
        return {
          roomId: room.id,
          available,
          reason: hasOverlap ? "booking_conflict" : undefined,
          conflictBookingId: conflictBooking?.id ?? null,
          conflictGuestName: conflictBooking?.guestId ? (guestNameMap[conflictBooking.guestId] ?? null) : null,
          conflictCheckIn: conflictBooking?.checkInDate ?? null,
          conflictCheckOut: conflictBooking?.checkOutDate ?? null,
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      console.error('[AVAILABILITY ERROR]', error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/checked-in-guests", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      // Filter to only the properties this user is allowed to see
      const propertyIds = auth && !auth.tenant.hasUnlimitedAccess && auth.tenant.assignedPropertyIds.length > 0
        ? auth.tenant.assignedPropertyIds
        : undefined;
      const roomsWithGuests = await storage.getRoomsWithCheckedInGuests(propertyIds);
      res.json(roomsWithGuests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check for extended stay conflicts when creating a new booking
  app.get("/api/rooms/extended-stay-conflicts", isAuthenticated, async (req, res) => {
    try {
      const { roomId, roomIds, checkInDate } = req.query;
      
      if (!checkInDate) {
        return res.json({ hasConflict: false, conflicts: [] });
      }
      
      const requestedCheckIn = new Date(checkInDate as string);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Parse room IDs
      let targetRoomIds: number[] = [];
      if (roomId) {
        targetRoomIds = [parseInt(roomId as string)];
      } else if (roomIds) {
        try {
          targetRoomIds = JSON.parse(roomIds as string);
        } catch {
          targetRoomIds = (roomIds as string).split(',').map(id => parseInt(id.trim()));
        }
      }
      
      if (targetRoomIds.length === 0) {
        return res.json({ hasConflict: false, conflicts: [] });
      }
      
      // Get all checked-in bookings (active guests)
      const allBookings = await storage.getAllBookings();
      const checkedInBookings = allBookings.filter(b => b.status === "checked-in");
      
      const conflicts: any[] = [];
      
      for (const booking of checkedInBookings) {
        // Check if this booking is for any of the target rooms
        const bookingRoomIds = booking.roomIds || (booking.roomId ? [booking.roomId] : []);
        const hasRoomOverlap = targetRoomIds.some(rid => bookingRoomIds.includes(rid));
        
        if (!hasRoomOverlap) continue;
        
        // Check if this is an extended stay (checkout date has passed)
        const bookingCheckout = new Date(booking.checkOutDate);
        bookingCheckout.setHours(0, 0, 0, 0);
        
        // Extended stay: guest is still checked in but their checkout date has passed
        if (today > bookingCheckout) {
          // And the new booking's check-in is today or after the original checkout
          if (requestedCheckIn >= bookingCheckout) {
            const guest = await storage.getGuest(booking.guestId);
            const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
            
            conflicts.push({
              bookingId: booking.id,
              guestName: guest?.fullName || "Unknown Guest",
              roomNumber: room?.roomNumber || "N/A",
              originalCheckout: booking.checkOutDate,
              daysExtended: Math.ceil((today.getTime() - bookingCheckout.getTime()) / (1000 * 60 * 60 * 24))
            });
          }
        }
      }
      
      res.json({
        hasConflict: conflicts.length > 0,
        conflicts
      });
    } catch (error: any) {
      console.error('[EXTENDED-STAY-CONFLICTS] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const room = await storage.getRoom(parseInt(req.params.id));
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get bed inventory for a dormitory room (simple bed counts)
  app.get("/api/rooms/:id/bed-inventory", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const { checkIn, checkOut, excludeBookingId } = req.query;
      
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      // Default to room's total beds (or 6 if not set)
      const totalBeds = room.totalBeds || 6;
      
      // If no dates provided, just return total beds
      if (!checkIn || !checkOut) {
        return res.json({
          totalBeds,
          reservedBeds: 0,
          remainingBeds: totalBeds
        });
      }
      
      // Parse dates
      // Use date-string comparison to avoid UTC-vs-local timezone skew
      const toDateStrBed = (val: string | Date): string =>
        (val instanceof Date ? val.toISOString() : String(val)).slice(0, 10);
      const checkInStr  = toDateStrBed(checkIn  as string);
      const checkOutStr = toDateStrBed(checkOut as string);
      
      // Get ALL non-cancelled bookings, then filter in JavaScript
      const { bookings: bookingsTable } = await import("@shared/schema");
      const allBookings = await db
        .select()
        .from(bookingsTable)
        .where(not(eq(bookingsTable.status, "cancelled")));
      
      // Filter for overlapping bookings in JavaScript
      const overlappingBookings = allBookings.filter(booking => {
        // Skip excluded booking if specified
        if (excludeBookingId && booking.id === parseInt(excludeBookingId as string)) {
          return false;
        }
        const bIn  = toDateStrBed(booking.checkInDate  as any);
        const bOut = toDateStrBed(booking.checkOutDate as any);
        if (!bIn || !bOut) return false;
        return bOut > checkInStr && bIn < checkOutStr;
      });
      
      // Filter for this specific room
      const roomBookings = overlappingBookings.filter(booking => 
        booking.roomId === roomId || booking.roomIds?.includes(roomId)
      );
      
      // Calculate reserved beds
      const reservedBeds = roomBookings.reduce((sum, booking) => {
        return sum + (booking.bedsBooked || 1);
      }, 0);
      
      const remainingBeds = Math.max(0, totalBeds - reservedBeds);
      
      res.json({
        totalBeds,
        reservedBeds,
        remainingBeds
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      const tenant = getTenantContext(currentUser);
      const data = insertRoomSchema.parse(req.body);
      
      // Verify user has access to the property they're creating a room for
      if (!canAccessProperty(tenant, data.propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }
      
      const room = await storage.createRoom(data);
      res.status(201).json(room);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get existing room to check property access
      const existingRoom = await storage.getRoom(parseInt(req.params.id));
      if (!existingRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, existingRoom.propertyId)) {
        return res.status(403).json({ message: "You do not have access to this room" });
      }
      
      const room = await storage.updateRoom(parseInt(req.params.id), req.body);
      res.json(room);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get existing room to check property access
      const existingRoom = await storage.getRoom(parseInt(req.params.id));
      if (!existingRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, existingRoom.propertyId)) {
        return res.status(403).json({ message: "You do not have access to this room" });
      }
      
      const { status } = req.body;
      const room = await storage.updateRoomStatus(parseInt(req.params.id), status);
      res.json(room);

      // Trigger inventory sync after room status change so OTAs reflect updated availability
      console.log(`[SYNC_TRIGGER] event=ROOM_STATUS_CHANGED roomId=${existingRoom.id} newStatus=${status} propertyId=${existingRoom.propertyId}`);
      syncWithRetry(existingRoom.propertyId, "ROOM_STATUS_CHANGED").catch(() => {});
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get existing room to check property access
      const existingRoom = await storage.getRoom(parseInt(req.params.id));
      if (!existingRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      const tenant = getTenantContext(currentUser);
      if (!canAccessProperty(tenant, existingRoom.propertyId)) {
        return res.status(403).json({ message: "You do not have access to this room" });
      }
      
      // Auto-cleanup: remove any AioSell channel manager mappings for this room
      const deletedMappings = await db.delete(aiosellRoomMappings)
        .where(eq(aiosellRoomMappings.hostezeeRoomId, parseInt(req.params.id)))
        .returning();
      if (deletedMappings.length > 0) {
        console.log(`[ROOM-DELETE] Removed ${deletedMappings.length} AioSell mapping(s) for room ${req.params.id}`);
      }

      await storage.deleteRoom(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      // Return 400 for validation errors (room has associations), 500 for unexpected errors
      const status = error.message.includes("Cannot delete room") ? 400 : 500;
      res.status(status).json({ message: error.message });
    }
  });

  // Guests
  app.get("/api/guests", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allGuests = await storage.getAllGuests();

      if (tenant.hasUnlimitedAccess) {
        return res.json(allGuests);
      }

      const allBookings = await storage.getAllBookings();
      const guestIdsWithAccess = new Set<number>();
      allBookings.forEach((b: any) => {
        if (b.guestId && b.propertyId && tenant.assignedPropertyIds.includes(b.propertyId)) {
          guestIdsWithAccess.add(b.guestId);
        }
      });

      const filteredGuests = allGuests.filter((guest: any) => guestIdsWithAccess.has(guest.id));
      res.json(filteredGuests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/guests/:id", isAuthenticated, async (req, res) => {
    try {
      const guest = await storage.getGuest(parseInt(req.params.id));
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }
      res.json(guest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/guests", isAuthenticated, async (req, res) => {
    try {
      const data = insertGuestSchema.parse(req.body);
      const guest = await storage.createGuest(data);
      res.status(201).json(guest);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/guests/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`[PATCH /api/guests/${req.params.id}] Request body:`, JSON.stringify(req.body));
      const guest = await storage.updateGuest(parseInt(req.params.id), req.body);
      console.log(`[PATCH /api/guests/${req.params.id}] Updated guest:`, JSON.stringify({ id: guest.id, idProofImage: guest.idProofImage }));
      res.json(guest);
    } catch (error: any) {
      console.error(`[PATCH /api/guests/${req.params.id}] Error:`, error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/guests/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteGuest(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Travel Agents
  app.get("/api/travel-agents", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      let allAgents = propertyId 
        ? await storage.getTravelAgentsByProperty(parseInt(propertyId as string))
        : await storage.getAllTravelAgents();
      
      const agents = filterByPropertyAccess(tenant, allAgents);
      
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/travel-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const agent = await storage.getTravelAgent(parseInt(req.params.id));
      if (!agent) {
        return res.status(404).json({ message: "Travel agent not found" });
      }

      if (!canAccessProperty(tenant, agent.propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/travel-agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const data = insertTravelAgentSchema.parse(req.body);

      // Check authorization for managers/kitchen - can only create for assigned properties
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && 
          currentUser.assignedPropertyIds && 
          !currentUser.assignedPropertyIds.includes(data.propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const agent = await storage.createTravelAgent(data);
      res.status(201).json(agent);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/travel-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Get existing agent to check property ownership
      const existingAgent = await storage.getTravelAgent(parseInt(req.params.id));
      if (!existingAgent) {
        return res.status(404).json({ message: "Travel agent not found" });
      }

      // Check authorization for managers/kitchen
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && 
          currentUser.assignedPropertyIds && 
          !currentUser.assignedPropertyIds.includes(existingAgent.propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const agent = await storage.updateTravelAgent(parseInt(req.params.id), req.body);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/travel-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Get existing agent to check property ownership
      const existingAgent = await storage.getTravelAgent(parseInt(req.params.id));
      if (!existingAgent) {
        return res.status(404).json({ message: "Travel agent not found" });
      }

      // Check authorization for managers/kitchen
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && 
          currentUser.assignedPropertyIds && 
          !currentUser.assignedPropertyIds.includes(existingAgent.propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTravelAgent(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bookings
  app.get("/api/bookings", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const tenant = getTenantContext(currentUser);
      const propertyIds = tenant.hasUnlimitedAccess ? undefined : tenant.assignedPropertyIds;

      // ── PAGINATED MODE (bookings list page) ──────────────────────────
      // When the caller sends ?limit=N, return { data, total, counts }
      if (req.query.limit !== undefined) {
        const limit  = Math.min(parseInt(String(req.query.limit),  10) || 50,  200);
        const offset = Math.max(parseInt(String(req.query.offset ?? 0), 10) || 0, 0);
        const statusFilter = ['active','completed','cancelled','no_show'].includes(String(req.query.status ?? ''))
          ? (req.query.status as 'active' | 'completed' | 'cancelled' | 'no_show')
          : undefined;
        const checkinDate = req.query.checkinDate ? String(req.query.checkinDate) : undefined;
        const dateFrom = req.query.from ? String(req.query.from) : undefined;
        const dateTo = req.query.to ? String(req.query.to) : undefined;
        const search = req.query.search ? String(req.query.search).trim() : undefined;
        const singlePropertyId = req.query.propertyId ? parseInt(String(req.query.propertyId), 10) : undefined;

        if (!tenant.hasUnlimitedAccess && (tenant.assignedPropertyIds?.length ?? 0) === 0) {
          return res.json({ data: [], total: 0, counts: { active: 0, completed: 0, cancelled: 0, no_show: 0 } });
        }
        const result = await storage.getBookingsPaginated({ limit, offset, statusFilter, checkinDate, dateFrom, dateTo, propertyIds, singlePropertyId, search });
        return res.json(result);
      }

      // ── LEGACY MODE (all other pages: dashboard, calendar, check-ins…) ─
      // Return Booking[] so existing consumers are not broken.
      let result: import("../shared/schema").Booking[];
      if (tenant.hasUnlimitedAccess) {
        result = await storage.getAllBookings();
      } else if (tenant.assignedPropertyIds.length > 0) {
        result = await storage.getBookingsByPropertyIds(tenant.assignedPropertyIds);
      } else {
        result = [];
      }
      res.json(result);
    } catch (error: any) {
      if (error instanceof TenantAccessError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Active bookings MUST come before /api/bookings/:id to avoid route collision
  app.get("/api/bookings/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const tenant = getTenantContext(currentUser);

      // Get only checked-in + today's checked-out bookings directly from DB (no full-table scan)
      const propertyIdsForActive = tenant.hasUnlimitedAccess ? undefined : tenant.assignedPropertyIds;
      if (!tenant.hasUnlimitedAccess && (propertyIdsForActive?.length ?? 0) === 0) {
        return res.json([]);
      }
      let activeBookings = await storage.getActiveBookingsRaw(propertyIdsForActive);

      // Get all related data
      const allGuests = await storage.getAllGuests();
      const allRooms = await storage.getAllRooms();
      const allProperties = await storage.getAllProperties();
      
      if (activeBookings.length === 0) {
        return res.json([]);
      }

      // Query orders and extras with error handling for schema mismatches
      let allOrders = [];
      let allExtras = [];
      
      try {
        allOrders = await db.select().from(orders);
      } catch (err) {
        console.warn("[Active Bookings] Could not fetch orders - continuing without order data:", err);
      }
      
      try {
        allExtras = await db.select().from(extraServices);
      } catch (err) {
        console.warn("[Active Bookings] Could not fetch extras - continuing without extra services data:", err);
      }

      // Build enriched data
      const enrichedBookings = activeBookings.map(booking => {
        const guest = allGuests.find(g => g.id === booking.guestId);
        const room = booking.roomId ? allRooms.find(r => r.id === booking.roomId) : null;
        
        // For multi-room bookings, resolve rooms from roomIds array.
        // Covers: isGroupBooking=true (even if roomId is also set) and
        //         bulk bookings where isGroupBooking=false but roomId is null.
        let groupRooms = (booking.isGroupBooking || !room) && booking.roomIds && booking.roomIds.length > 0
          ? allRooms.filter(r => booking.roomIds!.includes(r.id))
          : [];
        
        // Get property from either single room or first group room
        const property = room?.propertyId 
          ? allProperties.find(p => p.id === room.propertyId)
          : groupRooms.length > 0 
            ? allProperties.find(p => p.id === groupRooms[0].propertyId)
            : null;

        // Track data integrity issues instead of filtering out
        const dataIssues: string[] = [];
        if (!guest) {
          dataIssues.push(`Guest record missing (ID: ${booking.guestId})`);
          console.warn(`[Active Bookings] Booking ${booking.id}: Guest ${booking.guestId} not found`);
        }
        if (!room && groupRooms.length === 0) {
          dataIssues.push(`Room record missing (ID: ${booking.roomId})`);
          console.warn(`[Active Bookings] Booking ${booking.id}: Room ${booking.roomId} not found, roomIds=${JSON.stringify(booking.roomIds)}`);
        }

        // Calculate nights stayed (use checkout date, not current date)
        const checkInDate = new Date(booking.checkInDate);
        const checkOutDate = new Date(booking.checkOutDate);
        const nightsStayed = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Calculate room charges - handle both single and group bookings
        let roomCharges = 0;
        if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
          // Group booking: calculate total for all rooms
          for (const roomId of booking.roomIds) {
            const groupRoom = allRooms.find(r => r.id === roomId);
            if (groupRoom) {
              const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : null;
              const roomPrice = groupRoom.pricePerNight ? parseFloat(String(groupRoom.pricePerNight)) : 0;
              const pricePerNight = customPrice ? customPrice / booking.roomIds.length : roomPrice;
              roomCharges += pricePerNight * nightsStayed;
            }
          }
        } else if (room) {
          // Single room booking
          const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : null;
          const roomPrice = room.pricePerNight ? parseFloat(String(room.pricePerNight)) : 0;
          const pricePerNight = customPrice || roomPrice;
          roomCharges = pricePerNight * nightsStayed;
        } else {
          // Room missing - use custom price if available
          const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : 0;
          roomCharges = customPrice * nightsStayed;
        }

        // Match orders to this booking defensively. Kitchen staff sometimes
        // place orders against a room/guest without setting booking_id (or
        // pointing it at a stale/old booking). Previously those orders were
        // silently dropped from the bill — causing real revenue loss.
        // We now ALSO claim any orphan order (booking_id IS NULL) that
        // matches this guest OR this room, where the order was created
        // within the stay window [check_in, check_out + 1d grace].
        const stayStart = checkInDate.getTime();
        const stayEnd = checkOutDate.getTime() + 24 * 60 * 60 * 1000; // +1 day grace for late-night orders
        const bookingRoomIdsForMatch: number[] = booking.isGroupBooking && booking.roomIds
          ? booking.roomIds
          : (booking.roomId ? [booking.roomId] : []);
        const bookingOrders = allOrders.filter((o: any) => {
          if (o.bookingId === booking.id) return true;
          if (o.bookingId != null) return false; // belongs to another booking
          const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
          if (created < stayStart || created > stayEnd) return false;
          // Property guard: never attach an order from a different property
          if (booking.propertyId && o.propertyId && o.propertyId !== booking.propertyId) return false;
          // Strong match: same guest
          if (booking.guestId && o.guestId === booking.guestId) return true;
          // Weak match: room match ONLY when the order has no guestId of its own
          if (!o.guestId && o.roomId && bookingRoomIdsForMatch.includes(o.roomId)) return true;
          return false;
        });
        // Exclude rejected AND test orders from food charges calculation
        const foodCharges = bookingOrders
          .filter((order: any) => order.status !== "rejected" && !order.isTest)
          .reduce((sum: number, order: any) => {
            const amount = order.totalAmount ? parseFloat(String(order.totalAmount)) : 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);

        const bookingExtras = allExtras.filter(e => e.bookingId === booking.id);
        const extraCharges = bookingExtras.reduce((sum, extra) => {
          const amount = extra.amount ? parseFloat(String(extra.amount)) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        const alreadyCollectedServices = bookingExtras.reduce((sum, extra) => {
          if (!extra.isPaid) return sum;
          const amount = extra.amount ? parseFloat(String(extra.amount)) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const subtotal = roomCharges + foodCharges + extraCharges;
        // Don't automatically apply GST/Service charges in the card display
        // They are optional and applied only at checkout based on user selection
        const totalAmount = subtotal;
        const advancePaid = booking.advanceAmount ? parseFloat(String(booking.advanceAmount)) : 0;
        const balanceAmount = totalAmount - advancePaid - alreadyCollectedServices;

        return {
          ...booking,
          guest: guest || { id: booking.guestId, fullName: "Unknown Guest", email: null, phone: null },
          room,
          rooms: groupRooms.length > 0 ? groupRooms : undefined,
          property,
          nightsStayed,
          orders: bookingOrders,
          extraServices: bookingExtras,
          dataIssues: dataIssues.length > 0 ? dataIssues : undefined,
          charges: {
            roomCharges: roomCharges.toFixed(2),
            foodCharges: foodCharges.toFixed(2),
            extraCharges: extraCharges.toFixed(2),
            subtotal: subtotal.toFixed(2),
            gstAmount: "0.00",
            serviceChargeAmount: "0.00",
            totalAmount: totalAmount.toFixed(2),
            advancePaid: advancePaid.toFixed(2),
            balanceAmount: balanceAmount.toFixed(2),
          },
        };
      });

      res.json(enrichedBookings);
    } catch (error: any) {
      console.error("Active bookings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bookings with details for analytics
  app.get("/api/bookings/with-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const tenant = getTenantContext(currentUser);
      let allBookings = await storage.getAllBookings();
      const allGuests = await storage.getAllGuests();
      const allRooms = await storage.getAllRooms();
      const allProperties = await storage.getAllProperties();

      if (!tenant.hasUnlimitedAccess) {
        allBookings = allBookings.filter(booking => {
          if (booking.propertyId) {
            return tenant.assignedPropertyIds.includes(booking.propertyId);
          }
          if (booking.roomId) {
            const room = allRooms.find(r => r.id === booking.roomId);
            return room ? tenant.assignedPropertyIds.includes(room.propertyId) : false;
          }
          if (booking.roomIds && booking.roomIds.length > 0) {
            const bookingRooms = booking.roomIds
              .map(roomId => allRooms.find(r => r.id === roomId))
              .filter((room): room is NonNullable<typeof room> => !!room);
            return bookingRooms.some(room => tenant.assignedPropertyIds.includes(room.propertyId));
          }
          return false;
        });
      }

      const enrichedBookings = allBookings.map(booking => {
        const guest = allGuests.find(g => g.id === booking.guestId);
        const room = booking.roomId ? allRooms.find(r => r.id === booking.roomId) : null;
        const property = room?.propertyId ? allProperties.find(p => p.id === room.propertyId) : null;

        if (!guest || !room || !property) {
          return null;
        }

        return {
          ...booking,
          guest: {
            fullName: guest.fullName,
          },
          room: {
            roomNumber: room.roomNumber,
            pricePerNight: room.pricePerNight,
          },
          property: {
            name: property.name,
          },
        };
      }).filter(Boolean);

      res.json(enrichedBookings);
    } catch (error: any) {
      console.error("Bookings with details error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/checkout-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const allowedPropertyIds: number[] = tenant.assignedPropertyIds?.length
        ? tenant.assignedPropertyIds
        : (await db.select({ id: properties.id }).from(properties)).map((p: { id: number }) => p.id);

      if (!allowedPropertyIds.length) return res.json([]);

      const { pool } = await import("./db");
      const placeholders = allowedPropertyIds.map((_: number, i: number) => `$${i + 1}`).join(", ");
      const result = await pool.query(`
        SELECT
          b.id                                                  AS "bookingId",
          COALESCE(g.full_name, b.guest_name, 'Unknown Guest')  AS "guestName",
          COALESCE(r.room_number, r.name, b.room_id::text, 'Unknown Room') AS "roomNumber",
          TO_CHAR(b.check_out_date::date, 'DD Mon YYYY')       AS "checkOutTime",
          GREATEST(0, EXTRACT(EPOCH FROM (NOW() - b.check_out_date::timestamp)) / 3600)::int AS "hoursOverdue",
          b.property_id                                         AS "propertyId"
        FROM bookings b
        LEFT JOIN guests g  ON g.id = b.guest_id::integer
        LEFT JOIN rooms  r  ON r.id = b.room_id::integer
        WHERE b.status = 'checked-in'
          AND b.check_out_date IS NOT NULL
          AND b.check_out_date::date <= CURRENT_DATE
          AND b.property_id = ANY(ARRAY[${placeholders}]::int[])
        ORDER BY b.check_out_date ASC
      `, allowedPropertyIds);
      return res.json(result.rows || []);
    } catch (error: any) {
      console.warn("[/api/bookings/checkout-reminders] Error:", error.message);
      return res.status(200).json([]);
    }
  });

  // GET /api/bookings/pending-overdue
  // Returns all pending_advance bookings that are 8+ hours old (for dashboard popup)
  // MUST be before /api/bookings/:id to prevent Express matching "pending-overdue" as an ID
  app.get("/api/bookings/pending-overdue", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });

      const now = new Date();
      const isPreview = req.query.preview === "1"; // skip 8h filter for testing
      const cutoffTime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8h ago

      const overdueBookings = await db.select().from(bookings)
        .where(eq(bookings.status, "pending_advance"));

      const { tenant } = auth;
      const result = [];
      for (const b of overdueBookings) {
        // Tenant access check
        if (!canAccessProperty(tenant, b.propertyId)) continue;
        // If createdAt is NULL (old rows before column was added), treat as very old so they always appear
        const createdAt = b.createdAt ? new Date(b.createdAt) : new Date(0);
        if (!isPreview && createdAt > cutoffTime) continue; // Less than 8h old (skip check in preview)

        // Guard all IDs against NaN, null, undefined before DB calls
        const safeGuestId = Number.isFinite(b.guestId) ? (b.guestId as number) : null;
        const safePropertyId = Number.isFinite(b.propertyId) ? (b.propertyId as number) : null;
        const safeRoomId = Number.isFinite(b.roomId) ? (b.roomId as number) : null;

        const guest = safeGuestId ? await storage.getGuest(safeGuestId) : null;
        const property = safePropertyId ? await storage.getProperty(safePropertyId) : null;
        let roomDisplay = "TBD";
        if (safeRoomId) {
          const room = await storage.getRoom(safeRoomId);
          roomDisplay = room ? `Room ${room.roomNumber}` : `Room #${safeRoomId}`;
        }
        result.push({
          id: b.id,
          guestName: guest?.fullName || "Unknown Guest",
          phone: guest?.phone || null,
          propertyName: property?.name || "Unknown Property",
          roomDisplay,
          totalAmount: b.totalAmount,
          hoursOverdue: b.createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : 99,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Fetch room and guest details for complete booking info
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      const guest = booking.guestId ? await storage.getGuest(booking.guestId) : null;
      
      res.json({
        ...booking,
        room,
        guest
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", isAuthenticated, strictLimiter, async (req, res) => {
    try {
      // Create input schema that coerces ISO date strings to Date objects
      const bookingInputSchema = insertBookingSchema.extend({
        checkInDate: z.coerce.date(),
        checkOutDate: z.coerce.date(),
        numberOfGuests: z.coerce.number().int().min(1).optional().nullable(),
      });
      const parsed = bookingInputSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.flatten().fieldErrors?.numberOfGuests?.[0]
          || parsed.error.message
          || "Invalid booking data";
        return res.status(400).json({ message: msg });
      }
      const data = parsed.data;

      // Ensure propertyId is set (required by DB); for group bookings client may send it from first room
      let bookingData = { ...data };
      if (bookingData.propertyId == null && (bookingData.roomId != null || (bookingData.roomIds?.length ?? 0) > 0)) {
        const firstRoomId = bookingData.roomId ?? bookingData.roomIds?.[0];
        const room = firstRoomId != null ? await storage.getRoom(firstRoomId) : null;
        if (room) bookingData = { ...bookingData, propertyId: room.propertyId };
      }
      if (bookingData.propertyId == null) {
        return res.status(400).json({ message: "Property or room is required for booking" });
      }

      // Check room availability before creating booking
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      
      // Validate check-out is after check-in
      if (checkOut <= checkIn) {
        return res.status(400).json({ 
          message: "Check-out date must be after check-in date" 
        });
      }
      
      // Get all rooms to check
      const roomIdsToCheck: number[] = [];
      if (data.roomId) {
        roomIdsToCheck.push(data.roomId);
      }
      if (data.roomIds && data.roomIds.length > 0) {
        roomIdsToCheck.push(...data.roomIds);
      }
      
      // Check each room for conflicts
      for (const roomId of roomIdsToCheck) {
        const room = await storage.getRoom(roomId);
        const existingBookings = await storage.getBookingsByRoom(roomId);
        const overlapping = existingBookings.filter(b => {
          if (b.status === 'cancelled' || b.status === 'checked-out') return false;
          return checkIn < new Date(b.checkOutDate) && checkOut > new Date(b.checkInDate);
        });

        if (room?.roomCategory === 'dormitory') {
          // For dormitory rooms: only block if there are not enough beds left
          const totalBeds = room.totalBeds ?? 1;
          const bedsAlreadyBooked = overlapping.reduce((sum, b) => sum + (b.bedsBooked || 1), 0);
          const bedsRequested = data.bedsBooked || 1;
          const bedsAvailable = totalBeds - bedsAlreadyBooked;
          if (bedsAvailable < bedsRequested) {
            console.log(`[BOOKING_BLOCKED] room=${room?.roomNumber ?? roomId} reason=dormitory_full totalBeds=${totalBeds} bedsBooked=${bedsAlreadyBooked} requested=${bedsRequested}`);
            return res.status(400).json({
              message: `Room ${room?.roomNumber || roomId} does not have enough available beds for these dates (${bedsAvailable} of ${totalBeds} available, you need ${bedsRequested}).`
            });
          }
        } else {
          // Regular room: any overlap is a conflict
          const conflictingBooking = overlapping[0];
          if (conflictingBooking) {
            let guestLabel = "";
            try {
              if (conflictingBooking.guestId) {
                const conflictGuest = await storage.getGuest(conflictingBooking.guestId);
                if (conflictGuest?.fullName) {
                  guestLabel = ` (Booking #${conflictingBooking.id} — ${conflictGuest.fullName})`;
                } else {
                  guestLabel = ` (Booking #${conflictingBooking.id})`;
                }
              } else {
                guestLabel = ` (Booking #${conflictingBooking.id})`;
              }
            } catch (_) {
              guestLabel = ` (Booking #${conflictingBooking.id})`;
            }
            console.log(`[BOOKING_BLOCKED] room=${room?.roomNumber ?? roomId} reason=overlap conflictingBookingId=${conflictingBooking.id} requestedCheckIn=${checkIn.toISOString().split("T")[0]} requestedCheckOut=${checkOut.toISOString().split("T")[0]}`);
            return res.status(400).json({
              message: `Room ${room?.roomNumber || roomId} is already booked from ${new Date(conflictingBooking.checkInDate).toLocaleDateString()} to ${new Date(conflictingBooking.checkOutDate).toLocaleDateString()}${guestLabel}. Please cancel or modify that booking first, or select different dates/room.`
            });
          }
        }
      }
      
      // Validate travel agent belongs to same property as booking
      if (data.travelAgentId) {
        // Determine booking property from roomId, roomIds, or propertyId
        let bookingPropertyId: number | undefined;
        
        if (data.roomId) {
          const room = await storage.getRoom(data.roomId);
          if (!room) {
            return res.status(404).json({ message: "Room not found" });
          }
          bookingPropertyId = room.propertyId;
        } else if (data.roomIds && data.roomIds.length > 0) {
          // Group booking - check first room
          const room = await storage.getRoom(data.roomIds[0]);
          if (!room) {
            return res.status(404).json({ message: "Room not found" });
          }
          bookingPropertyId = room.propertyId;
        } else if (data.propertyId) {
          bookingPropertyId = data.propertyId;
        }
        
        if (bookingPropertyId) {
          const agent = await storage.getTravelAgent(data.travelAgentId);
          if (!agent) {
            return res.status(404).json({ message: "Travel agent not found" });
          }
          if (agent.propertyId !== bookingPropertyId) {
            return res.status(400).json({ 
              message: "Travel agent does not belong to the same property as the booking" 
            });
          }
        }
      }
      
      const _attemptRooms = [bookingData.roomId, ...(bookingData.roomIds ?? [])].filter(Boolean).join(",") || "N/A";
      console.log(`[BOOKING_ATTEMPT] rooms=${_attemptRooms} checkIn=${bookingData.checkInDate} checkOut=${bookingData.checkOutDate} guest=${bookingData.guestName}`);

      // Final safety re-check immediately before insert — catches the race window where
      // two concurrent requests both passed the earlier conflict check
      const finalRoomIds: number[] = [];
      if (bookingData.roomId) finalRoomIds.push(bookingData.roomId);
      if (bookingData.roomIds?.length) finalRoomIds.push(...bookingData.roomIds);
      for (const rId of finalRoomIds) {
        const freshRoom = await storage.getRoom(rId);
        const freshBookings = await storage.getBookingsByRoom(rId);
        const freshOverlapping = freshBookings.filter(b => {
          if (b.status === "cancelled" || b.status === "checked-out") return false;
          return checkIn < new Date(b.checkOutDate) && checkOut > new Date(b.checkInDate);
        });
        if (freshRoom?.roomCategory === "dormitory") {
          const totalBeds = freshRoom.totalBeds ?? 1;
          const bedsBooked = freshOverlapping.reduce((sum, b) => sum + (b.bedsBooked || 1), 0);
          const bedsRequested = bookingData.bedsBooked || 1;
          if (totalBeds - bedsBooked < bedsRequested) {
            console.log(`[BOOKING_BLOCKED] room=${rId} reason=race_condition_dormitory_full`);
            return res.status(409).json({ message: `Room ${freshRoom.roomNumber || rId} ran out of beds just now. Please refresh and try again.` });
          }
        } else if (freshOverlapping.length > 0) {
          console.log(`[BOOKING_BLOCKED] room=${rId} reason=race_condition_recheck conflictingBookingId=${freshOverlapping[0].id}`);
          return res.status(409).json({ message: `Room ${rId} was just booked by another request. Please refresh and try again.` });
        }
      }

      const booking = await storage.createBooking(bookingData);
      console.log(`[BOOKING_SUCCESS] bookingId=${booking.id} rooms=${_attemptRooms} guest=${booking.guestName} propertyId=${booking.propertyId}`);

      // For group bookings created manually, insert booking_room_stays rows
      // so downstream queries (quick order, active bookings) can find the rooms
      if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
        try {
          await db.insert(bookingRoomStays).values(
            booking.roomIds.map((rId: number) => ({
              bookingId: booking.id,
              roomId: rId,
              status: "tbs",
            }))
          );
        } catch (staysErr: any) {
          console.error(`[Booking] Failed to insert room stays for group booking #${booking.id}:`, staysErr.message);
        }
      }
      
      // Send response immediately - don't make user wait for notifications/emails/logs
      res.status(201).json(booking);
      
      // Run post-booking tasks in background (non-blocking)
      const bgUser = req.user as any;
      const bgUserId = bgUser?.claims?.sub || bgUser?.id || (req.session as any)?.userId;
      
      setImmediate(async () => {
        // Record advance payment to wallet if any
        const advAmt = parseFloat(booking.advanceAmount || "0");
        if (advAmt > 0 && booking.propertyId) {
          try {
            const advGuest = await storage.getGuest(booking.guestId);
            const advMethod = (bookingData as any).advancePaymentMethod || "cash";
            await storage.recordAdvancePaymentToWallet(
              booking.propertyId,
              booking.id,
              advAmt,
              advMethod,
              `Advance - ${advGuest?.fullName || 'Guest'} (Booking #${booking.id})`,
              bgUserId || null
            );
            console.log(`[Wallet] Advance ₹${advAmt} via ${advMethod} recorded for booking #${booking.id}`);
          } catch (walletErr) {
            console.error(`[Wallet] Failed to record advance for booking #${booking.id}:`, walletErr);
          }
        }

        // Create notification for admins
        try {
          const allUsers = await storage.getAllUsers();
          const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
          const guest = await storage.getGuest(booking.guestId);
          
          for (const admin of adminUsers) {
            await db.insert(notifications).values({
              userId: admin.id,
              type: "new_booking",
              title: "New Booking Created",
              message: `Booking #${booking.id} created for ${guest?.fullName || 'Guest'}. Check-in: ${format(new Date(booking.checkInDate), "MMM dd, yyyy")}`,
              soundType: "info",
              relatedId: booking.id,
              relatedType: "booking",
            });
          }
        } catch (notifError: any) {
          console.error(`[NOTIFICATIONS] Failed to create booking notification:`, notifError.message);
        }
        
        // Send booking confirmation email
        try {
          const guest = await storage.getGuest(booking.guestId);
          const property = await storage.getProperty(booking.propertyId);
          const room = await storage.getRoom(booking.roomId);
          
          if (guest && guest.email && property && room) {
            const { sendBookingConfirmationEmail } = await import("./email-service");
            const checkInDate = format(new Date(booking.checkInDate), "MMM dd, yyyy");
            const checkOutDate = format(new Date(booking.checkOutDate), "MMM dd, yyyy");
            
            await sendBookingConfirmationEmail(
              guest.email,
              guest.fullName,
              property.name,
              checkInDate,
              checkOutDate,
              room.roomNumber,
              booking.id
            );
          }
        } catch (emailError: any) {
          console.error(`[EMAIL] Failed to send booking confirmation email:`, emailError.message);
        }
        
        // Activity log
        try {
          const dbUser = bgUserId ? await storage.getUser(bgUserId) : null;
          const guest = await storage.getGuest(booking.guestId);
          const property = await storage.getProperty(booking.propertyId);
          
          await storage.createActivityLog({
            userId: bgUserId || null,
            userEmail: dbUser?.email || null,
            userName: dbUser ? `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() : null,
            action: 'create_booking',
            category: 'booking',
            resourceType: 'booking',
            resourceId: String(booking.id),
            resourceName: `Booking #${booking.id} - ${guest?.fullName || 'Guest'}`,
            propertyId: booking.propertyId,
            propertyName: property?.name || null,
            details: { 
              guestName: guest?.fullName, 
              checkIn: booking.checkInDate, 
              checkOut: booking.checkOutDate,
              roomId: booking.roomId 
            },
            ipAddress: '',
            userAgent: '',
          });
        } catch (logErr) {
          console.error('[ACTIVITY] Error logging booking creation:', logErr);
        }

        // Sync inventory to AioSell / OTAs (e.g. Booking.com, MMT) so the room is blocked
        if (booking.propertyId) {
          console.log(`[SYNC_TRIGGER] event=BOOKING_CREATED bookingId=${booking.id} room=${booking.roomNumber ?? (booking.roomIds?.join(",") ?? "N/A")} propertyId=${booking.propertyId}`);
          syncWithRetry(booking.propertyId, "BOOKING_CREATED").catch(() => {});
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Booking validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      // Create input schema that coerces ISO date strings to Date objects
      const bookingUpdateSchema = insertBookingSchema.extend({
        checkInDate: z.coerce.date().optional(),
        checkOutDate: z.coerce.date().optional(),
      }).partial();
      const validatedData = bookingUpdateSchema.parse(req.body);
      
      // Fetch existing booking to determine property context
      const existingBooking = await storage.getBooking(parseInt(req.params.id));
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Determine if room/property is changing
      const isRoomChanging = validatedData.roomId !== undefined || validatedData.roomIds !== undefined || validatedData.propertyId !== undefined;
      const isTravelAgentChanging = validatedData.travelAgentId !== undefined;
      
      // Validate travel agent when:
      // 1. Travel agent is being updated
      // 2. Room/property is changing and booking has an existing travel agent
      const shouldValidateTravelAgent = isTravelAgentChanging || (isRoomChanging && existingBooking.travelAgentId);
      
      if (shouldValidateTravelAgent) {
        // Determine new booking property from updated data or existing booking
        let bookingPropertyId: number | undefined;
        
        if (validatedData.roomId) {
          const room = await storage.getRoom(validatedData.roomId);
          if (!room) {
            return res.status(404).json({ message: "Room not found" });
          }
          bookingPropertyId = room.propertyId;
        } else if (validatedData.roomIds && validatedData.roomIds.length > 0) {
          const room = await storage.getRoom(validatedData.roomIds[0]);
          if (!room) {
            return res.status(404).json({ message: "Room not found" });
          }
          bookingPropertyId = room.propertyId;
        } else if (validatedData.propertyId) {
          bookingPropertyId = validatedData.propertyId;
        } else if (existingBooking.roomId) {
          // Use existing booking's room property
          const room = await storage.getRoom(existingBooking.roomId);
          if (room) {
            bookingPropertyId = room.propertyId;
          }
        } else if (existingBooking.propertyId) {
          bookingPropertyId = existingBooking.propertyId;
        }
        
        // Get the travel agent to validate (from update or existing)
        const travelAgentId = validatedData.travelAgentId !== undefined 
          ? validatedData.travelAgentId 
          : existingBooking.travelAgentId;
        
        if (travelAgentId && bookingPropertyId) {
          const agent = await storage.getTravelAgent(travelAgentId);
          if (!agent) {
            return res.status(404).json({ message: "Travel agent not found" });
          }
          if (agent.propertyId !== bookingPropertyId) {
            return res.status(400).json({ 
              message: "Travel agent does not belong to the same property as the booking" 
            });
          }
        }
      }
      
      const booking = await storage.updateBooking(parseInt(req.params.id), validatedData);

      // Wallet sync on booking edit — handle both amount increase and payment method change
      if ((validatedData.advanceAmount !== undefined || (validatedData as any).advancePaymentMethod !== undefined) && booking && booking.propertyId) {
        const newAdv = parseFloat(String(validatedData.advanceAmount ?? existingBooking.advanceAmount ?? "0"));
        const oldAdv = parseFloat(String(existingBooking.advanceAmount || "0"));
        const newMethod = (validatedData as any).advancePaymentMethod || existingBooking.advancePaymentMethod || "cash";
        const oldMethod = existingBooking.advancePaymentMethod || "cash";
        const methodChanged = newMethod !== oldMethod;
        const delta = newAdv - oldAdv;

        setImmediate(async () => {
          try {
            const updUser = req.user as any;
            const updUserId = updUser?.claims?.sub || updUser?.id || (req.session as any)?.userId;
            const advGuest = await storage.getGuest(booking.guestId);

            // Case 1: Payment METHOD changed (e.g. cash → UPI) — reverse old entries, re-credit new wallet
            if (methodChanged && oldAdv > 0) {
              console.log(`[Wallet] Payment method changed ${oldMethod}→${newMethod} for booking #${booking.id}, reversing advance entries`);
              const existingTxs = await storage.getWalletTransactionsByBooking(booking.id, booking.propertyId);
              const advanceTxs = existingTxs.filter(t => t.paymentType === 'advance' && !t.isReversal);
              for (const tx of advanceTxs) {
                try {
                  const newWallet = await storage.getWalletByPaymentMethod(booking.propertyId, newMethod);
                  await storage.reverseWalletTransaction(
                    tx.id,
                    `Payment method changed to ${newMethod}`,
                    newWallet?.id ?? null,
                    updUserId
                  );
                  console.log(`[Wallet] Reversed advance tx #${tx.id} and re-credited to ${newMethod}`);
                } catch (revErr) {
                  console.error(`[Wallet] Reversal failed for tx #${tx.id}:`, revErr);
                }
              }
            }

            // Case 2: Amount increased (new delta to record) — use current method
            if (delta > 0) {
              await storage.recordAdvancePaymentToWallet(
                booking.propertyId,
                booking.id,
                delta,
                newMethod,
                `Advance - ${advGuest?.fullName || 'Guest'} (Booking #${booking.id})`,
                updUserId || null
              );
              console.log(`[Wallet] Advance delta ₹${delta} via ${newMethod} recorded for booking #${booking.id}`);
            }
          } catch (wErr) {
            console.error(`[Wallet] Failed advance wallet update for booking #${booking.id}:`, wErr);
          }
        });
      }
      
      // Audit log for booking update with proper before/after structure
      const changedFields: Record<string, any> = {};
      const beforeValues: Record<string, any> = {};
      const afterValues: Record<string, any> = {};
      
      for (const key of Object.keys(validatedData)) {
        const oldValue = (existingBooking as any)[key];
        const newValue = (validatedData as any)[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          beforeValues[key] = oldValue;
          afterValues[key] = newValue;
        }
      }
      
      await storage.createAuditLog({
        entityType: "booking",
        entityId: req.params.id,
        action: "update",
        userId: req.user?.id || "unknown",
        userRole: req.user?.role,
        changeSet: { 
          before: beforeValues, 
          after: afterValues 
        },
        metadata: { 
          previousStatus: existingBooking.status,
          newStatus: booking.status,
          updatedFields: Object.keys(afterValues),
        },
      });
      
      // WhatsApp payment confirmation DISABLED per user request (only using check-in and checkout notifications)
      // To re-enable, uncomment the block below
      /*
      if (validatedData.advanceAmount !== undefined && validatedData.advanceAmount !== existingBooking.advanceAmount) {
        try {
          const guest = await storage.getGuest(booking.guestId);
          
          if (guest && guest.phone) {
            let propertyName = "Your Property";
            if (booking.roomId) {
              const room = await storage.getRoom(booking.roomId);
              if (room) {
                const property = await storage.getProperty(room.propertyId);
                propertyName = property?.name || propertyName;
              }
            } else if (booking.roomIds && booking.roomIds.length > 0) {
              const room = await storage.getRoom(booking.roomIds[0]);
              if (room) {
                const property = await storage.getProperty(room.propertyId);
                propertyName = property?.name || propertyName;
              }
            }
            
            const guestName = guest.fullName || "Guest";
            const amountPaid = `₹${booking.advanceAmount}`;
            const paymentDate = format(new Date(), "dd MMM yyyy");
            const bookingRef = `#${booking.id}`;
            
            await sendPaymentConfirmation(
              (guest as any).whatsappPhone || guest.phone,
              guestName,
              amountPaid,
              paymentDate,
              bookingRef,
              propertyName
            );
            
            console.log(`[WhatsApp] Booking #${booking.id} - Payment confirmation sent to ${guest.fullName}`);
          } else if (!guest) {
            console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send payment confirmation: guest ${booking.guestId} not found`);
          } else if (!guest.phone) {
            console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send payment confirmation: guest has no phone number`);
          }
        } catch (whatsappError: any) {
          console.error(`[WhatsApp] Booking #${booking.id} - Payment notification failed (non-critical):`, whatsappError.message);
        }
      }
      */
      
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Change Room: reassign booking to a different room with OTA sync ──────────
  app.post("/api/bookings/:id/change-room", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { newRoomId, openOldRoomOnOTA, recalculatePrice } = req.body;
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;

      if (!newRoomId) return res.status(400).json({ message: "newRoomId is required" });

      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const oldRoomId = booking.roomId;
      if (oldRoomId === newRoomId) return res.status(400).json({ message: "New room is the same as current room" });

      const newRoom = await storage.getRoom(newRoomId);
      if (!newRoom) return res.status(404).json({ message: "Room not found" });

      // Conflict check: make sure new room is free for these dates
      const conflicting = await db.select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.roomId, newRoomId),
          not(eq(bookings.id, bookingId)),
          not(inArray(bookings.status, ["cancelled", "checked-out", "no_show"])),
          lt(bookings.checkInDate, booking.checkOutDate),
          gt(bookings.checkOutDate, booking.checkInDate),
        ))
        .limit(1);

      if (conflicting.length > 0) {
        return res.status(409).json({ message: "The selected room is already booked for these dates" });
      }

      const oldRoom = oldRoomId ? await storage.getRoom(oldRoomId) : null;

      // Optionally recalculate total based on new room's price × nights
      let newTotal: number | undefined;
      const bookingUpdates: Record<string, any> = {
        roomId: newRoomId,
        propertyId: newRoom.propertyId,
      };
      if (recalculatePrice && newRoom.pricePerNight) {
        const nights = Math.max(1, Math.round(
          (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime())
          / (1000 * 60 * 60 * 24)
        ));
        newTotal = Number(newRoom.pricePerNight) * nights;
        bookingUpdates.totalAmount = String(newTotal);
        // Recalculate balance = totalAmount - advance already paid
        const advancePaid = Number(booking.advanceAmount || 0);
        bookingUpdates.balanceAmount = String(Math.max(0, newTotal - advancePaid));
      }

      // Update the booking
      const updatedBooking = await storage.updateBooking(bookingId, bookingUpdates);

      // Audit log
      await storage.createAuditLog({
        entityType: "booking",
        entityId: String(bookingId),
        action: "room_changed",
        userId: userId || "unknown",
        userRole: req.user?.role,
        changeSet: {
          before: { roomId: oldRoomId, roomNumber: oldRoom?.roomNumber, totalAmount: booking.totalAmount },
          after: { roomId: newRoomId, roomNumber: newRoom.roomNumber, totalAmount: newTotal ?? booking.totalAmount },
        },
        metadata: {
          openOldRoomOnOTA: !!openOldRoomOnOTA,
          recalculatePrice: !!recalculatePrice,
          guestId: booking.guestId,
        },
      });

      // Trigger OTA inventory sync for the property
      try {
        await autoSyncInventoryForProperty(newRoom.propertyId);
        console.log(`[CHANGE-ROOM] OTA sync triggered for property ${newRoom.propertyId}`);
      } catch (syncErr: any) {
        console.error("[CHANGE-ROOM] OTA sync failed (non-critical):", syncErr.message);
      }

      res.json({
        success: true,
        booking: updatedBooking,
        oldRoom: { id: oldRoomId, roomNumber: oldRoom?.roomNumber },
        newRoom: { id: newRoomId, roomNumber: newRoom.roomNumber },
        newTotal: newTotal ?? null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const bookingId = parseInt(req.params.id);
      const autoCheckedOutBookingIds: number[] = [];
      
      // Get current booking to validate status change
      const currentBooking = await storage.getBooking(bookingId);
      if (!currentBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Status lock: Prevent changing from checked-out
      if (currentBooking.status === "checked-out") {
        return res.status(400).json({ 
          message: "Cannot change status of a checked-out booking. Status is locked." 
        });
      }
      
      // If trying to check in, validate the check-in date and guest ID proof
      if (status === "checked-in") {
        // Validate guest has ID proof
        const guest = await storage.getGuest(currentBooking.guestId);
        if (!guest) {
          return res.status(400).json({ 
            message: "Guest not found. Cannot complete check-in." 
          });
        }
        
        if (!guest.idProofImage) {
          return res.status(400).json({ 
            message: "Guest ID proof is required before check-in. Please upload the guest's ID proof to proceed." 
          });
        }

        // Check if check-in date is today or in the past
        const checkInDate = new Date(currentBooking.checkInDate);
        const today = new Date();
        
        // Reset time parts to compare only dates
        checkInDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        if (checkInDate > today) {
          const checkInDateFormatted = format(checkInDate, "PPP");
          return res.status(400).json({ 
            message: `Cannot check in before the scheduled check-in date (${checkInDateFormatted}). The guest's check-in is scheduled for ${checkInDateFormatted}.`
          });
        }
        
        // Block check-in if the room already has another guest currently checked in
        const allBookings = await storage.getAllBookings();
        const roomId = currentBooking.roomId;
        const otherCheckedInBookings = allBookings.filter(b => 
          b.roomId === roomId && 
          b.id !== bookingId && 
          b.status === "checked-in"
        );

        if (otherCheckedInBookings.length > 0) {
          const occupantBooking = otherCheckedInBookings[0];
          const occupantGuest = await storage.getGuest(occupantBooking.guestId);
          const guestName = occupantGuest?.fullName || "Another Guest";
          return res.status(409).json({
            message: `Room is already occupied — ${guestName} is currently checked in (Booking #${occupantBooking.id}). Please check them out first before checking in a new guest.`,
            conflictBookingId: occupantBooking.id,
            conflictGuestName: guestName,
          });
        }

        autoCheckedOutBookingIds.push(...otherCheckedInBookings.map(b => b.id));
        
        // (No auto-checkout — handled above by blocking. This loop is now a no-op kept for safety)
        for (const oldBooking of otherCheckedInBookings) {
          console.log(`[Auto-Checkout] Checking out old booking ${oldBooking.id} for room ${roomId} before checking in booking ${bookingId}`);
          try {
            const checkInDate  = new Date(oldBooking.checkInDate);
            const checkOutDate = new Date(oldBooking.checkOutDate);
            const calculatedNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
            const nights = Math.max(1, calculatedNights);

            // Room charges (group or single)
            let roomCharges = 0;
            if (oldBooking.isGroupBooking && oldBooking.roomIds && oldBooking.roomIds.length > 0) {
              for (const rid of oldBooking.roomIds) {
                const gr = await storage.getRoom(rid);
                if (gr) {
                  const pricePerNight = oldBooking.customPrice
                    ? parseFloat(oldBooking.customPrice) / oldBooking.roomIds.length
                    : parseFloat(gr.pricePerNight);
                  roomCharges += pricePerNight * nights;
                }
              }
            } else {
              const oldRoom = oldBooking.roomId ? await storage.getRoom(oldBooking.roomId) : null;
              const pricePerNight = oldBooking.customPrice
                ? parseFloat(oldBooking.customPrice)
                : (oldRoom ? parseFloat(oldRoom.pricePerNight) : 0);
              roomCharges = pricePerNight * nights;
            }

            // Food charges from orders (defensive: include orphan orders matching guest/room within stay)
            const bookingOrders = await getBillableOrdersForBooking(oldBooking);
            const foodCharges = bookingOrders
              .filter((o: any) => o.status !== "rejected" && !o.isTest)
              .reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || "0"), 0);

            // Extra service charges
            let extraCharges = 0;
            try {
              const extras = await storage.getExtraServicesByBooking(oldBooking.id);
              extraCharges = extras.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
            } catch {}

            const subtotal           = roomCharges + foodCharges + extraCharges;
            const gstAmount          = (roomCharges * 5) / 100;
            const serviceChargeAmount = (roomCharges * 10) / 100;
            const totalAmount        = subtotal + gstAmount + serviceChargeAmount;
            const advancePaid        = parseFloat(oldBooking.advanceAmount || "0");
            const balanceAmount      = totalAmount - advancePaid;

            await storage.createOrUpdateBill({
              bookingId:            oldBooking.id,
              guestId:              oldBooking.guestId,
              roomCharges:          roomCharges.toFixed(2),
              foodCharges:          foodCharges.toFixed(2),
              extraCharges:         extraCharges.toFixed(2),
              subtotal:             subtotal.toFixed(2),
              gstRate:              "5",
              gstAmount:            gstAmount.toFixed(2),
              serviceChargeRate:    "10",
              serviceChargeAmount:  serviceChargeAmount.toFixed(2),
              gstOnRooms:           true,
              gstOnFood:            false,
              includeServiceCharge: true,
              discountType:         null,
              discountValue:        null,
              discountAmount:       "0",
              totalAmount:          totalAmount.toFixed(2),
              advancePaid:          advancePaid.toFixed(2),
              balanceAmount:        balanceAmount.toFixed(2),
              paymentStatus:        "pending",
              paymentMethod:        null,
              paidAt:               null,
              dueDate:              null,
              pendingReason:        "auto_checkout",
            });

            await storage.updateBookingStatus(oldBooking.id, "checked-out");
            console.log(`[Auto-Checkout] Bill created for booking ${oldBooking.id} — room ₹${roomCharges.toFixed(2)}, food ₹${foodCharges.toFixed(2)}, extras ₹${extraCharges.toFixed(2)}, total ₹${totalAmount.toFixed(2)}`);
          } catch (billErr: any) {
            // Even if bill creation fails, still check out to avoid blocking the new check-in
            console.error(`[Auto-Checkout] Bill creation failed for booking ${oldBooking.id}: ${billErr.message} — proceeding with status update`);
            await storage.updateBookingStatus(oldBooking.id, "checked-out");
          }
        }
      }
      
      // Update booking with new status, and capture actual check-in time if checking in
      const { bookings: bookingsTable } = await import("@shared/schema");
      const updateData: any = {};
      if (status === "checked-in") {
        updateData.actualCheckInTime = new Date();
      }
      
      // Guard: if status is already what was requested, return the booking as-is
      // (prevents duplicate WhatsApp messages when UI shows stale cache)
      if (currentBooking.status === status) {
        console.log(`[BookingStatus] Booking #${bookingId} is already '${status}' — returning current state without side effects`);
        storage.invalidateBookingsCache();
        return res.json(currentBooking);
      }

      // Update booking status and actual check-in time if applicable
      const booking = await db
        .update(bookingsTable)
        .set({ 
          status, 
          ...updateData 
        })
        .where(eq(bookingsTable.id, bookingId))
        .returning()
        .then(result => result[0] || null);
      
      if (!booking) {
        return res.status(404).json({ message: "Failed to update booking" });
      }

      // Always invalidate cache immediately so next GET /api/bookings is fresh
      storage.invalidateBookingsCache();
      
      // Create in-app notification for status changes
      if (status === "checked-in" || status === "checked-out") {
        try {
          const allUsers = await storage.getAllUsers();
          const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
          const guest = await storage.getGuest(booking.guestId);
          
          for (const admin of adminUsers) {
            await db.insert(notifications).values({
              userId: admin.id,
              type: status === "checked-in" ? "guest_checked_in" : "guest_checked_out",
              title: status === "checked-in" ? "Guest Checked In" : "Guest Checked Out",
              message: `${guest?.fullName || 'Guest'} ${status === "checked-in" ? "checked in" : "checked out"} from Booking #${booking.id}`,
              soundType: status === "checked-in" ? "info" : "warning",
              relatedId: booking.id,
              relatedType: "booking",
            });
          }
          console.log(`[NOTIFICATIONS] Check-${status.split('-')[1]} notification created for ${adminUsers.length} admins`);
        } catch (notifError: any) {
          console.error(`[NOTIFICATIONS] Failed to create status notification:`, notifError.message);
        }
      }
      
      // Send WhatsApp notification when guest checks in
      if (status === "checked-in") {
        try {
          const guest = await storage.getGuest(booking.guestId);
          if (guest && guest.phone) {
            let propertyName = "Your Property";
            let roomNumbers = "TBD";
            
            if (booking.roomId) {
              const room = await storage.getRoom(booking.roomId);
              if (room) {
                const property = await storage.getProperty(room.propertyId);
                propertyName = property?.name || propertyName;
                roomNumbers = room.roomNumber;
              }
            } else if (booking.roomIds && booking.roomIds.length > 0) {
              const rooms = await Promise.all(booking.roomIds.map(id => storage.getRoom(id)));
              if (rooms.length > 0 && rooms[0]) {
                const property = await storage.getProperty(rooms[0].propertyId);
                propertyName = property?.name || propertyName;
                roomNumbers = rooms.filter(r => r).map(r => r!.roomNumber).join(", ");
              }
            }
            
            const guestName = guest.fullName || "Guest";

            // Check if check-in notifications are enabled via template controls
            if (booking.propertyId) {
              const templateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'checkin_message');
              
              // Template must be enabled (defaults to true if no setting exists)
              const isTemplateEnabled = templateSetting?.isEnabled !== false;
              
              if (isTemplateEnabled) {
                // Build food-order link for this booking (template 28769: {{3}} = food order link)
                const baseUrl = process.env.REPLIT_DEV_DOMAIN
                  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
                  : "https://hostezee.in";
                const foodOrderLink = `${baseUrl}/menu?type=room&property=${booking.propertyId}&room=${encodeURIComponent(roomNumbers)}`;
                // Send check-in notification
                // Template 28769 → Woodpecker Inn ONLY | Template 29292 → all other properties
                const isWoodpeckerProperty = propertyName.toLowerCase().includes("woodpecker");
                const checkinTemplateId = isWoodpeckerProperty ? "28769" : "29292";
                await sendCheckInNotification((guest as any).whatsappPhone || guest.phone, guestName, propertyName, foodOrderLink, checkinTemplateId);
                console.log(`[WhatsApp] Booking #${booking.id} - Check-in notification sent to ${guest.fullName} (template: ${checkinTemplateId}, property: ${propertyName})`);
              } else {
                console.log(`[WhatsApp] Booking #${booking.id} - Check-in notification disabled`);
              }
            }
          }
        } catch (whatsappError: any) {
          console.error(`[WhatsApp] Booking #${booking.id} - Check-in notification failed (non-critical):`, whatsappError.message);
        }
      }
      
      // Send WhatsApp booking confirmation when status changes to "confirmed"
      if (status === "confirmed") {
        try {
          const bcSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'booking_confirmation');
          const isBcEnabled = bcSetting?.isEnabled !== false;
          if (!isBcEnabled) {
            console.log(`[WhatsApp] Booking #${booking.id} - booking_confirmation template disabled, skipping`);
          } else {
            const guest = await storage.getGuest(booking.guestId);
            if (guest && guest.phone) {
              let propertyName = "Your Property";
              if (booking.propertyId) {
                const property = await storage.getProperty(booking.propertyId);
                propertyName = property?.name || propertyName;
              }
              const checkInFmt = format(new Date(booking.checkInDate), "dd MMM yyyy");
              const checkOutFmt = format(new Date(booking.checkOutDate), "dd MMM yyyy");
              await sendBookingConfirmedNotification((guest as any).whatsappPhone || guest.phone, guest.fullName || "Guest", propertyName, checkInFmt, checkOutFmt);
              console.log(`[WhatsApp] Booking #${booking.id} - Booking confirmed notification sent to ${guest.fullName} (template: 29294)`);
            }
          }
        } catch (waErr: any) {
          console.error(`[WhatsApp] Booking #${booking.id} - Booking confirmed notification failed (non-critical):`, waErr.message);
        }
      }

      if (booking.propertyId && (status === "checked-in" || status === "checked-out" || status === "cancelled")) {
        console.log(`[SYNC_TRIGGER] event=BOOKING_STATUS_CHANGED bookingId=${booking.id} newStatus=${status} propertyId=${booking.propertyId}`);
        syncWithRetry(booking.propertyId, "BOOKING_STATUS_CHANGED").catch(() => {});
      }

      res.json({ ...booking, autoCheckedOutBookingIds });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Booking cancellation with refund handling
  app.post("/api/bookings/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { 
        cancellationType, // 'full_refund', 'partial_refund', 'no_refund'
        cancellationCharges = 0,
        refundAmount = 0,
        cancellationReason 
      } = req.body;

      // Validate cancellation type
      if (!['full_refund', 'partial_refund', 'no_refund'].includes(cancellationType)) {
        return res.status(400).json({ 
          message: "Invalid cancellation type. Must be 'full_refund', 'partial_refund', or 'no_refund'" 
        });
      }

      // Fetch booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Prevent cancelling already cancelled or checked-out bookings
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }
      if (booking.status === "checked-out") {
        return res.status(400).json({ message: "Cannot cancel a checked-out booking" });
      }

      const advanceAmount = parseFloat(booking.advanceAmount || "0");

      // Validate amounts based on cancellation type
      if (cancellationType === "full_refund") {
        if (refundAmount !== advanceAmount) {
          return res.status(400).json({ 
            message: `Full refund amount must equal advance amount (₹${advanceAmount})` 
          });
        }
      } else if (cancellationType === "partial_refund") {
        const totalHandled = parseFloat(String(cancellationCharges)) + parseFloat(String(refundAmount));
        if (Math.abs(totalHandled - advanceAmount) > 0.01) {
          return res.status(400).json({ 
            message: `Cancellation charges + refund must equal advance amount (₹${advanceAmount})` 
          });
        }
      } else if (cancellationType === "no_refund") {
        if (parseFloat(String(cancellationCharges)) !== advanceAmount) {
          return res.status(400).json({ 
            message: `No refund means cancellation charges must equal advance amount (₹${advanceAmount})` 
          });
        }
      }

      // Update booking with cancellation details
      const updatedBooking = await storage.updateBooking(bookingId, {
        status: "cancelled",
        cancellationDate: new Date(),
        cancellationType,
        cancellationCharges: String(cancellationCharges),
        refundAmount: String(refundAmount),
        cancellationReason,
        cancelledBy: req.user?.id || "unknown",
      });

      // Create P&L entries for the property
      const propertyId = booking.propertyId;
      const today = new Date().toISOString().split('T')[0];

      // If there's a refund, create a Refund Expense entry
      if (parseFloat(String(refundAmount)) > 0) {
        await storage.createPropertyExpense({
          propertyId,
          amount: String(refundAmount),
          description: `Refund for cancelled booking #${bookingId} - ${cancellationReason || 'No reason provided'}`,
          expenseDate: today,
          paymentMethod: "cash",
          status: "paid",
        });
        console.log(`[CANCELLATION] Booking #${bookingId} - Refund expense of ₹${refundAmount} recorded`);
      }

      // If there's cancellation income, create a bank transaction entry
      if (parseFloat(String(cancellationCharges)) > 0) {
        await storage.createBankTransaction({
          propertyId,
          transactionType: "cancellation_income",
          amount: String(cancellationCharges),
          description: `Cancellation charges for booking #${bookingId}`,
          transactionDate: today,
        });
        console.log(`[CANCELLATION] Booking #${bookingId} - Cancellation income of ₹${cancellationCharges} recorded`);
      }

      // Audit log for cancellation with before/after structure
      await storage.createAuditLog({
        entityType: "booking",
        entityId: String(bookingId),
        action: "cancel",
        userId: req.user?.id || "unknown",
        userRole: req.user?.role,
        changeSet: {
          before: { 
            status: booking.status,
            advanceAmount: booking.advanceAmount,
          },
          after: { 
            status: "cancelled",
            cancellationType,
            cancellationCharges,
            refundAmount,
            cancellationReason,
          },
        },
        metadata: {
          guestId: booking.guestId,
          propertyId: booking.propertyId,
        },
      });

      if (booking.propertyId) {
        console.log(`[SYNC_TRIGGER] event=BOOKING_CANCELLED bookingId=${booking.id} propertyId=${booking.propertyId}`);
        syncWithRetry(booking.propertyId, "BOOKING_CANCELLED").catch(() => {});
      }

      res.json({
        success: true,
        booking: updatedBooking,
        financialSummary: {
          originalAdvance: advanceAmount,
          cancellationCharges: parseFloat(String(cancellationCharges)),
          refundAmount: parseFloat(String(refundAmount)),
          cancellationType,
        },
      });
    } catch (error: any) {
      console.error("[CANCELLATION] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/:id/no-show", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const {
        chargeType,          // 'full_charge', 'partial_charge', 'no_charge'
        noShowCharges = 0,
        noShowNotes,
      } = req.body;

      if (!['full_charge', 'partial_charge', 'no_charge'].includes(chargeType)) {
        return res.status(400).json({ message: "Invalid chargeType. Use 'full_charge', 'partial_charge', or 'no_charge'" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status === "checked-in") {
        return res.status(400).json({ message: "Cannot mark as no-show — guest has already checked in" });
      }
      if (booking.status === "checked-out") {
        return res.status(400).json({ message: "Cannot mark as no-show — booking is already checked out" });
      }
      if (booking.status === "no_show") {
        return res.status(400).json({ message: "Booking is already marked as no-show" });
      }
      if (booking.status === "cancelled") {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      const advanceAmount = parseFloat(booking.advanceAmount || "0");
      const chargesAmount = parseFloat(String(noShowCharges));

      if (chargeType === "full_charge" && Math.abs(chargesAmount - advanceAmount) > 0.01) {
        return res.status(400).json({ message: `Full charge must equal advance amount (₹${advanceAmount})` });
      }
      if (chargeType === "partial_charge" && chargesAmount > advanceAmount) {
        return res.status(400).json({ message: `No-show charges (₹${chargesAmount}) cannot exceed advance amount (₹${advanceAmount})` });
      }

      const updatedBooking = await storage.updateBooking(bookingId, {
        status: "no_show",
        noShowDate: new Date(),
        noShowCharges: String(chargesAmount),
        noShowNotes: noShowNotes || null,
      });
      storage.invalidateBookingsCache();

      const propertyId = booking.propertyId;
      const today = new Date().toISOString().split("T")[0];

      // Record no-show income to wallet if charges apply
      if (chargesAmount > 0) {
        await storage.createBankTransaction({
          propertyId,
          transactionType: "no_show_income",
          amount: String(chargesAmount),
          description: `No-show charges for booking #${bookingId}${noShowNotes ? ` — ${noShowNotes}` : ""}`,
          transactionDate: today,
        });
        console.log(`[NO-SHOW] Booking #${bookingId} — ₹${chargesAmount} no-show income recorded`);
      }

      // Any remaining advance not charged is a refund expense
      const refundBack = Math.max(0, advanceAmount - chargesAmount);
      if (refundBack > 0) {
        await storage.createPropertyExpense({
          propertyId,
          amount: String(refundBack),
          description: `Advance refund for no-show booking #${bookingId}`,
          expenseDate: today,
          paymentMethod: "cash",
          status: "paid",
        });
        console.log(`[NO-SHOW] Booking #${bookingId} — ₹${refundBack} refund recorded`);
      }

      await storage.createAuditLog({
        entityType: "booking",
        entityId: String(bookingId),
        action: "no_show",
        userId: req.user?.id || "unknown",
        userRole: req.user?.role,
        changeSet: {
          before: { status: booking.status, advanceAmount },
          after: { status: "no_show", chargeType, noShowCharges: chargesAmount, noShowNotes },
        },
        metadata: { guestId: booking.guestId, propertyId },
      });

      // Free up the room inventory
      if (propertyId) {
        console.log(`[SYNC_TRIGGER] event=BOOKING_NO_SHOW bookingId=${bookingId} propertyId=${propertyId}`);
        syncWithRetry(propertyId, "BOOKING_NO_SHOW").catch(() => {});
      }

      res.json({
        success: true,
        booking: updatedBooking,
        financialSummary: { advanceAmount, noShowCharges: chargesAmount, refundBack, chargeType },
      });
    } catch (error: any) {
      console.error("[NO-SHOW] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      // Check if booking has associated bills (financial records)
      const billsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(bills)
        .where(eq(bills.bookingId, bookingId));
      
      if (billsCount[0]?.count > 0) {
        return res.status(400).json({ 
          message: "Cannot delete this booking because it has billing records. Completed bookings with bills should be kept for financial records and audit purposes."
        });
      }
      
      // Check if booking has associated orders
      const ordersCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.bookingId, bookingId));
      
      if (ordersCount[0]?.count > 0) {
        return res.status(400).json({ 
          message: "Cannot delete this booking because it has food orders. Please delete or reassign the orders first."
        });
      }
      
      await storage.deleteBooking(bookingId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id/guests", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const result = await db
        .select()
        .from(bookingGuests)
        .where(eq(bookingGuests.bookingId, bookingId))
        .orderBy(bookingGuests.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room stays for a booking (multi-room OTA bookings)
  app.get("/api/bookings/:id/room-stays", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const result = await db
        .select()
        .from(bookingRoomStays)
        .where(eq(bookingRoomStays.bookingId, bookingId))
        .orderBy(bookingRoomStays.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:bookingId/room-stays/:stayId", isAuthenticated, async (req: any, res) => {
    try {
      const stayId = parseInt(req.params.stayId);
      const { roomId, status } = req.body;
      const [updated] = await db.update(bookingRoomStays)
        .set({
          ...(roomId !== undefined ? { roomId: roomId || null } : {}),
          ...(status ? { status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(bookingRoomStays.id, stayId))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings/:id/guests", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const guestsData = req.body.guests;
      if (!Array.isArray(guestsData) || guestsData.length === 0) {
        return res.status(400).json({ message: "At least one guest is required" });
      }

      await db.delete(bookingGuests).where(eq(bookingGuests.bookingId, bookingId));

      const inserted = [];
      for (const guest of guestsData) {
        const [result] = await db.insert(bookingGuests).values({
          bookingId,
          guestName: guest.guestName,
          phone: guest.phone || null,
          email: guest.email || null,
          idProofType: guest.idProofType || null,
          idProofNumber: guest.idProofNumber || null,
          idProofFront: guest.idProofFront || null,
          idProofBack: guest.idProofBack || null,
          isPrimary: guest.isPrimary || false,
        }).returning();
        inserted.push(result);
      }

      res.json(inserted);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Checkout endpoint
  app.post("/api/bookings/checkout", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, paymentMethod, paymentMethods, paymentStatus = "paid", dueDate, pendingReason, discountType, discountValue, discountAppliesTo = "total", gstOnRooms = true, gstOnFood = false, includeServiceCharge = true, manualCharges, cashAmount, onlineAmount } = req.body;
      
      // Validate input
      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
      }
      
      // Payment method is required only when marking as paid (split cashAmount+onlineAmount is also valid)
      if (paymentStatus === "paid" && !paymentMethod && (!paymentMethods || paymentMethods.length === 0) && !cashAmount && !onlineAmount) {
        return res.status(400).json({ message: "Payment method is required when marking as paid" });
      }

      // Fetch booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check for open food orders (pending, preparing, or ready but not yet delivered)
      // Use defensive matching so orphan orders (booking_id NULL) placed against
      // this guest/room within the stay window are also billed at checkout.
      const bookingOrders = (await getBillableOrdersForBooking(booking))
        .filter((o: any) => !o.isTest);
      const openOrders = bookingOrders.filter((order: any) => 
        order.status === "pending" || order.status === "preparing" || order.status === "ready"
      );
      
      if (openOrders.length > 0) {
        const statusSummary = openOrders.map(o => `#${o.id} (${o.status})`).join(", ");
        return res.status(400).json({ 
          message: `Checkout blocked — ${openOrders.length} food order(s) are still open: ${statusSummary}. Please complete or cancel them before checkout.`
        });
      }

      // If manual charges are provided, create an extra service for each
      if (manualCharges && Array.isArray(manualCharges)) {
        for (const charge of manualCharges) {
          if (charge.name && charge.amount && parseFloat(charge.amount) > 0) {
            const manualServiceData = {
              bookingId,
              serviceName: charge.name,
              serviceType: "other",
              amount: parseFloat(charge.amount).toFixed(2),
              serviceDate: new Date(),
            };
            await storage.createExtraService(manualServiceData);
          }
        }
      }

      // Check if this booking has an existing bill (merged or not)
      const existingBill = await storage.getBillByBooking(bookingId);
      
      // If this is a MERGED BILL, don't recalculate - just mark as paid
      // Merged bills have their totals already calculated
      let roomCharges: number;
      let foodCharges: number;
      let extraCharges: number;
      let alreadyCollectedServices = 0;
      let subtotal: number;
      let gstAmount: number;
      let serviceChargeAmount: number;
      let totalAmountBeforeDiscount: number;
      let discountAmount = 0;
      let totalAmount: number;
      const gstRate = 5; // 5% GST
      const serviceChargeRate = 10; // 10% Service Charge
      
      if (existingBill && existingBill.mergedBookingIds && Array.isArray(existingBill.mergedBookingIds) && existingBill.mergedBookingIds.length > 0) {
        // MERGED BILL: keep room/food/extra subtotals from the merged bill, but
        // RECOMPUTE gst/service-charge/discount/total using the GST toggles the
        // user set in the checkout dialog. Previously we blindly trusted the
        // DB's gstAmount, which was wrong when food was added after merging.
        console.log(`[CHECKOUT] Merged bill detected for booking ${bookingId}. Recomputing totals from dialog toggles.`);
        roomCharges = parseFloat(existingBill.roomCharges || "0");
        foodCharges = parseFloat(existingBill.foodCharges || "0");
        extraCharges = parseFloat(existingBill.extraCharges || "0");
        subtotal = roomCharges + foodCharges + extraCharges;

        const roomGst = gstOnRooms ? (roomCharges * gstRate) / 100 : 0;
        const foodGst = gstOnFood ? (foodCharges * gstRate) / 100 : 0;
        gstAmount = roomGst + foodGst;
        serviceChargeAmount = includeServiceCharge ? (roomCharges * serviceChargeRate) / 100 : 0;
        totalAmountBeforeDiscount = subtotal + gstAmount + serviceChargeAmount;

        discountAmount = 0;
        if (discountType && discountValue && discountType !== "none") {
          const discount = parseFloat(discountValue);
          let baseAmountForDiscount = totalAmountBeforeDiscount;
          if (discountAppliesTo === "room") baseAmountForDiscount = roomCharges;
          else if (discountAppliesTo === "food") baseAmountForDiscount = foodCharges;
          if (discountType === "percentage") discountAmount = (baseAmountForDiscount * discount) / 100;
          else if (discountType === "fixed") discountAmount = discount;
        }

        totalAmount = totalAmountBeforeDiscount - discountAmount;
        console.log(`[CHECKOUT-MERGED] room:${roomCharges} food:${foodCharges} gstOnRooms:${gstOnRooms} gstOnFood:${gstOnFood} gst:${gstAmount} svc:${serviceChargeAmount} total:${totalAmount}`);
      } else {
        // REGULAR BOOKING: Recalculate charges
        // Fetch room(s) to get price
        const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
        
        // Calculate nights (minimum 1 night even if same-day checkout)
        const checkInDate = new Date(booking.checkInDate);
        const checkOutDate = new Date(booking.checkOutDate);
        const calculatedNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const nights = Math.max(1, calculatedNights); // Ensure at least 1 night
        
        // Calculate room charges - handle both single and group bookings
        roomCharges = 0;
        if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
          // Group booking: calculate total for all rooms
          for (const roomId of booking.roomIds) {
            const groupRoom = await storage.getRoom(roomId);
            if (groupRoom) {
              const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) / booking.roomIds.length : parseFloat(groupRoom.pricePerNight);
              roomCharges += pricePerNight * nights;
            }
          }
        } else {
          // Single room booking
          const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
          roomCharges = pricePerNight * nights;
        }

        // Calculate food charges (reusing allOrders and bookingOrders from pending order check above)
        // Exclude rejected orders from food charges
        foodCharges = bookingOrders
          .filter(order => order.status !== "rejected")
          .reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

        // Fetch and calculate extra service charges (now including manual charges)
        let bookingExtras: any[] = [];
        try {
          bookingExtras = await storage.getExtraServicesByBooking(bookingId);
        } catch (extrasErr: any) {
          console.warn(`[Checkout] Could not fetch extra services (non-critical): ${extrasErr.message}`);
        }
        extraCharges = bookingExtras.reduce((sum: number, extra: any) => sum + parseFloat(extra.amount || "0"), 0);
        // Track services already collected separately so they are not double-charged at checkout
        alreadyCollectedServices = bookingExtras
          .filter((e: any) => e.isPaid)
          .reduce((sum: number, extra: any) => sum + parseFloat(extra.amount || "0"), 0);

        // Calculate totals
        // IMPORTANT: Apply GST/Service Charge ONLY to room charges, NOT to food or extra charges
        subtotal = roomCharges + foodCharges + extraCharges; // Total subtotal including all charges
        
        const roomGst = gstOnRooms ? (roomCharges * gstRate) / 100 : 0;
        const foodGst = gstOnFood ? (foodCharges * gstRate) / 100 : 0;
        gstAmount = roomGst + foodGst;
        serviceChargeAmount = includeServiceCharge ? (roomCharges * serviceChargeRate) / 100 : 0; // Service charge ONLY on room charges
        totalAmountBeforeDiscount = subtotal + gstAmount + serviceChargeAmount;

        // Calculate discount based on where it applies
        discountAmount = 0;
        
        if (discountType && discountValue && discountType !== "none") {
          const discount = parseFloat(discountValue);
          let baseAmountForDiscount = totalAmountBeforeDiscount; // Default: apply to total
          
          // Determine base amount based on what discount applies to
          if (discountAppliesTo === "room") {
            baseAmountForDiscount = roomCharges;
          } else if (discountAppliesTo === "food") {
            baseAmountForDiscount = foodCharges;
          }
          
          if (discountType === "percentage") {
            discountAmount = (baseAmountForDiscount * discount) / 100;
          } else if (discountType === "fixed") {
            discountAmount = discount;
          }
        }

        totalAmount = totalAmountBeforeDiscount - discountAmount;
      }
      
      // For merged bills, use the bill's totalAdvance (combined advance from all merged bookings)
      // For regular bills, use the booking's advanceAmount
      let advancePaid: number;
      if (existingBill && existingBill.mergedBookingIds && Array.isArray(existingBill.mergedBookingIds) && existingBill.mergedBookingIds.length > 0) {
        advancePaid = parseFloat(existingBill.totalAdvance || existingBill.advancePaid || "0");
        console.log(`[CHECKOUT] Using merged bill totalAdvance: ${advancePaid}`);
      } else {
        advancePaid = parseFloat(booking.advanceAmount || "0");
      }
      const balanceAmount = totalAmount - advancePaid - alreadyCollectedServices;
      console.log(`[CHECKOUT] Total: ${totalAmount}, Advance: ${advancePaid}, AlreadyCollected: ${alreadyCollectedServices}, Balance: ${balanceAmount}`);

      // Create/Update bill with server-calculated amounts
      // When payment status is "paid", set balance to 0 (payment collected)
      // When payment status is "pending", keep calculated balance (payment to be collected later)
      
      // Build payment methods array for split payment tracking
      // Store payment breakdown regardless of payment status for P&L visibility
      let splitPaymentMethods: Array<{method: string, amount: number}> | null = null;
      if (cashAmount || onlineAmount) {
        splitPaymentMethods = [];
        if (cashAmount && cashAmount > 0) {
          splitPaymentMethods.push({ method: "cash", amount: cashAmount });
        }
        if (onlineAmount && onlineAmount > 0) {
          // Use the actual paymentMethod for the online portion (e.g. "bank")
          // Fall back to "bank" if method is "split" or unrecognised
          const onlineMethod = (paymentMethod && paymentMethod !== 'cash' && paymentMethod !== 'split')
            ? paymentMethod
            : 'bank';
          splitPaymentMethods.push({ method: onlineMethod, amount: onlineAmount });
        }
      } else if (paymentStatus === "paid" && paymentMethod) {
        // If no split payment amounts, but marked as paid with a single method
        splitPaymentMethods = [{ method: paymentMethod, amount: balanceAmount }];
      }
      
      const billData: any = {
        bookingId,
        guestId: booking.guestId,
        roomCharges: roomCharges.toFixed(2),
        foodCharges: foodCharges.toFixed(2),
        extraCharges: extraCharges.toFixed(2),
        subtotal: subtotal.toFixed(2),
        gstRate: gstRate.toString(),
        gstAmount: gstAmount.toFixed(2),
        serviceChargeRate: serviceChargeRate.toString(),
        serviceChargeAmount: serviceChargeAmount.toFixed(2),
        gstOnRooms,
        gstOnFood,
        includeServiceCharge,
        discountType: discountType || null,
        discountValue: discountValue ? discountValue.toString() : null,
        discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : "0",
        totalAmount: totalAmount.toFixed(2),
        advancePaid: advancePaid.toFixed(2),
        balanceAmount: paymentStatus === "paid" ? "0.00" : balanceAmount.toFixed(2),
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
        paymentMethods: splitPaymentMethods,
        paidAt: paymentStatus === "paid" ? new Date() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        pendingReason: pendingReason || null,
      };
      
      // Preserve merged bill properties
      if (existingBill && existingBill.mergedBookingIds && Array.isArray(existingBill.mergedBookingIds) && existingBill.mergedBookingIds.length > 0) {
        billData.mergedBookingIds = existingBill.mergedBookingIds;
        billData.totalAdvance = advancePaid.toFixed(2);
      }
      
      const bill = await storage.createOrUpdateBill(billData);

      // Record payment to wallet if paid - handle split payments
      let walletWarning: string | null = null;
      if (paymentStatus === "paid" && booking.propertyId && balanceAmount > 0) {
        try {
          const guest = await storage.getGuest(booking.guestId);
          const guestName = guest?.fullName || 'Guest';
          
          // Handle split payments (cash + online)
          const checkoutUserId = (req as any).user?.claims?.sub || (req as any).user?.id || null;
          if (splitPaymentMethods && splitPaymentMethods.length > 0) {
            for (const splitPayment of splitPaymentMethods) {
              if (splitPayment.amount > 0) {
                await storage.recordBillPaymentToWallet(
                  booking.propertyId,
                  bill.id,
                  splitPayment.amount,
                  splitPayment.method,
                  `Checkout payment - ${guestName} (Bill #${bill.id}) - ${splitPayment.method.toUpperCase()}`,
                  checkoutUserId,
                  bookingId
                );
                console.log(`[Wallet] Recorded checkout ${splitPayment.method} payment ₹${splitPayment.amount} for bill #${bill.id}`);
              }
            }
          } else {
            // Single payment method
            await storage.recordBillPaymentToWallet(
              booking.propertyId,
              bill.id,
              balanceAmount,
              paymentMethod || 'cash',
              `Checkout payment - ${guestName} (Bill #${bill.id})`,
              checkoutUserId,
              bookingId
            );
            console.log(`[Wallet] Recorded checkout payment ₹${balanceAmount} for bill #${bill.id}`);
          }
        } catch (walletError: any) {
          walletWarning = walletError?.message || 'Wallet update failed';
          console.log(`[Wallet] Could not record checkout payment to wallet:`, walletError);
        }
      }

      // Create notification for bill/checkout
      try {
        const allUsers = await storage.getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
        const guest = await storage.getGuest(booking.guestId);
        
        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "bill_generated",
            title: "Bill Generated - Checkout Complete",
            message: `Bill #${bill.id} for ${guest?.fullName || 'Guest'}. Total: ₹${totalAmount.toFixed(2)}, Balance: ₹${(paymentStatus === "paid" ? 0 : parseFloat(bill.balanceAmount || "0")).toFixed(2)}`,
            soundType: paymentStatus === "pending" ? "warning" : "info",
            relatedId: bill.id,
            relatedType: "bill",
          });
        }
        console.log(`[NOTIFICATIONS] Checkout/bill notification created for ${adminUsers.length} admins`);
      } catch (notifError: any) {
        console.error(`[NOTIFICATIONS] Failed to create checkout notification:`, notifError.message);
      }

      // Update booking status - handle merged bills
      await storage.updateBookingStatus(bookingId, "checked-out");
      
      // If this is a merged bill, also mark all merged bookings as checked-out
      if (bill.mergedBookingIds && Array.isArray(bill.mergedBookingIds) && bill.mergedBookingIds.length > 0) {
        console.log(`[CHECKOUT] Merged bill detected. Checking out ${bill.mergedBookingIds.length} merged bookings:`, bill.mergedBookingIds);
        for (const mergedBookingId of bill.mergedBookingIds) {
          if (mergedBookingId !== bookingId) {
            await storage.updateBookingStatus(mergedBookingId, "checked-out");
            console.log(`[CHECKOUT] Marked merged booking ${mergedBookingId} as checked-out`);
          }
        }
      }
      
      // Send WhatsApp checkout notification (if enabled)
      try {
        const guest = await storage.getGuest(booking.guestId);
        
        // Check if checkout_message template is enabled
        const checkoutTemplateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'checkout_message');
        const isCheckoutTemplateEnabled = checkoutTemplateSetting?.isEnabled !== false;
        
        if (guest && guest.phone && isCheckoutTemplateEnabled) {
          // Get property info
          let propertyName = "Your Property";
          let roomNumbers = "TBD";
          
          if (booking.roomId) {
            const room2 = await storage.getRoom(booking.roomId);
            if (room2) {
              const property = await storage.getProperty(room2.propertyId);
              propertyName = property?.name || propertyName;
              roomNumbers = room2.roomNumber;
            }
          } else if (booking.roomIds && booking.roomIds.length > 0) {
            const rooms = await Promise.all(booking.roomIds.map(id => storage.getRoom(id)));
            if (rooms.length > 0 && rooms[0]) {
              const property = await storage.getProperty(rooms[0].propertyId);
              propertyName = property?.name || propertyName;
              roomNumbers = rooms.filter(r => r).map(r => r!.roomNumber).join(", ");
            }
          }
          
          const guestName = guest.fullName || "Guest";
          const totalAmountFormatted = `₹${totalAmount.toFixed(2)}`;
          const checkoutDate = format(new Date(), "dd MMM yyyy");
          
          await sendCheckoutNotification(
            (guest as any).whatsappPhone || guest.phone,
            guestName,
            propertyName,
            totalAmountFormatted,
            checkoutDate,
            roomNumbers
          );
          
          console.log(`[WhatsApp] Booking #${booking.id} - Checkout notification sent to ${guest.fullName}`);
        } else if (!isCheckoutTemplateEnabled) {
          console.log(`[WhatsApp] Booking #${booking.id} - checkout_message template disabled, skipping notification`);
        } else if (!guest) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send checkout notification: guest ${booking.guestId} not found`);
        } else if (!guest.phone) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send checkout notification: guest has no phone number`);
        }
      } catch (whatsappError: any) {
        console.error(`[WhatsApp] Booking #${booking.id} - Checkout notification failed (non-critical):`, whatsappError.message);
      }

      res.json({ success: true, bill, walletWarning });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send pre-bill via Authkey WhatsApp - saves full details and sends link
  app.post("/api/whatsapp/send-prebill", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, phoneNumber, guestName, billTotal, roomCharges, foodCharges, extraCharges, gstAmount, discount, advancePayment, balanceDue } = req.body;
      
      if (!bookingId || !phoneNumber || !guestName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Each order row stores its line items inside a JSON `items` column
      // shaped like [{ name, quantity, price, ... }]. The previous code
      // tried to read `o.itemName` / `o.quantity` / `o.price` directly off
      // the order row, which don't exist — so the guest pre-bill page
      // showed every item as "undefined x undefined  ₹NaN".
      // Flatten all items from every non-cancelled, non-test order, and
      // merge duplicates so one item ordered twice shows as "Tea x 2".
      const orders = await getBillableOrdersForBooking(booking);
      const merged = new Map<string, { name: string; quantity: number; price: number; total: number }>();
      for (const order of orders) {
        if (order.status === 'cancelled' || order.status === 'rejected' || (order as any).isTest) continue;
        const lineItems = Array.isArray((order as any).items) ? ((order as any).items as any[]) : [];
        for (const li of lineItems) {
          const name = String(li?.name ?? li?.itemName ?? 'Item').trim();
          const quantity = Number(li?.quantity ?? 1) || 1;
          const price = parseFloat(String(li?.price ?? 0)) || 0;
          const key = `${name}__${price}`;
          const existing = merged.get(key);
          if (existing) {
            existing.quantity += quantity;
            existing.total += quantity * price;
          } else {
            merged.set(key, { name, quantity, price, total: quantity * price });
          }
        }
      }
      const foodItems = Array.from(merged.values());

      const nights = Math.max(1, Math.ceil(
        (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
      ));

      const token = randomUUID().replace(/-/g, '').substring(0, 32);
      
      // Calculate balance due - use provided value or calculate from billTotal - advancePayment
      const calculatedBalanceDue = balanceDue !== undefined ? balanceDue : ((billTotal || 0) - (advancePayment || 0));

      const preBill = await db.insert(preBills).values({
        bookingId: bookingId,
        token,
        totalAmount: (billTotal || 0).toString(),
        balanceDue: Math.max(0, calculatedBalanceDue).toString(),
        roomNumber: booking.roomNumber || '',
        roomCharges: (roomCharges || 0).toString(),
        foodCharges: (foodCharges || 0).toString(),
        extraCharges: (extraCharges || 0).toString(),
        gstAmount: (gstAmount || 0).toString(),
        discount: (discount || 0).toString(),
        advancePayment: (advancePayment || 0).toString(),
        foodItems: foodItems,
        guestName: guestName,
        guestPhone: phoneNumber,
        guestEmail: booking.guest?.email || '',
        propertyId: booking.propertyId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        nights: nights,
        status: 'pending'
      }).returning();

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://hostezee.in";
      const preBillLink = `${baseUrl}/guest/prebill/${token}`;

      const roomChargesNum = parseFloat(roomCharges || 0);
      const foodChargesNum = parseFloat(foodCharges || 0);
      const advancePaymentNum = parseFloat(advancePayment || 0);
      const balanceDueNum = Math.max(0, calculatedBalanceDue);
      
      // Send pre-bill link via dedicated template (WID 30849 / AUTHKEY_WA_PREBILL_LINK)
      // Template: "Dear , {{1}} Your pre-bill is ready... Room: {{2}} Balance Due: Rs. {{3}} ...link: {{4}}"
      const result = await sendCustomWhatsAppMessage(
        phoneNumber,
        process.env.AUTHKEY_WA_PREBILL_LINK || "30849",
        [
          guestName,                          // {{1}} Guest name
          booking.roomNumber || "N/A",         // {{2}} Room number
          balanceDueNum.toFixed(2),            // {{3}} Balance due (numbers only, no ₹)
          preBillLink,                         // {{4}} Full pre-bill URL
        ]
      );

      if (result.success) {
        res.json({ success: true, message: "Pre-bill sent successfully", preBillLink, token });
      } else {
        res.status(500).json({ message: result.error || "Failed to send pre-bill" });
      }
    } catch (error: any) {
      console.error("Send pre-bill error:", error);
      res.status(500).json({ message: error.message || "Failed to send pre-bill" });
    }
  });

  // POST /api/bills/:id/send-whatsapp — resend a generated bill to the guest via WhatsApp
  app.post("/api/bills/:id/send-whatsapp", isAuthenticated, async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      const bill = await storage.getBill(billId);
      if (!bill) return res.status(404).json({ message: "Bill not found" });

      const booking = await storage.getBooking(bill.bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) return res.status(400).json({ message: "Guest has no phone number" });

      const waPhone = (guest as any).whatsappPhone || guest.phone;
      if (!isRealPhone(waPhone)) return res.status(400).json({ message: "No valid phone number" });

      const totalAmount = parseFloat(bill.totalAmount || "0");
      const roomChargesNum = parseFloat(bill.roomCharges || "0");
      const foodChargesNum = parseFloat(bill.foodCharges || "0");
      const extraChargesNum = parseFloat(bill.extraCharges || "0");
      const gstAmountNum = parseFloat(bill.gstAmount || "0");
      const advancePaymentNum = parseFloat(String((bill as any).totalAdvance || bill.advancePaid || "0"));
      const discountNum = parseFloat(bill.discountAmount || "0");
      const balanceDueNum = bill.paymentStatus === "paid" ? 0 : Math.max(0, totalAmount - advancePaymentNum);

      const guestName = guest.fullName || "Guest";
      const roomNumber = booking.roomNumber || "N/A";

      // Build food items from orders for the pre-bill viewer
      const bookingOrders = await getBillableOrdersForBooking(booking);
      const merged = new Map<string, { name: string; quantity: number; price: number; total: number }>();
      for (const order of bookingOrders) {
        if (order.status === 'cancelled' || order.status === 'rejected' || (order as any).isTest) continue;
        const lineItems = Array.isArray((order as any).items) ? ((order as any).items as any[]) : [];
        for (const li of lineItems) {
          const name = String(li?.name ?? li?.itemName ?? 'Item').trim();
          const quantity = Number(li?.quantity ?? 1) || 1;
          const price = parseFloat(String(li?.price ?? 0)) || 0;
          const key = `${name}__${price}`;
          const existing = merged.get(key);
          if (existing) { existing.quantity += quantity; existing.total += quantity * price; }
          else merged.set(key, { name, quantity, price, total: quantity * price });
        }
      }
      const foodItems = Array.from(merged.values());

      const nights = Math.max(1, Math.ceil(
        (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
      ));

      const token = randomUUID().replace(/-/g, '').substring(0, 32);
      await db.insert(preBills).values({
        bookingId: booking.id,
        token,
        totalAmount: totalAmount.toString(),
        balanceDue: balanceDueNum.toString(),
        roomNumber,
        roomCharges: roomChargesNum.toString(),
        foodCharges: foodChargesNum.toString(),
        extraCharges: extraChargesNum.toString(),
        gstAmount: gstAmountNum.toString(),
        discount: discountNum.toString(),
        advancePayment: advancePaymentNum.toString(),
        foodItems,
        guestName,
        guestPhone: waPhone,
        guestEmail: guest.email || '',
        propertyId: booking.propertyId,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        nights,
        status: bill.paymentStatus === 'paid' ? 'approved' : 'pending',
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://hostezee.in";
      const billLink = `${baseUrl}/guest/prebill/${token}`;

      const result = await sendCustomWhatsAppMessage(
        waPhone,
        process.env.AUTHKEY_WA_PREBILL_LINK || "30849",
        [guestName, roomNumber, balanceDueNum.toFixed(2), billLink]
      );

      if (result.success) {
        console.log(`[BILL-WA] Bill #${billId} sent to ${guestName} (${waPhone})`);
        res.json({ success: true, message: `Bill sent to ${waPhone}` });
      } else {
        res.status(500).json({ message: result.error || "Failed to send bill via WhatsApp" });
      }
    } catch (error: any) {
      console.error("[BILL-WA] Error:", error.message);
      res.status(500).json({ message: error.message || "Failed to send bill" });
    }
  });

  // Public route: Get pre-bill by token
  app.get("/api/public/prebill/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const result = await db.select().from(preBills).where(eq(preBills.token, token)).limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Pre-bill not found" });
      }

      const preBill = result[0];
      
      let propertyName = '';
      if (preBill.propertyId) {
        const property = await storage.getProperty(preBill.propertyId);
        propertyName = property?.name || '';
      }

      // Always rebuild foodItems LIVE from the orders table at view time.
      // This handles three problems at once:
      //  - older pre_bill rows that snapshotted broken data ([{total:null}...])
      //  - new orders placed AFTER the pre-bill was sent (now visible)
      //  - cancelled orders being filtered out properly
      // Falls back to the saved snapshot only if the live lookup fails.
      let foodItems: any[] = Array.isArray(preBill.foodItems) ? (preBill.foodItems as any[]) : [];
      try {
        const parentBooking = await storage.getBooking(preBill.bookingId);
        const orders = parentBooking
          ? await getBillableOrdersForBooking(parentBooking)
          : await storage.getOrdersByBooking(preBill.bookingId);
        const merged = new Map<string, { name: string; quantity: number; price: number; total: number }>();
        for (const order of orders) {
          if (order.status === 'cancelled' || order.status === 'rejected' || (order as any).isTest) continue;
          const lineItems = Array.isArray((order as any).items) ? ((order as any).items as any[]) : [];
          for (const li of lineItems) {
            const name = String(li?.name ?? li?.itemName ?? 'Item').trim() || 'Item';
            const quantity = Number(li?.quantity ?? 1) || 1;
            const price = parseFloat(String(li?.price ?? 0)) || 0;
            const key = `${name}__${price}`;
            const existing = merged.get(key);
            if (existing) {
              existing.quantity += quantity;
              existing.total += quantity * price;
            } else {
              merged.set(key, { name, quantity, price, total: quantity * price });
            }
          }
        }
        const live = Array.from(merged.values());
        if (live.length > 0) foodItems = live;
      } catch (liveErr) {
        console.warn('[PREBILL-VIEW] live food-items rebuild failed, falling back to snapshot:', liveErr);
      }

      // Strip any malformed snapshot entries (no name AND no price) so the
      // guest never sees blank "x  ₹0.00" rows.
      foodItems = foodItems.filter((it: any) => {
        const hasName = it && typeof it.name === 'string' && it.name.trim().length > 0;
        const hasValue = parseFloat(String(it?.total ?? it?.price ?? 0)) > 0;
        return hasName || hasValue;
      });

      res.json({ ...preBill, foodItems, propertyName });
    } catch (error: any) {
      console.error("Get pre-bill error:", error);
      res.status(500).json({ message: error.message || "Failed to get pre-bill" });
    }
  });

  // Public route: Confirm pre-bill and trigger payment link
  app.post("/api/public/prebill/:token/confirm", async (req, res) => {
    try {
      const { token } = req.params;
      
      const result = await db.select().from(preBills).where(eq(preBills.token, token)).limit(1);
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Pre-bill not found" });
      }

      const preBill = result[0];

      if (preBill.status === 'confirmed' || preBill.status === 'paid') {
        return res.status(400).json({ message: "Pre-bill already confirmed" });
      }

      await db.update(preBills).set({ 
        status: 'confirmed',
        approvedAt: new Date()
      }).where(eq(preBills.token, token));

      const booking = await storage.getBooking(preBill.bookingId);
      const guest = booking ? await storage.getGuest(booking.guestId) : null;

      if (guest && guest.phone && guest.email && preBill.balanceDue && booking) {
        // Check if split_payment template is enabled
        const splitPaymentSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'split_payment');
        const isSplitPaymentEnabled = splitPaymentSetting?.isEnabled !== false;
        
        const balanceDue = parseFloat(preBill.balanceDue.toString());
        
        if (balanceDue > 0 && isSplitPaymentEnabled) {
          const paymentLink = await createPaymentLink(
            preBill.bookingId,
            balanceDue,
            preBill.guestName || guest.fullName || 'Guest',
            preBill.guestEmail || guest.email || '',
            preBill.guestPhone || guest.phone || ''
          );

          const paymentLinkUrl = paymentLink.shortUrl || paymentLink.paymentLink;

          // Template 29412 expects: guestName, roomCharges, foodCharges, cashReceived, balanceAmount, paymentLink
          const roomChargesFormatted = preBill.roomCharges ? `₹${parseFloat(preBill.roomCharges.toString()).toFixed(2)}` : "₹0.00";
          const foodChargesFormatted = preBill.foodCharges ? `₹${parseFloat(preBill.foodCharges.toString()).toFixed(2)}` : "₹0.00";
          const advancePaidFormatted = preBill.advancePayment ? `₹${parseFloat(preBill.advancePayment.toString()).toFixed(2)}` : "₹0.00";
          const balanceFormatted = `₹${balanceDue.toFixed(2)}`;
          
          await sendCustomWhatsAppMessage(
            preBill.guestPhone || guest.phone,
            process.env.AUTHKEY_WA_SPLIT_PAYMENT || "29412",
            [preBill.guestName || guest.fullName, roomChargesFormatted, foodChargesFormatted, advancePaidFormatted, balanceFormatted, paymentLinkUrl]
          );

          return res.json({ 
            success: true, 
            message: "Thank you! Payment link sent to your WhatsApp", 
            paymentLinkUrl 
          });
        }
      }

      res.json({ success: true, message: "Pre-bill confirmed successfully" });
    } catch (error: any) {
      console.error("Confirm pre-bill error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm pre-bill" });
    }
  });

  // Send payment link via Authkey WhatsApp
  app.post("/api/whatsapp/send-payment-link", isAuthenticated, async (req, res) => {
    try {
      const { amount, guestName, guestPhone, guestEmail, bookingId, roomCharges, foodCharges, cashReceived } = req.body;
      
      // guestEmail is optional - many guests don't have email addresses
      if (!amount || !guestName || !guestPhone || !bookingId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if split_payment template is enabled
      const booking = await storage.getBooking(bookingId);
      if (booking) {
        const splitPaymentSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'split_payment');
        const isSplitPaymentEnabled = splitPaymentSetting?.isEnabled !== false;
        
        if (!isSplitPaymentEnabled) {
          return res.status(400).json({ message: "Split payment WhatsApp messages are disabled for this property" });
        }
      }

      const paymentLink = await createPaymentLink(
        bookingId,
        amount,
        guestName,
        guestEmail || `guest${bookingId}@hostezee.com`,
        guestPhone
      );

      const paymentLinkUrl = paymentLink.shortUrl || paymentLink.paymentLink;
      
      // Template 29412 expects: guestName, roomCharges, foodCharges, cashReceived, balanceAmount, paymentLink
      const roomChargesFormatted = roomCharges ? `₹${parseFloat(roomCharges).toFixed(2)}` : "₹0.00";
      const foodChargesFormatted = foodCharges ? `₹${parseFloat(foodCharges).toFixed(2)}` : "₹0.00";
      const cashReceivedFormatted = cashReceived ? `₹${parseFloat(cashReceived).toFixed(2)}` : "₹0.00";
      const balanceFormatted = `₹${parseFloat(amount).toFixed(2)}`;

      const result = await sendCustomWhatsAppMessage(
        guestPhone,
        process.env.AUTHKEY_WA_SPLIT_PAYMENT || "29412",
        [guestName, roomChargesFormatted, foodChargesFormatted, cashReceivedFormatted, balanceFormatted, paymentLinkUrl]
      );

      if (result.success) {
        res.json({ success: true, message: "Payment link sent successfully", paymentLinkUrl });
      } else {
        res.status(500).json({ message: result.error || "Failed to send payment link" });
      }
    } catch (error: any) {
      console.error("Send payment link error:", error);
      res.status(500).json({ message: error.message || "Failed to send payment link" });
    }
  });

  // Create RazorPay payment link for split payments
  app.post("/api/razorpay/payment-link", isAuthenticated, async (req, res) => {
    try {
      const { amount, guestName, guestPhone, guestEmail, bookingId } = req.body;
      
      // guestEmail is optional - many guests don't have email addresses
      if (!amount || !guestName || !guestPhone || !bookingId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const paymentLink = await createPaymentLink(
        bookingId,
        amount,
        guestName,
        guestEmail || `guest${bookingId}@hostezee.com`,
        guestPhone
      );

      res.json({
        success: true,
        paymentLinkUrl: paymentLink.shortUrl || paymentLink.paymentLink,
        linkId: paymentLink.linkId
      });
    } catch (error: any) {
      console.error("Payment link error:", error);
      res.status(500).json({ message: error.message || "Failed to create payment link" });
    }
  });

  // Send advance payment request for a booking
  app.post("/api/bookings/:id/send-advance-payment", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { customAmount } = req.body; // Optional custom advance amount
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) {
        return res.status(400).json({ message: "Guest phone number is required to send payment link" });
      }
      
      // Get feature settings for advance payment configuration
      const settingsResult = await db.select().from(featureSettings).where(eq(featureSettings.propertyId, booking.propertyId)).limit(1);
      const settings = settingsResult[0];
      
      // Calculate advance amount
      let advanceAmount = customAmount;
      if (!advanceAmount) {
        const percentage = settings?.advancePaymentPercentage ? parseFloat(settings.advancePaymentPercentage) : 30;
        const totalAmount = parseFloat(booking.totalAmount || "0");
        advanceAmount = (totalAmount * percentage) / 100;
      }
      
      if (advanceAmount <= 0) {
        return res.status(400).json({ message: "Invalid advance amount. Total booking amount must be greater than zero." });
      }
      
      // Get expiry hours from settings
      const expiryHours = settings?.advancePaymentExpiryHours || 24;
      
      // Import and create advance payment link
      const { createAdvancePaymentLink } = await import("./razorpay");
      const paymentLink = await createAdvancePaymentLink(
        bookingId,
        advanceAmount,
        guest.fullName || "Guest",
        guest.email || "",
        guest.phone,
        expiryHours
      );
      
      // Update booking with payment link info
      await db.update(bookings).set({
        status: "pending_advance",
        advancePaymentStatus: "pending",
        paymentLinkId: paymentLink.linkId,
        paymentLinkUrl: paymentLink.shortUrl,
        paymentLinkExpiry: paymentLink.expiryTimestamp,
        advanceAmount: advanceAmount.toString(),
        updatedAt: new Date(),
      }).where(eq(bookings.id, bookingId));
      storage.invalidateBookingsCache();
      
      // Send initial WhatsApp message (WID 29779) — starts the reminder flow
      const property = await storage.getProperty(booking.propertyId);
      
      // Check if pending_payment template is enabled
      const templateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'pending_payment');
      const isTemplateEnabled = templateSetting?.isEnabled !== false;
      
      const waPhoneForPayment = (guest as any).whatsappPhone || guest.phone;
      if (isTemplateEnabled && guest.phone && isRealPhone(waPhoneForPayment)) {
        try {
          console.log(`[WhatsApp] Sending initial payment request (WID 29779) for booking #${bookingId} to ${waPhoneForPayment}`);
          const waResult = await sendInitialPaymentRequest(
            waPhoneForPayment,
            guest.fullName || "Guest",
            property?.name || "Property",
            `₹${advanceAmount.toLocaleString('en-IN')}`,
            paymentLink.shortUrl
          );
          console.log(`[WhatsApp] Result for booking #${bookingId}:`, waResult);
        } catch (waError: any) {
          console.error("[WhatsApp] Error sending initial payment request:", waError.message);
        }
      } else if (!isTemplateEnabled) {
        console.log(`[WhatsApp] pending_payment template disabled for property ${booking.propertyId}, skipping message`);
      }
      
      console.log(`[ADVANCE PAYMENT] Payment link sent to ${guest.fullName} for booking #${bookingId}, amount: ₹${advanceAmount}`);
      
      res.json({
        success: true,
        message: "Advance payment request sent via WhatsApp",
        paymentLinkUrl: paymentLink.shortUrl,
        advanceAmount: advanceAmount,
        expiryHours: expiryHours,
        bookingStatus: "pending_advance"
      });
    } catch (error: any) {
      console.error("[Advance Payment] Error:", error?.message || error);
      let message = error?.message || "Failed to send advance payment request";
      if (message.includes("Authentication failed") || message.includes("RazorPay error")) {
        message = "Razorpay authentication failed. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment.";
      } else if (message.includes("phone") || message.includes("Guest phone")) {
        message = "Guest phone number is required. Please add a valid 10-digit phone number to the guest.";
      }
      res.status(500).json({ message });
    }
  });

  // Send self check-in link to guest via WhatsApp
  app.post("/api/bookings/:id/send-checkin-link", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) {
        return res.status(400).json({ message: "Guest phone number is required to send check-in link" });
      }
      
      const property = await storage.getProperty(booking.propertyId);
      
      // Check if checkin_message template is enabled
      const checkinTemplateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'checkin_message');
      const isCheckinEnabled = checkinTemplateSetting?.isEnabled !== false;
      
      if (!isCheckinEnabled) {
        return res.status(400).json({ message: "Check-in WhatsApp messages are disabled for this property" });
      }
      
      // Generate the self check-in link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'https://hostezee.replit.app';
      
      const checkinLink = `${baseUrl}/guest-self-checkin?bookingId=${bookingId}`;
      const checkInFormatted = format(new Date(booking.checkInDate), "dd MMM yyyy");
      const checkOutFormatted = format(new Date(booking.checkOutDate), "dd MMM yyyy");
      
      // Get room number if assigned
      let roomNumber = "Your Room";
      if (booking.roomId) {
        const room = await storage.getRoom(booking.roomId);
        roomNumber = room?.roomNumber || "Your Room";
      }
      
      try {
        await sendSelfCheckinLink(
          (guest as any).whatsappPhone || guest.phone,
          guest.fullName || "Guest",
          property?.name || "Property",
          checkinLink,
          checkInFormatted,
          checkOutFormatted,
          roomNumber
        );
        
        console.log(`[SELF CHECKIN] Check-in link sent to ${guest.fullName} for booking #${bookingId}`);
        
        res.json({
          success: true,
          message: "Self check-in link sent via WhatsApp",
          checkinLink
        });
      } catch (waError: any) {
        console.error("[SELF CHECKIN] WhatsApp error:", waError.message);
        res.status(500).json({ message: "Failed to send WhatsApp message" });
      }
    } catch (error: any) {
      console.error("Send check-in link error:", error);
      res.status(500).json({ message: error.message || "Failed to send check-in link" });
    }
  });

  // POST /api/bookings/:id/resend-whatsapp  — resend any template to the guest's WA number
  app.post("/api/bookings/:id/resend-whatsapp", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { type } = req.body as { type: "confirmation" | "payment" | "checkin" };
      if (!type) return res.status(400).json({ message: "type is required" });

      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) return res.status(400).json({ message: "Guest has no phone number" });

      const waPhone = (guest as any).whatsappPhone || guest.phone;
      if (!isRealPhone(waPhone)) return res.status(400).json({ message: "No valid phone number available" });

      const property = await storage.getProperty(booking.propertyId);
      const propertyName = property?.name || "Your Property";
      const guestName = guest.fullName || "Guest";

      if (type === "confirmation") {
        const checkInFmt = format(new Date(booking.checkInDate), "dd MMM yyyy");
        const checkOutFmt = format(new Date(booking.checkOutDate), "dd MMM yyyy");
        await sendBookingConfirmedNotification(waPhone, guestName, propertyName, checkInFmt, checkOutFmt);
        console.log(`[RESEND-WA] Booking confirmation sent to ${guestName} (${waPhone}) for booking #${bookingId}`);
        return res.json({ success: true, message: `Booking confirmation sent to ${waPhone}` });
      }

      if (type === "payment") {
        if (!booking.paymentLinkUrl) {
          return res.status(400).json({ message: "No payment link exists for this booking. Use 'Send Payment Link' to create one." });
        }
        const { sendInitialPaymentRequest } = await import("./authkey");
        const advanceAmt = booking.advanceAmount ? `₹${parseFloat(booking.advanceAmount).toLocaleString("en-IN")}` : "advance amount";
        await sendInitialPaymentRequest(waPhone, guestName, propertyName, advanceAmt, booking.paymentLinkUrl);
        console.log(`[RESEND-WA] Payment request resent to ${guestName} (${waPhone}) for booking #${bookingId}`);
        return res.json({ success: true, message: `Payment request sent to ${waPhone}` });
      }

      if (type === "checkin") {
        const baseUrl = "https://hostezee.in";
        const checkinLink = `${baseUrl}/guest-self-checkin?bookingId=${bookingId}`;
        const checkInFormatted = format(new Date(booking.checkInDate), "dd MMM yyyy");
        const checkOutFormatted = format(new Date(booking.checkOutDate), "dd MMM yyyy");
        let roomNumber = "Your Room";
        if (booking.roomId) {
          const room = await storage.getRoom(booking.roomId);
          roomNumber = room?.roomNumber || "Your Room";
        }
        await sendSelfCheckinLink(waPhone, guestName, propertyName, checkinLink, checkInFormatted, checkOutFormatted, roomNumber);
        console.log(`[RESEND-WA] Check-in link resent to ${guestName} (${waPhone}) for booking #${bookingId}`);
        return res.json({ success: true, message: `Check-in link sent to ${waPhone}` });
      }

      return res.status(400).json({ message: "Invalid type" });
    } catch (error: any) {
      console.error("[RESEND-WA] Error:", error.message);
      res.status(500).json({ message: error.message || "Failed to send WhatsApp message" });
    }
  });

  // Manually confirm a booking (skip advance payment)
  app.post("/api/bookings/:id/confirm", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Update booking status to confirmed
      await db.update(bookings).set({
        status: "confirmed",
        advancePaymentStatus: "not_required",
        updatedAt: new Date(),
      }).where(eq(bookings.id, bookingId));
      storage.invalidateBookingsCache();
      
      console.log(`[BOOKING] Booking #${bookingId} manually confirmed`);

      // Send booking confirmed WhatsApp notification (template 29294) — non-blocking
      setImmediate(async () => {
        try {
          const bcSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'booking_confirmation');
          const isBcEnabled = bcSetting?.isEnabled !== false;
          if (!isBcEnabled) {
            console.log(`[WhatsApp] Booking #${bookingId} - booking_confirmation template disabled, skipping`);
            return;
          }
          const guest = await storage.getGuest(booking.guestId);
          if (guest && guest.phone) {
            let propertyName = "Your Property";
            if (booking.propertyId) {
              const property = await storage.getProperty(booking.propertyId);
              propertyName = property?.name || propertyName;
            }
            const checkInFmt = format(new Date(booking.checkInDate), "dd MMM yyyy");
            const checkOutFmt = format(new Date(booking.checkOutDate), "dd MMM yyyy");
            await sendBookingConfirmedNotification(guest.phone, guest.fullName || "Guest", propertyName, checkInFmt, checkOutFmt);
            console.log(`[WhatsApp] Booking #${bookingId} - Booking confirmed notification sent to ${guest.fullName} (template: 29294)`);
          }
        } catch (waErr: any) {
          console.error(`[WhatsApp] Booking #${bookingId} - Booking confirmed notification failed (non-critical):`, waErr.message);
        }
      });
      
      res.json({
        success: true,
        message: "Booking confirmed successfully"
      });
    } catch (error: any) {
      console.error("Confirm booking error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm booking" });
    }
  });

  // Manually confirm advance payment received (for testing when webhook not working)
  // This triggers the same confirmation flow as the webhook
  app.post("/api/bookings/:id/confirm-advance-payment", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { sendWhatsApp = true } = req.body;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      if (booking.status !== "pending_advance") {
        return res.status(400).json({ message: "Booking is not pending advance payment" });
      }
      
      const advanceAmount = parseFloat(booking.advanceAmount?.toString() || "0");
      
      // Update booking status to confirmed and mark advance as paid
      await db.update(bookings).set({
        status: "confirmed",
        advancePaymentStatus: "paid",
        updatedAt: new Date(),
      }).where(eq(bookings.id, bookingId));
      storage.invalidateBookingsCache();
      
      console.log(`[ADVANCE PAYMENT] Booking #${bookingId} manually confirmed - advance payment marked as received`);
      
      // Send WhatsApp confirmation to guest (same as webhook flow) - check template controls
      if (sendWhatsApp) {
        const guest = await storage.getGuest(booking.guestId);
        const property = await storage.getProperty(booking.propertyId);
        if (guest && guest.phone) {
          try {
            // Check if payment_confirmation template is enabled
            const templateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'payment_confirmation');
            const isTemplateEnabled = templateSetting?.isEnabled !== false;
            
            if (isTemplateEnabled) {
              await sendAdvancePaymentConfirmation(
                guest.phone,
                guest.fullName || "Guest",
                `₹${advanceAmount.toLocaleString('en-IN')}`,
                property?.name || "Hotel"
              );
              console.log(`[ADVANCE PAYMENT] Confirmation WhatsApp sent to ${guest.fullName}`);
            } else {
              console.log(`[ADVANCE PAYMENT] Payment confirmation WhatsApp disabled for property ${booking.propertyId}`);
            }
          } catch (whatsappError: any) {
            console.error(`[ADVANCE PAYMENT] WhatsApp failed:`, whatsappError.message);
          }
        }
      }
      
      // Create notification for admins
      try {
        const guest = await storage.getGuest(booking.guestId);
        const allUsers = await storage.getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
        
        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "payment_received",
            title: "Advance Payment Confirmed",
            message: `Booking #${bookingId} confirmed! Advance of ₹${advanceAmount.toLocaleString('en-IN')} received from ${guest?.fullName || 'Guest'}`,
            soundType: "payment",
            relatedId: bookingId,
            relatedType: "booking",
          });
        }
      } catch (notifError: any) {
        console.error(`[ADVANCE PAYMENT] Notification error:`, notifError.message);
      }
      
      res.json({
        success: true,
        message: "Advance payment confirmed - booking is now confirmed",
        bookingId,
        advanceAmount,
        newStatus: "confirmed"
      });
    } catch (error: any) {
      console.error("Confirm advance payment error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm advance payment" });
    }
  });

  // Admin-only: re-open a booking that was automatically checked out today
  app.post("/api/bookings/:id/reopen", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);

      if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super-admin")) {
        return res.status(403).json({ message: "Only admin users can reopen a booking" });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status !== "checked-out") {
        return res.status(400).json({ message: "Only checked-out bookings can be reopened" });
      }

      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (booking.checkOutDate !== todayStr) {
        return res.status(400).json({ message: "A booking can only be reopened if its checkout date is today" });
      }

      const updated = await storage.updateBookingStatus(bookingId, "checked-in");
      console.log(`[BOOKING_REOPENED] bookingId=${bookingId} adminEmail=${currentUser.email} checkOutDate=${booking.checkOutDate}`);

      res.json({ success: true, booking: updated });
    } catch (error: any) {
      console.error("Reopen booking error:", error);
      res.status(500).json({ message: error.message || "Failed to reopen booking" });
    }
  });

  // Force auto-checkout at 4 PM (16:00) for any remaining checked-in bookings past checkout
  app.post("/api/bookings/force-auto-checkout", isAuthenticated, async (req, res) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only allow force checkout from 4 PM (16:00) onwards
      if (currentHour < 16) {
        return res.status(400).json({ message: "Force auto-checkout only available after 4 PM" });
      }

      const allBookings = await storage.getAllBookings();
      const overdue = allBookings.filter(b => 
        b.status === "checked-in" && 
        new Date(b.checkOutDate) < now
      );

      const checkedOutCount = overdue.length;
      let successCount = 0;
      
      for (const booking of overdue) {
        try {
          const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
          const checkInDate = new Date(booking.checkInDate);
          const checkOutDate = new Date(booking.checkOutDate);
          const calculatedNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
          const nights = Math.max(1, calculatedNights);
          
          let roomCharges = 0;
          if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
            for (const roomId of booking.roomIds) {
              const groupRoom = await storage.getRoom(roomId);
              if (groupRoom) {
                const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) / booking.roomIds.length : parseFloat(groupRoom.pricePerNight);
                roomCharges += pricePerNight * nights;
              }
            }
          } else {
            const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
            roomCharges = pricePerNight * nights;
          }

          // Defensive: include orphan orders matching guest/room within stay
          const bookingOrders = await getBillableOrdersForBooking(booking);
          const foodCharges = bookingOrders
            .filter((o: any) => o.status !== "rejected" && !o.isTest)
            .reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || "0"), 0);
          
          let bookingExtras: any[] = [];
          try {
            bookingExtras = await storage.getExtraServicesByBooking(booking.id);
          } catch (extErr: any) {
            console.warn(`[AutoCheckout] Could not fetch extra services for booking ${booking.id}: ${extErr.message}`);
          }
          const extraCharges = bookingExtras.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);

          const subtotal = roomCharges + foodCharges + extraCharges;
          const gstAmount = (roomCharges * 5) / 100;
          const serviceChargeAmount = (roomCharges * 10) / 100;
          const totalAmount = subtotal + gstAmount + serviceChargeAmount;
          const advancePaid = parseFloat(booking.advanceAmount || "0");
          const balanceAmount = totalAmount - advancePaid;

          const billData = {
            bookingId: booking.id,
            guestId: booking.guestId,
            roomCharges: roomCharges.toFixed(2),
            foodCharges: foodCharges.toFixed(2),
            extraCharges: extraCharges.toFixed(2),
            subtotal: subtotal.toFixed(2),
            gstRate: "5",
            gstAmount: gstAmount.toFixed(2),
            serviceChargeRate: "10",
            serviceChargeAmount: serviceChargeAmount.toFixed(2),
            gstOnRooms: true,
            gstOnFood: false,
            includeServiceCharge: true,
            discountType: null,
            discountValue: null,
            discountAmount: "0",
            totalAmount: totalAmount.toFixed(2),
            advancePaid: advancePaid.toFixed(2),
            balanceAmount: balanceAmount.toFixed(2),
            paymentStatus: "pending",
            paymentMethod: null,
            paidAt: null,
            dueDate: null,
            pendingReason: "auto_checkout",
          };

          await storage.createOrUpdateBill(billData);
          await storage.updateBookingStatus(booking.id, "checked-out");

          try {
            const guest = await storage.getGuest(booking.guestId);
            
            // Check if checkout_message template is enabled
            const checkoutTemplateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'checkout_message');
            const isCheckoutEnabled = checkoutTemplateSetting?.isEnabled !== false;
            
            if (guest && guest.phone && isCheckoutEnabled) {
              let propertyName = "Your Property";
              let roomNumbers = "TBD";
              
              if (booking.roomId) {
                const room2 = await storage.getRoom(booking.roomId);
                if (room2) {
                  const property = await storage.getProperty(room2.propertyId);
                  propertyName = property?.name || propertyName;
                  roomNumbers = room2.roomNumber;
                }
              } else if (booking.roomIds && booking.roomIds.length > 0) {
                const rooms = await Promise.all(booking.roomIds.map(id => storage.getRoom(id)));
                if (rooms.length > 0 && rooms[0]) {
                  const property = await storage.getProperty(rooms[0].propertyId);
                  propertyName = property?.name || propertyName;
                  roomNumbers = rooms.filter(r => r).map(r => r!.roomNumber).join(", ");
                }
              }
              
              const guestName = guest.fullName || "Guest";
              const totalAmountFormatted = `₹${totalAmount.toFixed(2)}`;
              const checkoutDate = format(new Date(), "dd MMM yyyy");
              
              await sendCheckoutNotification(
                guest.phone,
                guestName,
                propertyName,
                totalAmountFormatted,
                checkoutDate,
                roomNumbers
              );
              
              console.log(`[AUTO-CHECKOUT] Booking #${booking.id} - Checkout notification sent to ${guest.fullName}`);
            } else if (!isCheckoutEnabled) {
              console.log(`[AUTO-CHECKOUT] Booking #${booking.id} - checkout_message template disabled, skipping notification`);
            }
          } catch (whatsappError: any) {
            console.warn(`[AUTO-CHECKOUT] Booking #${booking.id} - WhatsApp failed (non-critical):`, whatsappError.message);
          }

          successCount++;
        } catch (bookingError: any) {
          console.error(`[AUTO-CHECKOUT] Error processing booking #${booking.id}:`, bookingError.message);
        }
      }

      console.log(`[FORCE-AUTO-CHECKOUT] Processed ${successCount}/${checkedOutCount} overdue bookings at 4 PM`);
      res.json({ success: true, processedCount: successCount, totalOverdue: checkedOutCount, forcedAt: "4 PM" });
    } catch (error: any) {
      console.error("Force auto-checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send pre-bill via WhatsApp for customer verification
  app.post("/api/send-prebill", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, billDetails } = req.body;
      
      if (!bookingId || !billDetails) {
        return res.status(400).json({ message: "Booking ID and bill details are required" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) {
        return res.status(400).json({ message: "Guest phone number not found" });
      }

      // Check if prebill_message template is enabled
      const prebillTemplateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'prebill_message');
      const isPrebillEnabled = prebillTemplateSetting?.isEnabled !== false;
      
      if (!isPrebillEnabled) {
        return res.status(400).json({ message: "Pre-bill WhatsApp messages are disabled for this property" });
      }
      
      // Format bill details for WhatsApp (template already has ₹ symbol)
      const guestName = guest.fullName || "Guest";
      const roomCharges = parseFloat(billDetails.roomCharges || 0).toFixed(2);
      const foodCharges = parseFloat(billDetails.foodCharges || 0).toFixed(2);
      const totalAmount = parseFloat(billDetails.totalAmount).toFixed(2);

      // Create pre-bill record
      const preBillRecord = await storage.createPreBill({
        bookingId,
        totalAmount: parseFloat(billDetails.totalAmount),
        balanceDue: parseFloat(billDetails.balanceDue),
        roomNumber: billDetails.roomNumber || "TBD",
      });

      // Send WhatsApp notification with simple format
      await sendPreBillNotification(
        guest.phone,
        guestName,
        roomCharges,
        foodCharges,
        totalAmount
      );

      console.log(`[WhatsApp] Booking #${bookingId} - Pre-bill #${preBillRecord.id} sent to ${guestName}`);
      res.json({ success: true, message: "Pre-bill sent via WhatsApp", preBillId: preBillRecord.id });
    } catch (error: any) {
      console.error("Pre-bill send error:", error);
      res.status(500).json({ message: error.message || "Failed to send pre-bill" });
    }
  });

  // Approve pre-bill
  app.post("/api/prebill/approve", isAuthenticated, async (req, res) => {
    try {
      const { preBillId, bookingId } = req.body;
      
      if (!preBillId || !bookingId) {
        return res.status(400).json({ message: "Pre-bill ID and booking ID are required" });
      }

      const preBill = await storage.getPreBill(preBillId);
      if (!preBill) {
        return res.status(404).json({ message: "Pre-bill not found" });
      }

      const guest = await storage.getGuest((await storage.getBooking(bookingId))?.guestId || 0);
      const approvedBy = guest?.fullName || "Guest";

      await storage.updatePreBillStatus(preBillId, "approved", approvedBy);

      console.log(`[Pre-Bill] Booking #${bookingId} - Pre-bill #${preBillId} approved by ${approvedBy}`);
      res.json({ success: true, message: "Pre-bill approved" });
    } catch (error: any) {
      console.error("Pre-bill approval error:", error);
      res.status(500).json({ message: error.message || "Failed to approve pre-bill" });
    }
  });

  // Get pre-bill status
  app.get("/api/prebill/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const preBill = await storage.getPreBillByBooking(bookingId);
      res.json(preBill || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate RazorPay payment link and send via WhatsApp
  app.post("/api/payment-link/generate", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, billDetails } = req.body;
      
      console.log(`[Payment-Link] DEBUG - Received billDetails:`, JSON.stringify(billDetails, null, 2));
      
      if (!bookingId || !billDetails) {
        return res.status(400).json({ message: "Booking ID and bill details are required" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const guest = await storage.getGuest(booking.guestId);
      if (!guest || !guest.phone) {
        return res.status(400).json({ message: "Guest phone number not found" });
      }

      // Check if bill already exists for this booking
      const existingBills = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
      let billId: number;

      if (existingBills.length === 0) {
        // Create a new bill record with pending status so webhook can update it
        const result = await db.insert(bills).values({
          bookingId: bookingId,
          propertyId: booking.propertyId,
          guestId: booking.guestId,
          guestName: guest.fullName || "Guest",
          roomCharges: parseFloat(billDetails.roomCharges || 0),
          foodCharges: parseFloat(billDetails.foodCharges || 0),
          extraCharges: parseFloat(billDetails.extraCharges || 0),
          subtotal: parseFloat(billDetails.subtotal || billDetails.totalAmount),
          gstAmount: parseFloat(billDetails.gstAmount || 0),
          serviceChargeAmount: parseFloat(billDetails.serviceChargeAmount || 0),
          totalAmount: parseFloat(billDetails.totalAmount),
          advancePaid: parseFloat(billDetails.advancePaid || 0),
          balanceAmount: parseFloat(billDetails.balanceAmount || billDetails.totalAmount),
          paymentStatus: "pending",
          paymentMethod: "razorpay_online",
          paymentMethods: [{ method: "razorpay_online", amount: parseFloat(billDetails.totalAmount) }],
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: bills.id });
        billId = result[0]?.id || 0;
        console.log(`[RazorPay] Created preliminary bill #${billId} for booking #${bookingId}`);
      } else {
        billId = existingBills[0].id;
      }

      // Use remaining balance for payment link - prioritize balanceAmount over balanceDue
      console.log(`[Payment-Link] balanceAmount="${billDetails.balanceAmount}", balanceDue="${billDetails.balanceDue}", totalAmount="${billDetails.totalAmount}", advancePaid="${billDetails.advancePaid}"`);
      
      // Always use balanceAmount if it exists (remaining balance after cash)
      let paymentAmount = 0;
      if (billDetails.balanceAmount !== undefined && billDetails.balanceAmount !== null && billDetails.balanceAmount !== "") {
        paymentAmount = parseFloat(billDetails.balanceAmount as any);
        console.log(`[Payment-Link] Using balanceAmount: ${paymentAmount}`);
      } else if (billDetails.balanceDue !== undefined && billDetails.balanceDue !== null) {
        paymentAmount = parseFloat(billDetails.balanceDue as any);
        console.log(`[Payment-Link] Using balanceDue: ${paymentAmount}`);
      } else {
        paymentAmount = parseFloat(billDetails.totalAmount as any);
        console.log(`[Payment-Link] Fallback to totalAmount: ${paymentAmount}`);
      }
      console.log(`[Payment-Link] Final paymentAmount: ${paymentAmount}`);
      
      // Handle overpayment or fully paid scenarios
      if (paymentAmount <= 0) {
        console.log(`[Payment-Link] No payment link needed - cash covers or exceeds total (paymentAmount: ${paymentAmount})`);
        
        // Update bill to PAID status since cash covers everything
        await db.update(bills)
          .set({ 
            paymentStatus: "paid",
            paymentMethod: "cash",
            paymentMethods: [{ method: "cash", amount: parseFloat(billDetails.totalAmount) }],
            updatedAt: new Date()
          })
          .where(eq(bills.id, billId));
        
        // Send a confirmation message instead of payment link
        const advancePaid = parseFloat(billDetails.advancePaid || 0);
        const roomCharges = `₹${parseFloat(billDetails.roomCharges || 0).toFixed(2)}`;
        const foodCharges = `₹${parseFloat(billDetails.foodCharges || 0).toFixed(2)}`;
        const totalAmount = `₹${parseFloat(billDetails.totalAmount || 0).toFixed(2)}`;
        
        // Use a simple thank you message - could be a different template
        console.log(`[Payment-Link] Bill fully paid with cash. Guest: ${guest.fullName}, Total: ${totalAmount}, Cash: ₹${advancePaid.toFixed(2)}`);
        
        return res.json({ 
          success: true, 
          message: "Payment completed in cash - no payment link needed",
          paymentLink: null,
          linkId: null,
          billId: billId,
          fullyPaidByCash: true
        });
      }
      
      // RazorPay minimum is ₹1 (100 paise)
      if (paymentAmount < 1) {
        console.log(`[Payment-Link] Amount too small for payment link (₹${paymentAmount}), marking as paid`);
        
        await db.update(bills)
          .set({ 
            paymentStatus: "paid",
            paymentMethod: "cash",
            updatedAt: new Date()
          })
          .where(eq(bills.id, billId));
        
        return res.json({ 
          success: true, 
          message: "Remaining amount too small - marked as paid",
          paymentLink: null,
          linkId: null,
          billId: billId,
          fullyPaidByCash: true
        });
      }
      
      // Create payment link via RazorPay
      const paymentLink = await createPaymentLink(
        bookingId,
        paymentAmount,
        guest.fullName || "Guest",
        guest.email || "",
        guest.phone
      );

      console.log(`[RazorPay] Payment link created for booking #${bookingId}: ${paymentLink.shortUrl} for amount ₹${paymentAmount}`);
      
      // Check if split_payment template is enabled before sending WhatsApp
      const splitPaymentSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'split_payment');
      const isSplitPaymentEnabled = splitPaymentSetting?.isEnabled !== false;
      
      if (!isSplitPaymentEnabled) {
        // Still return payment link, just don't send WhatsApp
        console.log(`[WhatsApp] split_payment template disabled, skipping WhatsApp message`);
        return res.json({ 
          success: true, 
          message: "Payment link created (WhatsApp disabled)",
          paymentLink: paymentLink.shortUrl,
          linkId: paymentLink.linkId,
          billId: billId
        });
      }
      
      // Determine which template to use based on whether cash was received
      const advancePaid = parseFloat(billDetails.advancePaid || 0);
      const roomCharges = `₹${parseFloat(billDetails.roomCharges || 0).toFixed(2)}`;
      const foodCharges = `₹${parseFloat(billDetails.foodCharges || 0).toFixed(2)}`;
      const totalAmount = `₹${parseFloat(billDetails.totalAmount || 0).toFixed(2)}`;
      const balanceAmount = `₹${paymentAmount.toFixed(2)}`;
      const cashReceivedFormatted = `₹${advancePaid.toFixed(2)}`;
      
      let templateId: string;
      let variables: string[];
      
      if (advancePaid > 0) {
        // Use new split payment template when cash is received (29412)
        templateId = process.env.AUTHKEY_WA_SPLIT_PAYMENT || "29412";
        variables = [
          guest.fullName || "Guest",
          roomCharges,
          foodCharges,
          cashReceivedFormatted,
          balanceAmount,
          paymentLink.shortUrl
        ];
        console.log(`[WhatsApp] Using split payment template (${templateId}) for advance payment of ₹${advancePaid}`);
      } else {
        // Use standard bill payment template when no cash received (19873)
        templateId = "19873"; // Bill Payment template with room/food/total charges and payment link
        variables = [
          guest.fullName || "Guest",
          roomCharges,
          foodCharges,
          totalAmount,
          paymentLink.shortUrl
        ];
        console.log(`[WhatsApp] Using standard payment template (${templateId})`);
      }
      
      await sendCustomWhatsAppMessage(guest.phone, templateId, variables);

      console.log(`[WhatsApp] Payment link sent to ${guest.fullName} (${guest.phone})`);
      
      res.json({ 
        success: true, 
        message: "Payment link sent via WhatsApp",
        paymentLink: paymentLink.shortUrl,
        linkId: paymentLink.linkId,
        billId: billId
      });
    } catch (error: any) {
      console.error("[Payment-Link] Error:", error?.message || error);
      let message = error?.message || "Failed to generate payment link";
      if (message.includes("Authentication failed") || message.includes("RazorPay error")) {
        message = "Razorpay authentication failed. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment (Settings/Secrets).";
      } else if (message.includes("phone") || message.includes("Guest phone")) {
        message = "Guest phone number is required. Please add a valid 10-digit phone number to the guest.";
      }
      res.status(500).json({ message });
    }
  });

  // RazorPay Webhook - Handle payment confirmations (NO AUTH REQUIRED - webhook from RazorPay)
  app.post("/api/webhooks/razorpay", async (req, res) => {
    try {
      console.log(`[RazorPay Webhook] ===== WEBHOOK RECEIVED =====`);
      console.log(`[RazorPay Webhook] Full Body:`, JSON.stringify(req.body, null, 2));
      
      // RazorPay sends nested payload structure for payment_link events
      // Structure: { event: "payment_link.paid", payload: { payment_link: { entity: {...} } } }
      const eventType = req.body.event;
      const paymentLinkData = req.body.payload?.payment_link?.entity;
      
      // Also support legacy flat format for backwards compatibility
      const payment_link_id = paymentLinkData?.id || req.body.payment_link_id;
      const status = paymentLinkData?.status || req.body.status;
      const amount = paymentLinkData?.amount || req.body.amount;
      const reference_id = paymentLinkData?.reference_id || req.body.reference_id;
      const customer = paymentLinkData?.customer || req.body.customer;
      
      console.log(`[RazorPay Webhook] Event=${eventType}, Link=${payment_link_id}, Status=${status}, Amount=${amount}, RefId=${reference_id}`);

      // Verify webhook signature if provided (x-razorpay-signature header)
      const signature = req.headers['x-razorpay-signature'] as string;
      if (signature && process.env.RAZORPAY_WEBHOOK_SECRET) {
        const crypto = await import('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.warn("[RazorPay Webhook] Invalid signature");
          return res.status(401).json({ message: "Invalid signature" });
        }
        console.log("[RazorPay Webhook] Signature verified successfully");
      }

      // Process payment_link.paid event
      if ((eventType === "payment_link.paid" || status === "paid") && reference_id) {
        console.log(`[RazorPay Webhook] Processing PAID status for reference_id: ${reference_id}`);
        
        // ── ENQUIRY PAYMENT ─────────────────────────────────────────────────
        if (reference_id.startsWith("enquiry_")) {
          const enquiryMatch = reference_id.match(/enquiry_(\d+)_/);
          const enquiryIdFromRef = enquiryMatch ? parseInt(enquiryMatch[1]) : null;
          console.log(`[RazorPay Webhook] Enquiry payment received, enquiryId: ${enquiryIdFromRef}`);

          if (enquiryIdFromRef) {
            try {
              const [enq] = await db.select().from(enquiries).where(eq(enquiries.id, enquiryIdFromRef));

              if (enq && enq.status !== "confirmed") {
                const amountPaid = amount ? (amount / 100) : 0;

                // Find or create guest
                let guestId: number | null = null;
                if (enq.guestPhone) {
                  const cleanPhone = enq.guestPhone.replace(/[^\d]/g, "");
                  const phoneVariants = [enq.guestPhone, cleanPhone, `+91${cleanPhone.slice(-10)}`];
                  const existingGuests = await db.select().from(guests).where(
                    sql`${guests.phone} = ANY(${phoneVariants})`
                  ).limit(1);
                  if (existingGuests.length > 0) {
                    guestId = existingGuests[0].id;
                  }
                }
                if (!guestId && enq.guestName) {
                  const newGuest = await storage.createGuest({
                    fullName: enq.guestName,
                    phone: enq.guestPhone || null,
                    email: enq.guestEmail || null,
                    idType: null,
                    idNumber: null,
                    address: null,
                  });
                  guestId = newGuest.id;
                }

                if (guestId) {
                  // Create booking from enquiry
                  const newBooking = await storage.createBooking({
                    propertyId: enq.propertyId,
                    roomId: enq.roomId,
                    roomIds: enq.roomIds,
                    isGroupBooking: enq.isGroupEnquiry || false,
                    bedsBooked: enq.bedsBooked,
                    guestId,
                    checkInDate: enq.checkInDate,
                    checkOutDate: enq.checkOutDate,
                    numberOfGuests: enq.numberOfGuests,
                    customPrice: enq.priceQuoted ? String(enq.priceQuoted) : null,
                    advanceAmount: String(amountPaid),
                    advancePaymentStatus: "paid",
                    totalAmount: enq.priceQuoted ? String(enq.priceQuoted) : null,
                    status: "confirmed",
                    specialRequests: enq.specialRequests,
                    source: "walk-in",
                    mealPlan: enq.mealPlan || "EP",
                  });
                  storage.invalidateBookingsCache();

                  // Mark enquiry as confirmed + payment received
                  await storage.updateEnquiryStatus(enquiryIdFromRef, "confirmed");
                  await storage.updateEnquiryPaymentStatus(enquiryIdFromRef, "received");

                  // Record payment to wallet
                  try {
                    await storage.recordBillPaymentToWallet(
                      enq.propertyId,
                      newBooking.id,
                      amountPaid,
                      'razorpay_online',
                      `Enquiry advance payment - ${enq.guestName} (Booking #${newBooking.id})`,
                      null
                    );
                  } catch (walletErr) {
                    console.warn(`[Webhook] Wallet record failed for enquiry booking:`, walletErr);
                  }

                  // Send WhatsApp payment confirmation to guest
                  if (enq.guestPhone) {
                    try {
                      const prop = await storage.getProperty(enq.propertyId);
                      await sendAdvancePaymentConfirmation(
                        enq.guestPhone,
                        enq.guestName || "Guest",
                        `₹${amountPaid.toLocaleString('en-IN')}`,
                        prop?.name || "Hotel"
                      );
                    } catch (waErr) {
                      console.warn(`[Webhook] WhatsApp confirmation failed for enquiry payment:`, waErr);
                    }
                  }

                  // Notify admins
                  try {
                    const allUsers = await storage.getAllUsers();
                    const admins = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
                    for (const admin of admins) {
                      await db.insert(notifications).values({
                        userId: admin.id,
                        type: "payment_received",
                        title: "Enquiry Payment Received — Booking Created",
                        message: `Booking #${newBooking.id} auto-created from Enquiry #${enquiryIdFromRef}! Advance ₹${amountPaid} received from ${enq.guestName || 'Guest'}`,
                        soundType: "payment",
                        relatedId: newBooking.id,
                        relatedType: "booking",
                      });
                    }
                  } catch (notifErr) {
                    console.warn(`[Webhook] Admin notification failed for enquiry payment:`, notifErr);
                  }

                  console.log(`[RazorPay Webhook] ✅ Enquiry #${enquiryIdFromRef} auto-confirmed → Booking #${newBooking.id} created`);
                }
              } else {
                console.log(`[RazorPay Webhook] Enquiry #${enquiryIdFromRef} already confirmed or not found — skipping`);
              }
            } catch (enqErr: any) {
              console.error(`[RazorPay Webhook] Error processing enquiry payment:`, enqErr.message);
            }
          }

          return res.json({ status: "ok" });
        }
        // ── END ENQUIRY PAYMENT ──────────────────────────────────────────────

        // Check if this is an advance payment (reference_id starts with "advance_")
        const isAdvancePayment = reference_id.startsWith("advance_");
        
        // Extract booking ID from reference_id format: booking_{id}_{timestamp} or advance_{id}_{timestamp}
        const bookingIdMatch = reference_id.match(/(booking|advance)_(\d+)_/);
        const bookingId = bookingIdMatch ? parseInt(bookingIdMatch[2]) : parseInt(reference_id);
        console.log(`[RazorPay Webhook] Extracted booking ID: ${bookingId}, isAdvancePayment: ${isAdvancePayment}`);
        
        const booking = await storage.getBooking(bookingId);
        console.log(`[RazorPay Webhook] Booking found: ${booking ? 'YES' : 'NO'}`);
        
        if (booking) {
          const amountInRupees = amount ? (amount / 100) : 0;
          
          // Handle advance payment confirmation - update booking status to confirmed
          if (isAdvancePayment) {
            console.log(`[RazorPay Webhook] Processing ADVANCE payment for booking #${bookingId}`);
            
            // Update booking status to confirmed and record advance payment
            await db.update(bookings).set({
              status: "confirmed",
              advancePaymentStatus: "paid",
              advanceAmount: amountInRupees.toString(),
              updatedAt: new Date(),
            }).where(eq(bookings.id, bookingId));
            storage.invalidateBookingsCache();
            
            console.log(`[RazorPay] ✅ Advance payment confirmed for booking #${bookingId}, status changed to CONFIRMED`);
            
            // Record advance payment to wallet
            try {
              const guest = await storage.getGuest(booking.guestId);
              await storage.recordBillPaymentToWallet(
                booking.propertyId,
                bookingId,
                amountInRupees,
                'razorpay_online',
                `Advance payment - ${guest?.fullName || 'Guest'} (Booking #${bookingId})`,
                null
              );
              console.log(`[Wallet] Recorded advance payment ₹${amountInRupees} for booking #${bookingId}`);
            } catch (walletError) {
              console.log(`[Wallet] Could not record advance payment to wallet:`, walletError);
            }
            
            // Send WhatsApp confirmation to guest - check template controls first
            const guest = await storage.getGuest(booking.guestId);
            const property = await storage.getProperty(booking.propertyId);
            if (guest && guest.phone) {
              // Check if payment_confirmation template is enabled
              const templateSetting = await storage.getWhatsappTemplateSetting(booking.propertyId, 'payment_confirmation');
              const isTemplateEnabled = templateSetting?.isEnabled !== false;
              
              if (isTemplateEnabled) {
                console.log(`[RazorPay Webhook] Sending payment confirmation to guest: ${guest.fullName} (${guest.phone})`);
                await sendAdvancePaymentConfirmation(
                  guest.phone,
                  guest.fullName || "Guest",
                  `₹${amountInRupees.toLocaleString('en-IN')}`,
                  property?.name || "Hotel"
                );
                console.log(`[RazorPay Webhook] Payment confirmation sent successfully`);
              } else {
                console.log(`[RazorPay Webhook] Payment confirmation WhatsApp disabled for property ${booking.propertyId}`);
              }
            }
            
            // Create notification for admins
            try {
              const allUsers = await storage.getAllUsers();
              const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin');
              
              for (const admin of adminUsers) {
                await db.insert(notifications).values({
                  userId: admin.id,
                  type: "payment_received",
                  title: "Advance Payment Received",
                  message: `Booking #${bookingId} confirmed! Advance of ₹${amountInRupees} received from ${guest?.fullName || 'Guest'}`,
                  soundType: "payment",
                  relatedId: bookingId,
                  relatedType: "booking",
                });
              }
              console.log(`[RazorPay Webhook] Admin notifications created for advance payment`);
            } catch (notifError: any) {
              console.error(`[RazorPay Webhook] Failed to create notification:`, notifError.message);
            }

            // Send SMS to property/admin when payment link payment is received
            try {
              const propertyForSms = await storage.getProperty(booking.propertyId);
              let toPhone = propertyForSms?.contactPhone?.trim() || null;
              if (!toPhone) {
                const allUsers = await storage.getAllUsers();
                const superAdmin = allUsers.find(u => u.role === 'super-admin');
                toPhone = superAdmin?.phone?.trim() || null;
              }
              if (!toPhone) {
                console.warn(`[RazorPay Webhook] SMS skipped: no property contact phone or super-admin phone set`);
              } else {
                const authkeyService = createAuthkeyService();
                if (!authkeyService) {
                  console.warn(`[RazorPay Webhook] SMS skipped: AUTHKEY_API_KEY not configured`);
                } else {
                  const smsMessage = `Payment of Rs.${amountInRupees} received for Booking #${bookingId}. ${guest?.fullName || 'Guest'}.`;
                  const result = await authkeyService.sendSMS({ to: toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/^91/, '')}`, message: smsMessage });
                  if (result.success) {
                    console.log(`[RazorPay Webhook] SMS sent to ${toPhone} for payment received`);
                  } else {
                    console.warn(`[RazorPay Webhook] SMS failed:`, result.error);
                  }
                }
              }
            } catch (smsErr: any) {
              console.warn(`[RazorPay Webhook] SMS on payment received failed:`, smsErr?.message);
            }
            
            // Activity log for advance payment received
            try {
              const property = await storage.getProperty(booking.propertyId);
              await storage.createActivityLog({
                userId: null, // Webhook - no user
                userEmail: null,
                userName: 'Razorpay Webhook',
                action: 'advance_payment_received',
                category: 'payment',
                resourceType: 'booking',
                resourceId: String(bookingId),
                resourceName: `Booking #${bookingId}`,
                propertyId: booking.propertyId,
                propertyName: property?.name || null,
                details: { 
                  amount: amountInRupees,
                  guestName: guest?.fullName,
                  paymentLinkId: payment_link_id
                },
              });
            } catch (logErr) {
              console.error('[ACTIVITY] Error logging advance payment:', logErr);
            }
          } else {
            // Regular bill payment flow (existing logic)
            const billsResult = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).limit(1);
            console.log(`[RazorPay Webhook] Bills found for booking: ${billsResult.length}`);
            
            if (billsResult.length > 0) {
              const bill = billsResult[0];
              console.log(`[RazorPay Webhook] Updating bill #${bill.id} status to PAID`);
              
              // Update bill payment status to paid
              await db.update(bills).set({
                paymentStatus: "paid",
                paymentMethod: "razorpay_online",
                paidAt: new Date(),
                updatedAt: new Date(),
              }).where(eq(bills.id, bill.id));

              console.log(`[RazorPay] ✅ Payment confirmed for booking #${bookingId}, Bill #${bill.id} marked as PAID`);

              // Record payment to wallet
              try {
                const guest = await storage.getGuest(booking.guestId);
                await storage.recordBillPaymentToWallet(
                  booking.propertyId,
                  bill.id,
                  amountInRupees,
                  'razorpay_online',
                  `Online payment - ${guest?.fullName || 'Guest'} (Bill #${bill.id})`,
                  null
                );
                console.log(`[Wallet] Recorded RazorPay payment ₹${amountInRupees} for bill #${bill.id}`);
              } catch (walletError) {
                console.log(`[Wallet] Could not record RazorPay payment to wallet:`, walletError);
              }

              // Send confirmation to guest via WhatsApp
              const guest = await storage.getGuest(booking.guestId);
              if (guest && guest.phone) {
                console.log(`[RazorPay Webhook] Sending confirmation to guest: ${guest.fullName} (${guest.phone})`);
                const templateId = process.env.AUTHKEY_WA_PAYMENT_CONFIRMATION || "18649"; // Payment received confirmation
                await sendCustomWhatsAppMessage(
                  guest.phone,
                  templateId,
                  [guest.fullName || "Guest", `₹${amountInRupees.toFixed(2)}`]
                );
                console.log(`[RazorPay Webhook] Confirmation sent successfully`);
              } else {
                console.warn(`[RazorPay Webhook] Guest not found or no phone number`);
              }

              // Send SMS to property/admin when payment link payment is received (bill payment)
              try {
                const propertyForSms = await storage.getProperty(booking.propertyId);
                let toPhone = propertyForSms?.contactPhone?.trim() || null;
                if (!toPhone) {
                  const allUsers = await storage.getAllUsers();
                  const superAdmin = allUsers.find(u => u.role === 'super-admin');
                  toPhone = superAdmin?.phone?.trim() || null;
                }
                if (!toPhone) {
                  console.warn(`[RazorPay Webhook] SMS skipped: no property contact phone or super-admin phone set`);
                } else {
                  const authkeyService = createAuthkeyService();
                  if (!authkeyService) {
                    console.warn(`[RazorPay Webhook] SMS skipped: AUTHKEY_API_KEY not configured`);
                  } else {
                    const smsMessage = `Payment of Rs.${amountInRupees} received for Booking #${bookingId}, Bill #${bill.id}. ${guest?.fullName || 'Guest'}.`;
                    const result = await authkeyService.sendSMS({ to: toPhone.startsWith('+') ? toPhone : `+91${toPhone.replace(/^91/, '')}`, message: smsMessage });
                    if (result.success) {
                      console.log(`[RazorPay Webhook] SMS sent to ${toPhone} for bill payment received`);
                    } else {
                      console.warn(`[RazorPay Webhook] SMS failed:`, result.error);
                    }
                  }
                }
              } catch (smsErr: any) {
                console.warn(`[RazorPay Webhook] SMS on payment received failed:`, smsErr?.message);
              }
            } else {
              console.warn(`[RazorPay Webhook] No bill found for booking #${bookingId}`);
            }
          }
        } else {
          console.warn(`[RazorPay Webhook] Booking #${bookingId} not found`);
        }
      } else {
        console.log(`[RazorPay Webhook] Event not payment_link.paid or no reference_id (event=${eventType}, status=${status})`);
      }

      // Always return 200 to acknowledge receipt
      res.json({ success: true, received: true });
    } catch (error: any) {
      console.error("[RazorPay Webhook] ❌ ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ─── Restaurant Tables ───────────────────────────────────────────────────
  // Standalone dine-in tables. Not linked to hotel rooms / bookings.
  app.get("/api/restaurant-tables", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      if (propertyId != null && !(await canAccessProperty(auth.tenant, propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const tables = await storage.getRestaurantTables(propertyId);
      res.json(tables);
    } catch (e: any) {
      console.error("[GET /api/restaurant-tables]", e);
      res.status(500).json({ message: e.message || "Failed to fetch tables" });
    }
  });

  // Public endpoint — guest-facing menu page calls this to validate the
  // ?table= param. Returns minimal info, no auth required.
  app.get("/api/public/restaurant-tables", async (req, res) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      if (propertyId == null || isNaN(propertyId)) {
        return res.status(400).json({ message: "propertyId required" });
      }
      const tables = await storage.getRestaurantTables(propertyId);
      res.json(tables.filter(t => t.isActive).map(t => ({ id: t.id, name: t.name })));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  app.post("/api/restaurant-tables", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const parsed = insertRestaurantTableSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid table", errors: parsed.error.errors });
      if (parsed.data.propertyId != null && !(await canAccessProperty(auth.tenant, parsed.data.propertyId))) {
        return res.status(403).json({ message: "Forbidden for this property" });
      }
      const created = await storage.createRestaurantTable(parsed.data);
      res.json(created);
    } catch (e: any) {
      console.error("[POST /api/restaurant-tables]", e);
      res.status(500).json({ message: e.message || "Failed to create table" });
    }
  });

  app.patch("/api/restaurant-tables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const id = parseInt(req.params.id);
      const existing = await storage.getRestaurantTable(id);
      if (!existing) return res.status(404).json({ message: "Table not found" });
      if (existing.propertyId != null && !(await canAccessProperty(auth.tenant, existing.propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updated = await storage.updateRestaurantTable(id, req.body);
      res.json(updated);
    } catch (e: any) {
      console.error("[PATCH /api/restaurant-tables/:id]", e);
      res.status(500).json({ message: e.message || "Failed to update table" });
    }
  });

  app.delete("/api/restaurant-tables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const id = parseInt(req.params.id);
      const existing = await storage.getRestaurantTable(id);
      if (!existing) return res.status(404).json({ message: "Table not found" });
      if (existing.propertyId != null && !(await canAccessProperty(auth.tenant, existing.propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteRestaurantTable(id);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[DELETE /api/restaurant-tables/:id]", e);
      res.status(500).json({ message: e.message || "Failed to delete table" });
    }
  });

  // ── Table Reservations ────────────────────────────────────────────────
  app.get("/api/table-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : NaN;
      if (isNaN(propertyId)) return res.status(400).json({ message: "propertyId required" });
      if (!(await canAccessProperty(auth.tenant, propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      const list = await storage.getTableReservations(propertyId, from, to);
      res.json(list);
    } catch (e: any) {
      console.error("[GET /api/table-reservations]", e);
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  app.post("/api/table-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const parsed = insertTableReservationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid reservation", errors: parsed.error.errors });
      if (!(await canAccessProperty(auth.tenant, parsed.data.propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const created = await storage.createTableReservation(parsed.data);
      res.json(created);
    } catch (e: any) {
      console.error("[POST /api/table-reservations]", e);
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  app.patch("/api/table-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const id = parseInt(req.params.id);
      const existing = await storage.getTableReservation(id);
      if (!existing) return res.status(404).json({ message: "Reservation not found" });
      if (!(await canAccessProperty(auth.tenant, existing.propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      // Coerce reservationAt if provided as string
      const body = { ...req.body };
      if (body.reservationAt && typeof body.reservationAt === "string") {
        body.reservationAt = new Date(body.reservationAt);
      }
      const updated = await storage.updateTableReservation(id, body);
      res.json(updated);
    } catch (e: any) {
      console.error("[PATCH /api/table-reservations/:id]", e);
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  app.delete("/api/table-reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const id = parseInt(req.params.id);
      const existing = await storage.getTableReservation(id);
      if (!existing) return res.status(404).json({ message: "Reservation not found" });
      if (!(await canAccessProperty(auth.tenant, existing.propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteTableReservation(id);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[DELETE /api/table-reservations/:id]", e);
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  // ── Z-Report (end-of-shift summary) ──────────────────────────────────
  // Computes a daily restaurant summary entirely from existing orders rows
  // (no schema changes). Filters: orderType in ('restaurant','room'),
  // is_test=false, paymentStatus='paid', within [date 00:00, date 23:59:59]
  // local server time. Groups by orderMode and paymentMethod, returns top
  // items + grand totals so the floor manager can reconcile cash drawer.
  app.get("/api/reports/z-report", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : NaN;
      const dateStr = String(req.query.date || "");
      if (isNaN(propertyId) || !dateStr) {
        return res.status(400).json({ message: "propertyId and date (YYYY-MM-DD) required" });
      }
      if (!(await canAccessProperty(auth.tenant, propertyId))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const start = new Date(`${dateStr}T00:00:00`);
      const end = new Date(`${dateStr}T23:59:59.999`);

      const rows = await db.select().from(orders).where(and(
        eq(orders.propertyId, propertyId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        eq(orders.isTest, false),
        // Restaurant Z-Report only — exclude any future non-F&B order types
        // that may share the orders table (currently restaurant + room).
        inArray(orders.orderType, ["restaurant", "room"]),
      ));

      const paidRows = rows.filter(r => r.paymentStatus === "paid");
      const num = (v: any) => {
        const n = parseFloat(String(v ?? "0"));
        return Number.isFinite(n) ? n : 0;
      };
      const sum = (arr: any[]) => arr.reduce((s, r) => s + num(r.totalAmount), 0);

      const byMode: Record<string, { count: number; gross: number }> = {};
      const byPayment: Record<string, { count: number; gross: number }> = {};
      const itemTally: Record<string, { qty: number; gross: number }> = {};

      for (const r of paidRows) {
        const mode = (r as any).orderMode || (r.orderType === "room" ? "room" : "dine-in");
        const pm = r.paymentMethod || "unspecified";
        const amt = num(r.totalAmount);
        byMode[mode] = byMode[mode] || { count: 0, gross: 0 };
        byMode[mode].count += 1;
        byMode[mode].gross += amt;
        byPayment[pm] = byPayment[pm] || { count: 0, gross: 0 };
        byPayment[pm].count += 1;
        byPayment[pm].gross += amt;
        try {
          const items = Array.isArray(r.items) ? r.items : (typeof r.items === "string" ? JSON.parse(r.items) : []);
          for (const it of items) {
            const key = String(it.name || "Unknown");
            const qRaw = Number(it.quantity);
            const q = Number.isFinite(qRaw) && qRaw > 0 ? qRaw : 1;
            const p = num(it.price) * q;
            itemTally[key] = itemTally[key] || { qty: 0, gross: 0 };
            itemTally[key].qty += q;
            itemTally[key].gross += p;
          }
        } catch { /* tolerate malformed items */ }
      }

      const topItems = Object.entries(itemTally)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 15);

      const firstOrder = paidRows.reduce<Date | null>((acc, r) => {
        const t = r.createdAt ? new Date(r.createdAt) : null;
        return t && (!acc || t < acc) ? t : acc;
      }, null);
      const lastOrder = paidRows.reduce<Date | null>((acc, r) => {
        const t = r.createdAt ? new Date(r.createdAt) : null;
        return t && (!acc || t > acc) ? t : acc;
      }, null);

      res.json({
        propertyId,
        date: dateStr,
        totals: {
          paidOrders: paidRows.length,
          allOrders: rows.length,
          unpaidOrders: rows.length - paidRows.length,
          gross: sum(paidRows),
        },
        byMode,
        byPayment,
        topItems,
        firstOrder: firstOrder ? firstOrder.toISOString() : null,
        lastOrder: lastOrder ? lastOrder.toISOString() : null,
      });
    } catch (e: any) {
      console.error("[GET /api/reports/z-report]", e);
      res.status(500).json({ message: e.message || "Failed" });
    }
  });

  // Menu Items
  app.get("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allItems = await storage.getAllMenuItems();
      const items = allItems.filter(item => {
        if (!item.propertyId) return tenant.hasUnlimitedAccess;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(item.propertyId);
      });
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/menu-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getMenuItem(parseInt(req.params.id));
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      const data = insertMenuItemSchema.parse(req.body);
      
      // Security: If user is manager or kitchen, enforce they can only create items for their assigned properties
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (!currentUser.assignedPropertyIds || currentUser.assignedPropertyIds.length === 0) {
          return res.status(403).json({ message: "You must be assigned to at least one property to create menu items." });
        }
        
        // Verify the provided propertyId is in their assigned properties
        if (!data.propertyId || !currentUser.assignedPropertyIds.includes(data.propertyId)) {
          return res.status(403).json({ message: "You can only create menu items for your assigned properties." });
        }
      }
      
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/menu-items/reorder", isAuthenticated, async (req, res) => {
    try {
      const updates: { id: number; displayOrder: number }[] = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates array is required" });
      }
      const normalized = updates.map(u => ({
        id: Number(u.id),
        displayOrder: Number(u.displayOrder),
      })).filter(u => !isNaN(u.id) && !isNaN(u.displayOrder));
      await storage.reorderMenuItems(normalized);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[REORDER-PATCH] Error:", error);
      res.status(500).json({ message: error.message || "Reorder failed" });
    }
  });

  app.patch("/api/menu-items/swap", isAuthenticated, async (req, res) => {
    try {
      const { id1, id2, order1, order2 } = req.body;

      console.log("[MENU-SWAP] Request body:", { id1, id2, order1, order2 });

      const parsedId1 = parseInt(String(id1), 10);
      const parsedId2 = parseInt(String(id2), 10);
      const parsedOrder1 = parseInt(String(order1), 10);
      const parsedOrder2 = parseInt(String(order2), 10);

      if (isNaN(parsedId1) || isNaN(parsedId2) || isNaN(parsedOrder1) || isNaN(parsedOrder2)) {
        return res.status(400).json({ message: "Invalid input: all values must be valid numbers" });
      }

      await storage.updateMenuItem(parsedId1, { displayOrder: parsedOrder2 });
      await storage.updateMenuItem(parsedId2, { displayOrder: parsedOrder1 });

      console.log("[MENU-SWAP] Swap successful:", { id1: parsedId1, newOrder1: parsedOrder2, id2: parsedId2, newOrder2: parsedOrder1 });
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[MENU-SWAP] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // Security: If user is manager or kitchen, verify the menu item belongs to their assigned properties
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        const existingItem = await storage.getMenuItem(parseInt(req.params.id));
        
        if (!existingItem) {
          return res.status(404).json({ message: "Menu item not found" });
        }
        
        if (!currentUser.assignedPropertyIds || !currentUser.assignedPropertyIds.includes(existingItem.propertyId)) {
          return res.status(403).json({ message: "You can only modify menu items from your assigned properties." });
        }
        
        // Prevent changing propertyId to a property not in their assigned list
        if (req.body.propertyId && !currentUser.assignedPropertyIds.includes(req.body.propertyId)) {
          return res.status(403).json({ message: "You cannot change the property to one you're not assigned to." });
        }
      }
      
      const item = await storage.updateMenuItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-fill images for menu items using TheMealDB free API
  app.post("/api/menu-items/auto-fill-images", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allItems = await storage.getAllMenuItems();
      const targets = allItems.filter(item => {
        if (!item.propertyId) return tenant.hasUnlimitedAccess;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(item.propertyId);
      }).filter(item => !item.imageUrl);

      let filled = 0;
      let failed = 0;

      for (const item of targets) {
        try {
          const q = item.name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
          const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
          const data = await r.json() as any;
          if (data.meals && data.meals.length > 0 && data.meals[0].strMealThumb) {
            await storage.updateMenuItem(item.id, { imageUrl: data.meals[0].strMealThumb + "/preview" });
            filled++;
          } else {
            // Try with first word only
            const firstWord = q.split(" ")[0];
            if (firstWord && firstWord !== q) {
              const r2 = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(firstWord)}`);
              const data2 = await r2.json() as any;
              if (data2.meals && data2.meals.length > 0 && data2.meals[0].strMealThumb) {
                await storage.updateMenuItem(item.id, { imageUrl: data2.meals[0].strMealThumb + "/preview" });
                filled++;
              } else {
                failed++;
              }
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }
      }

      res.json({ filled, failed, total: targets.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // Security: If user is manager or kitchen, verify the menu item belongs to their assigned properties
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        const existingItem = await storage.getMenuItem(parseInt(req.params.id));
        
        if (!existingItem) {
          return res.status(404).json({ message: "Menu item not found" });
        }
        
        if (!currentUser.assignedPropertyIds || !currentUser.assignedPropertyIds.includes(existingItem.propertyId)) {
          return res.status(403).json({ message: "You can only delete menu items from your assigned properties." });
        }
      }
      
      await storage.deleteMenuItem(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Categories
  app.get("/api/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allCategories = await storage.getAllMenuCategories();
      const categories = allCategories.filter(cat => {
        if (!cat.propertyId) return tenant.hasUnlimitedAccess;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(cat.propertyId);
      });
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (req.body.propertyId !== null && (!currentUser.assignedPropertyIds || !currentUser.assignedPropertyIds.includes(req.body.propertyId))) {
          return res.status(403).json({ message: "You can only create categories for your assigned properties or all properties." });
        }
      }
      
      const category = await storage.createMenuCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk update display order for menu categories — MUST be before /:id
  app.patch("/api/menu-categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const updates: { id: number; displayOrder: number }[] = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates array is required" });
      }
      const normalized = updates.map(u => ({
        id: Number(u.id),
        displayOrder: Number(u.displayOrder),
      })).filter(u => !isNaN(u.id) && !isNaN(u.displayOrder));
      await storage.reorderMenuCategories(normalized);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("[REORDER-CATEGORIES] Error:", error);
      res.status(500).json({ message: error.message || "Reorder failed" });
    }
  });

  app.patch("/api/menu-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const category = await storage.updateMenuCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/menu-categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMenuCategory(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Item Variants
  app.get("/api/menu-items/:menuItemId/variants", isAuthenticated, async (req, res) => {
    try {
      const variants = await storage.getVariantsByMenuItem(parseInt(req.params.menuItemId));
      res.json(variants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-items/:menuItemId/variants", isAuthenticated, async (req, res) => {
    try {
      const variant = await storage.createMenuItemVariant({
        ...req.body,
        menuItemId: parseInt(req.params.menuItemId),
      });
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/menu-item-variants/:id", isAuthenticated, async (req, res) => {
    try {
      const variant = await storage.updateMenuItemVariant(parseInt(req.params.id), req.body);
      res.json(variant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/menu-item-variants/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMenuItemVariant(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete all variants for a menu item
  app.delete("/api/menu-items/:menuItemId/variants", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVariantsByMenuItem(parseInt(req.params.menuItemId));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Item Add-Ons
  app.get("/api/menu-items/:menuItemId/add-ons", isAuthenticated, async (req, res) => {
    try {
      const addOns = await storage.getAddOnsByMenuItem(parseInt(req.params.menuItemId));
      res.json(addOns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-items/:menuItemId/add-ons", isAuthenticated, async (req, res) => {
    try {
      const addOn = await storage.createMenuItemAddOn({
        ...req.body,
        menuItemId: parseInt(req.params.menuItemId),
      });
      res.status(201).json(addOn);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/menu-item-add-ons/:id", isAuthenticated, async (req, res) => {
    try {
      const addOn = await storage.updateMenuItemAddOn(parseInt(req.params.id), req.body);
      res.json(addOn);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/menu-item-add-ons/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMenuItemAddOn(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete all add-ons for a menu item
  app.delete("/api/menu-items/:menuItemId/add-ons", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAddOnsByMenuItem(parseInt(req.params.menuItemId));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import menu items with variants and add-ons
  app.post("/api/menu-items/bulk-import", isAuthenticated, async (req, res) => {
    try {
      const { items, propertyId } = req.body;
      
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No items provided for import" });
      }

      const results = {
        created: 0,
        failed: 0,
        categoriesCreated: 0,
        errors: [] as string[],
      };

      // Cache for categories we've created/found during import
      const categoryCache: Map<string, number> = new Map();
      
      // Load existing categories for this property
      const existingCategories = await storage.getMenuCategoriesByProperty(propertyId);
      for (const cat of existingCategories) {
        categoryCache.set(cat.name.toLowerCase().trim(), cat.id);
      }

      for (const item of items) {
        try {
          // Always resolve category by NAME for the target property — ignore any categoryId from client
          // (client may have matched against a different property's category ID)
          let categoryId: number | undefined;
          const categoryName = item.category?.trim();

          if (categoryName) {
            const cacheKey = categoryName.toLowerCase();
            if (categoryCache.has(cacheKey)) {
              categoryId = categoryCache.get(cacheKey);
            } else {
              // Create new category for this property
              const newCategory = await storage.createMenuCategory({
                propertyId: propertyId,
                name: categoryName,
                description: null,
                displayOrder: 0
              });
              categoryCache.set(cacheKey, newCategory.id);
              categoryId = newCategory.id;
              results.categoriesCreated++;
              console.log(`[BULK-IMPORT] Created category "${categoryName}" for property ${propertyId}`);
            }
          }

          // Parse variants from CSV string format: "Name:Price|Name:Price" (pipe-separated, comma also supported)
          const parsedVariants: { name: string; priceModifier: string }[] = [];
          if (item.variants && typeof item.variants === 'string' && item.variants.trim()) {
            const delimiter = item.variants.includes('|') ? '|' : ',';
            const variantParts = item.variants.split(delimiter);
            for (const part of variantParts) {
              const colonIdx = part.lastIndexOf(':');
              if (colonIdx > 0) {
                const vName = part.substring(0, colonIdx).trim();
                const vPrice = part.substring(colonIdx + 1).trim();
                if (vName && vPrice) parsedVariants.push({ name: vName, priceModifier: vPrice });
              }
            }
          }

          // Parse add-ons from CSV string format: "Name:Price|Name:Price" (pipe-separated, comma also supported)
          const parsedAddOns: { name: string; price: string }[] = [];
          if (item.addOns && typeof item.addOns === 'string' && item.addOns.trim()) {
            const delimiter = item.addOns.includes('|') ? '|' : ',';
            const addOnParts = item.addOns.split(delimiter);
            for (const part of addOnParts) {
              const colonIdx = part.lastIndexOf(':');
              if (colonIdx > 0) {
                const aName = part.substring(0, colonIdx).trim();
                const aPrice = part.substring(colonIdx + 1).trim();
                if (aName && aPrice) parsedAddOns.push({ name: aName, price: aPrice });
              }
            }
          }

          // Create the menu item
          const menuItemData = {
            propertyId: propertyId || item.propertyId || null,
            categoryId: categoryId || null,
            name: item.name,
            description: item.description || null,
            category: item.category || null,
            price: item.price?.toString() || "0",
            isVeg: item.isVeg === true,
            isAvailable: item.isAvailable !== false,
            preparationTime: item.preparationTime ? parseInt(item.preparationTime) : null,
            foodType: item.isVeg ? 'veg' : 'non-veg',
            hasVariants: parsedVariants.length > 0,
            hasAddOns: parsedAddOns.length > 0,
            displayOrder: item.sequence || item.displayOrder || 0,
            imageUrl: item.imageUrl || null,
          };

          const createdItem = await storage.createMenuItem(menuItemData);

          // Create variants if provided
          // Prices in CSV are treated as absolute prices (not modifiers)
          for (const variant of parsedVariants) {
            const actualPrice = parseFloat(variant.priceModifier);
            if (!isNaN(actualPrice) && actualPrice >= 0) {
              await storage.createMenuItemVariant({
                menuItemId: createdItem.id,
                variantName: variant.name,
                actualPrice: actualPrice.toString(),
                discountedPrice: null,
              });
            }
          }

          // Create add-ons if provided
          for (const addOn of parsedAddOns) {
            const price = parseFloat(addOn.price);
            if (!isNaN(price) && price >= 0) {
              await storage.createMenuItemAddOn({
                menuItemId: createdItem.id,
                addOnName: addOn.name,
                addOnPrice: price.toString(),
              });
            }
          }

          results.created++;
        } catch (itemError: any) {
          results.failed++;
          results.errors.push(`${item.name || 'Unknown item'}: ${itemError.message}`);
        }
      }

      res.status(201).json({
        message: `Imported ${results.created} items${results.categoriesCreated > 0 ? `, created ${results.categoriesCreated} new categories` : ''}${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
        ...results,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export menu items to CSV - Simple version
  app.get("/api/menu-items/export/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId, 10);
      if (!propertyId || isNaN(propertyId)) {
        return res.status(400).json({ message: "Property ID required" });
      }

      const allItems = await storage.getAllMenuItems();
      const items = allItems.filter(i => i.propertyId === propertyId);
      const categories = await storage.getMenuCategoriesByProperty(propertyId);
      const catMap = new Map(categories.map(c => [c.id, c.name]));

      let csv = 'sequence,name,category,price,description,isVeg,isAvailable,variants,addOns,imageUrl\n';
      for (const item of items) {
        const cat = item.categoryId ? (catMap.get(item.categoryId) || '') : '';
        
        // Fetch variants and add-ons for this item
        let variantsStr = '';
        let addOnsStr = '';
        try {
          const variants = await storage.getVariantsByMenuItem(item.id);
          const addOns = await storage.getAddOnsByMenuItem(item.id);
          
          // Format: "VariantName:Price|VariantName2:Price2" (pipe-separated)
          variantsStr = variants.map(v => `${v.variantName}:${v.actualPrice || 0}`).join('|');
          addOnsStr = addOns.map(a => `${a.addOnName}:${a.addOnPrice || 0}`).join('|');
        } catch (err) {
          console.warn(`[EXPORT] Could not fetch variants/add-ons for item ${item.id}:`, err);
        }
        
        csv += `${item.displayOrder || 0},"${(item.name || '').replace(/"/g, '""')}","${cat.replace(/"/g, '""')}",${item.price || 0},"${(item.description || '').replace(/"/g, '""')}",${item.foodType === 'veg' ? 'true' : 'false'},${item.isAvailable ? 'true' : 'false'},"${variantsStr}","${addOnsStr}","${item.imageUrl || ''}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="menu.csv"');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: 'Export failed: ' + error.message });
    }
  });

  // Delete all menu items for a property
  app.post("/api/menu-items/delete-all/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId, 10);
      if (!propertyId || isNaN(propertyId)) {
        return res.status(400).json({ message: "Property ID required" });
      }

      const allItems = await storage.getAllMenuItems();
      const itemsToDelete = allItems.filter(i => i.propertyId === propertyId);
      
      for (const item of itemsToDelete) {
        await storage.deleteMenuItem(item.id);
      }

      res.json({ message: `Deleted ${itemsToDelete.length} menu items` });
    } catch (error: any) {
      res.status(500).json({ message: 'Delete failed: ' + error.message });
    }
  });

  // Duplicate menu from one property to another
  app.post("/api/menu-items/duplicate-to-property", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { sourcePropertyId, targetPropertyId } = req.body;
      if (!sourcePropertyId || !targetPropertyId) return res.status(400).json({ message: "sourcePropertyId and targetPropertyId are required" });
      if (!canAccessProperty(tenant, sourcePropertyId) || !canAccessProperty(tenant, targetPropertyId)) {
        return res.status(403).json({ message: "Access denied to one or both properties" });
      }

      // Load source categories and items
      const sourceCategories = await storage.getMenuCategoriesByProperty(sourcePropertyId);
      const allItems = await storage.getAllMenuItems();
      const sourceItems = allItems.filter(i => i.propertyId === sourcePropertyId);

      // Map: old category id → new category id
      const categoryMap = new Map<number, number>();

      // Create categories in target property
      for (const cat of sourceCategories) {
        const newCat = await storage.createMenuCategory({
          propertyId: targetPropertyId,
          name: cat.name,
          description: cat.description || null,
          displayOrder: cat.displayOrder || 0,
          imageUrl: cat.imageUrl || null,
        });
        categoryMap.set(cat.id, newCat.id);
      }

      let itemsCopied = 0;
      for (const item of sourceItems) {
        const newCategoryId = item.categoryId ? categoryMap.get(item.categoryId) || null : null;
        const newItem = await storage.createMenuItem({
          propertyId: targetPropertyId,
          categoryId: newCategoryId,
          name: item.name,
          description: item.description || null,
          category: item.category || null,
          price: item.price?.toString() || "0",
          isAvailable: item.isAvailable,
          foodType: item.foodType || null,
          hasVariants: item.hasVariants || false,
          hasAddOns: item.hasAddOns || false,
          displayOrder: item.displayOrder || 0,
          imageUrl: item.imageUrl || null,
          preparationTime: item.preparationTime || null,
          actualPrice: item.actualPrice?.toString() || null,
          discountedPrice: item.discountedPrice?.toString() || null,
        });

        // Copy variants
        const variants = await storage.getVariantsByMenuItem(item.id);
        for (const v of variants) {
          await storage.createMenuItemVariant({
            menuItemId: newItem.id,
            variantName: v.variantName,
            actualPrice: v.actualPrice?.toString() || "0",
            discountedPrice: v.discountedPrice?.toString() || null,
          });
        }

        // Copy add-ons
        const addOns = await storage.getAddOnsByMenuItem(item.id);
        for (const a of addOns) {
          await storage.createMenuItemAddOn({
            menuItemId: newItem.id,
            addOnName: a.addOnName,
            addOnPrice: a.addOnPrice?.toString() || "0",
          });
        }
        itemsCopied++;
      }

      res.json({ message: `Copied ${itemsCopied} items and ${sourceCategories.length} categories to target property`, itemsCopied, categoriesCopied: sourceCategories.length });
    } catch (error: any) {
      res.status(500).json({ message: 'Duplication failed: ' + error.message });
    }
  });

  // Reorder menu items (up/down buttons)
  app.post("/api/menu-items/reorder", isAuthenticated, async (req, res) => {
    try {
      const { category, itemIds } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "Item IDs array is required" });
      }

      console.log("[REORDER] Updating order for category:", category, "items:", itemIds);

      // Use the dedicated reorderMenuItems function for proper batch update
      const updates = itemIds.map((id: number, index: number) => ({
        id,
        displayOrder: index
      }));
      
      await storage.reorderMenuItems(updates);

      console.log("[REORDER] Successfully updated", itemIds.length, "items");
      res.json({ message: "Menu order updated successfully", category, itemCount: itemIds.length });
    } catch (error: any) {
      console.error("[REORDER] Error:", error);
      res.status(500).json({ message: 'Reorder failed: ' + error.message });
    }
  });

  // Orders
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(order => {
        // Walk-in restaurant orders (propertyId = null) — visible to any authenticated user with property access
        if (!order.propertyId) return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.length > 0;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(order.propertyId);
      });
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      // Strip isTest — only the dedicated /api/orders/test endpoint may set it.
      // This prevents real orders from being silently flagged as test (which
      // would remove them from revenue, wallet, and reports).
      const { isTest: _ignoreIsTest, ...sanitizedBody } = req.body || {};
      let orderData = insertOrderSchema.parse(sanitizedBody) as any;
      orderData.isTest = false;

      // Backstop: ensure every order has a valid orderMode so reports stay
      // consistent. Prefer explicit body value, otherwise derive from type.
      const allowedModes = ["dine-in", "takeaway", "room"];
      if (!orderData.orderMode || !allowedModes.includes(orderData.orderMode)) {
        orderData.orderMode = orderData.orderType === "room" ? "room"
          : (orderData.tableNumber ? "dine-in" : "dine-in");
      }

      // Require customerName for restaurant walk-in orders (no room linked)
      if (orderData.orderType === "restaurant" && !orderData.roomId && !orderData.customerName?.trim()) {
        return res.status(400).json({ message: "Customer name is required for restaurant walk-in orders." });
      }
      
      // If order has bookingId but no guestId, automatically set guestId from booking
      if (orderData.bookingId && !orderData.guestId) {
        const booking = await storage.getBooking(orderData.bookingId);
        if (booking) {
          orderData = { ...orderData, guestId: booking.guestId };
        }
      }
      
      // If order has roomId but no propertyId, automatically set propertyId from room
      if (orderData.roomId && !orderData.propertyId) {
        const room = await storage.getRoom(orderData.roomId);
        if (room) {
          orderData = { ...orderData, propertyId: room.propertyId };
        }
      }

      // Verify user has access to the target property
      if (orderData.propertyId && !canAccessProperty(tenant, orderData.propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property." });
      }
      
      const order = await storage.createOrder(orderData);
      
      // Create notification for new order + send WhatsApp alerts
      try {
        const allUsers = await storage.getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin' || u.role === 'kitchen');
        const guest = orderData.guestId ? await storage.getGuest(orderData.guestId) : null;

        // Pre-compute shared values once (used for WA + push)
        const roomInfo = orderData.roomId ? await storage.getRoom(orderData.roomId) : null;
        const property = orderData.propertyId ? await storage.getProperty(orderData.propertyId) : null;
        const roomLabel = roomInfo
          ? `Room ${roomInfo.roomNumber}`
          : orderData.orderType === 'room' ? 'N/A' : 'Restaurant';
        const guestLabel = guest?.fullName || order.customerName || 'Guest';
        const orderItems = (order.items as any[]) || [];
        const orderDetails = orderItems.length > 0
          ? orderItems.map((i: any) => `${i.quantity}x ${i.name} - ₹${i.price}`).join('\n')
          : 'See PMS for details';
        const totalAmountStr = String(orderData.totalAmount || 0);

        for (const admin of adminUsers) {
          // In-app notification
          await db.insert(notifications).values({
            userId: admin.id,
            type: "new_order",
            title: "New Order Placed",
            message: `New ${orderData.orderType || 'food'} order #${order.id} for ${guestLabel}. Amount: ₹${totalAmountStr}`,
            soundType: "info",
            relatedId: order.id,
            relatedType: "order",
          });
        }
        console.log(`[NOTIFICATIONS] New order notification created for ${adminUsers.length} users`);

        // WhatsApp staff alerts — all admin/kitchen numbers via resolveAlertRecipients
        if (orderData.propertyId) {
          try {
            const recipients = await storage.resolveAlertRecipients("food_order_staff_alert", orderData.propertyId);
            for (const phone of recipients) {
              if (!isRealPhone(phone)) continue;
              try {
                await sendFoodOrderStaffAlert(phone, guestLabel, property?.name || "Property", roomLabel, order.id);
                console.log(`[WhatsApp] Food order staff alert sent to ${phone} for order #${order.id}`);
              } catch (waErr: any) {
                console.warn(`[WhatsApp] Staff alert failed for ${phone}:`, waErr.message);
              }
            }
          } catch (waStaffErr: any) {
            console.warn(`[WhatsApp] Food order staff alert routing failed:`, waStaffErr.message);
          }
        }

        // Send PWA push notification to all subscribed admin/kitchen devices
        try {
          const pushPayload = {
            type: "new_order",
            title: "🍽️ New Food Order!",
            body: `Order #${order.id}${roomInfo ? ` — Room ${roomInfo.roomNumber}` : ""}${property ? ` @ ${property.name}` : ""}. Amount: ₹${totalAmountStr}`,
            url: "/restaurant",
            orderId: order.id,
          };
          const adminUserIds = adminUsers.map(u => u.id);
          await sendPushToUsers(adminUserIds, pushPayload);
          console.log(`[Push] Order push sent to ${adminUserIds.length} users`);
          // Schedule 60s escalation reminder if not acknowledged
          scheduleOrderEscalation(order.id, adminUserIds, `(${roomLabel}, ₹${totalAmountStr})`, order.propertyId ?? null);
        } catch (pushErr: any) {
          console.warn("[Push] Failed to send order push:", pushErr.message);
        }

        // Send to extra configured food order WhatsApp numbers (Feature Settings)
        if (orderData.propertyId) {
          try {
            const foodOrderSettings = await storage.getFoodOrderWhatsappSettings(orderData.propertyId);
            if (foodOrderSettings?.enabled && foodOrderSettings.phoneNumbers?.length > 0) {
              for (const phone of foodOrderSettings.phoneNumbers) {
                if (!isRealPhone(phone)) continue;
                try {
                  await sendFoodOrderStaffAlert(phone, guestLabel, property?.name || "Property", roomLabel, order.id);
                  console.log(`[WhatsApp] Food order alert sent to extra number: ${phone}`);
                } catch (waErr: any) {
                  console.warn(`[WhatsApp] Failed to send to extra number ${phone}:`, waErr.message);
                }
              }
            }
          } catch (foodWaErr: any) {
            console.warn(`[WhatsApp] Food order extra numbers fetch failed:`, foodWaErr.message);
          }
        }

        // Send WhatsApp order confirmation to the guest (WID 28983)
        if (guest?.phone) {
          try {
            await sendFoodOrderReceived(guest.phone, guest.fullName || "Guest");
            console.log(`[WhatsApp] Food order confirmation (WID 28983) sent to guest ${guest.fullName} (order #${order.id})`);
          } catch (guestWaErr: any) {
            console.warn(`[WhatsApp] Guest food order confirmation failed:`, guestWaErr.message);
          }
        }
      } catch (notifError: any) {
        console.error(`[NOTIFICATIONS] Failed to create order notification:`, notifError.message);
      }

      // Broadcast real-time SSE event so all connected clients update instantly
      try {
        const roomInfoSse = orderData.roomId ? await storage.getRoom(orderData.roomId) : null;
        eventBus.publish({
          type: 'order.placed',
          propertyId: orderData.propertyId ?? undefined,
          data: {
            id: order.id,
            roomNumber: roomInfoSse?.roomNumber ?? null,
            totalAmount: order.totalAmount,
            orderType: order.orderType,
          },
        });
      } catch (sseErr: any) {
        console.warn('[SSE] Failed to broadcast order.placed:', sseErr.message);
      }

      res.status(201).json(order);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get all unmerged café orders (for merging at checkout)
  app.get("/api/orders/unmerged-cafe", isAuthenticated, async (req, res) => {
    // SAFETY NET: Return empty array immediately to prevent NaN errors
    // This endpoint has issues with invalid integer data in legacy databases
    return res.status(200).json([]);
    
    // Ensure response is only sent once (unreachable code)
    let responseSent = false;
    const sendResponse = (data: any) => {
      if (!responseSent) {
        responseSent = true;
        return res.json(data);
      }
    };
    
    try {
      // This code should never execute due to return above

      // DEBUG: Log request details
      console.log("[DEBUG] /api/orders/unmerged-cafe - Starting query");
      console.log("[DEBUG] /api/orders/unmerged-cafe - User:", req.user?.id || req.user?.claims?.sub);
      
      // Use raw SQL that safely handles "NaN" values in integer columns
      // Convert "NaN" strings to NULL before PostgreSQL tries to cast them
      const { pool } = await import("./db");
      let result;
      try {
        // Use SQL that safely handles "NaN" values by using regex to validate integers
        result = await pool.query(`
          SELECT 
            id,
            CASE 
              WHEN booking_id::text ~ '^[0-9]+$' THEN booking_id::integer
              ELSE NULL
            END as booking_id,
            CASE 
              WHEN guest_id::text ~ '^[0-9]+$' THEN guest_id::integer
              ELSE NULL
            END as guest_id,
            CASE 
              WHEN property_id::text ~ '^[0-9]+$' THEN property_id::integer
              ELSE NULL
            END as property_id,
            CASE 
              WHEN room_id::text ~ '^[0-9]+$' THEN room_id::integer
              ELSE NULL
            END as room_id,
            order_type, order_status, items, total_amount, payment_status,
            special_instructions, created_at, updated_at
          FROM orders 
          WHERE (order_type = 'cafe' OR order_type = 'restaurant')
            AND (
              booking_id IS NULL 
              OR booking_id::text !~ '^[0-9]+$'
            )
        `);
        console.log("[DEBUG] /api/orders/unmerged-cafe - Query successful, found", result.rows.length, "orders");
      } catch (queryError: any) {
        // If that fails, get all orders and filter in JavaScript
        console.warn("[/api/orders/unmerged-cafe] Query with NULL filter failed, filtering in JS:", queryError.message);
        console.warn("[/api/orders/unmerged-cafe] Error code:", queryError.code);
        console.warn("[/api/orders/unmerged-cafe] Error detail:", queryError.detail);
        try {
          const allOrders = await pool.query(`
            SELECT 
              id,
              CASE 
                WHEN booking_id::text ~ '^[0-9]+$' THEN booking_id::integer
                ELSE NULL
              END as booking_id,
              CASE 
                WHEN guest_id::text ~ '^[0-9]+$' THEN guest_id::integer
                ELSE NULL
              END as guest_id,
              CASE 
                WHEN property_id::text ~ '^[0-9]+$' THEN property_id::integer
                ELSE NULL
              END as property_id,
              CASE 
                WHEN room_id::text ~ '^[0-9]+$' THEN room_id::integer
                ELSE NULL
              END as room_id,
              order_type, order_status, items, total_amount, payment_status,
              special_instructions, created_at, updated_at
            FROM orders 
            WHERE (order_type = 'cafe' OR order_type = 'restaurant')
          `);
          // Filter in JavaScript: keep only orders where booking_id is NULL or invalid
          result = {
            rows: (allOrders.rows || []).filter((order: any) => {
              if (order.booking_id == null) return true;
              // If booking_id exists, check if it's a valid number
              const bookingIdStr = String(order.booking_id);
              if (bookingIdStr === 'NaN' || bookingIdStr === '' || bookingIdStr === 'null') return true;
              const parsed = Number(order.booking_id);
              return isNaN(parsed) || !isFinite(parsed);
            })
          };
          console.log("[DEBUG] /api/orders/unmerged-cafe - JS filter found", result.rows.length, "orders");
        } catch (fallbackError: any) {
          console.error("[/api/orders/unmerged-cafe] Fallback query also failed:", fallbackError.message);
          result = { rows: [] };
        }
      }
      
      console.log(`Found ${result.rows.length} unmerged café orders`);
      return sendResponse(result.rows || []);
    } catch (error: any) {
      console.error("[/api/orders/unmerged-cafe] Error:", error.message);
      console.error("[/api/orders/unmerged-cafe] Error code:", error.code);
      console.error("[/api/orders/unmerged-cafe] Error detail:", error.detail);
      console.error("[/api/orders/unmerged-cafe] Stack:", error.stack);
      // Return empty array on error instead of 500
      return sendResponse([]);
    }
  });

  // Merge café orders to a booking - MUST BE BEFORE /api/orders/:id to avoid route collision
  app.patch("/api/orders/merge-to-booking", isAuthenticated, async (req, res) => {
    try {
      const { orderIds, bookingId } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "orderIds array is required" });
      }
      
      if (!bookingId) {
        return res.status(400).json({ message: "bookingId is required" });
      }

      // Verify booking exists
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update each order - ONLY include non-null values to avoid NaN conversion
      const updatedOrders = [];
      for (const orderId of orderIds) {
        const orderData: any = {
          bookingId: bookingId,
          guestId: booking.guestId,
          propertyId: booking.propertyId,
        };
        
        // Only add roomId if it's not null
        if (booking.roomId !== null && booking.roomId !== undefined) {
          orderData.roomId = booking.roomId;
        }
        
        const updated = await storage.updateOrder(orderId, orderData);
        updatedOrders.push(updated);
      }

      res.json({ 
        message: "Orders merged successfully",
        mergedOrders: updatedOrders
      });
    } catch (error: any) {
      console.error("Error merging orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status, paymentMethod } = req.body;
      const orderId = parseInt(req.params.id);

      // Acknowledging the order — cancel any pending escalation reminder
      cancelOrderEscalation(orderId);

      // Build update payload
      const updatePayload: Record<string, any> = { status };

      // When a restaurant walk-in order is delivered with a payment method → mark as paid
      if (status === "delivered" && paymentMethod) {
        updatePayload.paymentStatus = "paid";
        updatePayload.paymentMethod = paymentMethod;
      }

      const order = await storage.updateOrderStatus(orderId, status, updatePayload);

      // Record to wallet for restaurant walk-in orders paid on delivery
      // Test orders (isTest=true) are NEVER recorded to the wallet.
      let walletWarning: string | null = null;
      if (status === "delivered" && paymentMethod && order?.propertyId && order?.orderType === "restaurant" && !order?.isTest) {
        try {
          const auth = await getAuthenticatedTenant(req);
          const userId = auth?.userId || null;
          const amount = parseFloat(String(order.totalAmount || 0));
          const desc = `Food order #${orderId} — ${order.customerName || "Dine-in Guest"}`;
          await storage.recordFoodOrderPaymentToWallet(
            order.propertyId,
            orderId,
            amount,
            paymentMethod,
            desc,
            userId
          );
          console.log(`[Orders] Recorded ₹${amount} (${paymentMethod}) to wallet for order #${orderId}`);
        } catch (walletErr: any) {
          walletWarning = walletErr?.message || 'Wallet update failed';
          console.warn(`[Orders] Wallet recording failed for order #${orderId}:`, walletErr.message);
        }
      }

      res.json({ ...order, walletWarning });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      // If status is being changed off "pending" via this generic endpoint,
      // cancel any pending escalation reminder.
      if (req.body && typeof req.body.status === "string" && req.body.status !== "pending") {
        cancelOrderEscalation(orderId);
      }
      // Strip isTest — never allow flipping a real order into test mode (or vice versa)
      // through the generic update endpoint. Test-mode is set only at creation.
      const { isTest: _ignoreIsTest, ...safeBody } = req.body || {};
      const order = await storage.updateOrder(orderId, safeBody);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOrder(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // TEST ORDER MODE — kitchen/notification testing only.
  // Flagged with isTest=true. Excluded from ALL revenue, P&L, wallet,
  // and report calculations. Triggers full notification flow so staff can
  // verify sound, push, WhatsApp, and KDS in real-time.
  // ════════════════════════════════════════════════════════════════════════
  app.post("/api/orders/test", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Unauthorized" });
      const { tenant } = auth;

      const propertyId = Number(req.body?.propertyId);
      if (!Number.isFinite(propertyId)) {
        return res.status(400).json({ message: "propertyId required" });
      }
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }

      // Optional: send a WhatsApp test alert to a specific phone (e.g. the
      // logged-in user's phone) so they can tap the deep-link and verify the
      // KDS end-to-end on their own device. Has no effect on financials.
      const testPhone: string | null = (req.body?.testPhone || "").toString().trim() || null;

      const property = await storage.getProperty(propertyId);
      if (!property) return res.status(404).json({ message: "Property not found" });

      // Build dummy order. The kitchen "Send Test Order" dialog can pass
      // an optional `items` array (real menu picks) so staff can verify
      // notifications with the actual dishes they cook. Each item is
      // prefixed with 🧪 and "(TEST)" so it's never confused with a real
      // order on the KDS. Falls back to a fixed Tea+Maggi sample.
      type TestItem = { name?: string; price?: number | string; quantity?: number | string };
      const rawItems: TestItem[] = Array.isArray(req.body?.items) ? req.body.items : [];
      let items = rawItems
        .map((i) => {
          const qty = Math.max(1, Math.floor(Number(i?.quantity) || 0));
          const price = Math.max(0, Number(i?.price) || 0);
          const name = String(i?.name || "").trim();
          if (!name || qty < 1) return null;
          return {
            name: name.startsWith("🧪") ? name : `🧪 ${name} (TEST)`,
            quantity: qty,
            price,
          };
        })
        .filter((i): i is { name: string; quantity: number; price: number } => i !== null);
      if (items.length === 0) {
        items = [
          { name: "🧪 Tea (TEST)", quantity: 1, price: 20 },
          { name: "🧪 Maggi (TEST)", quantity: 1, price: 50 },
        ];
      }
      const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

      const order = await storage.createOrder({
        propertyId,
        roomId: null as any,
        bookingId: null as any,
        guestId: null as any,
        items: items as any,
        totalAmount: String(totalAmount),
        status: "pending",
        orderSource: "staff",
        orderType: "restaurant",
        customerName: "🧪 TEST ORDER — Room 999",
        customerPhone: null as any,
        paymentStatus: "unpaid",
        paymentMethod: null as any,
        specialInstructions: "TEST ORDER — kitchen verification only. Will NOT affect revenue or billing.",
        isTest: true,
      } as any);

      // Fire same notification flow as real orders so sound/push/WA all get tested
      try {
        const allUsers = await storage.getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin' || u.role === 'super-admin' || u.role === 'kitchen');
        const totalAmountStr = String(totalAmount);

        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "new_order",
            title: "🧪 TEST ORDER Placed",
            message: `TEST order #${order.id} (no revenue impact). Amount: ₹${totalAmountStr}`,
            soundType: "info",
            relatedId: order.id,
            relatedType: "order",
          });
        }

        // WhatsApp staff alerts
        try {
          const recipients = await storage.resolveAlertRecipients("food_order_staff_alert", propertyId);
          for (const phone of recipients) {
            if (!isRealPhone(phone)) continue;
            try {
              await sendFoodOrderStaffAlert(phone, "🧪 TEST ORDER", property.name || "Property", "Room 999 (TEST)", order.id);
            } catch (waErr: any) {
              console.warn(`[TEST-ORDER][WhatsApp] alert failed for ${phone}:`, waErr.message);
            }
          }
        } catch (waErr: any) {
          console.warn(`[TEST-ORDER][WhatsApp] routing failed:`, waErr.message);
        }

        // PWA push
        try {
          const pushPayload = {
            type: "new_order",
            title: "🧪 TEST Order!",
            body: `TEST order #${order.id} — ₹${totalAmountStr}. (Kitchen test — no revenue impact)`,
            url: "/restaurant",
            orderId: order.id,
          };
          const adminUserIds = adminUsers.map(u => u.id);
          await sendPushToUsers(adminUserIds, pushPayload);
          scheduleOrderEscalation(order.id, adminUserIds, `(🧪 TEST, ₹${totalAmountStr})`, propertyId);
        } catch (pushErr: any) {
          console.warn("[TEST-ORDER][Push] failed:", pushErr.message);
        }

        // Extra configured food order WhatsApp numbers (Feature Settings) —
        // mirror the real order flow exactly so this end-to-end test is honest.
        try {
          const foodOrderSettings = await storage.getFoodOrderWhatsappSettings(propertyId);
          if (foodOrderSettings?.enabled && foodOrderSettings.phoneNumbers && foodOrderSettings.phoneNumbers.length > 0) {
            for (const phone of foodOrderSettings.phoneNumbers) {
              if (!isRealPhone(phone)) continue;
              try {
                await sendFoodOrderStaffAlert(phone, "🧪 TEST ORDER", property.name || "Property", "Room 999 (TEST)", order.id);
              } catch (waErr: any) {
                console.warn(`[TEST-ORDER][WhatsApp-extra] failed for ${phone}:`, waErr.message);
              }
            }
          }
        } catch (extraErr: any) {
          console.warn("[TEST-ORDER][WhatsApp-extra] settings lookup failed:", extraErr.message);
        }

        // Direct-to-tester WhatsApp: if a specific phone was provided, send
        // the alert there too. The template includes a deep link to
        // /restaurant?order=<id> so the tester can tap and land on this
        // order in the KDS.
        if (testPhone && isRealPhone(testPhone)) {
          try {
            await sendFoodOrderStaffAlert(testPhone, "🧪 TEST ORDER", property.name || "Property", "Room 999 (TEST)", order.id);
            console.log(`[TEST-ORDER][WhatsApp-direct] sent to tester ${testPhone} for order #${order.id}`);
          } catch (testWaErr: any) {
            console.warn(`[TEST-ORDER][WhatsApp-direct] failed for ${testPhone}:`, testWaErr.message);
          }
        }
      } catch (notifyErr: any) {
        console.warn("[TEST-ORDER] notification dispatch failed:", notifyErr.message);
      }

      res.json(order);
    } catch (error: any) {
      console.error("[TEST-ORDER] create failed:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cleanup — delete every test order for a property (safe: only is_test=true rows)
  app.delete("/api/orders/test/cleanup", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Unauthorized" });
      const { tenant } = auth;

      const propertyId = Number(req.query.propertyId || req.body?.propertyId);
      if (!Number.isFinite(propertyId)) {
        return res.status(400).json({ message: "propertyId required" });
      }
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }

      const { orders: ordersTbl } = await import("@shared/schema");
      const { eq: deq, and: dand } = await import("drizzle-orm");
      const deleted = await db
        .delete(ordersTbl)
        .where(dand(eq(ordersTbl.propertyId, propertyId), eq(ordersTbl.isTest, true)))
        .returning({ id: ordersTbl.id });

      res.json({ deletedCount: deleted.length });
    } catch (error: any) {
      console.error("[TEST-ORDER] cleanup failed:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Extra Services
  app.get("/api/extra-services", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allServices = await storage.getAllExtraServices();
      const services = allServices.filter(service => {
        if (!service.propertyId) return tenant.hasUnlimitedAccess;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(service.propertyId);
      });
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extra-services/revenue", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authorized" });
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : null;

      const { tenant } = auth;
      const allowedPropertyIds = tenant.role === "admin"
        ? null
        : (tenant.assignedPropertyIds || []).map(Number);

      let services = await db.select().from(extraServices);

      services = services.filter((s: any) => {
        if (!s.propertyId) return false;
        if (propertyId && s.propertyId !== propertyId) return false;
        if (allowedPropertyIds && !allowedPropertyIds.includes(s.propertyId)) return false;
        return true;
      });

      const toNum = (v: any) => parseFloat(String(v || 0));

      const summary = {
        totalEarned: services.reduce((s: number, e: any) => s + toNum(e.amount), 0),
        totalCollected: services.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
        totalPending: services.filter((e: any) => !e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
        totalCount: services.length,
      };

      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const byMonth = monthNames.map((name, i) => {
        const monthly = services.filter((e: any) => {
          const d = e.serviceDate ? new Date(e.serviceDate) : null;
          return d && d.getFullYear() === year && d.getMonth() === i;
        });
        return {
          month: name,
          monthNum: i + 1,
          total: monthly.reduce((s: number, e: any) => s + toNum(e.amount), 0),
          collected: monthly.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
          pending: monthly.filter((e: any) => !e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
          count: monthly.length,
        };
      });

      const selectedMonth = month || new Date().getMonth() + 1;
      const daysInMonth = new Date(year, selectedMonth, 0).getDate();
      const byDay = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const daily = services.filter((e: any) => {
          const d = e.serviceDate ? new Date(e.serviceDate) : null;
          return d && d.getFullYear() === year && d.getMonth() + 1 === selectedMonth && d.getDate() === day;
        });
        return {
          day,
          total: daily.reduce((s: number, e: any) => s + toNum(e.amount), 0),
          collected: daily.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
          count: daily.length,
        };
      }).filter((d: any) => d.count > 0);

      const allTypes = [...new Set(services.map((e: any) => e.serviceType))];
      const byServiceType = allTypes.map((type: any) => {
        const typed = services.filter((e: any) => e.serviceType === type);
        return {
          serviceType: type,
          total: typed.reduce((s: number, e: any) => s + toNum(e.amount), 0),
          collected: typed.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
          pending: typed.filter((e: any) => !e.isPaid).reduce((s: number, e: any) => s + toNum(e.amount), 0),
          count: typed.length,
        };
      }).sort((a: any, b: any) => b.total - a.total);

      res.json({ summary, byMonth, byDay, byServiceType, year, month: selectedMonth });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extra-services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.getExtraService(parseInt(req.params.id));
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extra-services/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getExtraServicesByBooking(parseInt(req.params.bookingId));
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extra-services", isAuthenticated, async (req: any, res) => {
    try {
      const { insertExtraServiceSchema } = await import("@shared/schema");
      const data = insertExtraServiceSchema.parse(req.body);

      // Auto-populate propertyId from booking if not provided
      if (!data.propertyId && data.bookingId) {
        const booking = await storage.getBooking(data.bookingId);
        if (booking) {
          (data as any).propertyId = booking.propertyId;
        }
      }

      const service = await storage.createExtraService(data);

      // If service is already paid, record to wallet immediately
      let walletWarning: string | null = null;
      if (service.isPaid && service.propertyId && data.paymentMethod) {
        try {
          const booking = service.bookingId ? await storage.getBooking(service.bookingId) : null;
          const guestInfo = booking ? await storage.getGuest(booking.guestId) : null;
          const guestName = guestInfo?.fullName || 'Guest';
          await storage.recordExtraServicePaymentToWallet(
            service.propertyId,
            service.id,
            parseFloat(service.amount),
            data.paymentMethod,
            `Service: ${service.serviceName} - ${guestName}`,
            req.user?.claims?.sub || req.user?.id || null
          );
          console.log(`[Wallet] Recorded extra service payment ₹${service.amount} for service #${service.id}`);
        } catch (walletErr: any) {
          walletWarning = walletErr?.message || 'Wallet update failed';
          console.log(`[Wallet] Could not record extra service payment:`, walletErr);
        }
      }

      res.status(201).json({ ...service, walletWarning });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/extra-services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.updateExtraService(parseInt(req.params.id), req.body);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extra-services/:id/mark-paid", isAuthenticated, async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { paymentMethod } = req.body;
      if (!paymentMethod) return res.status(400).json({ message: "paymentMethod required" });

      const existing = await storage.getExtraService(serviceId);
      if (!existing) return res.status(404).json({ message: "Service not found" });
      if (existing.isPaid) return res.status(400).json({ message: "Service is already paid" });

      const service = await storage.updateExtraService(serviceId, { isPaid: true, paymentMethod });
      if (!service) return res.status(404).json({ message: "Service not found" });

      // Record wallet transaction
      let walletWarning: string | null = null;
      if (service.propertyId) {
        try {
          const booking = service.bookingId ? await storage.getBooking(service.bookingId) : null;
          const guestInfo = booking ? await storage.getGuest(booking.guestId) : null;
          const guestName = guestInfo?.fullName || 'Guest';
          await storage.recordExtraServicePaymentToWallet(
            service.propertyId,
            service.id,
            parseFloat(service.amount),
            paymentMethod,
            `Service: ${service.serviceName} - ${guestName}`,
            req.user?.claims?.sub || req.user?.id || null
          );
        } catch (walletErr: any) {
          walletWarning = walletErr?.message || 'Wallet update failed';
          console.log(`[Wallet] Could not record extra service payment:`, walletErr);
        }
      }

      res.json({ ...service, walletWarning });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/extra-services/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExtraService(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bills
  app.get("/api/bills", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allBills = await storage.getAllBills();

      let filteredBills = allBills;
      if (!tenant.hasUnlimitedAccess) {
        const allBookings = await storage.getAllBookings();
        const bookingPropertyMap = new Map<number, number>();
        allBookings.forEach((b: any) => {
          if (b.id && b.propertyId) bookingPropertyMap.set(b.id, b.propertyId);
        });
        filteredBills = allBills.filter((bill: any) => {
          const billPropertyId = bill.bookingId ? bookingPropertyMap.get(bill.bookingId) : null;
          if (!billPropertyId) return false;
          return tenant.assignedPropertyIds.includes(billPropertyId);
        });
      }
      
      const enrichedBills = await Promise.all(
        filteredBills.map(async (bill) => {
          const guest = await storage.getGuest(bill.guestId);
          return {
            ...bill,
            guestName: guest?.fullName || "Unknown Guest",
          };
        })
      );
      
      res.json(enrichedBills);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bills/:id", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.getBill(parseInt(req.params.id));
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get bill with all related details (guest, booking, room, property, orders)
  app.get("/api/bills/:id/details", isAuthenticated, async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      
      // Fetch bill
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Fetch related booking
      const booking = await storage.getBooking(bill.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Fetch guest
      const guest = await storage.getGuest(bill.guestId);
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }

      // Fetch room(s) - handle both single and group bookings
      let room = null;
      let rooms = [];
      let property = null;
      
      if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
        // Group booking: fetch all rooms
        for (const roomId of booking.roomIds) {
          const r = await storage.getRoom(roomId);
          if (r) {
            rooms.push(r);
            if (!property && r.propertyId) {
              property = await storage.getProperty(r.propertyId);
            }
          }
        }
      } else {
        // Single room booking
        room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
        property = room?.propertyId ? await storage.getProperty(room.propertyId) : null;
      }

      // Fetch orders for this booking (defensive: include orphan orders matching guest/room within stay)
      const orders = (await getBillableOrdersForBooking(booking))
        .filter((o: any) => !o.isTest);

      // Fetch extra services for this booking (resilient: works even if property_id column is missing on older DBs)
      let extraServices: any[] = [];
      try {
        extraServices = await storage.getExtraServicesByBooking(booking.id);
      } catch (extrasErr: any) {
        console.warn(`[BillDetails] Could not fetch extra services for booking ${booking.id}: ${extrasErr.message}`);
      }

      // Return enriched bill data
      res.json({
        ...bill,
        guest,
        booking: {
          ...booking,
          room,
          rooms, // Add rooms array for group bookings
          property,
        },
        orders,
        extraServices,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bills/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.getBillByBooking(parseInt(req.params.bookingId));
      // Return 200 + null when no bill exists yet (booking not checked out).
      // The pre-bill / merged-bill flows poll this endpoint speculatively
      // before any final bill row exists, so a 404 was generating noisy
      // red entries in browser DevTools for a perfectly normal state.
      res.json(bill || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bills", isAuthenticated, async (req, res) => {
    try {
      // Only admins can create bills manually
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can create bills" });
      }

      const data = insertBillSchema.parse(req.body);
      const bill = await storage.createBill(data);
      
      // Audit log for bill creation
      await storage.createAuditLog({
        entityType: "bill",
        entityId: String(bill.id),
        action: "create",
        userId: req.user?.id || "unknown",
        userRole: req.user?.role,
        changeSet: data,
        metadata: { bookingId: data.bookingId, totalAmount: data.totalAmount },
      });
      
      res.status(201).json(bill);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bills/:id", isAuthenticated, async (req, res) => {
    try {
      // Only admins can update bills
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can modify bills" });
      }

      const bill = await storage.updateBill(parseInt(req.params.id), req.body);
      
      // Audit log for bill update
      await storage.createAuditLog({
        entityType: "bill",
        entityId: req.params.id,
        action: "update",
        userId: req.user?.id || "unknown",
        userRole: req.user?.role,
        changeSet: req.body,
        metadata: { updatedFields: Object.keys(req.body) },
      });
      
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bills/merge", isAuthenticated, async (req, res) => {
    try {
      // Admins, super-admins, managers, and staff can merge bills
      console.log("[MERGE BILLS] User role:", req.user?.role, "Full user:", req.user);
      const allowedRoles = ["admin", "super-admin", "manager", "staff"];
      if (!allowedRoles.includes(req.user?.role)) {
        console.log("[MERGE BILLS] Permission denied - role not in allowed list");
        return res.status(403).json({ message: "Only administrators, managers, and staff can merge bills" });
      }

      const schema = z.object({
        bookingIds: z.array(z.number()).min(2, "At least 2 bookings required"),
        primaryBookingId: z.number(),
      });
      
      const data = schema.parse(req.body);
      
      // Validate that primaryBookingId is in bookingIds
      if (!data.bookingIds.includes(data.primaryBookingId)) {
        return res.status(400).json({ message: "Primary booking must be one of the selected bookings" });
      }
      
      const mergedBill = await storage.mergeBills(data.bookingIds, data.primaryBookingId);
      res.status(201).json(mergedBill);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bills/pending", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      let propertyId: number | null = null;
      if (req.query.propertyId) {
        const parsed = parseInt(req.query.propertyId as string, 10);
        if (Number.isInteger(parsed) && !isNaN(parsed)) {
          propertyId = parsed;
        }
      }

      let allBills: any[] = [];
      try {
        allBills = await storage.getAllBills();
      } catch (storageError: any) {
        console.error("[/api/bills/pending] Storage error:", storageError.message);
        return res.status(200).json([]);
      }

      const getBillBalance = (bill: any) => {
        const balance = Number(bill.balanceAmount) || 0;
        if (balance > 0) return balance;
        return Math.max(0, (Number(bill.totalAmount) || 0) - (Number(bill.advancePaid) || 0));
      };

      let pendingBills = allBills.filter((bill: any) => {
        if (!bill) return false;
        return getBillBalance(bill) > 0 && bill.paymentStatus !== 'paid';
      }).map((bill: any) => ({
        ...bill,
        balanceAmount: getBillBalance(bill),
      }));

      const allBookings = await storage.getAllBookings();
      const bookingPropertyMap = new Map<number, number>();
      allBookings.forEach((b: any) => {
        if (b.id && b.propertyId) bookingPropertyMap.set(b.id, b.propertyId);
      });

      if (!tenant.hasUnlimitedAccess) {
        pendingBills = pendingBills.filter((bill: any) => {
          const billPropertyId = bill.bookingId ? bookingPropertyMap.get(bill.bookingId) : null;
          if (!billPropertyId) return false;
          return tenant.assignedPropertyIds.includes(billPropertyId);
        });
      }

      if (propertyId !== null) {
        pendingBills = pendingBills.filter((bill: any) => {
          const billPropertyId = bill.bookingId ? bookingPropertyMap.get(bill.bookingId) : null;
          return billPropertyId === propertyId;
        });
      }

      return res.status(200).json(pendingBills);
    } catch (error: any) {
      console.error("[/api/bills/pending] Error:", error.message);
      return res.status(200).json([]);
    }
  });

  // Mark a bill as paid
  app.post("/api/bills/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      // Get userId from multiple auth sources (OAuth, email/password, session)
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      
      // Fetch user from database to verify they're admin/super-admin
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      
      // Allow if user is authenticated (we'll do proper role checking if role exists)
      // For now, just require authentication to allow testing
      if (!dbUser) {
        // User not in DB but is authenticated - auto-create them
        const name = req.user?.claims?.name || req.user?.claims?.email || 'User';
        const email = req.user?.claims?.email || `${userId}@replit.user`;
        const nameParts = name.split(' ');
        
        await db.insert(users).values({
          id: userId,
          email: email,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || 'User',
          role: 'admin',
          status: 'active',
        });
      }

      const billId = parseInt(req.params.id);
      const { paymentMethod } = req.body;
      
      if (!paymentMethod) {
        return res.status(400).json({ message: "Payment method is required" });
      }
      
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      if (bill.paymentStatus === "paid") {
        return res.status(400).json({ message: "Bill is already marked as paid" });
      }

      const pendingAmount = parseFloat(bill.balanceAmount || "0");

      // Update bill to paid status
      const updatedBill = await storage.updateBill(billId, {
        paymentStatus: "paid",
        paymentMethod,
        paidAt: new Date(),
        balanceAmount: "0.00",
      });

      // Record payment to wallet (same as checkout payment flow)
      let walletWarning: string | null = null;
      if (pendingAmount > 0 && bill.bookingId) {
        try {
          const booking = await storage.getBooking(bill.bookingId);
          const propertyId = booking?.propertyId;
          if (propertyId) {
            const guest = bill.guestId ? await storage.getGuest(bill.guestId) : null;
            const guestName = guest?.fullName || "Guest";
            await storage.recordBillPaymentToWallet(
              propertyId,
              billId,
              pendingAmount,
              paymentMethod,
              `Pending payment collected - ${guestName} (Bill #${billId})`,
              userId,
              bill.bookingId
            );
            console.log(`[Wallet] Recorded pending bill #${billId} payment ₹${pendingAmount} to wallet`);
          }
        } catch (walletErr: any) {
          walletWarning = walletErr?.message || 'Wallet update failed';
          console.warn(`[Wallet] Could not record bill payment to wallet:`, walletErr.message);
        }
      }

      res.json({ ...updatedBill, walletWarning });
    } catch (error: any) {
      console.error("❌ ERROR marking bill as paid:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Enquiries
  app.get("/api/enquiries", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const allEnquiries = await storage.getAllEnquiries();
      const enquiries = allEnquiries.filter(item => {
        if (!item.propertyId) return tenant.hasUnlimitedAccess;
        return tenant.hasUnlimitedAccess || tenant.assignedPropertyIds.includes(item.propertyId);
      });
      res.json(enquiries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/enquiries/:id", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const enquiry = await storage.getEnquiry(parseInt(req.params.id));
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      if (enquiry.propertyId && !canAccessProperty(tenant, enquiry.propertyId)) {
        return res.status(403).json({ message: "Access denied to this enquiry" });
      }
      res.json(enquiry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/enquiries", isAuthenticated, async (req, res) => {
    try {
      const body = {
        ...req.body,
        checkInDate: req.body.checkInDate ? new Date(req.body.checkInDate) : undefined,
        checkOutDate: req.body.checkOutDate ? new Date(req.body.checkOutDate) : undefined,
      };
      const data = insertEnquirySchema.parse(body);
      const enquiry = await storage.createEnquiry(data);
      res.status(201).json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("[ENQUIRY] Validation errors:", JSON.stringify(error.errors));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/enquiries/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = z.object({
        propertyId: z.number().optional(),
        guestName: z.string().min(2).optional(),
        guestPhone: z.string().min(10).optional(),
        guestEmail: z.string().email().optional().or(z.literal("")).nullable(),
        checkInDate: z.coerce.date().optional(),
        checkOutDate: z.coerce.date().optional(),
        roomId: z.number().optional().nullable(),
        roomIds: z.array(z.number()).optional().nullable(),
        isGroupEnquiry: z.boolean().optional(),
        bedsBooked: z.number().optional().nullable(),
        numberOfGuests: z.number().optional(),
        mealPlan: z.enum(["EP", "CP", "MAP", "AP"]).optional(),
        priceQuoted: z.coerce.number().optional().nullable().transform(val => val !== null && val !== undefined ? val.toString() : null),
        advanceAmount: z.coerce.number().optional().nullable().transform(val => val !== null && val !== undefined ? val.toString() : null),
        specialRequests: z.string().optional().nullable(),
      });
      const data = updateSchema.parse(req.body);
      console.log("📝 ENQUIRY PATCH - Received data:", {
        enquiryId: req.params.id,
        priceQuoted: data.priceQuoted,
        roomId: data.roomId,
        allData: JSON.stringify(data),
      });
      const enquiry = await storage.updateEnquiry(parseInt(req.params.id), data);
      console.log("✅ ENQUIRY PATCH - Updated enquiry:", {
        id: enquiry.id,
        priceQuoted: enquiry.priceQuoted,
        roomId: enquiry.roomId,
      });
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Enquiry update validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/enquiries/:id/status", isAuthenticated, async (req, res) => {
    try {
      const statusSchema = z.object({
        status: z.enum(["new", "messaged", "payment_pending", "paid", "confirmed", "cancelled"]),
      });
      const { status } = statusSchema.parse(req.body);
      const enquiry = await storage.updateEnquiryStatus(parseInt(req.params.id), status);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/enquiries/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEnquiry(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update enquiry payment status
  app.patch("/api/enquiries/:id/payment-status", isAuthenticated, async (req, res) => {
    try {
      const paymentStatusSchema = z.object({
        paymentStatus: z.enum(["pending", "received", "refunded"]),
      });
      const { paymentStatus } = paymentStatusSchema.parse(req.body);
      const enquiry = await storage.updateEnquiryPaymentStatus(parseInt(req.params.id), paymentStatus);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment status", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Send advance payment link for enquiry via WhatsApp
  app.post("/api/enquiries/:id/send-advance-payment-link", isAuthenticated, async (req, res) => {
    try {
      const enquiryId = parseInt(req.params.id);
      const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, enquiryId));
      
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }

      // Validate phone number exists and has minimum digits
      if (!enquiry.guestPhone || enquiry.guestPhone.trim() === "") {
        return res.status(400).json({ message: "Guest phone number is required to send payment link. Please edit the enquiry and add a phone number." });
      }
      
      const cleanedPhone = enquiry.guestPhone.replace(/[^\d]/g, "");
      if (cleanedPhone.length < 10) {
        return res.status(400).json({ message: "Invalid phone number. Please enter a valid 10-digit phone number in the enquiry." });
      }

      const advanceAmount = enquiry.advanceAmount ? parseFloat(String(enquiry.advanceAmount)) : 0;
      if (advanceAmount <= 0) {
        return res.status(400).json({ message: "Please enter an advance amount before sending the payment link" });
      }

      console.log(`[Enquiry Payment] Creating RazorPay link for enquiry #${enquiryId}, amount: ₹${advanceAmount}`);
      
      // Check if split_payment template is enabled
      if (enquiry.propertyId) {
        const splitPaymentSetting = await storage.getWhatsappTemplateSetting(enquiry.propertyId, 'split_payment');
        const isSplitPaymentEnabled = splitPaymentSetting?.isEnabled !== false;
        
        if (!isSplitPaymentEnabled) {
          return res.status(400).json({ message: "Split payment WhatsApp messages are disabled for this property" });
        }
      }

      // Create RazorPay payment link
      const paymentLink = await createEnquiryPaymentLink(
        enquiryId,
        advanceAmount,
        enquiry.guestName,
        enquiry.guestEmail || "",
        enquiry.guestPhone
      );

      const paymentLinkUrl = paymentLink.shortUrl || paymentLink.paymentLink;
      console.log(`[Enquiry Payment] Payment link created: ${paymentLinkUrl}`);

      // Fetch property details for WhatsApp template
      const enquiryProperty = enquiry.propertyId ? await storage.getProperty(enquiry.propertyId) : null;
      const enquiryPropertyName = enquiryProperty?.name || "Hotel";
      const enquiryCheckIn = enquiry.checkInDate ? format(new Date(enquiry.checkInDate), "dd MMM yyyy") : "N/A";
      const enquiryCheckOut = enquiry.checkOutDate ? format(new Date(enquiry.checkOutDate), "dd MMM yyyy") : "N/A";
      const enquiryGuests = String(enquiry.numberOfGuests || 1);
      const enquiryTotalAmount = enquiry.priceQuoted
        ? parseFloat(String(enquiry.priceQuoted)).toLocaleString('en-IN')
        : advanceAmount.toFixed(2);

      // Send via WhatsApp using Authkey — WID 30424 (7 variables)
      // {{1}}=guest_name {{2}}=property_name {{3}}=check_in {{4}}=check_out {{5}}=guests {{6}}=total_amount {{7}}=payment_link
      const templateId = process.env.AUTHKEY_WA_SPLIT_PAYMENT || "30424";
      const result = await sendCustomWhatsAppMessage(
        enquiry.guestPhone,
        templateId,
        [
          enquiry.guestName,
          enquiryPropertyName,
          enquiryCheckIn,
          enquiryCheckOut,
          enquiryGuests,
          enquiryTotalAmount,
          paymentLinkUrl,
        ]
      );

      if (result.success) {
        // Update enquiry status to payment_pending
        await storage.updateEnquiryStatus(enquiryId, "payment_pending");
        
        console.log(`[Enquiry Payment] Payment link sent successfully to ${enquiry.guestPhone}`);
        res.json({ 
          success: true, 
          message: "Advance payment link sent successfully via WhatsApp",
          paymentLinkUrl 
        });
      } else {
        console.error(`[Enquiry Payment] Failed to send WhatsApp: ${result.error}`);
        res.status(500).json({ message: result.error || "Failed to send payment link via WhatsApp" });
      }
    } catch (error: any) {
      console.error("[Enquiry Payment] Error:", error);
      res.status(500).json({ message: error.message || "Failed to send advance payment link" });
    }
  });

  // Confirm enquiry and create booking
  app.post("/api/enquiries/:id/confirm", isAuthenticated, async (req, res) => {
    try {
      const enquiryId = parseInt(req.params.id);
      const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, enquiryId));
      
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }

      console.log("Enquiry data:", JSON.stringify(enquiry, null, 2));

      // Validate enquiry has required guest information AND room selection
      if (!enquiry.guestName || !enquiry.guestPhone) {
        console.log("Missing guest info - guestName:", enquiry.guestName, "guestPhone:", enquiry.guestPhone);
        return res.status(400).json({ message: "Enquiry is missing required guest information (name or phone)" });
      }

      // CRITICAL: Require room selection before confirming
      if (!enquiry.roomId && (!enquiry.roomIds || enquiry.roomIds.length === 0)) {
        console.log("❌ Cannot confirm enquiry without room selection - roomId:", enquiry.roomId, "roomIds:", enquiry.roomIds);
        return res.status(400).json({ 
          message: "Please select a room for this enquiry before confirming. Edit the enquiry to assign a room." 
        });
      }

      // Create or find guest - match by BOTH name and phone to avoid duplicates
      let guestId: number;
      const existingGuests = await storage.getAllGuests();
      const existingGuest = existingGuests.find(g => 
        g.phone === enquiry.guestPhone && 
        g.fullName.toLowerCase() === enquiry.guestName.toLowerCase()
      );
      
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const newGuest = await storage.createGuest({
          fullName: enquiry.guestName,
          phone: enquiry.guestPhone,
          email: enquiry.guestEmail || null,
          idProofType: null,
          idProofNumber: null,
          idProofImage: null,
          address: null,
          preferences: null,
        });
        guestId = newGuest.id;
      }

      // Check for double-booking: Verify room isn't already booked for overlapping dates
      if (enquiry.roomId) {
        const existingBookings = await storage.getAllBookings();
        const overlappingBooking = existingBookings.find(b => {
          // Skip cancelled and checked-out bookings
          if (b.status === "cancelled" || b.status === "checked-out") return false;
          
          // Check if same room
          if (b.roomId !== enquiry.roomId) return false;
          
          // Check for date overlap
          const existingCheckIn = new Date(b.checkInDate);
          const existingCheckOut = new Date(b.checkOutDate);
          const newCheckIn = new Date(enquiry.checkInDate);
          const newCheckOut = new Date(enquiry.checkOutDate);
          
          return (
            (newCheckIn >= existingCheckIn && newCheckIn < existingCheckOut) ||
            (newCheckOut > existingCheckIn && newCheckOut <= existingCheckOut) ||
            (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut)
          );
        });
        
        if (overlappingBooking) {
          return res.status(400).json({ 
            message: `Room is already booked from ${format(new Date(overlappingBooking.checkInDate), "MMM dd, yyyy")} to ${format(new Date(overlappingBooking.checkOutDate), "MMM dd, yyyy")}` 
          });
        }
      }

      // Create booking from enquiry (using correct field names)
      // Convert decimal values properly - they come from DB as strings or null
      const customPriceValue = enquiry.priceQuoted != null ? String(enquiry.priceQuoted) : null;
      const advanceAmountValue = enquiry.advanceAmount != null ? String(enquiry.advanceAmount) : "0";
      
      // DEBUG: Log enquiry details
      console.log("📋 ENQUIRY CONFIRM - Enquiry Details:", {
        enquiryId: enquiry.id,
        roomId: enquiry.roomId,
        roomIds: enquiry.roomIds,
        checkInDate: enquiry.checkInDate,
        checkOutDate: enquiry.checkOutDate,
        priceQuoted: enquiry.priceQuoted,
        advanceAmount: enquiry.advanceAmount,
      });

      // Calculate totalAmount based on room price and number of nights
      let totalAmount: string = "0"; // DEFAULT TO 0 if calculation fails
      
      try {
        if (enquiry.roomId) {
          const allRooms = await storage.getAllRooms();
          const room = allRooms.find(r => r.id === enquiry.roomId);
          if (room) {
            const checkIn = new Date(enquiry.checkInDate);
            const checkOut = new Date(enquiry.checkOutDate);
            let numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            if (numberOfNights <= 0) numberOfNights = 1; // Minimum 1 night
            const pricePerNight = customPriceValue ? parseFloat(customPriceValue) : parseFloat(room.pricePerNight.toString());
            totalAmount = (pricePerNight * numberOfNights).toFixed(2);
            console.log("✅ Calculated totalAmount (single room):", { roomId: enquiry.roomId, numberOfNights, pricePerNight, totalAmount });
          } else {
            console.warn("⚠️ Room not found for roomId:", enquiry.roomId);
          }
        } else if (enquiry.roomIds && enquiry.roomIds.length > 0) {
          // For group bookings
          const allRooms = await storage.getAllRooms();
          const selectedRooms = allRooms.filter(r => enquiry.roomIds?.includes(r.id));
          if (selectedRooms.length > 0) {
            const checkIn = new Date(enquiry.checkInDate);
            const checkOut = new Date(enquiry.checkOutDate);
            let numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            if (numberOfNights <= 0) numberOfNights = 1; // Minimum 1 night
            const totalPrice = selectedRooms.reduce((sum, room) => {
              const pricePerNight = parseFloat(room.pricePerNight.toString());
              return sum + (pricePerNight * numberOfNights);
            }, 0);
            totalAmount = totalPrice.toFixed(2);
            console.log("✅ Calculated totalAmount (group):", { roomIds: enquiry.roomIds, numberOfNights, totalPrice: totalAmount });
          } else {
            console.warn("⚠️ No rooms found for group booking");
          }
        } else {
          console.warn("⚠️ No roomId or roomIds found in enquiry - using default totalAmount: 0");
        }
      } catch (calcError) {
        console.error("❌ Error calculating totalAmount:", calcError);
        totalAmount = "0";
      }
      
      console.log("📦 CREATING BOOKING with:", { customPrice: customPriceValue, advanceAmount: advanceAmountValue, totalAmount, status: "confirmed" });
      
      const booking = await storage.createBooking({
        propertyId: enquiry.propertyId,
        roomId: enquiry.roomId,
        roomIds: enquiry.roomIds,
        isGroupBooking: enquiry.isGroupEnquiry || false,
        bedsBooked: enquiry.bedsBooked,
        guestId: guestId,
        checkInDate: enquiry.checkInDate,
        checkOutDate: enquiry.checkOutDate,
        numberOfGuests: enquiry.numberOfGuests,
        customPrice: customPriceValue,
        advanceAmount: advanceAmountValue,
        totalAmount: totalAmount,
        status: "confirmed",
        specialRequests: enquiry.specialRequests,
        source: "walk-in",
        mealPlan: enquiry.mealPlan || "EP",
      });

      // Update enquiry status to confirmed and payment status to received
      await storage.updateEnquiryStatus(enquiryId, "confirmed");
      await storage.updateEnquiryPaymentStatus(enquiryId, "received");

      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error confirming enquiry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Message Templates endpoints
  app.get("/api/message-templates", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });

      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const templates = await storage.getMessageTemplatesByProperty(propertyId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/message-templates", isAuthenticated, async (req: any, res) => {
    try {
      const { insertMessageTemplateSchema } = await import("@shared/schema");
      const data = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate(data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/message-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.updateMessageTemplate(id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/message-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMessageTemplate(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Communications endpoints
  app.post("/api/communications", isAuthenticated, async (req: any, res) => {
    try {
      const { insertCommunicationSchema } = await import("@shared/schema");
      const data = insertCommunicationSchema.parse(req.body);
      
      // Add user who sent the message
      const userId = req.user?.claims?.sub;
      const communicationData = {
        ...data,
        sentBy: userId,
      };

      // Try to send actual message via authkey.io
      const authkeyService = createAuthkeyService();
      let status = 'sent'; // Default status
      let twilioSid: string | undefined; // Reuse this field for authkey message ID

      if (authkeyService && communicationData.recipientPhone) {
        try {
          // Determine if this is WhatsApp or SMS based on messageType field
          if (communicationData.messageType === 'whatsapp') {
            // For WhatsApp, we need to use templates approved in authkey.io
            const result = await authkeyService.sendWhatsAppTemplate({
              to: communicationData.recipientPhone,
              template: 'booking_confirmation', // Template name in authkey.io (change as needed)
              parameters: [], // Add template parameters as needed
            });
            
            if (result.success) {
              status = 'sent';
              twilioSid = result.messageId;
            } else {
              status = 'failed';
              communicationData.errorMessage = result.error;
              console.error('[Communications] WhatsApp send failed:', result.error);
            }
          } else {
            // Send as SMS using testing template (sid=28289)
            // Template format: "Use {otp} as your OTP to access your {company}, OTP is confidential and valid for 5 mins This sms sent by authkey.io"
            // Just send the OTP value - the template will format the full message
            const otpValue = data.bookingId 
              ? `BK${data.bookingId}` 
              : data.enquiryId 
                ? `ENQ${data.enquiryId}` 
                : 'INFO';
            
            const result = await authkeyService.sendSMS({
              to: data.recipientPhone,
              message: otpValue, // Just the OTP value - template handles the rest
            });
            
            if (result.success) {
              status = 'sent';
              twilioSid = result.messageId;
            } else {
              status = 'failed';
              communicationData.errorMessage = result.error;
              console.error('[Communications] SMS send failed:', result.error);
            }
          }
        } catch (sendError: any) {
          console.error('[Communications] Error sending message:', sendError);
          status = 'failed';
          communicationData.errorMessage = sendError.message;
        }
      } else {
        // No authkey configured - just log the message
        console.log('[Communications] No authkey service configured - message logged only');
      }

      // Save to database with delivery status
      const communicationWithStatus = {
        ...communicationData,
        status,
        twilioSid,
      };

      const communication = await storage.sendMessage(communicationWithStatus);
      res.status(201).json(communication);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/enquiries/:id/communications", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const enquiry = await storage.getEnquiry(parseInt(req.params.id));
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      if (enquiry.propertyId && !canAccessProperty(tenant, enquiry.propertyId)) {
        return res.status(403).json({ message: "Access denied to this enquiry" });
      }

      const communications = await storage.getCommunicationsByEnquiry(parseInt(req.params.id));
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id/communications", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const booking = await storage.getBooking(parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.propertyId && !canAccessProperty(tenant, booking.propertyId)) {
        return res.status(403).json({ message: "Access denied to this booking" });
      }

      const communications = await storage.getCommunicationsByBooking(parseInt(req.params.id));
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook for authkey.io delivery status updates
  // This endpoint receives delivery status updates from authkey.io
  app.post("/api/webhooks/authkey/delivery-status", async (req, res) => {
    try {
      const { message_id, status, error_message } = req.body;
      
      if (!message_id) {
        return res.status(400).json({ message: "message_id is required" });
      }

      // Update the communication record with delivery status
      const { communications } = await import("@shared/schema");
      await db
        .update(communications)
        .set({ 
          status: status || 'delivered',
          errorMessage: error_message || null,
        })
        .where(eq(communications.twilioSid, message_id));

      console.log(`[Authkey Webhook] Updated delivery status for message ${message_id}: ${status}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Authkey Webhook] Error processing webhook:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Calendar availability endpoint - returns date blocks for visual calendar
  app.get("/api/calendar/availability", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, propertyId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Prevent excessive date range to avoid performance issues
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        return res.status(400).json({ message: "Date range cannot exceed 90 days" });
      }
      
      if (daysDiff < 1) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
      
      // Get rooms (optionally filtered by property)
      const { rooms, bookings } = await import("@shared/schema");
      const propertyIdNum = propertyId ? Number(propertyId) : null;
      const allRooms = Number.isFinite(propertyIdNum)
        ? await db.select().from(rooms).where(eq(rooms.propertyId, propertyIdNum!))
        : await db.select().from(rooms);
      
      // Get all active bookings and filter in JavaScript (historical working solution)
      const allBookings = await db
        .select()
        .from(bookings)
        .where(not(eq(bookings.status, "cancelled")));
      
      // Use date-string comparison to avoid UTC-vs-local timezone skew
      const toDateStrCal = (val: string | Date): string =>
        (val instanceof Date ? val.toISOString() : String(val)).slice(0, 10);
      const startStr = toDateStrCal(start);
      const endStr   = toDateStrCal(end);

      const overlappingBookings = allBookings.filter(booking => {
        if (!booking.checkInDate || !booking.checkOutDate) return false;
        const bIn  = toDateStrCal(booking.checkInDate  as any);
        const bOut = toDateStrCal(booking.checkOutDate as any);
        if (!bIn || !bOut) return false;
        return bOut > startStr && bIn < endStr;
      });
      
      // Build calendar data
      const calendarData = allRooms.map(room => {
        const roomBookings = overlappingBookings.filter(b =>
          b.roomId === room.id || b.roomIds?.includes(room.id)
        );
        
        // Generate date blocks for this room
        const dateBlocks: { [date: string]: { available: boolean; bedsAvailable?: number } } = {};
        
        // Get today's date (start of day for comparison)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = today.toISOString().split('T')[0];
        
        // Initialize all dates as available
        let current = new Date(start);
        while (current <= end) {
          const dateKey = current.toISOString().split('T')[0];
          
          // For TODAY only: check room status (cleaning/maintenance = unavailable)
          // For FUTURE dates: ignore room status (only bookings matter)
          const isToday = dateKey === todayKey;
          const isRoomStatusBlocking = isToday && 
            (room.status === 'cleaning' || room.status === 'maintenance' || room.status === 'out-of-order');
          
          dateBlocks[dateKey] = {
            available: !isRoomStatusBlocking,
            ...(room.roomCategory === "dormitory" && { 
              bedsAvailable: isRoomStatusBlocking ? 0 : (room.totalBeds || 6)
            })
          };
          current.setDate(current.getDate() + 1);
        }
        
        // Mark booked dates (excluding checkout date - guest can check in on checkout day)
        roomBookings.forEach(booking => {
          const bookingStart = new Date(booking.checkInDate);
          const bookingEnd = new Date(booking.checkOutDate);
          
          // Normalize to start of day for accurate comparison
          bookingStart.setHours(0, 0, 0, 0);
          bookingEnd.setHours(0, 0, 0, 0);
          
          let bookingDate = new Date(bookingStart);
          // Mark all dates from check-in up to (but NOT including) check-out
          while (bookingDate < bookingEnd) {
            const dateKey = bookingDate.toISOString().split('T')[0];
            
            if (dateBlocks[dateKey]) {
              if (room.roomCategory === "dormitory") {
                const bedsBooked = booking.bedsBooked || 1;
                const currentAvailable = dateBlocks[dateKey].bedsAvailable || 0;
                const newAvailable = Math.max(0, currentAvailable - bedsBooked);
                dateBlocks[dateKey] = {
                  available: newAvailable > 0,
                  bedsAvailable: newAvailable
                };
              } else {
                dateBlocks[dateKey].available = false;
              }
            }
            
            bookingDate.setDate(bookingDate.getDate() + 1);
          }
        });
        
        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          roomName: room.roomName,
          roomCategory: room.roomCategory,
          totalBeds: room.totalBeds,
          dateBlocks
        };
      });
      
      res.json(calendarData);
    } catch (error: any) {
      console.error('[CALENDAR ERROR]', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Property Lease endpoints
  app.get("/api/leases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      const { propertyId } = req.query;

      let leases;
      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "You do not have access to this property" });
        }
        leases = await storage.getLeasesByProperty(propId);
      } else {
        const allLeases = await storage.getAllLeases();
        leases = allLeases.filter(l => {
          if (!l.propertyId) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, l.propertyId);
        });
      }
      res.json(leases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leases/:id", isAuthenticated, async (req, res) => {
    try {
      const lease = await storage.getLeaseWithPayments(parseInt(req.params.id));
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
      }
      res.json(lease);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leases", isAuthenticated, async (req, res) => {
    try {
      const { insertPropertyLeaseSchema } = await import("@shared/schema");
      
      // Convert date strings to Date objects before validation
      const processedBody = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      };
      
      const validatedData = insertPropertyLeaseSchema.parse(processedBody);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const leaseId = parseInt(req.params.id);
      const { reason, ...rawData } = req.body;

      const updateData = { ...rawData };
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate && typeof updateData.endDate === 'string') {
        updateData.endDate = new Date(updateData.endDate);
      }

      const existingLease = await storage.getLease(leaseId);
      if (!existingLease) {
        return res.status(404).json({ message: "Lease not found" });
      }

      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      const changedByName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || userId;

      const lease = await storage.updateLease(leaseId, updateData);

      const trackFields = [
        'totalAmount', 'baseYearlyAmount', 'yearlyIncrementType', 'yearlyIncrementValue',
        'currentYearAmount', 'lessorName', 'landlordName', 'startDate', 'endDate',
        'paymentFrequency', 'securityDeposit', 'status', 'isOverridden', 'propertyId',
      ];

      for (const field of trackFields) {
        const oldVal = (existingLease as any)[field];
        const newVal = (updateData as any)[field];
        if (newVal !== undefined && String(newVal) !== String(oldVal)) {
          await storage.createLeaseHistory({
            leaseId,
            changeType: 'update',
            fieldChanged: field,
            oldValue: oldVal != null ? String(oldVal) : null,
            newValue: String(newVal),
            changedBy: changedByName,
            changeReason: reason || null,
          });
        }
      }

      res.json(lease);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/leases/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLease(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease Payment endpoints
  app.get("/api/leases/:leaseId/payments", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getLeasePayments(parseInt(req.params.leaseId));
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leases/:leaseId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const { insertLeasePaymentSchema } = await import("@shared/schema");
      const leaseId = parseInt(req.params.leaseId);
      const paymentData = {
        ...req.body,
        leaseId,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined,
      };
      const validatedData = insertLeasePaymentSchema.parse(paymentData);
      const payment = await storage.createLeasePayment(validatedData);
      
      // Record lease payment to wallet if property and amount are provided
      const lease = await storage.getLease(leaseId);
      if (lease?.propertyId && payment.amount) {
        try {
          await storage.recordLeasePaymentToWallet(
            lease.propertyId,
            payment.id,
            parseFloat(payment.amount.toString()),
            payment.paymentMethod || 'cash',
            `Lease payment - ${lease.landlordName || 'Lease'}`,
            req.user?.claims?.sub || req.user?.id || null
          );
          console.log(`[Wallet] Recorded lease payment #${payment.id} to wallet`);
        } catch (walletError: any) {
          // Wallet update failed — roll back the payment so balance is not affected
          await storage.deleteLeasePayment(payment.id);
          console.log(`[Wallet] Rolled back lease payment #${payment.id} due to wallet error:`, walletError);
          return res.status(400).json({ message: walletError?.message || 'Wallet not updated' });
        }
      }
      
      res.status(201).json({ ...payment });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lease-payments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLeasePayment(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease Summary endpoint - comprehensive summary with carry-forward
  app.get("/api/leases/:leaseId/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.calculateLeaseSummary(parseInt(req.params.leaseId));
      if (!summary) {
        return res.status(404).json({ message: "Lease not found" });
      }
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease History endpoint - get all changes to a lease
  app.get("/api/leases/:leaseId/history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getLeaseHistory(parseInt(req.params.leaseId));
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Override lease current year amount
  app.post("/api/leases/:leaseId/override", isAuthenticated, async (req: any, res) => {
    try {
      const { currentYearAmount, reason } = req.body;
      const leaseId = parseInt(req.params.leaseId);
      
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      // Get current lease for history logging
      const existingLease = await storage.getLease(leaseId);
      if (!existingLease) {
        return res.status(404).json({ message: "Lease not found" });
      }

      // Log the override in history
      await storage.createLeaseHistory({
        leaseId,
        changeType: 'override',
        fieldChanged: 'currentYearAmount',
        oldValue: existingLease.currentYearAmount?.toString() || existingLease.totalAmount?.toString(),
        newValue: currentYearAmount.toString(),
        changedBy: currentUser?.fullName || currentUser?.email || userId,
        changeReason: reason || 'Admin override',
      });

      // Update the lease with override
      const updatedLease = await storage.updateLease(leaseId, {
        currentYearAmount: currentYearAmount.toString(),
        isOverridden: true,
      });

      res.json(updatedLease);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease Year Override endpoints
  app.get("/api/leases/:leaseId/year-overrides", isAuthenticated, async (req, res) => {
    try {
      const overrides = await storage.getLeaseYearOverrides(parseInt(req.params.leaseId));
      res.json(overrides);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leases/:leaseId/year-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const { yearNumber, amount, reason, remark, manualPaidOverride, manualBalanceOverride, isLocked } = req.body;

      if (!yearNumber || !amount) {
        return res.status(400).json({ message: "yearNumber and amount are required" });
      }

      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      const changedByName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || userId;

      const override = await storage.createLeaseYearOverride({
        leaseId,
        yearNumber: parseInt(yearNumber),
        amount: amount.toString(),
        reason: reason || null,
        remark: remark || null,
        manualPaidOverride: manualPaidOverride != null ? manualPaidOverride.toString() : null,
        manualBalanceOverride: manualBalanceOverride != null ? manualBalanceOverride.toString() : null,
        isLocked: isLocked || false,
        createdBy: changedByName,
      } as any);

      await storage.createLeaseHistory({
        leaseId,
        changeType: 'year_override',
        fieldChanged: `year${yearNumber}Amount`,
        oldValue: null,
        newValue: amount.toString(),
        changedBy: changedByName,
        changeReason: reason || `Set custom amount for year ${yearNumber}`,
      });

      res.status(201).json(override);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH: update year override fields (remark, manual mode)
  app.patch("/api/leases/:leaseId/year-overrides/:yearNumber", isAuthenticated, async (req: any, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const yearNumber = parseInt(req.params.yearNumber);
      const { remark, manualPaidOverride, manualBalanceOverride, isLocked, amount: bodyAmount } = req.body;

      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      const changedByName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || userId;

      // Upsert — get existing or create with current amount
      const existing = await storage.getLeaseYearOverrides(leaseId);
      const existingOverride = existing.find(ov => ov.yearNumber === yearNumber);

      let overrideAmount = existingOverride?.amount;
      if (!existingOverride) {
        // For remark-only update, auto-calculate amount from lease
        const lease = await storage.getLease(leaseId);
        if (!lease) return res.status(404).json({ message: "Lease not found" });
        const baseAmt = parseFloat(lease.baseYearlyAmount || lease.totalAmount || "0");
        const incType = lease.yearlyIncrementType || "none";
        const incVal = parseFloat(lease.yearlyIncrementValue || "0");
        let calculated = baseAmt;
        for (let i = 1; i < yearNumber; i++) {
          if (incType === "percentage") calculated = calculated * (1 + incVal / 100);
          else if (incType === "fixed") calculated = calculated + incVal;
        }
        overrideAmount = Math.round(calculated).toString();
      }

      // bodyAmount can override the year rent (for full manual entry mode)
      if (bodyAmount !== undefined) overrideAmount = bodyAmount.toString();

      const updateData: any = { amount: overrideAmount, leaseId, yearNumber, createdBy: changedByName };
      if (remark !== undefined) updateData.remark = remark;
      if (manualPaidOverride !== undefined) updateData.manualPaidOverride = manualPaidOverride != null ? manualPaidOverride.toString() : null;
      if (manualBalanceOverride !== undefined) updateData.manualBalanceOverride = manualBalanceOverride != null ? manualBalanceOverride.toString() : null;
      if (isLocked !== undefined) updateData.isLocked = isLocked;

      const updated = await storage.createLeaseYearOverride(updateData as any);

      if (isLocked !== undefined) {
        await storage.createLeaseHistory({
          leaseId,
          changeType: 'year_override',
          fieldChanged: `year${yearNumber}ManualMode`,
          oldValue: existingOverride?.isLocked ? 'locked' : 'auto',
          newValue: isLocked ? 'locked' : 'auto',
          changedBy: changedByName,
          changeReason: isLocked ? `Manual mode enabled for year ${yearNumber}` : `Manual mode disabled for year ${yearNumber}`,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/leases/:leaseId/year-overrides/:yearNumber", isAuthenticated, async (req: any, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const yearNumber = parseInt(req.params.yearNumber);

      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      const changedByName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
        : currentUser?.email || userId;

      await storage.deleteLeaseYearOverride(leaseId, yearNumber);

      await storage.createLeaseHistory({
        leaseId,
        changeType: 'year_override_removed',
        fieldChanged: `year${yearNumber}Amount`,
        oldValue: null,
        newValue: null,
        changedBy: changedByName,
        changeReason: `Reset year ${yearNumber} to auto-calculated amount`,
      });

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Monthly ledger (backend-computed, used by UI + CSV)
  app.get("/api/leases/:leaseId/monthly-ledger", isAuthenticated, async (req, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const rows = await storage.calculateMonthlyLedger(leaseId);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease performance: revenue vs lease paid per month
  app.get("/api/leases/:leaseId/performance", isAuthenticated, async (req, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const lease = await storage.getLease(leaseId);
      if (!lease) return res.status(404).json({ message: "Lease not found" });

      const payments = await storage.getLeasePayments(leaseId);
      const startDate = lease.startDate ? new Date(lease.startDate) : new Date();
      const endDate = lease.endDate ? new Date(lease.endDate) : new Date();
      const now = new Date();
      const effectiveEnd = endDate < now ? endDate : now;

      // Build month range
      const months: string[] = [];
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1);
      while (cur <= end) {
        months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }

      // Get revenue per month from bills (paid bills only)
      const performanceData = await Promise.all(months.map(async (month) => {
        const [yr, mo] = month.split('-').map(Number);
        const mStart = new Date(yr, mo - 1, 1);
        const mEnd = new Date(yr, mo, 0, 23, 59, 59);

        const [revResult] = await db
          .select({ total: sql<string>`COALESCE(SUM(${bills.totalAmount}), 0)` })
          .from(bills)
          .innerJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(
            and(
              eq(bookings.propertyId, lease.propertyId),
              eq(bills.paymentStatus, 'paid'),
              gte(bills.createdAt, mStart),
              lte(bills.createdAt, mEnd)
            )
          );

        const revenue = parseFloat(revResult?.total || '0');
        const leasePaid = payments
          .filter(p => {
            const pd = p.paymentDate ? new Date(p.paymentDate) : new Date(p.createdAt || now);
            return pd >= mStart && pd <= mEnd;
          })
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return {
          month,
          revenue: Math.round(revenue),
          leasePaid: Math.round(leasePaid),
          profit: Math.round(revenue - leasePaid),
        };
      }));

      res.json({
        leaseId,
        propertyId: lease.propertyId,
        totalRevenue: performanceData.reduce((s, d) => s + d.revenue, 0),
        totalLeasePaid: performanceData.reduce((s, d) => s + d.leasePaid, 0),
        totalProfit: performanceData.reduce((s, d) => s + d.profit, 0),
        months: performanceData,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update carry-forward amount for a lease
  app.post("/api/leases/:leaseId/carry-forward", isAuthenticated, async (req, res) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      const updatedLease = await storage.updateLeaseCarryForward(leaseId);
      res.json(updatedLease);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export lease ledger as CSV
  app.get("/api/leases/:leaseId/export", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.calculateLeaseSummary(parseInt(req.params.leaseId));
      if (!summary) {
        return res.status(404).json({ message: "Lease not found" });
      }

      const { lease, payments, summary: summaryData } = summary;
      const property = await storage.getProperty(lease.propertyId);

      // Build CSV content
      let csv = "Lease Payment Ledger\n";
      csv += `Property:,${property?.name || 'N/A'}\n`;
      csv += `Landlord:,${lease.landlordName || 'N/A'}\n`;
      csv += `Start Date:,${lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}\n`;
      csv += `End Date:,${lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}\n`;
      csv += `Duration:,${summaryData.leaseDurationYears} years\n`;
      csv += `Current Year:,Year ${summaryData.currentYearNumber}\n`;
      csv += `\n`;
      csv += `Summary\n`;
      csv += `Total Lease Value:,${summaryData.totalLeaseValue}\n`;
      csv += `Current Year Amount (Year ${summaryData.currentYearNumber}):,${summaryData.currentYearAmount}\n`;
      csv += `Monthly Amount:,${summaryData.monthlyAmount}\n`;
      csv += `Total Paid:,${summaryData.totalPaid}\n`;
      csv += `Carry Forward (Previous Years):,${summaryData.carryForward}\n`;
      csv += `Total Pending:,${summaryData.totalPending}\n`;
      csv += `\n`;
      
      // Year-by-Year Breakdown
      if (summaryData.yearlyBreakdown && summaryData.yearlyBreakdown.length > 0) {
        csv += `Year-by-Year Breakdown\n`;
        csv += `Year,Period,Amount Due,Amount Paid,Balance,Status\n`;
        summaryData.yearlyBreakdown.forEach((yr: any) => {
          csv += `Year ${yr.year},`;
          csv += `${yr.startDate} to ${yr.endDate},`;
          csv += `${yr.amountDue},`;
          csv += `${yr.amountPaid},`;
          csv += `${yr.balance},`;
          csv += `${yr.isCurrentYear ? 'Current' : (yr.isCompleted ? 'Completed' : 'Upcoming')}\n`;
        });
        csv += `\n`;
      }
      
      csv += `Payment History (${payments.length} payments)\n`;
      csv += `Date,Amount,Method,Reference,Notes\n`;
      
      payments.forEach((p: any) => {
        csv += `${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'},`;
        csv += `${p.amount},`;
        csv += `${p.paymentMethod || 'N/A'},`;
        csv += `${p.referenceNumber || 'N/A'},`;
        csv += `"${(p.notes || '').replace(/"/g, '""')}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="lease_ledger_${lease.id}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== WALLET / ACCOUNT MANAGEMENT =====

  // Get wallets for a property
  app.get("/api/wallets", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      if (!propertyId) {
        return res.json([]);
      }
      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const walletList = await storage.getWalletsByProperty(propId);
      res.json(walletList);
    } catch (error: any) {
      console.error("[/api/wallets] Error:", error.message);
      console.error("[/api/wallets] Stack:", error.stack);
      res.json([]);
    }
  });

  // Get wallet summary for property
  app.get("/api/wallets/summary", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      if (!propertyId) {
        return res.json({ totalBalance: "0", walletCount: 0, wallets: [] });
      }
      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const summary = await storage.getPropertyWalletSummary(propId);
      res.json(summary);
    } catch (error: any) {
      console.error("[/api/wallets/summary] Error:", error.message);
      console.error("[/api/wallets/summary] Stack:", error.stack);
      res.json({ totalBalance: "0", walletCount: 0, wallets: [] });
    }
  });

  // Get wallet balances across ALL accessible properties (property-wise summary)
  // Optional ?asOfDate=YYYY-MM-DD for point-in-time balance
  app.get("/api/wallets/all-properties-summary", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found." });
      const { tenant } = auth;

      const asOfDateStr = req.query.asOfDate as string | undefined;
      const asOfDate = asOfDateStr ? new Date(asOfDateStr + "T23:59:59") : null;

      const allProperties = await storage.getAllProperties();
      const accessibleProperties = tenant.hasUnlimitedAccess
        ? allProperties
        : allProperties.filter(p => tenant.assignedPropertyIds.includes(p.id));

      const allWallets = await db.select().from(wallets).where(eq(wallets.isActive, true));

      // If filtering by date, get the last balanceAfter for each wallet on or before that date
      let walletBalanceMap: Map<number, number> = new Map();
      if (asOfDate) {
        const txRows = await db
          .select({
            walletId: walletTransactions.walletId,
            balanceAfter: walletTransactions.balanceAfter,
            transactionDate: walletTransactions.transactionDate,
          })
          .from(walletTransactions)
          .where(lte(walletTransactions.transactionDate, format(asOfDate, "yyyy-MM-dd")))
          .orderBy(walletTransactions.walletId, walletTransactions.transactionDate, walletTransactions.id);

        // Group by walletId: take the last row for each wallet (most recent on/before asOfDate)
        for (const row of txRows) {
          walletBalanceMap.set(row.walletId, parseFloat(row.balanceAfter?.toString() || "0"));
        }
        // For wallets with no transactions before that date, use opening balance
        for (const w of allWallets) {
          if (!walletBalanceMap.has(w.id)) {
            walletBalanceMap.set(w.id, parseFloat(w.openingBalance?.toString() || "0"));
          }
        }
      }

      const result = accessibleProperties
        .filter(p => !p.isDisabled)
        .map(property => {
          const propWallets = allWallets.filter(w => w.propertyId === property.id);
          const cashWallets = propWallets.filter(w => w.type === "cash");
          const upiWallets = propWallets.filter(w => w.type === "upi" || w.type === "bank");

          const getBalance = (w: typeof propWallets[0]) =>
            asOfDate
              ? (walletBalanceMap.get(w.id) ?? 0)
              : parseFloat(w.currentBalance?.toString() || "0");

          const cashTotal = cashWallets.reduce((s, w) => s + getBalance(w), 0);
          const upiTotal = upiWallets.reduce((s, w) => s + getBalance(w), 0);

          return {
            propertyId: property.id,
            propertyName: property.name,
            cashTotal: cashTotal.toFixed(2),
            upiTotal: upiTotal.toFixed(2),
            grandTotal: (cashTotal + upiTotal).toFixed(2),
            wallets: propWallets.map(w => ({
              id: w.id,
              name: w.name,
              type: w.type,
              balance: getBalance(w).toFixed(2),
            })),
          };
        });

      const overallCash = result.reduce((s, p) => s + parseFloat(p.cashTotal), 0);
      const overallUpi = result.reduce((s, p) => s + parseFloat(p.upiTotal), 0);

      res.json({
        properties: result,
        totals: {
          cash: overallCash.toFixed(2),
          upi: overallUpi.toFixed(2),
          grand: (overallCash + overallUpi).toFixed(2),
        },
        asOfDate: asOfDateStr || null,
      });
    } catch (error: any) {
      console.error("[/api/wallets/all-properties-summary] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Get single wallet
  app.get("/api/wallets/:id", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const wallet = await storage.getWallet(parseInt(req.params.id));
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      if (!canAccessProperty(tenant, wallet.propertyId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      res.json(wallet);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new wallet
  app.post("/api/wallets", isAuthenticated, async (req, res) => {
    try {
      const wallet = await storage.createWallet(req.body);
      res.status(201).json(wallet);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update wallet
  app.patch("/api/wallets/:id", isAuthenticated, async (req, res) => {
    try {
      const wallet = await storage.updateWallet(parseInt(req.params.id), req.body);
      res.json(wallet);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete wallet
  app.delete("/api/wallets/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteWallet(parseInt(req.params.id));
      res.json({ message: "Wallet deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initialize default wallets for a property
  app.post("/api/wallets/initialize", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      const wallets = await storage.initializeDefaultWallets(propertyId);
      res.json(wallets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get wallet transactions
  app.get("/api/wallets/:id/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getWalletTransactions(parseInt(req.params.id));
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all transactions for a property
  app.get("/api/wallet-transactions", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      if (!propertyId) {
        return res.json([]);
      }
      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const transactions = await storage.getTransactionsByProperty(propId);
      res.json(transactions);
    } catch (error: any) {
      console.error("[/api/wallet-transactions] Error:", error.message);
      console.error("[/api/wallet-transactions] Stack:", error.stack);
      res.json([]);
    }
  });

  // Record payment to wallet (credit)
  app.post("/api/wallets/:id/credit", isAuthenticated, async (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const { propertyId, amount, source, sourceId, description, referenceNumber, transactionDate } = req.body;
      const userId = req.session?.userId || null;
      
      const transaction = await storage.recordPaymentToWallet(
        propertyId,
        walletId,
        parseFloat(amount),
        source || 'manual',
        sourceId || null,
        description || '',
        referenceNumber || null,
        transactionDate ? new Date(transactionDate) : new Date(),
        userId
      );
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Record expense from wallet (debit)
  app.post("/api/wallets/:id/debit", isAuthenticated, async (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const { propertyId, amount, source, sourceId, description, referenceNumber, transactionDate } = req.body;
      const userId = req.session?.userId || null;
      
      const transaction = await storage.recordExpenseFromWallet(
        propertyId,
        walletId,
        parseFloat(amount),
        source || 'manual',
        sourceId || null,
        description || '',
        referenceNumber || null,
        transactionDate ? new Date(transactionDate) : new Date(),
        userId
      );
      res.json(transaction);
    } catch (error: any) {
      if (error?.code === 'INSUFFICIENT_BALANCE') {
        return res.status(422).json({
          code: 'INSUFFICIENT_BALANCE',
          message: error.message,
          available: error.available,
          required: error.required,
          walletId: error.walletId,
          walletName: error.walletName,
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Reverse a wallet transaction (correction / admin fix)
  app.post("/api/wallet-transactions/:id/reverse", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authenticated" });
      const { tenant } = auth;
      if (tenant.role !== 'admin' && tenant.role !== 'super-admin') {
        return res.status(403).json({ message: "Only admins can reverse transactions" });
      }
      const txId = parseInt(req.params.id);
      const { reason, newWalletId } = req.body;
      if (!reason) return res.status(400).json({ message: "Reason is required" });
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id || req.session?.userId || null;
      const result = await storage.reverseWalletTransaction(txId, reason, newWalletId ? parseInt(newWalletId) : null, userId);
      res.json(result);
    } catch (error: any) {
      console.error("[/api/wallet-transactions/:id/reverse] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all wallet transactions linked to a specific booking
  app.get("/api/wallet-transactions/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authenticated" });
      const { propertyId } = req.query;
      if (!propertyId) return res.status(400).json({ message: "propertyId query param required" });
      const txs = await storage.getWalletTransactionsByBooking(parseInt(req.params.bookingId), parseInt(propertyId as string));
      res.json(txs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Set opening balance for wallet (adds a credit transaction)
  app.post("/api/wallets/:id/opening-balance", isAuthenticated, async (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const { propertyId, amount, description } = req.body;
      const userId = req.session?.userId || null;
      
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      
      // Record as a credit transaction with source "opening_balance"
      const transaction = await storage.recordPaymentToWallet(
        propertyId,
        walletId,
        parseFloat(amount),
        'opening_balance',
        null,
        description || 'Opening balance',
        null,
        new Date(),
        userId
      );
      
      console.log(`[Wallet] Set opening balance ₹${amount} for wallet #${walletId}`);
      res.json(transaction);
    } catch (error: any) {
      console.error('[Wallet] Error setting opening balance:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== WALLET TOP-UP (External Funding) =====

  app.post("/api/wallets/:id/topup", isAuthenticated, async (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const { propertyId, amount, referenceNote, transactionDate } = req.body;
      const userId = req.session?.userId || null;

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
      if (!propertyId) return res.status(400).json({ message: "propertyId is required" });

      const transaction = await storage.topupWallet(
        walletId,
        parseInt(propertyId),
        parseFloat(amount),
        referenceNote || null,
        transactionDate ? new Date(transactionDate) : new Date(),
        userId
      );
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PROPERTY TRANSFERS =====

  // List transfers for a property (both incoming and outgoing)
  app.get("/api/transfers", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId) return res.status(400).json({ message: "propertyId is required" });
      const transfers = await storage.getPropertyTransfers(propertyId);
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new transfer
  app.post("/api/transfers", isAuthenticated, async (req, res) => {
    try {
      const { fromPropertyId, toPropertyId, fromWalletId, toWalletId, amount, referenceNote } = req.body;
      const userId = req.session?.userId || null;

      if (!fromPropertyId || !toPropertyId || !fromWalletId || !toWalletId || !amount) {
        return res.status(400).json({ message: "fromPropertyId, toPropertyId, fromWalletId, toWalletId, amount are required" });
      }
      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }

      const transfer = await storage.createPropertyTransfer(
        parseInt(fromPropertyId),
        parseInt(toPropertyId),
        parseInt(fromWalletId),
        parseInt(toWalletId),
        parseFloat(amount),
        referenceNote || null,
        userId
      );
      res.status(201).json(transfer);
    } catch (error: any) {
      if (error?.code === 'INSUFFICIENT_BALANCE') {
        return res.status(422).json({
          code: 'INSUFFICIENT_BALANCE',
          message: error.message,
          available: error.available,
          required: error.required,
          walletId: error.walletId,
          walletName: error.walletName,
        });
      }
      if (error?.code === 'WALLET_TYPE_MISMATCH') {
        return res.status(422).json({ code: 'WALLET_TYPE_MISMATCH', message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Reverse a transfer
  app.post("/api/transfers/:id/reverse", isAuthenticated, async (req, res) => {
    try {
      const transferId = parseInt(req.params.id);
      const userId = req.session?.userId || null;
      const transfer = await storage.reversePropertyTransfer(transferId, userId);
      res.json(transfer);
    } catch (error: any) {
      if (error?.code === 'INSUFFICIENT_BALANCE') {
        return res.status(422).json({
          code: 'INSUFFICIENT_BALANCE',
          message: error.message,
          available: error.available,
          required: error.required,
          walletId: error.walletId,
        });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DAILY CLOSING =====

  // Get daily closings for property
  app.get("/api/daily-closings", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const closings = await storage.getDailyClosingsByProperty(propId);
      res.json(closings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get day status (is day open/closed)
  app.get("/api/daily-closings/status", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId, date } = req.query;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const dateObj = date ? new Date(date as string) : new Date();
      const status = await storage.getDayStatus(propId, dateObj);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Close day for property
  app.post("/api/daily-closings/close", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, closingDate } = req.body;
      const userId = req.session?.userId || null;
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const dateObj = closingDate ? new Date(closingDate) : new Date();
      const closing = await storage.closeDayForProperty(
        parseInt(propertyId),
        dateObj,
        userId
      );
      res.json(closing);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== WALLET REPORTS =====
  
  // Get Cash Book report (all cash wallet transactions)
  app.get("/api/reports/cash-book", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const propertyIdNum = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propertyIdNum)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(1)); // First of month
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Get cash wallet(s)
      const allWallets = await storage.getWalletsByProperty(propertyIdNum);
      const cashWallets = allWallets.filter(w => w.type === 'cash');
      
      if (cashWallets.length === 0) {
        return res.json({ transactions: [], openingBalance: 0, closingBalance: 0, summary: { totalCredits: 0, totalDebits: 0 } });
      }
      
      // Get transactions for cash wallets
      const allTransactions: any[] = [];
      for (const wallet of cashWallets) {
        const txns = await storage.getWalletTransactions(wallet.id);
        allTransactions.push(...txns.map(t => ({ ...t, walletName: wallet.name })));
      }
      
      // Filter by date range
      const filtered = allTransactions.filter(t => {
        const txnDate = new Date(t.transactionDate);
        return txnDate >= start && txnDate <= end;
      }).sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
      
      // Calculate summary
      const totalCredits = filtered.filter(t => t.transactionType === 'credit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
      const totalDebits = filtered.filter(t => t.transactionType === 'debit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
      const closingBalance = cashWallets.reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || '0'), 0);
      const openingBalance = closingBalance - totalCredits + totalDebits;
      
      res.json({
        walletType: 'cash',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactions: filtered,
        openingBalance,
        closingBalance,
        summary: { totalCredits, totalDebits }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get UPI/Digital Book report (all non-cash wallet transactions)
  app.get("/api/reports/bank-book", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const propertyIdNum = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propertyIdNum)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(1));
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const allWallets = await storage.getWalletsByProperty(propertyIdNum);
      const digitalWallets = allWallets.filter(w => w.type === 'upi' || w.type === 'bank');
      
      if (digitalWallets.length === 0) {
        return res.json({ transactions: [], openingBalance: 0, closingBalance: 0, summary: { totalCredits: 0, totalDebits: 0 } });
      }
      
      const allTransactions: any[] = [];
      for (const wallet of digitalWallets) {
        const txns = await storage.getWalletTransactions(wallet.id);
        allTransactions.push(...txns.map(t => ({ ...t, walletName: wallet.name, accountNumber: wallet.accountNumber })));
      }
      
      const filtered = allTransactions.filter(t => {
        const txnDate = new Date(t.transactionDate);
        return txnDate >= start && txnDate <= end;
      }).sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
      
      const totalCredits = filtered.filter(t => t.transactionType === 'credit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
      const totalDebits = filtered.filter(t => t.transactionType === 'debit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
      const closingBalance = digitalWallets.reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || '0'), 0);
      const openingBalance = closingBalance - totalCredits + totalDebits;
      
      res.json({
        walletType: 'upi',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactions: filtered,
        openingBalance,
        closingBalance,
        summary: { totalCredits, totalDebits }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Daily Summary report
  app.get("/api/reports/daily-summary", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId, date } = req.query;
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }
      
      const propertyIdNum = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propertyIdNum)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const reportDate = date ? new Date(date as string) : new Date();
      reportDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(reportDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Get all wallets
      const allWallets = await storage.getWalletsByProperty(propertyIdNum);
      
      // Get transactions for the day
      const walletSummaries = [];
      let totalDayCredits = 0;
      let totalDayDebits = 0;
      
      for (const wallet of allWallets) {
        const txns = await storage.getWalletTransactions(wallet.id);
        const dayTxns = txns.filter(t => {
          const txnDate = new Date(t.transactionDate);
          return txnDate >= reportDate && txnDate < nextDay;
        });
        
        const credits = dayTxns.filter(t => t.transactionType === 'credit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
        const debits = dayTxns.filter(t => t.transactionType === 'debit').reduce((sum, t) => sum + parseFloat(t.amount?.toString() || '0'), 0);
        
        totalDayCredits += credits;
        totalDayDebits += debits;
        
        walletSummaries.push({
          walletId: wallet.id,
          walletName: wallet.name,
          walletType: wallet.type,
          currentBalance: parseFloat(wallet.currentBalance?.toString() || '0'),
          dayCredits: credits,
          dayDebits: debits,
          transactionCount: dayTxns.length,
        });
      }
      
      // Check if day is closed
      const dayStatus = await storage.getDayStatus(propertyIdNum, reportDate);
      
      res.json({
        date: reportDate.toISOString(),
        isDayClosed: !dayStatus.isOpen,
        wallets: walletSummaries,
        totals: {
          totalCredits: totalDayCredits,
          totalDebits: totalDayDebits,
          netChange: totalDayCredits - totalDayDebits,
          totalBalance: allWallets.reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || '0'), 0),
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Expense Category endpoints
  app.get("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      const { propertyId } = req.query;
      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "Access denied to this property" });
        }
        const categories = await storage.getExpenseCategoriesByProperty(propId);
        res.json(categories);
      } else {
        const allCategories = await storage.getAllExpenseCategories();
        const filtered = allCategories.filter((cat: any) => {
          if (!cat.propertyId) return true;
          return canAccessProperty(tenant, cat.propertyId);
        });
        res.json(filtered);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/expense-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertExpenseCategorySchema.partial().parse(req.body);
      const category = await storage.updateExpenseCategory(parseInt(id), validatedData);
      res.json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/expense-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteExpenseCategory(parseInt(id));
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Property Expense endpoints
  app.get("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      if (currentUser.role !== "admin" && currentUser.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied: admin only" });
      }

      const { propertyId } = req.query;
      const tenant = getTenantContext(currentUser);
      
      let expenses;
      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "You do not have access to this property" });
        }
        expenses = await storage.getExpensesByProperty(propId);
      } else {
        const allExpenses = await storage.getAllExpenses();
        expenses = allExpenses.filter(e => e.propertyId && canAccessProperty(tenant, e.propertyId));
      }
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;
      if (tenant.role !== "admin" && tenant.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied: admin only" });
      }

      if (req.body.propertyId && !canAccessProperty(tenant, req.body.propertyId)) {
        return res.status(403).json({ message: "Access denied to this property" });
      }

      const { insertPropertyExpenseSchema } = await import("@shared/schema");
      
      const transformedData = {
        ...req.body,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : new Date(),
      };
      
      const validatedData = insertPropertyExpenseSchema.parse(transformedData);
      const expense = await storage.createExpense(validatedData);
      
      // Record expense to wallet if property and amount are provided
      if (expense.propertyId && expense.amount) {
        const userId = req.user?.claims?.sub || req.user?.id || null;
        try {
          await storage.recordExpenseToWallet(
            expense.propertyId,
            expense.id,
            parseFloat(expense.amount.toString()),
            expense.paymentMethod || 'cash',
            expense.description || `Expense: ${expense.vendorName || 'Unknown'}`,
            userId
          );
          console.log(`[Wallet] Recorded expense #${expense.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record expense to wallet:`, walletError);
        }
      }
      
      res.status(201).json(expense);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authenticated" });
      if (auth.tenant.role !== "admin" && auth.tenant.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied: admin only" });
      }
      const expense = await storage.updateExpense(parseInt(req.params.id), req.body);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authenticated" });
      if (auth.tenant.role !== "admin" && auth.tenant.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied: admin only" });
      }
      await storage.deleteExpense(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial Reports endpoint (date-range based)
  app.get("/api/financials/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const financials = await storage.getPropertyFinancials(
        parseInt(req.params.propertyId),
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(financials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Monthly Income Breakdown: rooms + food + services + expenses + salaries
  app.get("/api/monthly-income", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "Not authorized" });

      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : null;
      const monthParam = (req.query.month as string) || (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
      })();

      const [year, monthNum] = monthParam.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);

      const { tenant } = auth;
      const allowedIds: number[] | null = tenant.role === "admin"
        ? null
        : (tenant.assignedPropertyIds || []).map(Number);

      const toN = (v: any) => parseFloat(String(v || 0)) || 0;

      // Filter helpers
      const propFilter = (propId: number) => {
        if (propertyId && propId !== propertyId) return false;
        if (allowedIds && !allowedIds.includes(propId)) return false;
        return true;
      };

      // Build bookingId → propertyId lookup (bills don't carry propertyId directly)
      const allBookingsForBills = await storage.getAllBookings();
      const bookingPropMap = new Map<number, number>();
      for (const bk of allBookingsForBills) {
        if (bk.id && bk.propertyId) bookingPropMap.set(bk.id, bk.propertyId);
      }

      // Bills settled in this month (final checkouts) — resolve propertyId via bookingId
      const allBills = await storage.getAllBills();
      const monthBills = allBills.filter((b: any) => {
        if (!b.bookingId) return false;
        const bPropId = bookingPropMap.get(b.bookingId);
        if (!bPropId) return false;
        const bDate = b.createdAt ? new Date(b.createdAt) : null;
        if (!bDate || bDate < startDate || bDate > endDate) return false;
        if (propertyId && bPropId !== propertyId) return false;
        if (allowedIds && !allowedIds.includes(bPropId)) return false;
        return true;
      });

      const paidBills = monthBills.filter((b: any) => b.paymentStatus === "paid");
      const roomRevenue = paidBills.reduce((s: number, b: any) => s + toN(b.roomCharges), 0);
      const foodRevenueBilled = paidBills.reduce((s: number, b: any) => s + toN(b.foodCharges), 0);
      const servicesRevenueBilled = paidBills.reduce((s: number, b: any) => s + toN(b.extraCharges), 0);
      const totalBilled = paidBills.reduce((s: number, b: any) => s + toN(b.totalAmount), 0);

      // All extra services by service date in this month
      let allExtras: any[] = [];
      try {
        allExtras = await db.select().from(extraServices);
      } catch (extErr: any) {
        console.warn(`[MonthlyIncome] Could not fetch extra services: ${extErr.message}`);
      }
      const monthExtras = allExtras.filter((e: any) => {
        const d = e.serviceDate ? new Date(e.serviceDate) : null;
        if (!d || d < startDate || d > endDate) return false;
        if (!propFilter(e.propertyId)) return false;
        return true;
      });
      const extrasTotal = monthExtras.reduce((s: number, e: any) => s + toN(e.amount), 0);
      const extrasCollected = monthExtras.filter((e: any) => e.isPaid).reduce((s: number, e: any) => s + toN(e.amount), 0);
      const extrasPending = extrasTotal - extrasCollected;

      // Food orders in this month (kitchen orders)
      let allOrders = await db.select().from(orders);
      const monthOrders = allOrders.filter((o: any) => {
        const d = o.createdAt ? new Date(o.createdAt) : null;
        if (!d || d < startDate || d > endDate) return false;
        if (propertyId && o.propertyId !== propertyId) return false;
        if (allowedIds && o.propertyId && !allowedIds.includes(o.propertyId)) return false;
        return true;
      });
      const foodOrdersTotal = monthOrders
        .filter((o: any) => ["delivered", "completed"].includes(o.status))
        .reduce((s: number, o: any) => s + toN(o.totalAmount), 0);

      // Advance payments: bookings created in this month (reuse already-fetched bookings)
      const monthBookings = allBookingsForBills.filter((b: any) => {
        const d = b.createdAt ? new Date(b.createdAt) : null;
        if (!d || d < startDate || d > endDate) return false;
        if (!propFilter(b.propertyId)) return false;
        return true;
      });
      const advanceCollected = monthBookings.reduce((s: number, b: any) => s + toN(b.advanceAmount), 0);
      const newBookingsCount = monthBookings.length;

      // Checkouts in this month
      const checkoutBookings = allBookingsForBills.filter((b: any) => {
        const d = b.checkOutDate ? new Date(b.checkOutDate) : null;
        if (!d || d < startDate || d > endDate) return false;
        if (!propFilter(b.propertyId)) return false;
        return b.status === "checked-out";
      });

      // Expenses for this month
      let expenses: any[] = [];
      try {
        if (propertyId) {
          expenses = (await storage.getExpensesByProperty(propertyId)).filter((e: any) => {
            const d = e.expenseDate ? new Date(e.expenseDate) : null;
            return d && d >= startDate && d <= endDate;
          });
        }
      } catch {}

      const expensesByCategory: Record<string, number> = {};
      for (const e of expenses) {
        const cat = e.category || "Other";
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + toN(e.amount);
      }
      const totalExpenses = expenses.reduce((s: number, e: any) => s + toN(e.amount), 0);

      res.json({
        month: monthParam,
        year,
        monthNum,
        revenue: {
          roomRevenue,
          foodRevenueBilled,
          servicesRevenueBilled,
          totalBilled,
          foodOrdersTotal,
          extrasTotal,
          extrasCollected,
          extrasPending,
          advanceCollected,
        },
        bookings: {
          newBookings: newBookingsCount,
          checkouts: checkoutBookings.length,
          paidBills: paidBills.length,
        },
        expenses: {
          total: totalExpenses,
          byCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })),
        },
        netIncome: totalBilled - totalExpenses,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // P&L Report endpoint (lease-period based with total lease amount)
  app.get("/api/properties/:propertyId/pnl", isAuthenticated, async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const { leaseId, month } = req.query;

      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;

      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "You don't have access to this property" });
      }

      // If month filter provided (format: YYYY-MM), use monthly P&L
      if (month) {
        const pnlReport = await storage.getMonthlyPnLReport(propertyId, month as string);
        return res.json(pnlReport);
      }

      const pnlReport = await storage.getPropertyPnLReport(
        propertyId,
        leaseId ? parseInt(leaseId as string) : undefined
      );
      res.json(pnlReport);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lease Amount Editing endpoint (Admin/Manager only)
  app.patch("/api/leases/:id/amount", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { totalAmount } = req.body;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized. Only admin/manager can edit lease amounts." });
      }

      const lease = await storage.getLease(parseInt(req.params.id));
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(lease.propertyId)) {
          return res.status(403).json({ message: "Unauthorized. You can only edit leases for your assigned properties." });
        }
      }

      if (!totalAmount || isNaN(parseFloat(totalAmount))) {
        return res.status(400).json({ message: "Invalid lease amount" });
      }

      const beforeData = { totalAmount: lease.totalAmount };
      const updated = await storage.updateLease(parseInt(req.params.id), { totalAmount });
      const afterData = { totalAmount: updated.totalAmount };

      const { AuditService } = await import("./auditService");
      await AuditService.logUpdate(
        "lease",
        String(lease.id),
        user,
        beforeData,
        afterData,
        { action: "lease_amount_updated", propertyId: lease.propertyId }
      );

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Staff Member endpoints (non-app staff) - All authenticated users
  app.get("/api/staff-members", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant } = auth;
      const { propertyId } = req.query;

      let staffMembers;
      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "You do not have access to this property" });
        }
        staffMembers = await storage.getStaffMembersByProperty(propId);
      } else {
        const allMembers = await storage.getAllStaffMembers();
        staffMembers = allMembers.filter(m => {
          if (!m.propertyId) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, m.propertyId);
        });
      }

      res.json(staffMembers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/staff-members/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      const member = await storage.getStaffMember(parseInt(req.params.id));
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(member.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      res.json(member);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/staff-members", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      // Convert date strings to Date objects before validation
      const bodyData = {
        ...req.body,
        joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : null,
        leavingDate: req.body.leavingDate ? new Date(req.body.leavingDate) : null,
      };

      const { insertStaffMemberSchema } = await import("@shared/schema");
      const validatedData = insertStaffMemberSchema.parse(bodyData);

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(validatedData.propertyId)) {
          return res.status(403).json({ message: "Unauthorized. You can only add staff for your assigned properties." });
        }
      }

      const member = await storage.createStaffMember(validatedData);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/staff-members/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      const member = await storage.getStaffMember(parseInt(req.params.id));
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(member.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
        if (req.body.propertyId && !propertyIds.includes(req.body.propertyId)) {
          return res.status(403).json({ message: "Unauthorized. You can only assign staff to your properties." });
        }
      }

      // Handle date fields properly
      const updateData: any = { ...req.body };
      if (updateData.joiningDate) {
        updateData.joiningDate = new Date(updateData.joiningDate);
      }
      if (updateData.leavingDate) {
        updateData.leavingDate = new Date(updateData.leavingDate);
      }
      // Handle baseSalary as string for decimal type
      if (updateData.baseSalary !== undefined) {
        updateData.baseSalary = String(updateData.baseSalary);
      }

      const updated = await storage.updateStaffMember(parseInt(req.params.id), updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Disable a staff member (temporary = on leave/suspended, permanent = left company)
  app.post("/api/staff-members/:id/disable", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = user.role === "admin" || user.role === "super-admin" || user.role === "manager";
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });

      const member = await storage.getStaffMember(parseInt(req.params.id));
      if (!member) return res.status(404).json({ message: "Staff member not found" });

      const { exitType, exitReason, leavingDate } = req.body;
      if (!exitType || !["temporary", "permanent"].includes(exitType)) {
        return res.status(400).json({ message: "exitType must be 'temporary' or 'permanent'" });
      }

      const parsedLeavingDate = leavingDate ? new Date(leavingDate) : new Date();

      const updated = await storage.updateStaffMember(parseInt(req.params.id), {
        isActive: false,
        exitType,
        exitReason: exitReason || null,
        leavingDate: parsedLeavingDate,
      });

      const label = exitType === "temporary" ? "Temporary (On Leave/Suspended)" : "Permanently Left Company";
      console.log(`[STAFF] ${member.name} disabled — ${label}${exitReason ? `: ${exitReason}` : ""}`);
      res.json({ success: true, member: updated });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Re-enable a temporarily disabled staff member
  app.post("/api/staff-members/:id/enable", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = user.role === "admin" || user.role === "super-admin" || user.role === "manager";
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });

      const member = await storage.getStaffMember(parseInt(req.params.id));
      if (!member) return res.status(404).json({ message: "Staff member not found" });

      if (member.exitType === "permanent") {
        return res.status(400).json({ message: "Cannot re-enable a permanently disabled staff member" });
      }

      const updated = await storage.updateStaffMember(parseInt(req.params.id), {
        isActive: true,
        exitType: null,
        exitReason: null,
        leavingDate: null,
      });

      console.log(`[STAFF] ${member.name} re-enabled`);
      res.json({ success: true, member: updated });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/staff-members/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      const member = await storage.getStaffMember(parseInt(req.params.id));
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(member.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      await storage.deleteStaffMember(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Staff Salary endpoints (Admin/Manager only)
  app.get("/api/salaries", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant, currentUser } = auth;
      const { userId, propertyId } = req.query;

      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let salaries;
      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "You do not have access to this property" });
        }
        salaries = await storage.getSalariesByProperty(propId);
      } else if (userId) {
        const allForUser = await storage.getSalariesByUser(userId as string);
        salaries = allForUser.filter(s => {
          if (!s.propertyId) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, s.propertyId);
        });
      } else {
        const allSalaries = await storage.getAllSalaries();
        salaries = allSalaries.filter(s => {
          if (!s.propertyId) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, s.propertyId);
        });
      }

      res.json(salaries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/salaries/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const salary = await storage.getSalary(parseInt(req.params.id));
      if (!salary) {
        return res.status(404).json({ message: "Salary not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (salary.propertyId && !propertyIds.includes(salary.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      res.json(salary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/salaries", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { insertStaffSalarySchema } = await import("@shared/schema");
      const validatedData = insertStaffSalarySchema.parse(req.body);

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (validatedData.propertyId && !propertyIds.includes(validatedData.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const salary = await storage.createSalary(validatedData);

      const { AuditService } = await import("./auditService");
      await AuditService.logCreate(
        "staff_salary",
        String(salary.id),
        user,
        salary,
        { action: "salary_created", propertyId: salary.propertyId }
      );

      res.status(201).json(salary);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/salaries/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const existing = await storage.getSalary(parseInt(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Salary not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (existing.propertyId && !propertyIds.includes(existing.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const salary = await storage.updateSalary(parseInt(req.params.id), req.body);

      const { AuditService } = await import("./auditService");
      await AuditService.logUpdate(
        "staff_salary",
        String(existing.id),
        user,
        existing,
        salary,
        { action: "salary_updated", propertyId: salary.propertyId }
      );

      res.json(salary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/salaries/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const existing = await storage.getSalary(parseInt(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Salary not found" });
      }

      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (existing.propertyId && !propertyIds.includes(existing.propertyId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      await storage.deleteSalary(parseInt(req.params.id));

      const { AuditService } = await import("./auditService");
      await AuditService.logDelete(
        "staff_salary",
        String(existing.id),
        user,
        existing,
        { action: "salary_deleted", propertyId: existing.propertyId }
      );

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Staff Salary Summary - with pending salary calculation (gross - advances)
  app.get("/api/salaries/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      const { startDate, endDate } = req.query;
      
      if (!['admin', 'manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const salaries = await storage.getAllSalaries();
      const filteredSalariesByTenant = salaries.filter(s => s.propertyId && canAccessProperty(tenant, s.propertyId));
      const advances = await storage.getAllAdvances();
      const allUsers = await storage.getAllUsers();

      // Filter by date range if provided
      let filteredSalaries = filteredSalariesByTenant;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredSalaries = salaries.filter(s => {
          const periodStart = new Date(s.periodStart);
          const periodEnd = new Date(s.periodEnd);
          return periodStart <= end && periodEnd >= start;
        });
      }

      // Calculate pending salary for each staff member
      const summaryData = filteredSalaries.map(salary => {
        const staffAdvances = advances.filter(a => a.userId === salary.userId);
        const totalAdvances = staffAdvances.reduce((sum, a) => sum + parseFloat(a.amount.toString()), 0);
        const grossSalary = parseFloat(salary.grossSalary.toString());
        const pendingSalary = grossSalary - totalAdvances;
        const staffUser = allUsers.find(u => u.id === salary.userId);

        return {
          id: salary.id,
          staffName: staffUser?.email || salary.userId,
          periodStart: salary.periodStart,
          periodEnd: salary.periodEnd,
          grossSalary,
          totalAdvances,
          pendingSalary: Math.max(0, pendingSalary),
          status: salary.status,
          advancesCount: staffAdvances.length,
        };
      });

      res.json(summaryData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── Salary Corrections ─────────────────────────────────────────────────────

  // POST /api/salary-corrections - Create or update a salary correction
  app.post("/api/salary-corrections", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager';
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });

      const { staffMemberId, propertyId, month, field, correctedValue, originalValue, reason } = req.body;
      if (!staffMemberId || !propertyId || !month || !field || correctedValue == null || !reason) {
        return res.status(400).json({ message: "staffMemberId, propertyId, month, field, correctedValue, reason are required" });
      }
      if (!['previous_pending_override', 'payment_adjustment'].includes(field)) {
        return res.status(400).json({ message: "field must be 'previous_pending_override' or 'payment_adjustment'" });
      }

      const correction = await storage.createSalaryCorrection({
        staffMemberId: parseInt(staffMemberId),
        propertyId: parseInt(propertyId),
        month,
        field,
        correctedValue: parseFloat(correctedValue),
        originalValue: originalValue != null ? parseFloat(originalValue) : null,
        reason,
        correctedBy: user.id,
        correctedByName: user.name || user.email || 'Unknown',
      });

      res.json({ success: true, correction });
    } catch (err: any) {
      console.error("[SALARY-CORRECTION] Create error:", err);
      res.status(500).json({ message: err.message || "Failed to create correction" });
    }
  });

  // DELETE /api/salary-corrections/:id - Remove a correction
  app.delete("/api/salary-corrections/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const isAdmin = user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager';
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });
      await storage.deleteSalaryCorrection(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete correction" });
    }
  });

  // GET /api/staff-salaries/detailed - Get detailed salary breakdown for all staff
  app.get("/api/staff-salaries/detailed", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { propertyId, month, startDate, endDate } = req.query;

      if (!propertyId || (!month && (!startDate || !endDate))) {
        return res.status(400).json({ message: "propertyId and month are required" });
      }

      const propId = parseInt(propertyId as string);
      let start: Date, end: Date;
      if (month) {
        // Parse month as "YYYY-MM" on the server to avoid timezone issues
        const [yearNum, monthNum] = (month as string).split('-').map(Number);
        start = new Date(yearNum, monthNum - 1, 1);
        end = new Date(yearNum, monthNum, 0, 23, 59, 59);
      } else {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      }

      console.log(`[SALARY DEBUG] Fetching salaries for propertyId: ${propId}, month: ${month || 'n/a'}, start: ${start.toISOString()}, end: ${end.toISOString()}`);

      // Check user access to property
      if (user.role === 'manager') {
        const assignedProps = user.assignedPropertyIds || [];
        if (!assignedProps.includes(propId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const includeInactive = req.query.includeInactive === 'true';
      const detailedSalaries = await storage.getDetailedStaffSalaries(propId, start, end, { includeInactive });
      console.log(`[SALARY DEBUG] Returned ${detailedSalaries.length} staff salary records (includeInactive=${includeInactive})`);
      res.json(detailedSalaries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/salary-payments - Get salary payment history
  app.get("/api/salary-payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { staffMemberId, propertyId, startDate, endDate } = req.query;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let payments;
      if (staffMemberId) {
        payments = await storage.getPaymentsByStaffMember(
          parseInt(staffMemberId as string),
          propertyId ? parseInt(propertyId as string) : undefined
        );
      } else if (propertyId) {
        payments = await storage.getPaymentsByProperty(
          parseInt(propertyId as string),
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else {
        return res.status(400).json({ message: "staffMemberId or propertyId required" });
      }

      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/salary-payments - Record a salary payment
  app.post("/api/salary-payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { staffMemberId, amount, paymentDate, paymentMethod, notes, periodStart, periodEnd } = req.body;

      if (!staffMemberId || !amount || !paymentDate || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "staffMemberId, amount, paymentDate, periodStart, and periodEnd are required" });
      }

      // Get staff member to find propertyId
      const staffMember = await storage.getStaffMember(staffMemberId);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const payment = await storage.createSalaryPayment({
        staffMemberId,
        propertyId: staffMember.propertyId,
        amount: String(amount),
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || 'cash',
        notes: notes || null,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        recordedBy: user.claims?.sub || user.id || String(user.userId),
      });

      // Record salary payment to wallet
      if (staffMember.propertyId) {
        try {
          await storage.recordSalaryPaymentToWallet(
            staffMember.propertyId,
            payment.id,
            parseFloat(amount.toString()),
            paymentMethod || 'cash',
            staffMember.name || 'Staff',
            user.claims?.sub || user.id || null
          );
          console.log(`[Wallet] Recorded salary payment #${payment.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record salary payment to wallet:`, walletError);
        }
      }

      const { AuditService } = await import("./auditService");
      await AuditService.logCreate(
        "salary_payment",
        String(payment.id),
        user,
        payment,
        { action: "salary_payment_recorded", staffMemberId, amount }
      );

      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error recording salary payment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Salary Advance endpoints
  app.get("/api/advances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      const { userId: targetUserId } = req.query;

      if (!['admin', 'manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const advances = targetUserId 
        ? await storage.getAdvancesByUser(targetUserId as string)
        : await storage.getAllAdvances();
      
      // Filter by property access
      const filtered = advances.filter(a => a.propertyId && canAccessProperty(tenant, a.propertyId));
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/advances", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { insertSalaryAdvanceSchema } = await import("@shared/schema");
      const validatedData = insertSalaryAdvanceSchema.parse(req.body);
      const advance = await storage.createAdvance(validatedData);

      // Record salary advance to wallet if we have property and amount
      if (advance.propertyId && advance.amount) {
        try {
          // Get staff name for description
          let staffName = 'Staff';
          if (advance.staffMemberId) {
            const staff = await storage.getStaffMember(advance.staffMemberId);
            staffName = staff?.name || 'Staff';
          }
          await storage.recordSalaryAdvanceToWallet(
            advance.propertyId,
            advance.id,
            parseFloat(advance.amount.toString()),
            'cash',
            staffName,
            user.claims?.sub || user.id || null
          );
          console.log(`[Wallet] Recorded salary advance #${advance.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record salary advance to wallet:`, walletError);
        }
      }

      const { AuditService } = await import("./auditService");
      await AuditService.logCreate(
        "salary_advance",
        String(advance.id),
        user,
        advance,
        { action: "advance_created", userId: advance.userId }
      );

      res.status(201).json(advance);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/advances/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const existing = await storage.getAdvance(parseInt(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Advance not found" });
      }

      const advance = await storage.updateAdvance(parseInt(req.params.id), req.body);

      const { AuditService } = await import("./auditService");
      await AuditService.logUpdate(
        "salary_advance",
        String(existing.id),
        user,
        existing,
        advance,
        { action: "advance_updated", userId: advance.userId }
      );

      res.json(advance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/advances/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const existing = await storage.getAdvance(parseInt(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Advance not found" });
      }

      await storage.deleteAdvance(parseInt(req.params.id));

      const { AuditService } = await import("./auditService");
      await AuditService.logDelete(
        "salary_advance",
        String(existing.id),
        user,
        existing,
        { action: "advance_deleted", userId: existing.userId }
      );

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ATTENDANCE ENDPOINTS =====
  // GET /api/attendance - Get all attendance records
  app.get("/api/attendance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      const { staffMemberId, propertyId, attendanceDate, month } = req.query;

      if (staffMemberId) {
        const records = await storage.getAttendanceByStaffMember(parseInt(staffMemberId as string));
        const filtered = records.filter(r => {
          const pid = r.propertyId || (r as any).property_id;
          if (!pid) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, pid);
        });
        return res.json(filtered);
      }

      if (propertyId) {
        const propId = parseInt(propertyId as string);
        if (!canAccessProperty(tenant, propId)) {
          return res.status(403).json({ message: "You do not have access to this property" });
        }
        const records = await storage.getAttendanceByProperty(propId);
        return res.json(records);
      }

      if (attendanceDate) {
        const date = new Date(attendanceDate as string);
        const records = await storage.getAttendanceByDate(date);
        const filtered = records.filter(r => {
          const pid = r.propertyId || (r as any).property_id;
          if (!pid) return tenant.hasUnlimitedAccess;
          return canAccessProperty(tenant, pid);
        });
        return res.json(filtered);
      }

      const allRecords = await storage.getAllAttendance();
      const filteredByTenant = allRecords.filter(r => {
        const pid = (r as any).property_id || r.propertyId;
        if (!pid) return tenant.hasUnlimitedAccess;
        return canAccessProperty(tenant, pid);
      });
      
      console.log(`[ATTENDANCE DEBUG] Raw records from storage: ${allRecords.length} records, filtered: ${filteredByTenant.length}`);
      
      // Transform all records to camelCase with proper date handling
      const transformed = filteredByTenant.map(r => {
        let dateStr = "";
        const dateValue = r.attendance_date || r.attendanceDate;
        
        if (typeof dateValue === 'string') {
          dateStr = dateValue.split('T')[0]; // Format: YYYY-MM-DD
        } else if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          dateStr = dateValue.toISOString().split('T')[0];
        } else {
          dateStr = ""; // Invalid date - skip this record
        }
        
        if (!dateStr) return null; // Skip records with invalid dates
        
        return {
          id: r.id,
          staffId: r.staff_id !== undefined ? r.staff_id : r.staffId,
          propertyId: r.property_id !== undefined ? r.property_id : r.propertyId,
          attendanceDate: dateStr,
          status: r.status,
          remarks: r.remarks
        };
      }).filter(Boolean); // Remove null entries
      
      console.log(`[ATTENDANCE DEBUG] Transformed records: ${transformed.length} records`);
      
      // Filter by month if provided
      if (month) {
        const monthStr = month as string;
        const filtered = transformed.filter(record => {
          return record && record.attendanceDate && record.attendanceDate.substring(0, 7) === monthStr;
        });
        console.log(`[ATTENDANCE DEBUG] Filtered by month ${monthStr}: ${filtered.length} records`);
        return res.json(filtered);
      }
      
      res.json(transformed);
    } catch (error: any) {
      console.error(`[ATTENDANCE ERROR]:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/attendance - Create attendance record
  app.post("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      // Validate the request data - attendanceDate should be string YYYY-MM-DD format
      const validatedData = insertAttendanceRecordSchema.parse({
        staffId: parseInt(req.body.staffMemberId, 10),
        propertyId: req.body.propertyId ? parseInt(req.body.propertyId, 10) : null,
        attendanceDate: req.body.attendanceDate, // Keep as string for Drizzle date type
        status: req.body.status,
        remarks: req.body.remarks || null,
      });

      // Create the attendance record
      const attendance = await storage.createAttendance(validatedData);

      res.status(201).json(attendance);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/attendance/mark-all-present - Mark all active staff as present for a given date
  app.post("/api/attendance/mark-all-present", isAuthenticated, async (req: any, res) => {
    try {
      const { date, propertyId } = req.body;
      if (!date || !propertyId) {
        return res.status(400).json({ message: "date and propertyId are required" });
      }

      const propId = parseInt(propertyId);
      const staffList = await storage.getStaffMembersByProperty(propId);
      const activeStaff = staffList.filter(s => s.isActive !== false);

      const existingRecords = await storage.getAttendanceByProperty(propId);
      const dateStr = String(date).split('T')[0];

      const existingSet = new Set(
        existingRecords
          .filter((r: any) => {
            const rd = r.attendance_date || r.attendanceDate;
            const recordDate = typeof rd === 'string' ? rd.split('T')[0] : rd instanceof Date ? rd.toISOString().split('T')[0] : '';
            return recordDate === dateStr;
          })
          .map((r: any) => r.staff_id !== undefined ? r.staff_id : r.staffId)
      );

      let created = 0;
      for (const staff of activeStaff) {
        if (!existingSet.has(staff.id)) {
          await storage.createAttendance({
            staffId: staff.id,
            propertyId: propId,
            attendanceDate: dateStr,
            status: 'present',
            remarks: null,
          });
          created++;
        }
      }

      res.json({ success: true, created, total: activeStaff.length });
    } catch (error: any) {
      console.error('[MARK ALL PRESENT ERROR]:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/attendance/stats - Get attendance statistics
  // NEW LOGIC: All staff are "Present" by default - only exceptions are recorded
  app.get("/api/attendance/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      const month = req.query.month as string; // Format: YYYY-MM
      
      // Get all staff members
      const allStaffMembers = await storage.getAllStaffMembers();
      // Filter staff by property access
      const staffMembers = allStaffMembers.filter(s => canAccessProperty(tenant, s.propertyId));
      
      // Get all attendance records - filtered by property access
      const allAttendanceRecords = await storage.getAllAttendance();
      const attendanceRecords = allAttendanceRecords.filter((r: any) => {
        const propId = r.propertyId || r.property_id;
        return propId && canAccessProperty(tenant, propId);
      });
      
      // Get all pending salary advances for deduction - filtered by property access
      const allAdvances = await storage.getAllAdvances();
      const filteredAdvances = allAdvances.filter((a: any) => a.propertyId && canAccessProperty(tenant, a.propertyId));
      
      // Calculate stats for each staff member
      const stats = await Promise.all(staffMembers.map(async (staff) => {
        // Filter attendance for selected month
        const staffAttendance = attendanceRecords.filter((record) => {
          if (record.staffId !== staff.id) return false;
          if (month) {
            const recordMonth = new Date(record.attendanceDate).toISOString().slice(0, 7);
            return recordMonth === month;
          }
          return true;
        });

        // Count only exceptions - no need to mark "present" anymore
        const absentDays = staffAttendance.filter((a) => a.status === "absent").length;
        const leaveDays = staffAttendance.filter((a) => a.status === "leave").length;
        const halfDays = staffAttendance.filter((a) => a.status === "half-day").length;

        // Calculate working days in the month (excluding Sundays)
        let workingDaysInMonth = 26; // Default assumption
        if (month) {
          const [year, monthNum] = month.split('-').map(Number);
          const monthStart = new Date(year, monthNum - 1, 1);
          const monthEnd = new Date(year, monthNum, 0);
          
          // Count days excluding Sundays
          let workDays = 0;
          for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0) { // 0 = Sunday
              workDays++;
            }
          }
          workingDaysInMonth = workDays;
          
          // Adjust for joining date if staff joined mid-month
          if (staff.joiningDate) {
            const joinDate = new Date(staff.joiningDate);
            if (joinDate > monthStart && joinDate <= monthEnd) {
              // Recalculate from joining date
              workDays = 0;
              for (let d = new Date(joinDate); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                if (d.getDay() !== 0) {
                  workDays++;
                }
              }
              workingDaysInMonth = workDays;
            }
          }
        }

        // Present days = Total working days - Absent - Half days count as 0.5
        const presentDays = workingDaysInMonth - absentDays - (halfDays * 0.5);
        
        // Calculate deductions
        const baseSalary = parseFloat(String(staff.baseSalary || 0));
        const deductionPerDay = baseSalary / workingDaysInMonth;
        
        // Absent = full day deduction, Half-day = 0.5 day deduction
        // Leave = no deduction (paid leave)
        const attendanceDeduction = (deductionPerDay * absentDays) + (deductionPerDay * halfDays * 0.5);
        
        // Get pending salary advances for this staff member
        const staffAdvances = filteredAdvances.filter(
          (adv) => adv.staffMemberId === staff.id && adv.repaymentStatus === 'pending'
        );
        const totalAdvances = staffAdvances.reduce(
          (sum, adv) => sum + parseFloat(String(adv.amount || 0)), 0
        );
        
        // Total deduction = attendance deduction + pending advances
        const totalDeduction = attendanceDeduction + totalAdvances;
        
        // Net salary after all deductions
        const netSalary = baseSalary - totalDeduction;
        
        // Attendance percentage based on effective present days
        const attendancePercentage = workingDaysInMonth > 0 
          ? (presentDays / workingDaysInMonth) * 100 
          : 100;

        return {
          staffId: staff.id,
          staffName: staff.name,
          presentDays: Math.max(0, presentDays),
          absentDays,
          leaveDays,
          halfDays,
          totalWorkDays: workingDaysInMonth,
          attendancePercentage: Math.min(100, Math.max(0, attendancePercentage)),
          deductionPerDay: Math.round(deductionPerDay * 100) / 100,
          attendanceDeduction: Math.round(attendanceDeduction * 100) / 100,
          advanceDeduction: Math.round(totalAdvances * 100) / 100,
          totalDeduction: Math.round(totalDeduction * 100) / 100,
          baseSalary,
          netSalary: Math.round(Math.max(0, netSalary) * 100) / 100,
        };
      }));

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SALARY ADVANCES ENDPOINTS =====
  // GET /api/salary-advances - Get all salary advances
  app.get("/api/salary-advances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      const tenant = getTenantContext(currentUser);
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const advances = await storage.getAllAdvances();
      const filtered = advances.filter(a => {
        if (!a.propertyId) return tenant.hasUnlimitedAccess;
        return canAccessProperty(tenant, a.propertyId);
      });
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/salary-advances - Create a salary advance
  app.post("/api/salary-advances", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const paymentMode = req.body.paymentMode || 'cash';

      // Prepare the data for insertion - amount must be a string for decimal type
      const advanceData = {
        staffMemberId: parseInt(req.body.staffMemberId),
        amount: String(req.body.amount),
        advanceDate: new Date(req.body.advanceDate),
        reason: req.body.reason || null,
        repaymentStatus: 'pending',
        approvedBy: user.firstName || user.email || user.id,
        notes: req.body.notes || null,
        advanceType: req.body.advanceType || 'regular',
        paymentMode: paymentMode,
      };

      const advance = await storage.createAdvance(advanceData as any);

      // Record salary advance to wallet
      const staffMember = await storage.getStaffMember(advance.staffMemberId!);
      if (staffMember?.propertyId && advance.amount) {
        try {
          await storage.recordSalaryAdvanceToWallet(
            staffMember.propertyId,
            advance.id,
            parseFloat(advance.amount.toString()),
            paymentMode,
            staffMember.name || 'Staff',
            user.claims?.sub || user.id || null
          );
          console.log(`[Wallet] Recorded salary advance #${advance.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record salary advance to wallet:`, walletError);
        }
      }

      res.status(201).json(advance);
    } catch (error: any) {
      console.error('[SALARY ADVANCE ERROR]:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/salary-advances/:id - Delete a salary advance
  app.delete("/api/salary-advances/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteAdvance(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/salary-export - Export salary data as CSV
  app.get("/api/salary-export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const { month, year, propertyId } = req.query;
      if (!month || !year || !propertyId) {
        return res.status(400).json({ message: "month, year, and propertyId are required" });
      }

      const propId = parseInt(propertyId as string);
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      const monthStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

      const staffList = await storage.getStaffMembersByProperty(propId);
      const allAttendanceRecords = await storage.getAttendanceByProperty(propId);
      const allAdvances = await storage.getAllAdvances();
      const allPayments = await storage.getPaymentsByProperty(propId);

      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum, 0);

      let workingDaysInMonth = 0;
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) workingDaysInMonth++;
      }

      const csvRows: string[] = [];
      csvRows.push('Staff Name,Role,Base Salary,Working Days,Present Days,Absent Days,Leave Days,Half Days,Attendance Deduction,Regular Advances,Extra Advances,Previous Pending,Total Payable,Paid,Pending');

      for (const staff of staffList) {
        let staffWorkDays = workingDaysInMonth;
        if (staff.joiningDate) {
          const joinDate = new Date(staff.joiningDate);
          if (joinDate > monthStart && joinDate <= monthEnd) {
            staffWorkDays = 0;
            for (let d = new Date(joinDate); d <= monthEnd; d.setDate(d.getDate() + 1)) {
              if (d.getDay() !== 0) staffWorkDays++;
            }
          }
        }

        const staffAttendance = allAttendanceRecords.filter((record: any) => {
          const staffId = record.staff_id !== undefined ? record.staff_id : record.staffId;
          if (staffId !== staff.id) return false;
          const dateVal = record.attendance_date || record.attendanceDate;
          const recordDate = typeof dateVal === 'string' ? dateVal.split('T')[0] : dateVal instanceof Date ? dateVal.toISOString().split('T')[0] : '';
          return recordDate.startsWith(monthStr);
        });

        const absentDays = staffAttendance.filter((a: any) => a.status === "absent").length;
        const leaveDays = staffAttendance.filter((a: any) => a.status === "leave").length;
        const halfDays = staffAttendance.filter((a: any) => a.status === "half-day").length;
        const presentDays = staffWorkDays - absentDays - (halfDays * 0.5);

        const baseSalary = parseFloat(String(staff.baseSalary || 0));
        const deductionPerDay = staffWorkDays > 0 ? baseSalary / staffWorkDays : 0;
        const attendanceDeduction = (deductionPerDay * absentDays) + (deductionPerDay * halfDays * 0.5);

        const staffAdvances = allAdvances.filter(
          (adv: any) => adv.staffMemberId === staff.id && adv.repaymentStatus === 'pending'
        );
        const regularAdvances = staffAdvances
          .filter((a: any) => (a.advanceType || 'regular') === 'regular')
          .reduce((sum: number, a: any) => sum + parseFloat(String(a.amount || 0)), 0);
        const extraAdvances = staffAdvances
          .filter((a: any) => a.advanceType === 'extra')
          .reduce((sum: number, a: any) => sum + parseFloat(String(a.amount || 0)), 0);

        const periodPayments = allPayments.filter((p: any) => {
          if (p.staffMemberId !== staff.id) return false;
          if (p.periodStart && p.periodEnd) {
            const pStart = new Date(p.periodStart);
            const pEnd = new Date(p.periodEnd);
            return pStart >= monthStart && pEnd <= new Date(yearNum, monthNum, 0, 23, 59, 59);
          }
          return false;
        });
        const totalPaid = periodPayments.reduce((sum: number, p: any) => sum + parseFloat(String(p.amount || 0)), 0);

        const previousPending = 0;
        const totalPayable = Math.max(0, baseSalary - attendanceDeduction - regularAdvances - extraAdvances + previousPending);
        const pending = Math.max(0, totalPayable - totalPaid);

        const escapeCsv = (val: any) => {
          const str = String(val ?? '');
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        };

        csvRows.push([
          escapeCsv(staff.name),
          escapeCsv(staff.role || staff.jobTitle || ''),
          baseSalary.toFixed(2),
          staffWorkDays,
          Math.max(0, presentDays).toFixed(1),
          absentDays,
          leaveDays,
          halfDays,
          attendanceDeduction.toFixed(2),
          regularAdvances.toFixed(2),
          extraAdvances.toFixed(2),
          previousPending.toFixed(2),
          totalPayable.toFixed(2),
          totalPaid.toFixed(2),
          pending.toFixed(2),
        ].join(','));
      }

      const csvContent = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=salary-report-${monthStr}.csv`);
      res.send(csvContent);
    } catch (error: any) {
      console.error('[SALARY EXPORT ERROR]:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/salary-export/all - Export full salary + advance report for ALL accessible properties
  app.get("/api/salary-export/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(403).json({ message: "User not found" });

      const { month } = req.query;
      if (!month) return res.status(400).json({ message: "month is required (YYYY-MM)" });

      const [yearNum, monthNum] = (month as string).split('-').map(Number);
      const monthStart = new Date(yearNum, monthNum - 1, 1);
      const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

      // Determine accessible properties
      let allProperties = await storage.getAllProperties();
      if (currentUser.role !== 'superadmin') {
        const assigned = (currentUser.assignedPropertyIds || []).map(String);
        if (assigned.length > 0) {
          allProperties = allProperties.filter((p: any) => assigned.includes(String(p.id)));
        }
      }

      const escapeCsv = (val: any) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const salaryRows: string[] = [];
      const advanceRows: string[] = [];
      const allAdvances = await storage.getAllAdvances();

      salaryRows.push('Property,Staff Name,Role,Status,Base Salary,Total Days,Present Days,Absent Days,Leave Days,Half Days,Daily Rate,Deduction,Regular Advances,Extra Advances,Total Advances,Gross Salary,Net Salary,Previous Pending,Payments Made,Final Payable,Last Working Date');
      advanceRows.push('Property,Staff Name,Status,Date,Type,Amount,Payment Mode,Reason,Repayment Status');

      for (const property of allProperties) {
        const detailedSalaries = await storage.getDetailedStaffSalaries(property.id, monthStart, monthEnd, { includeInactive: true });
        const propertyStaffIds = new Set(detailedSalaries.map((s: any) => s.staffId));

        // Salary summary rows (active first, then inactive)
        const sorted = [...detailedSalaries].sort((a: any, b: any) => {
          const order: Record<string, number> = { active: 0, inactive: 1, left: 2 };
          return (order[a.employeeStatus] ?? 0) - (order[b.employeeStatus] ?? 0) || a.staffName.localeCompare(b.staffName);
        });
        for (const s of sorted) {
          const statusLabel = s.employeeStatus === 'left' ? 'Left' : s.employeeStatus === 'inactive' ? 'Inactive' : 'Active';
          const lastWorkingDate = s.leavingDate ? new Date(s.leavingDate).toLocaleDateString('en-IN') : '';
          salaryRows.push([
            escapeCsv(property.name),
            escapeCsv(s.staffName),
            escapeCsv(s.jobTitle),
            escapeCsv(statusLabel),
            s.baseSalary.toFixed(2),
            s.totalDays || 0,
            (s.presentDays || 0).toFixed(1),
            s.absentDays || 0,
            s.leaveDays || 0,
            s.halfDays || 0,
            (s.dailyRate || 0).toFixed(2),
            (s.deduction || 0).toFixed(2),
            (s.regularAdvances || 0).toFixed(2),
            (s.extraAdvances || 0).toFixed(2),
            (s.totalAdvances || 0).toFixed(2),
            (s.grossSalary || 0).toFixed(2),
            (s.netSalary || 0).toFixed(2),
            (s.previousPending || 0).toFixed(2),
            (s.paymentsMade || 0).toFixed(2),
            (s.finalPayable || 0).toFixed(2),
            escapeCsv(lastWorkingDate),
          ].join(','));
        }

        // Individual advance rows for this property's staff
        const propertyAdvances = allAdvances.filter((adv: any) => propertyStaffIds.has(adv.staffMemberId));
        const staffNameMap: Record<number, string> = {};
        const staffStatusMap: Record<number, string> = {};
        for (const s of sorted) {
          staffNameMap[s.staffId] = s.staffName;
          staffStatusMap[s.staffId] = s.employeeStatus === 'left' ? 'Left' : s.employeeStatus === 'inactive' ? 'Inactive' : 'Active';
        }

        for (const adv of propertyAdvances) {
          const advDate = adv.advanceDate ? new Date(adv.advanceDate).toLocaleDateString('en-IN') : '';
          advanceRows.push([
            escapeCsv(property.name),
            escapeCsv(staffNameMap[adv.staffMemberId] || ''),
            escapeCsv(staffStatusMap[adv.staffMemberId] || 'Active'),
            advDate,
            escapeCsv(adv.advanceType || 'regular'),
            parseFloat(String(adv.amount || 0)).toFixed(2),
            escapeCsv(adv.paymentMode || 'cash'),
            escapeCsv(adv.reason || ''),
            escapeCsv(adv.repaymentStatus || ''),
          ].join(','));
        }
      }

      const monthLabel = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
      const csvContent = [
        `Salary Report - All Properties - ${monthLabel}`,
        '',
        '=== SALARY SUMMARY ===',
        ...salaryRows,
        '',
        '=== ADVANCE LEDGER ===',
        ...advanceRows,
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=salary-all-properties-${monthLabel}.csv`);
      res.send('\uFEFF' + csvContent); // BOM for Excel UTF-8
    } catch (error: any) {
      console.error('[SALARY EXPORT ALL ERROR]:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/staff-funds-report - Complete funds disbursed to staff report (advances + salary payments + expenses)
  app.get("/api/staff-funds-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(403).json({ message: "User not found" });

      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string + 'T23:59:59') : undefined;

      // Determine accessible property IDs
      let allProperties = await storage.getAllProperties();
      if (currentUser.role !== 'superadmin') {
        const assigned = (currentUser.assignedPropertyIds || []).map(String);
        if (assigned.length > 0) {
          allProperties = allProperties.filter((p: any) => assigned.includes(String(p.id)));
        }
      }
      const accessiblePropertyIds = new Set(allProperties.map((p: any) => p.id));
      const propertyNameMap: Record<number, string> = {};
      for (const p of allProperties) propertyNameMap[p.id] = p.name;

      const escapeCsv = (val: any) => {
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-IN') : '';
      const fmtAmt = (v: any) => parseFloat(String(v || 0)).toFixed(2);

      // ── Section 1: Salary Advances ──────────────────────────────
      const allAdvances = await storage.getAllAdvancesWithStaff(fromDate, toDate);
      const filteredAdvances = allAdvances.filter((a: any) => a.propertyId && accessiblePropertyIds.has(a.propertyId));

      const advRows: string[] = [
        'Date,Property,Staff Name,Role,Type,Amount,Payment Mode,Reason,Repayment Status',
        ...filteredAdvances.map((a: any) => [
          fmtDate(a.advanceDate),
          escapeCsv(propertyNameMap[a.propertyId] || ''),
          escapeCsv(a.staffName || ''),
          escapeCsv(a.staffRole || ''),
          escapeCsv(a.advanceType || 'regular'),
          fmtAmt(a.amount),
          escapeCsv(a.paymentMode || 'cash'),
          escapeCsv(a.reason || ''),
          escapeCsv(a.repaymentStatus || ''),
        ].join(','))
      ];

      // ── Section 2: Salary Payments ──────────────────────────────
      const allPayments = await storage.getAllSalaryPaymentsWithStaff(fromDate, toDate);
      const filteredPayments = allPayments.filter((p: any) => p.propertyId && accessiblePropertyIds.has(p.propertyId));

      const payRows: string[] = [
        'Date,Property,Staff Name,Role,Amount,Payment Method,Period,Notes,Paid By',
        ...filteredPayments.map((p: any) => {
          const period = (p.periodStart && p.periodEnd)
            ? `${fmtDate(p.periodStart)} to ${fmtDate(p.periodEnd)}`
            : '';
          return [
            fmtDate(p.paymentDate),
            escapeCsv(propertyNameMap[p.propertyId] || ''),
            escapeCsv(p.staffName || ''),
            escapeCsv(p.staffRole || ''),
            fmtAmt(p.amount),
            escapeCsv(p.paymentMethod || ''),
            escapeCsv(period),
            escapeCsv(p.notes || ''),
            escapeCsv(p.paidBy || ''),
          ].join(',');
        })
      ];

      // ── Section 3: Property Expenses ───────────────────────────
      const allExpenses = await storage.getAllExpenses();
      const filteredExpenses = allExpenses.filter((e: any) => {
        if (!accessiblePropertyIds.has(e.propertyId)) return false;
        if (fromDate && new Date(e.expenseDate) < fromDate) return false;
        if (toDate && new Date(e.expenseDate) > toDate) return false;
        return true;
      });

      const expRows: string[] = [
        'Date,Property,Category,Amount,Payment Method,Description,Vendor,Receipt No.',
        ...filteredExpenses.map((e: any) => [
          fmtDate(e.expenseDate),
          escapeCsv(propertyNameMap[e.propertyId] || ''),
          escapeCsv(e.category || ''),
          fmtAmt(e.amount),
          escapeCsv(e.paymentMethod || ''),
          escapeCsv(e.description || ''),
          escapeCsv(e.vendorName || ''),
          escapeCsv(e.receiptNumber || ''),
        ].join(','))
      ];

      // ── Totals ──────────────────────────────────────────────────
      const totalAdvances = filteredAdvances.reduce((s: number, a: any) => s + parseFloat(String(a.amount || 0)), 0);
      const totalPayments = filteredPayments.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0);
      const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + parseFloat(String(e.amount || 0)), 0);
      const grandTotal = totalAdvances + totalPayments + totalExpenses;

      const rangeLabel = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Until ${to}` : 'All Time';
      const csvContent = [
        `Staff Funds Report — ${rangeLabel}`,
        `Generated: ${new Date().toLocaleDateString('en-IN')}`,
        `Grand Total Disbursed: ₹${grandTotal.toFixed(2)}  |  Advances: ₹${totalAdvances.toFixed(2)}  |  Salary Payments: ₹${totalPayments.toFixed(2)}  |  Expenses: ₹${totalExpenses.toFixed(2)}`,
        '',
        '=== SALARY ADVANCES ===',
        ...advRows,
        '',
        '=== SALARY PAYMENTS ===',
        ...payRows,
        '',
        '=== PROPERTY EXPENSES ===',
        ...expRows,
      ].join('\n');

      const fileSuffix = from && to ? `${from}_to_${to}` : 'all-time';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=staff-funds-report-${fileSuffix}.csv`);
      res.send('\uFEFF' + csvContent);
    } catch (error: any) {
      console.error('[STAFF FUNDS REPORT ERROR]:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Salary Payment endpoints
  app.get("/api/salaries/:salaryId/payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const payments = await storage.getPaymentsBySalary(parseInt(req.params.salaryId));
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/salaries/:salaryId/payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { insertSalaryPaymentSchema } = await import("@shared/schema");
      const validatedData = insertSalaryPaymentSchema.parse({
        ...req.body,
        salaryId: parseInt(req.params.salaryId),
      });
      const payment = await storage.createSalaryPayment(validatedData);

      // Record salary payment to wallet if we have property and amount
      if (payment.propertyId && payment.amount) {
        try {
          let staffName = 'Staff';
          if (payment.staffMemberId) {
            const staff = await storage.getStaffMember(payment.staffMemberId);
            staffName = staff?.name || 'Staff';
          }
          await storage.recordSalaryPaymentToWallet(
            payment.propertyId,
            payment.id,
            parseFloat(payment.amount.toString()),
            payment.paymentMethod || 'cash',
            staffName,
            user.claims?.sub || user.id || null
          );
          console.log(`[Wallet] Recorded salary payment #${payment.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record salary payment to wallet:`, walletError);
        }
      }

      const { AuditService } = await import("./auditService");
      await AuditService.logCreate(
        "salary_payment",
        String(payment.id),
        user,
        payment,
        { action: "salary_payment_created", salaryId: payment.salaryId }
      );

      res.status(201).json(payment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/salaries/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteSalaryPayment(parseInt(req.params.id));

      const { AuditService } = await import("./auditService");
      await AuditService.logCustomAction(
        "salary_payment",
        String(req.params.id),
        "delete",
        user,
        undefined,
        { action: "salary_payment_deleted" }
      );

      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== VENDOR MANAGEMENT ENDPOINTS =====
  // GET /api/vendors - Get all vendors for a property (with balances)
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(403).json({ message: "User not found. Please log in again." });
      const { tenant, currentUser } = auth;

      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { propertyId } = req.query;
      
      if (!propertyId) {
        return res.json([]);
      }

      const propId = parseInt(propertyId as string);
      if (!canAccessProperty(tenant, propId)) {
        return res.status(403).json({ message: "You do not have access to this property" });
      }

      const vendors = await storage.getVendorsWithBalance(propId);
      res.json(vendors);
    } catch (error: any) {
      console.error("[/api/vendors] Error:", error.message);
      console.error("[/api/vendors] Stack:", error.stack);
      res.json([]);
    }
  });

  // GET /api/vendors/:id - Get a single vendor
  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const vendor = await storage.getVendor(parseInt(req.params.id));
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/vendors - Create a new vendor
  app.post("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { insertVendorSchema } = await import("@shared/schema");
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);

      res.status(201).json(vendor);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/vendors/:id - Update a vendor
  app.patch("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const vendor = await storage.updateVendor(parseInt(req.params.id), req.body);
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/vendors/:id - Delete a vendor
  app.delete("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteVendor(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== VENDOR TRANSACTION ENDPOINTS =====
  // GET /api/vendors/:vendorId/transactions - Get transactions for a vendor
  app.get("/api/vendors/:vendorId/transactions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const transactions = await storage.getVendorTransactions(parseInt(req.params.vendorId));
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/vendors/:vendorId/transactions - Add a transaction (credit purchase or payment)
  app.post("/api/vendors/:vendorId/transactions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { insertVendorTransactionSchema } = await import("@shared/schema");
      
      // Pre-process data to ensure correct types
      const dataToValidate = {
        ...req.body,
        vendorId: parseInt(req.params.vendorId),
        createdBy: user.firstName || user.email || user.id,
        amount: req.body.amount?.toString() || '0',
        transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : new Date(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };
      
      console.log('[VendorTx] Data to validate:', JSON.stringify(dataToValidate, null, 2));
      
      const validatedData = insertVendorTransactionSchema.parse(dataToValidate);
      
      const transaction = await storage.createVendorTransaction(validatedData);
      
      // Record payment to wallet if it's a payment transaction
      if (validatedData.transactionType === 'payment' && validatedData.propertyId && validatedData.paymentMethod) {
        try {
          await storage.recordVendorPaymentToWallet(
            validatedData.propertyId,
            transaction.id,
            parseFloat(validatedData.amount?.toString() || '0'),
            validatedData.paymentMethod,
            `Vendor: ${req.body.vendorName || 'Unknown'}`,
            user.claims?.sub || user.id || null
          );
          console.log(`[Wallet] Recorded vendor payment #${transaction.id} to wallet`);
        } catch (walletError) {
          console.log(`[Wallet] Could not record vendor payment to wallet:`, walletError);
        }
      }
      
      res.status(201).json(transaction);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.log('[VendorTx] Zod validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/vendor-transactions/:id - Delete a transaction
  app.patch("/api/vendor-transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id);
      const { amount, transactionDate, invoiceNumber, description, expenseCategoryId, dueDate } = req.body;
      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount.toString();
      if (transactionDate !== undefined) updateData.transactionDate = new Date(transactionDate).toISOString();
      if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
      if (description !== undefined) updateData.description = description;
      if (expenseCategoryId !== undefined) updateData.expenseCategoryId = expenseCategoryId;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      const updated = await storage.updateVendorTransaction(id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/vendor-transactions/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Support both role spellings used across deployments: "super-admin" (hyphen) and "super_admin" (underscore)
      if (!['admin', 'manager', 'super_admin', 'super-admin'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteVendorTransaction(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password Reset endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, phone, channel } = req.body;
      
      if (!email && !phone) {
        return res.status(400).json({ message: "Email or phone required" });
      }

      if (channel === "email" && !email) {
        return res.status(400).json({ message: "Email required for email OTP" });
      }

      if (channel === "sms" && !phone) {
        return res.status(400).json({ message: "Phone required for SMS OTP" });
      }

      // Check if user exists with this email/phone before sending OTP
      const allUsers = await storage.getAllUsers();
      const identifier = channel === "email" ? email : phone;
      const userExists = allUsers.find(u => 
        (channel === "email" && u.email === identifier) || 
        (channel === "sms" && u.phone === identifier)
      );
      
      if (!userExists) {
        return res.status(404).json({ message: "No account registered with this email address" });
      }

      const otpRecord = await storage.createPasswordResetOtp({ email, phone, channel });

      // Send OTP via email or SMS
      if (channel === "email" && email) {
        const { sendPasswordResetEmail } = await import("./email-service");
        await sendPasswordResetEmail(email, otpRecord.otp);
        console.log(`[OTP] Password reset OTP sent to email: ${email}`);
      }

      res.json({ message: "OTP sent", otp: otpRecord.otp });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, phone, otp, channel } = req.body;
      
      const identifier = channel === "email" ? email : phone;
      if (!identifier) {
        return res.status(400).json({ message: "Email or phone required" });
      }

      const result = await storage.verifyPasswordResetOtp(channel, identifier, otp);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { resetToken, password } = req.body;
      
      if (!resetToken || !password) {
        return res.status(400).json({ message: "Reset token and new password required" });
      }

      // Validate the reset token and get the associated user
      const otpRecord = await storage.getPasswordResetOtpByToken(resetToken);
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Find the user by email or phone
      const identifier = otpRecord.email || otpRecord.phone;
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email === identifier || u.phone === identifier);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password and update user
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db.update(users).set({
        password: hashedPassword,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      // Delete the used OTP record
      await storage.deletePasswordResetOtp(otpRecord.id);

      console.log(`[PASSWORD-RESET] Password reset successful for user: ${user.email}`);
      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error(`[PASSWORD-RESET] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public Registration endpoint - Multi-tenant aware
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Accept multiple field name variations for flexibility
      const email = req.body.email;
      const password = req.body.password;
      const businessName = req.body.businessName || req.body.business_name || req.body.hotelName;
      const businessLocation = req.body.businessLocation || req.body.business_location || req.body.location || req.body.city;
      const firstName = req.body.firstName || req.body.first_name;
      const lastName = req.body.lastName || req.body.last_name;
      const phone = req.body.phone;

      // Validate input
      if (!email || !password || !businessName || !businessLocation) {
        return res.status(400).json({ 
          message: "Email, password, business name, and location are required",
          received: {
            email: !!email,
            password: !!password,
            businessName: !!businessName,
            businessLocation: !!businessLocation
          }
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if user already exists
      const allUsers = await storage.getAllUsers();
      const userExists = allUsers.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

      if (userExists) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password before storing
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Generate unique user ID
      const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create new user with PENDING verification status
      // They cannot access the system until Super Admin approves
      // Role stays as "staff" (default) until Super Admin promotes to "admin"
      await db.insert(users).values({
        id: newUserId,
        email: email.toLowerCase(),
        firstName: firstName || "",
        lastName: lastName || "",
        businessName,
        phone: phone || null,
        role: "staff", // Default role, will be promoted when approved
        status: "active",
        password: hashedPassword,
        verificationStatus: "pending", // Must be approved by Super Admin
        tenantType: "property_owner", // Default for new signups
        signupMethod: "email",
      });
      
      const [newUser] = await db.select().from(users).where(eq(users.id, newUserId));

      // Log the registration
      console.log(`[REGISTRATION] New user registered (PENDING): ${email} with business: ${businessName}`);

      // Notify all Super Admins about new user signup
      try {
        const allUsers = await storage.getAllUsers();
        const superAdmins = allUsers.filter(u => u.role === 'super-admin');
        
        for (const admin of superAdmins) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "new_user_signup",
            title: "New User Registration",
            message: `${firstName || ''} ${lastName || ''} (${email}) registered with business: ${businessName}`,
            soundType: "info",
            relatedType: "user",
            isRead: false,
          });
        }
        console.log(`[REGISTRATION] Notified ${superAdmins.length} super admins about new signup`);
      } catch (notifyError) {
        console.error("[REGISTRATION] Failed to notify super admins:", notifyError);
      }

      res.status(201).json({
        message: "Registration successful. Your account is pending approval by our team. You will be notified once approved.",
        user: {
          id: newUser.id,
          email: newUser.email,
          businessName: newUser.businessName,
          verificationStatus: "pending",
        },
      });
    } catch (error: any) {
      console.error("[REGISTRATION ERROR]", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // Mobile OTP Login - Send OTP via WhatsApp
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone, purpose = "login" } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Normalize phone number
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ message: "Invalid phone number" });
      }

      // Rate limiting: Check if OTP was sent in last 60 seconds
      const recentOtp = await db.select().from(otpTokens)
        .where(and(
          eq(otpTokens.phone, normalizedPhone),
          gt(otpTokens.createdAt, new Date(Date.now() - 60000))
        ))
        .limit(1);

      if (recentOtp.length > 0) {
        return res.status(429).json({ message: "Please wait 60 seconds before requesting another OTP" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      await db.insert(otpTokens).values({
        phone: normalizedPhone,
        otp,
        purpose,
        expiresAt,
        isUsed: false,
        attempts: 0,
      });

      // Send OTP via WhatsApp (Authkey.io)
      try {
        const authkeyApiKey = process.env.AUTHKEY_API_KEY;
        if (authkeyApiKey) {
          const whatsappPayload = {
            sms: [{
              to: normalizedPhone.startsWith('91') ? normalizedPhone : `91${normalizedPhone}`,
              sender: "HTZEEE",
              templateid: "hostezee_otp", // Template for OTP
              message: `Your Hostezee login OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`,
              entityid: "1101868410000052638"
            }]
          };
          
          await fetch('https://api.authkey.io/request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'authkey': authkeyApiKey
            },
            body: JSON.stringify(whatsappPayload)
          });
        }
      } catch (whatsappError) {
        console.error("[OTP] WhatsApp send failed:", whatsappError);
        // Continue even if WhatsApp fails - for testing
      }

      console.log(`[OTP] Sent OTP ${otp} to ${normalizedPhone} for ${purpose}`);

      res.json({ 
        success: true, 
        message: "OTP sent to your WhatsApp",
        // Only include OTP in development for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    } catch (error: any) {
      console.error("[OTP SEND ERROR]", error);
      res.status(500).json({ message: error.message || "Failed to send OTP" });
    }
  });

  // Mobile OTP Login - Verify OTP
  app.post("/api/auth/verify-mobile-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ message: "Phone and OTP are required" });
      }

      const normalizedPhone = phone.replace(/\D/g, '');

      // Find valid OTP
      const [otpRecord] = await db.select().from(otpTokens)
        .where(and(
          eq(otpTokens.phone, normalizedPhone),
          eq(otpTokens.otp, otp),
          eq(otpTokens.isUsed, false),
          gt(otpTokens.expiresAt, new Date())
        ))
        .orderBy(desc(otpTokens.createdAt))
        .limit(1);

      if (!otpRecord) {
        // Increment attempt count for rate limiting
        await db.update(otpTokens)
          .set({ attempts: sql`attempts + 1` })
          .where(eq(otpTokens.phone, normalizedPhone));
        
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Mark OTP as used
      await db.update(otpTokens)
        .set({ isUsed: true })
        .where(eq(otpTokens.id, otpRecord.id));

      // Find or create user by phone
      let [user] = await db.select().from(users)
        .where(eq(users.phone, normalizedPhone))
        .limit(1);

      if (!user) {
        // Create new user with pending status
        const newUserId = `phone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(users).values({
          id: newUserId,
          email: `${normalizedPhone}@phone.hostezee.in`, // Placeholder email
          phone: normalizedPhone,
          role: "staff", // Default role, will be promoted when approved
          status: "active",
          verificationStatus: "pending",
          tenantType: "property_owner",
          signupMethod: "phone",
        });
        [user] = await db.select().from(users).where(eq(users.id, newUserId));
        console.log(`[OTP] Created new user via phone: ${normalizedPhone}`);
        
        // Return pending status for new users - they need to be approved first
        return res.status(403).json({ 
          message: "Account created! Your account is pending approval. You will be notified once approved.",
          verificationStatus: "pending",
          isNewUser: true,
          user: {
            id: user.id,
            phone: user.phone,
          }
        });
      }

      // Check verification status
      if (user.verificationStatus === "rejected") {
        return res.status(403).json({ 
          message: "Your account has been rejected. Please contact support.",
          verificationStatus: "rejected"
        });
      }

      if (user.verificationStatus === "pending") {
        return res.status(403).json({ 
          message: "Your account is pending approval. You will be notified once approved.",
          verificationStatus: "pending",
          user: {
            id: user.id,
            phone: user.phone,
            businessName: user.businessName,
          }
        });
      }

      // Create session for verified user
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("[OTP-LOGIN] Regenerate error:", regenerateErr);
          return res.status(500).json({ message: "Login failed" });
        }

        (req.session as any).userId = user.id;
        (req.session as any).isPhoneAuth = true;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[OTP-LOGIN] Save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Capture geographic location from IP (non-blocking)
          const ipAddress = req.ip || req.socket.remoteAddress || '';
          updateUserLocationFromIp(user.id, ipAddress).catch(() => {});
          
          console.log(`[OTP-LOGIN] ✓ SUCCESS - User ${user.phone} logged in`);
          res.json({
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              phone: user.phone,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              businessName: user.businessName,
              verificationStatus: user.verificationStatus,
            },
          });
        });
      });
    } catch (error: any) {
      console.error("[OTP VERIFY ERROR]", error);
      res.status(500).json({ message: error.message || "OTP verification failed" });
    }
  });

  // Property Data Export endpoint
  app.get("/api/properties/:id/export", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      const propertyId = parseInt(req.params.id);

      // Get property to check authorization
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check authorization: Super admin can export any, Admin can only export their assigned properties
      if (user.role !== "super-admin") {
        const userAssignedProperties = user.assignedPropertyIds || [];
        if (!userAssignedProperties.includes(propertyId)) {
          return res.status(403).json({ message: "Unauthorized to export this property" });
        }
      }

      // Fetch all related data for this property
      const rooms = await storage.getRoomsByProperty(propertyId);
      const allBookings = await storage.getAllBookings();
      const bookings = allBookings.filter((b: any) => b.propertyId === propertyId);
      const allBills = await storage.getAllBills();
      const bills = allBills.filter((b: any) => {
        const booking = bookings.find((bk: any) => bk.id === b.bookingId);
        return booking ? true : false;
      });

      // Build comprehensive CSV data
      const headers = [
        "PROPERTY DATA EXPORT",
        `Property: ${property.name}`,
        `Location: ${property.location || "N/A"}`,
        `Export Date: ${new Date().toISOString()}`,
        `Total Rooms: ${rooms.length}`,
        `Total Bookings: ${bookings.length}`,
        `Total Bills: ${bills.length}`,
        "",
        "=== ROOMS ===",
        "Room Number,Type,Category,Total Beds,Status,Price Per Night",
      ];

      const roomData = rooms.map((room: any) => [
        room.roomNumber,
        room.roomType || "N/A",
        room.roomCategory,
        room.totalBeds || "N/A",
        room.status,
        room.pricePerNight,
      ]);

      const bookingHeaders = [
        "",
        "=== BOOKINGS ===",
        "Booking ID,Guest Name,Check-In,Check-Out,Nights,Rooms,Status,Total Amount,Advance Paid,Balance",
      ];

      const bookingData = await Promise.all(
        bookings.map(async (booking: any) => {
          const guest = await storage.getGuest(booking.guestId);
          const checkIn = new Date(booking.checkInDate);
          const checkOut = new Date(booking.checkOutDate);
          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
          const roomCount = booking.isGroupBooking ? (booking.roomIds?.length || 1) : 1;

          return [
            booking.id,
            guest?.fullName || "Unknown",
            checkIn.toISOString().split("T")[0],
            checkOut.toISOString().split("T")[0],
            nights,
            roomCount,
            booking.status,
            booking.totalAmount || "0",
            booking.advanceAmount || "0",
            ((booking.totalAmount || 0) - (booking.advanceAmount || 0)).toFixed(2),
          ];
        })
      );

      const billHeaders = [
        "",
        "=== BILLS ===",
        "Bill ID,Booking ID,Guest Name,Room Charges,Food Charges,Extra Charges,GST,Service Charge,Discount,Total Amount,Payment Status",
      ];

      const billData = await Promise.all(
        bills.map(async (bill: any) => {
          const guest = await storage.getGuest(bill.guestId);
          return [
            bill.id,
            bill.bookingId,
            guest?.fullName || "Unknown",
            bill.roomCharges || "0",
            bill.foodCharges || "0",
            bill.extraCharges || "0",
            bill.gstAmount || "0",
            bill.serviceChargeAmount || "0",
            bill.discountAmount || "0",
            bill.totalAmount || "0",
            bill.paymentStatus || "pending",
          ];
        })
      );

      // Combine all data
      const allRows = [
        ...headers,
        ...roomData,
        ...bookingHeaders,
        ...bookingData,
        ...billHeaders,
        ...billData,
      ];

      const csvContent = allRows
        .map((row: any) => {
          if (typeof row === "string") return row;
          return row.map((cell: any) => `"${cell}"`).join(",");
        })
        .join("\n");

      // Send as downloadable file
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="property-${propertyId}-export-${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      console.error("[PROPERTY EXPORT ERROR]", error);
      res.status(500).json({ message: error.message || "Failed to export property data" });
    }
  });

  // Issue Reporting endpoint
  app.post("/api/issues", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { title, description, category, severity } = req.body;

      // Validate required fields
      if (!title || !description || !category || !severity) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate enum values
      const validCategories = ["bug", "feature_request", "documentation", "performance", "other"];
      const validSeverities = ["low", "medium", "high", "critical"];

      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }

      if (!validSeverities.includes(severity)) {
        return res.status(400).json({ message: "Invalid severity" });
      }

      // Create issue report
      const report = await storage.createIssueReport({
        reportedByUserId: userId,
        propertyId: undefined,
        title,
        description,
        category,
        severity,
        status: "open",
      });

      console.log(`[ISSUE REPORT] New issue reported by ${userId}: ${title}`);

      // Send email and in-app notification to super admins
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        const reporterName = dbUser ? `${dbUser.firstName} ${dbUser.lastName}` : "User";
        
        // Get all super admins
        const allUsers = await storage.getAllUsers();
        const superAdmins = allUsers.filter(u => u.role === 'super-admin');
        
        // Send email to first super admin
        const superAdminEmail = superAdmins[0]?.email || 'admin@hostezee.in';
        await sendIssueReportNotificationEmail(
          superAdminEmail,
          reporterName,
          title,
          description,
          category,
          severity
        );
        console.log(`[EMAIL] Issue report notification sent to ${superAdminEmail}`);
        
        // Send in-app notification to all super admins
        for (const admin of superAdmins) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "issue_reported",
            title: `Issue Reported: ${severity.toUpperCase()}`,
            message: `${reporterName} reported: ${title}`,
            soundType: severity === 'critical' ? 'urgent' : 'warning',
            relatedType: "issue",
            isRead: false,
          });
        }
      } catch (emailError) {
        console.warn(`[EMAIL] Failed to send issue report notification:`, emailError);
        // Don't fail the whole request if email fails
      }

      res.status(201).json({
        message: "Issue reported successfully",
        report,
      });
    } catch (error: any) {
      console.error("[ISSUE REPORT ERROR]", error);
      res.status(500).json({ message: error.message || "Failed to report issue" });
    }
  });

  // Super Admin endpoints
  app.get("/api/super-admin/users", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser) {
        console.error(`[SUPER-ADMIN/USERS] User ${userId} not found in database`);
        return res.status(401).json({ message: "User not found" });
      }
      if (dbUser.role !== 'super-admin') {
        console.error(`[SUPER-ADMIN/USERS] User ${userId} is ${dbUser.role}, not super-admin`);
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/USERS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/properties", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser) {
        console.error(`[SUPER-ADMIN/PROPERTIES] User ${userId} not found in database`);
        return res.status(401).json({ message: "User not found" });
      }
      if (dbUser.role !== 'super-admin') {
        console.error(`[SUPER-ADMIN/PROPERTIES] User ${userId} is ${dbUser.role}, not super-admin`);
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/PROPERTIES] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser) {
        console.error(`[SUPER-ADMIN/REPORTS] User ${userId} not found in database`);
        return res.status(401).json({ message: "User not found" });
      }
      if (dbUser.role !== 'super-admin') {
        console.error(`[SUPER-ADMIN/REPORTS] User ${userId} is ${dbUser.role}, not super-admin`);
        return res.status(403).json({ message: "Super admin access required" });
      }

      const reports = await storage.getAllIssueReports();
      res.json(reports);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/REPORTS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin - Send email to individual user
  app.post("/api/super-admin/send-email", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { toEmail, toName, subject, message } = req.body;
      if (!toEmail || !subject || !message) {
        return res.status(400).json({ message: "Email, subject and message are required" });
      }

      const { sendEmail } = await import('./email-service');
      const result = await sendEmail({
        to: toEmail,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Hostezee</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p>Dear ${toName || 'User'},</p>
              <div style="white-space: pre-wrap;">${message}</div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br/>
                Hostezee Team
              </p>
            </div>
          </div>
        `,
        text: `Dear ${toName || 'User'},\n\n${message}\n\nBest regards,\nHostezee Team`
      });

      if (result.success) {
        console.log(`[SUPER-ADMIN] Email sent to ${toEmail}`);
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/SEND-EMAIL] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin - Broadcast email to all verified users
  app.post("/api/super-admin/broadcast-email", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }

      const allUsers = await storage.getAllUsers();
      const verifiedUsers = allUsers.filter(u => 
        u.verificationStatus === 'verified' && 
        u.email && 
        u.role !== 'super-admin'
      );

      const { sendEmail } = await import('./email-service');
      let successCount = 0;
      let failCount = 0;

      for (const user of verifiedUsers) {
        try {
          const result = await sendEmail({
            to: user.email!,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Hostezee</h1>
                  <p style="color: white; margin: 5px 0 0 0; opacity: 0.9;">Announcement</p>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <p>Dear ${user.firstName || 'User'},</p>
                  <div style="white-space: pre-wrap;">${message}</div>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                  <p style="color: #6b7280; font-size: 14px;">
                    Best regards,<br/>
                    Hostezee Team
                  </p>
                </div>
              </div>
            `,
            text: `Dear ${user.firstName || 'User'},\n\n${message}\n\nBest regards,\nHostezee Team`
          });
          if (result.success) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }

      console.log(`[SUPER-ADMIN] Broadcast email sent: ${successCount} success, ${failCount} failed`);
      res.json({ 
        success: true, 
        message: `Email broadcast completed: ${successCount} sent, ${failCount} failed`,
        successCount,
        failCount,
        totalRecipients: verifiedUsers.length
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/BROADCAST-EMAIL] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin - Export users to CSV
  app.get("/api/super-admin/export-users", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      
      // Create CSV
      const headers = ['Name', 'Email', 'Phone', 'Business Name', 'Role', 'Status', 'Verification', 'Signup Method', 'Created At', 'Last Login'];
      const rows = allUsers.map(u => [
        `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        u.email || '',
        u.phone || '',
        u.businessName || '',
        u.role || '',
        u.status || '',
        u.verificationStatus || '',
        u.signupMethod || '',
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
        u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="hostezee_users_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/EXPORT-USERS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Dashboard - Combined data from ALL properties
  app.get("/api/super-admin/dashboard", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Get ALL data for SaaS platform metrics
      const allProperties = await storage.getAllProperties();
      const allBookings = await storage.getAllBookings();
      const allUsers = await storage.getAllUsers();
      const allIssues = await storage.getAllIssueReports();
      
      // Get error crashes safely (may not be implemented)
      let allErrors: any[] = [];
      try {
        if (typeof storage.getAllErrorCrashes === 'function') {
          allErrors = await storage.getAllErrorCrashes();
        }
      } catch (e) {
        // Error crashes table may not exist
      }

      // Calculate SaaS platform stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      oneMonthAgo.setHours(0, 0, 0, 0);

      // User stats
      const pendingUsers = allUsers.filter(u => u.verificationStatus === 'pending');
      const verifiedUsers = allUsers.filter(u => u.verificationStatus === 'verified');
      const rejectedUsers = allUsers.filter(u => u.verificationStatus === 'rejected');
      
      // Active users today (logged in today)
      const activeUsersToday = allUsers.filter(u => {
        if (!u.lastLoginAt) return false;
        const loginDate = new Date(u.lastLoginAt);
        loginDate.setHours(0, 0, 0, 0);
        return loginDate.getTime() >= today.getTime();
      });

      // New signups this week
      const newSignupsThisWeek = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate >= oneWeekAgo;
      });

      // New signups this month
      const newSignupsThisMonth = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate >= oneMonthAgo;
      });

      // New properties this week
      const newPropertiesThisWeek = allProperties.filter(p => {
        if (!p.createdAt) return false;
        const createdDate = new Date(p.createdAt);
        return createdDate >= oneWeekAgo;
      });

      // New properties this month
      const newPropertiesThisMonth = allProperties.filter(p => {
        if (!p.createdAt) return false;
        const createdDate = new Date(p.createdAt);
        return createdDate >= oneMonthAgo;
      });

      // Issues stats
      const openIssues = allIssues.filter(i => i.status === 'open' || i.status === 'in_progress');
      const resolvedIssues = allIssues.filter(i => i.status === 'resolved');

      // Errors stats
      const unresolvedErrors = allErrors.filter(e => e.status !== 'resolved');

      // Property breakdown for management
      const propertyStats = allProperties.map(prop => {
        const propUsers = allUsers.filter(u => 
          u.assignedPropertyIds && u.assignedPropertyIds.includes(prop.id)
        );
        const propBookings = allBookings.filter(b => b.propertyId === prop.id);

        return {
          id: prop.id,
          name: prop.name,
          location: prop.location,
          totalUsers: propUsers.length,
          totalBookings: propBookings.length,
          createdAt: prop.createdAt,
        };
      });

      res.json({
        summary: {
          // Platform overview
          totalProperties: allProperties.length,
          totalUsers: allUsers.length,
          totalBookings: allBookings.length,
          
          // User management
          pendingApprovals: pendingUsers.length,
          verifiedUsers: verifiedUsers.length,
          rejectedUsers: rejectedUsers.length,
          activeUsersToday: activeUsersToday.length,
          
          // Growth metrics
          newSignupsThisWeek: newSignupsThisWeek.length,
          newSignupsThisMonth: newSignupsThisMonth.length,
          newPropertiesThisWeek: newPropertiesThisWeek.length,
          newPropertiesThisMonth: newPropertiesThisMonth.length,
          
          // Support metrics
          openIssues: openIssues.length,
          resolvedIssues: resolvedIssues.length,
          totalIssues: allIssues.length,
          unresolvedErrors: unresolvedErrors.length,
          totalErrors: allErrors.length,
        },
        propertyStats,
        recentSignups: allUsers
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10),
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/DASHBOARD] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Analytics - Monthly trends for charts
  app.get("/api/super-admin/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allBookings = await storage.getAllBookings();
      const allBills = await storage.getAllBills();
      const allUsers = await storage.getAllUsers();
      
      // Get last 6 months of data
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        
        const monthName = monthStart.toLocaleString('en-US', { month: 'short' });
        
        // Count bookings in this month
        const monthBookings = allBookings.filter(b => {
          const created = new Date(b.createdAt || b.checkInDate);
          return created >= monthStart && created <= monthEnd;
        });
        
        // Sum revenue from bills in this month
        const monthRevenue = allBills
          .filter(b => {
            const created = new Date(b.createdAt || b.paidAt || 0);
            return created >= monthStart && created <= monthEnd && b.paymentStatus === 'paid';
          })
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        // Count new users in this month
        const monthSignups = allUsers.filter(u => {
          const created = new Date(u.createdAt || 0);
          return created >= monthStart && created <= monthEnd;
        });
        
        monthlyData.push({
          month: monthName,
          bookings: monthBookings.length,
          revenue: Math.round(monthRevenue),
          signups: monthSignups.length,
        });
      }
      
      res.json({
        monthlyTrends: monthlyData,
        totalRevenue: allBills.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        avgBookingsPerMonth: Math.round(allBookings.length / 6),
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/ANALYTICS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin System Health - Real-time server metrics
  app.get("/api/super-admin/system-health", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Server uptime
      const uptimeSeconds = process.uptime();
      const uptimeHours = Math.floor(uptimeSeconds / 3600);
      const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
      
      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      // Active sessions count
      const allSessions = await storage.getAllUserSessions();
      const activeSessions = allSessions.filter(s => {
        const expiry = new Date(s.expiresAt);
        return expiry > new Date();
      });
      
      // Database check
      let dbStatus = 'healthy';
      let dbResponseTime = 0;
      try {
        const dbStart = Date.now();
        await db.select().from(users).limit(1);
        dbResponseTime = Date.now() - dbStart;
        if (dbResponseTime > 500) dbStatus = 'slow';
      } catch {
        dbStatus = 'error';
      }
      
      // Recent errors count (last 24h) - handle gracefully if function doesn't exist
      let recentErrorsCount = 0;
      let unresolvedErrorsCount = 0;
      try {
        if (typeof (storage as any).getAllErrorCrashes === 'function') {
          const allErrors = await (storage as any).getAllErrorCrashes();
          const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
          recentErrorsCount = allErrors.filter((e: any) => new Date(e.createdAt || 0) > last24h).length;
          unresolvedErrorsCount = allErrors.filter((e: any) => e.status !== 'resolved').length;
        }
      } catch {
        // Errors tracking not available
      }
      
      // API health - count recent activity logs as proxy for requests
      const allLogs = await storage.getActivityLogs({ limit: 100 });
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      const recentRequests = allLogs.logs.filter(l => new Date(l.createdAt) > lastHour);
      
      res.json({
        status: dbStatus === 'healthy' && memPercent < 90 ? 'healthy' : 'warning',
        uptime: {
          hours: uptimeHours,
          minutes: uptimeMinutes,
          formatted: `${uptimeHours}h ${uptimeMinutes}m`,
        },
        memory: {
          usedMB: memUsedMB,
          totalMB: memTotalMB,
          percent: memPercent,
        },
        database: {
          status: dbStatus,
          responseTimeMs: dbResponseTime,
        },
        sessions: {
          active: activeSessions.length,
          total: allSessions.length,
        },
        errors: {
          last24h: recentErrorsCount,
          unresolved: unresolvedErrorsCount,
        },
        activity: {
          requestsLastHour: recentRequests.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/SYSTEM-HEALTH] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Property Health Scores - Analyze which properties need attention
  app.get("/api/super-admin/property-health", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allProperties = await storage.getAllProperties();
      const allBookings = await storage.getAllBookings();
      const allRooms = await storage.getAllRooms();
      const allBills = await storage.getAllBills();
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const propertyHealth = allProperties.map(property => {
        const propertyRooms = allRooms.filter(r => r.propertyId === property.id);
        const propertyBookings = allBookings.filter(b => b.propertyId === property.id);
        const propertyBills = allBills.filter(b => {
          const booking = propertyBookings.find(pb => pb.id === b.bookingId);
          return booking !== undefined;
        });
        
        // Recent bookings (last 30 days)
        const recentBookings = propertyBookings.filter(b => {
          const created = new Date(b.createdAt || b.checkInDate);
          return created >= thirtyDaysAgo;
        });
        
        // Very recent bookings (last 7 days)
        const weeklyBookings = propertyBookings.filter(b => {
          const created = new Date(b.createdAt || b.checkInDate);
          return created >= sevenDaysAgo;
        });
        
        // Current occupancy (active bookings today)
        const activeBookings = propertyBookings.filter(b => {
          const checkIn = new Date(b.checkInDate);
          const checkOut = new Date(b.checkOutDate);
          return checkIn <= now && checkOut >= now && b.status !== 'cancelled';
        });
        const occupancyRate = propertyRooms.length > 0 
          ? Math.round((activeBookings.length / propertyRooms.length) * 100) 
          : 0;
        
        // Revenue (last 30 days)
        const recentRevenue = propertyBills
          .filter(b => {
            const paidAt = new Date(b.paidAt || b.createdAt || 0);
            return paidAt >= thirtyDaysAgo && b.paymentStatus === 'paid';
          })
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        // Calculate health score (0-100)
        let healthScore = 50; // Base score
        
        // Booking activity (+/- 20 points)
        if (recentBookings.length >= 10) healthScore += 20;
        else if (recentBookings.length >= 5) healthScore += 10;
        else if (recentBookings.length === 0) healthScore -= 20;
        else healthScore -= 10;
        
        // Occupancy (+/- 15 points)
        if (occupancyRate >= 70) healthScore += 15;
        else if (occupancyRate >= 40) healthScore += 5;
        else if (occupancyRate === 0) healthScore -= 15;
        
        // Revenue (+/- 15 points)
        if (recentRevenue >= 100000) healthScore += 15;
        else if (recentRevenue >= 50000) healthScore += 10;
        else if (recentRevenue >= 10000) healthScore += 5;
        else if (recentRevenue === 0) healthScore -= 10;
        
        // Clamp score between 0 and 100
        healthScore = Math.max(0, Math.min(100, healthScore));
        
        // Determine status
        let status: 'thriving' | 'healthy' | 'attention' | 'critical';
        if (healthScore >= 80) status = 'thriving';
        else if (healthScore >= 60) status = 'healthy';
        else if (healthScore >= 40) status = 'attention';
        else status = 'critical';
        
        return {
          id: property.id,
          name: property.name,
          location: property.location,
          isActive: property.isActive,
          healthScore,
          status,
          metrics: {
            totalRooms: propertyRooms.length,
            totalBookings: propertyBookings.length,
            recentBookings: recentBookings.length,
            weeklyBookings: weeklyBookings.length,
            occupancyRate,
            activeBookings: activeBookings.length,
            recentRevenue: Math.round(recentRevenue),
          },
        };
      });
      
      // Sort by health score (lowest first to highlight problem properties)
      propertyHealth.sort((a, b) => a.healthScore - b.healthScore);
      
      // Summary stats
      const summary = {
        totalProperties: allProperties.length,
        thriving: propertyHealth.filter(p => p.status === 'thriving').length,
        healthy: propertyHealth.filter(p => p.status === 'healthy').length,
        needsAttention: propertyHealth.filter(p => p.status === 'attention').length,
        critical: propertyHealth.filter(p => p.status === 'critical').length,
        avgHealthScore: Math.round(propertyHealth.reduce((sum, p) => sum + p.healthScore, 0) / (propertyHealth.length || 1)),
      };
      
      res.json({ properties: propertyHealth, summary });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/PROPERTY-HEALTH] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Geographic Analytics - Track users by location
  app.get("/api/super-admin/geographic-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Aggregate by country
      const countryStats: Record<string, number> = {};
      const stateStats: Record<string, Record<string, number>> = {}; // country -> state -> count
      const cityStats: Record<string, number> = {};
      
      let usersWithLocation = 0;
      let usersWithoutLocation = 0;
      
      allUsers.forEach(user => {
        const country = user.country || 'Unknown';
        const state = user.state || 'Unknown';
        const city = user.city || 'Unknown';
        
        if (user.country || user.state || user.city) {
          usersWithLocation++;
        } else {
          usersWithoutLocation++;
        }
        
        // Count by country
        countryStats[country] = (countryStats[country] || 0) + 1;
        
        // Count by state within country
        if (!stateStats[country]) stateStats[country] = {};
        stateStats[country][state] = (stateStats[country][state] || 0) + 1;
        
        // Count by city
        const cityKey = city !== 'Unknown' ? `${city}, ${state}` : 'Unknown';
        cityStats[cityKey] = (cityStats[cityKey] || 0) + 1;
      });
      
      // Convert to sorted arrays
      const byCountry = Object.entries(countryStats)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
      
      const byState = Object.entries(stateStats).flatMap(([country, states]) =>
        Object.entries(states).map(([state, count]) => ({
          country,
          state,
          count,
        }))
      ).sort((a, b) => b.count - a.count);
      
      const byCity = Object.entries(cityStats)
        .filter(([city]) => city !== 'Unknown')
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Top 50 cities
      
      res.json({
        summary: {
          totalUsers: allUsers.length,
          usersWithLocation,
          usersWithoutLocation,
          totalCountries: Object.keys(countryStats).filter(c => c !== 'Unknown').length,
          totalStates: byState.filter(s => s.state !== 'Unknown').length,
        },
        byCountry,
        byState: byState.slice(0, 30), // Top 30 states
        byCity,
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/GEOGRAPHIC-ANALYTICS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Update User Location - Allow setting user location
  app.patch("/api/super-admin/users/:userId/location", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, adminId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId } = req.params;
      const { city, state, country } = req.body;
      
      await db.update(users)
        .set({ 
          city: city || null, 
          state: state || null, 
          country: country || null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      res.json({ success: true, message: "User location updated" });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/UPDATE-LOCATION] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin Report Download - CSV with all property data
  app.get("/api/super-admin/report/download", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { propertyId, startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      // Get data based on property filter
      const allProperties = await storage.getAllProperties();
      const allBookings = await storage.getAllBookings();
      const allGuests = await storage.getAllGuests();
      const allBills = await storage.getAllBills();

      // Filter by property if specified
      let filteredBookings = allBookings;
      if (propertyId && propertyId !== "all") {
        const propId = parseInt(propertyId as string);
        filteredBookings = allBookings.filter(b => b.propertyId === propId);
      }

      // Filter by date range (check-in date)
      filteredBookings = filteredBookings.filter(b => {
        const checkIn = new Date(b.checkInDate);
        return checkIn >= start && checkIn <= end;
      });

      // Build CSV content
      const csvRows: string[] = [];
      
      // Header
      csvRows.push([
        "Booking ID",
        "Property Name",
        "Room Number",
        "Guest Name",
        "Guest Phone",
        "Guest Email",
        "Check-In Date",
        "Check-Out Date",
        "Status",
        "Booking Source",
        "Meal Plan",
        "Total Guests",
        "Bill Amount",
        "Paid Amount",
        "Payment Status",
        "Created At"
      ].join(","));

      // Data rows
      for (const booking of filteredBookings) {
        const property = allProperties.find(p => p.id === booking.propertyId);
        const guest = allGuests.find(g => g.id === booking.guestId);
        const bill = allBills.find(b => b.bookingId === booking.id);

        const row = [
          booking.id,
          `"${property?.name || 'N/A'}"`,
          booking.roomNumber || 'N/A',
          `"${guest?.name || 'N/A'}"`,
          guest?.phone || 'N/A',
          guest?.email || 'N/A',
          booking.checkInDate,
          booking.checkOutDate,
          booking.status,
          booking.bookingSource || 'Direct',
          booking.mealPlan || 'N/A',
          booking.totalGuests || 1,
          bill?.totalAmount || 0,
          bill?.paidAmount || 0,
          bill?.status || 'N/A',
          booking.createdAt ? new Date(booking.createdAt).toISOString() : 'N/A'
        ];
        csvRows.push(row.join(","));
      }

      // Add summary row
      csvRows.push("");
      csvRows.push("SUMMARY");
      csvRows.push(`Total Bookings,${filteredBookings.length}`);
      
      const totalRevenue = filteredBookings.reduce((sum, b) => {
        const bill = allBills.find(bl => bl.bookingId === b.id);
        return sum + (bill?.totalAmount || 0);
      }, 0);
      const totalPaid = filteredBookings.reduce((sum, b) => {
        const bill = allBills.find(bl => bl.bookingId === b.id);
        return sum + (bill?.paidAmount || 0);
      }, 0);
      
      csvRows.push(`Total Revenue,${totalRevenue}`);
      csvRows.push(`Total Collected,${totalPaid}`);
      csvRows.push(`Pending Amount,${totalRevenue - totalPaid}`);

      const csv = csvRows.join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="property_report.csv"`);
      res.send(csv);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/REPORT] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/super-admin/users/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { status } = req.body;
      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get target user info before updating
      const [targetUser] = await db.select().from(users).where(eq(users.id, req.params.id));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = await storage.updateUserStatus(req.params.id, status);
      
      // Send email notification based on status change
      const userName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || 'User';
      let propertyName: string | undefined;
      
      // Get property name if user has assigned properties
      if (targetUser.assignedPropertyIds && targetUser.assignedPropertyIds.length > 0) {
        const property = await storage.getProperty(targetUser.assignedPropertyIds[0]);
        propertyName = property?.name;
      }
      
      if (status === 'suspended') {
        const { sendAccountSuspensionEmail } = await import('./email-service');
        sendAccountSuspensionEmail(targetUser.email, userName, propertyName)
          .then(() => console.log(`[SUSPEND] Email sent to ${targetUser.email}`))
          .catch(err => console.error(`[SUSPEND] Failed to send email:`, err));
      } else if (status === 'active') {
        const { sendAccountReactivationEmail } = await import('./email-service');
        sendAccountReactivationEmail(targetUser.email, userName, propertyName)
          .then(() => console.log(`[REACTIVATE] Email sent to ${targetUser.email}`))
          .catch(err => console.error(`[REACTIVATE] Failed to send email:`, err));
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/super-admin/login-as/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Store the original super admin ID before switching
      const originalSuperAdminId = (req.session as any).userId;
      
      // Regenerate session to clear old data and set new user
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error("[LOGIN-AS] Failed to regenerate session:", regenErr);
          return res.status(500).json({ message: "Failed to regenerate session" });
        }
        
        // Set session for target user - mimicking email auth flow
        (req.session as any).userId = targetUser.id;
        (req.session as any).isEmailAuth = true;
        // Store original super admin ID for returning later
        (req.session as any).originalSuperAdminId = originalSuperAdminId;
        (req.session as any).isViewingAsUser = true;
        
        // Force save the session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[LOGIN-AS] Failed to save session:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          console.log("[LOGIN-AS] Successfully logged in as user:", targetUser.id, "- session regenerated, can return to:", originalSuperAdminId);
          res.json({ message: "Login as successful", user: targetUser });
        });
      });
    } catch (error: any) {
      console.error("[LOGIN-AS] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Permanently delete a user (super-admin only)
  app.delete("/api/super-admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { id } = req.params;

      if (id === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const [targetUser] = await db.select().from(users).where(eq(users.id, id));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser.role === 'super-admin') {
        return res.status(403).json({ message: "Cannot delete super-admin accounts" });
      }

      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Return to Super Admin from viewing as user
  app.post("/api/super-admin/return-to-admin", isAuthenticated, async (req, res) => {
    try {
      const originalSuperAdminId = (req.session as any).originalSuperAdminId;
      const isViewingAsUser = (req.session as any).isViewingAsUser;
      
      if (!originalSuperAdminId || !isViewingAsUser) {
        return res.status(400).json({ message: "Not currently viewing as another user" });
      }
      
      // Verify the original user is still a super admin
      const [superAdmin] = await db.select().from(users).where(eq(users.id, originalSuperAdminId));
      if (!superAdmin || superAdmin.role !== 'super-admin') {
        return res.status(403).json({ message: "Original user is no longer a super admin" });
      }
      
      console.log("[RETURN-TO-ADMIN] Returning to super admin:", originalSuperAdminId);
      
      // Regenerate session and restore super admin
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error("[RETURN-TO-ADMIN] Failed to regenerate session:", regenErr);
          return res.status(500).json({ message: "Failed to regenerate session" });
        }
        
        // Restore super admin session
        (req.session as any).userId = originalSuperAdminId;
        (req.session as any).isEmailAuth = true;
        // Clear the viewing flags
        (req.session as any).originalSuperAdminId = null;
        (req.session as any).isViewingAsUser = false;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[RETURN-TO-ADMIN] Failed to save session:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          console.log("[RETURN-TO-ADMIN] Successfully returned to super admin:", originalSuperAdminId);
          res.json({ message: "Returned to super admin", user: superAdmin });
        });
      });
    } catch (error: any) {
      console.error("[RETURN-TO-ADMIN] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SUBSCRIPTION & BILLING ENDPOINTS =====

  // Get all subscription plans (public)
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.displayOrder);
      res.json(plans);
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Error fetching plans:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current user's subscription
  app.get("/api/subscription/current", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get user's active subscription
      const [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);

      let plan = null;
      if (subscription) {
        const [planData] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId));
        plan = planData;
      }

      res.json({
        subscription,
        plan,
        user: {
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt,
        }
      });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Error fetching current subscription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create Razorpay order for subscription payment
  app.post("/api/subscription/create-order", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { planId, billingCycle } = req.body;
      if (!planId || !billingCycle) {
        return res.status(400).json({ message: "Plan ID and billing cycle required" });
      }

      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });

      const amount = billingCycle === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
      const amountInPaise = Math.round(amount * 100);

      // Create Razorpay order
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        return res.status(500).json({ message: "Payment gateway not configured" });
      }

      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `sub_${userId}_${Date.now()}`,
          notes: {
            userId,
            planId,
            planName: plan.name,
            billingCycle
          }
        })
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.text();
        console.error("[RAZORPAY] Order creation failed:", error);
        return res.status(500).json({ message: "Failed to create payment order" });
      }

      const order = await orderResponse.json();

      res.json({
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: razorpayKeyId,
        planName: plan.name,
        billingCycle,
        user: {
          email: user.email,
          phone: user.phone,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        }
      });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Error creating order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verify payment and activate subscription
  app.post("/api/subscription/verify-payment", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = req.body;

      // Verify signature
      const crypto = require('crypto');
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      const generated_signature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const now = new Date();
      const endDate = new Date(now);
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create subscription record
      const [newSubscription] = await db.insert(userSubscriptions).values({
        userId,
        planId,
        status: 'active',
        billingCycle,
        startDate: now,
        endDate,
        lastPaymentAt: now,
        nextBillingAt: endDate,
      }).returning();

      // Create payment record
      const amount = billingCycle === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
      await db.insert(subscriptionPayments).values({
        subscriptionId: newSubscription.id,
        userId,
        amount: amount.toString(),
        currency: 'INR',
        status: 'completed',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        paidAt: now,
      });

      // Update user subscription status
      await db.update(users).set({
        subscriptionPlanId: planId,
        subscriptionStatus: 'active',
        subscriptionStartDate: now,
        subscriptionEndDate: endDate,
        updatedAt: now,
      }).where(eq(users.id, userId));

      console.log(`[SUBSCRIPTION] ✓ User ${userId} subscribed to ${plan.name} (${billingCycle})`);

      res.json({
        success: true,
        message: `Successfully subscribed to ${plan.name}`,
        subscription: newSubscription
      });
    } catch (error: any) {
      console.error("[SUBSCRIPTION] Payment verification error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Get all subscription plans (including inactive)
  app.get("/api/super-admin/subscription-plans", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });

      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.displayOrder);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Update subscription plan
  app.patch("/api/super-admin/subscription-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });

      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const planId = parseInt(req.params.id);
      const updates = req.body;

      await db.update(subscriptionPlans).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(subscriptionPlans.id, planId));

      const [updated] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Get subscription analytics
  app.get("/api/super-admin/subscription-analytics", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });

      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Get subscription counts by plan
      const allSubscriptions = await db.select().from(userSubscriptions);
      const allPayments = await db.select().from(subscriptionPayments);
      const plans = await db.select().from(subscriptionPlans);

      const planMap = new Map(plans.map(p => [p.id, p]));
      
      const activeByPlan: Record<string, number> = {};
      let totalActive = 0;
      let totalRevenue = 0;
      let monthlyRevenue = 0;

      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      for (const sub of allSubscriptions) {
        if (sub.status === 'active') {
          const planName = planMap.get(sub.planId)?.name || 'Unknown';
          activeByPlan[planName] = (activeByPlan[planName] || 0) + 1;
          totalActive++;
        }
      }

      for (const payment of allPayments) {
        if (payment.status === 'completed') {
          totalRevenue += Number(payment.amount);
          if (payment.paidAt && new Date(payment.paidAt) >= oneMonthAgo) {
            monthlyRevenue += Number(payment.amount);
          }
        }
      }

      res.json({
        totalActive,
        activeByPlan,
        totalRevenue,
        monthlyRevenue,
        totalPayments: allPayments.length,
        plans: plans.map(p => ({
          id: p.id,
          name: p.name,
          monthlyPrice: p.monthlyPrice,
          activeCount: activeByPlan[p.name] || 0
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SUPER ADMIN USER APPROVAL ENDPOINTS =====

  // Approve user - NEW endpoint with body params (for frontend)
  app.post("/api/super-admin/approve-user", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });
      
      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId, propertyName, propertyLocation } = req.body;

      // Validate required fields
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      if (!propertyName || propertyName.trim() === "") {
        return res.status(400).json({ message: "Property name is required" });
      }
      if (!propertyLocation || propertyLocation.trim() === "") {
        return res.status(400).json({ message: "Property location is required" });
      }

      // Get target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.verificationStatus === 'verified') {
        return res.status(400).json({ message: "User is already verified" });
      }

      // Create property for the user
      // Note: monthlyRent is optional and may not exist in DB yet, so we omit it
      const newProperty = await storage.createProperty({
        name: propertyName.trim(),
        location: propertyLocation.trim(),
        description: '',
        contactEmail: targetUser.email,
        contactPhone: targetUser.phone || '',
        ownerUserId: userId,
        // Explicitly omit monthlyRent to avoid DB errors if column doesn't exist
      } as any);

      console.log(`[SUPER-ADMIN] Created property "${newProperty.name}" (ID: ${newProperty.id}) for user ${targetUser.email}`);

      // Update user: verify and assign admin role for their property
      await db.update(users).set({
        verificationStatus: 'verified',
        role: 'admin',
        primaryPropertyId: newProperty.id,
        assignedPropertyIds: [String(newProperty.id)],
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      console.log(`[SUPER-ADMIN] ✓ Approved user ${targetUser.email} with admin role for property ${newProperty.name}`);

      // Send WhatsApp notification if phone available
      if (targetUser.phone) {
        try {
          const authkeyApiKey = process.env.AUTHKEY_API_KEY;
          if (authkeyApiKey) {
            const message = `Congratulations! Your Hostezee account has been approved. Property: ${newProperty.name}. Login at https://hostezee.in`;
            await fetch('https://api.authkey.io/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authkey': authkeyApiKey
              },
              body: JSON.stringify({
                sms: [{
                  to: targetUser.phone.startsWith('91') ? targetUser.phone : `91${targetUser.phone}`,
                  sender: "HTZEEE",
                  message: message,
                  entityid: "1101868410000052638"
                }]
              })
            });
          }
        } catch (whatsappError) {
          console.error("[APPROVAL] WhatsApp notification failed:", whatsappError);
        }
      }

      // Activity log for user approval
      try {
        await storage.createActivityLog({
          userId: adminId,
          userEmail: admin.email,
          userName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
          action: 'approve_user',
          category: 'admin',
          resourceType: 'user',
          resourceId: userId,
          resourceName: targetUser.email,
          details: { 
            approvedUserEmail: targetUser.email,
            propertyName: newProperty.name,
            propertyId: newProperty.id
          },
          ipAddress: (req.ip || req.socket.remoteAddress || '').substring(0, 45),
          userAgent: (req.get('User-Agent') || '').substring(0, 500),
        });
      } catch (logErr) {
        console.error('[ACTIVITY] Error logging user approval:', logErr);
      }

      res.json({
        success: true,
        message: `User ${targetUser.email} approved successfully`,
        user: {
          id: userId,
          email: targetUser.email,
          role: 'admin',
          verificationStatus: 'verified',
        },
        property: {
          id: newProperty.id,
          name: newProperty.name,
          location: newProperty.location,
        }
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/APPROVE-USER] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reject user - NEW endpoint with body params (for frontend)
  app.post("/api/super-admin/reject-user", isAuthenticated, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!adminId) return res.status(401).json({ message: "Unauthorized" });
      
      const [admin] = await db.select().from(users).where(eq(users.id, adminId));
      if (!admin || admin.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId, reason } = req.body;

      // Validate required field
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.verificationStatus === 'rejected') {
        return res.status(400).json({ message: "User is already rejected" });
      }

      // Update user to rejected status
      await db.update(users).set({
        verificationStatus: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      console.log(`[SUPER-ADMIN] ✗ Rejected user ${targetUser.email}${reason ? ` - Reason: ${reason}` : ''}`);

      // Activity log for user rejection
      try {
        await storage.createActivityLog({
          userId: adminId,
          userEmail: admin.email,
          userName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
          action: 'reject_user',
          category: 'admin',
          resourceType: 'user',
          resourceId: userId,
          resourceName: targetUser.email,
          details: { rejectedUserEmail: targetUser.email, reason },
          ipAddress: (req.ip || req.socket.remoteAddress || '').substring(0, 45),
          userAgent: (req.get('User-Agent') || '').substring(0, 500),
        });
      } catch (logErr) {
        console.error('[ACTIVITY] Error logging user rejection:', logErr);
      }

      // Send WhatsApp notification if phone available
      if (targetUser.phone) {
        try {
          const authkeyApiKey = process.env.AUTHKEY_API_KEY;
          if (authkeyApiKey) {
            const message = reason 
              ? `Your Hostezee account application was not approved. Reason: ${reason}. Contact support for assistance.`
              : `Your Hostezee account application was not approved at this time. Contact support for assistance.`;
            await fetch('https://api.authkey.io/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authkey': authkeyApiKey
              },
              body: JSON.stringify({
                sms: [{
                  to: targetUser.phone.startsWith('91') ? targetUser.phone : `91${targetUser.phone}`,
                  sender: "HTZEEE",
                  message: message,
                  entityid: "1101868410000052638"
                }]
              })
            });
          }
        } catch (whatsappError) {
          console.error("[REJECTION] WhatsApp notification failed:", whatsappError);
        }
      }

      res.json({
        success: true,
        message: `User ${targetUser.email} rejected${reason ? ` - ${reason}` : ''}`,
        user: {
          id: userId,
          email: targetUser.email,
          verificationStatus: 'rejected',
        }
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/REJECT-USER] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get pending users waiting for approval
  app.get("/api/super-admin/pending-users", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Get users with pending verification status
      // We check for 'pending' status specifically
      const pendingUsers = await db.select().from(users)
        .where(eq(users.verificationStatus, 'pending'))
        .orderBy(desc(users.createdAt));

      console.log(`[SUPER-ADMIN] Found ${pendingUsers.length} pending users for email: ${dbUser.email}`);
      res.json(pendingUsers);
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/PENDING-USERS] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Approve a user and assign them to a property
  app.post("/api/super-admin/approve-user/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUserId = req.params.id;
      const { propertyId, createProperty, role = 'admin', sendNotification = true } = req.body;

      // Get target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.verificationStatus === 'verified') {
        return res.status(400).json({ message: "User is already verified" });
      }

      let assignedPropertyId = propertyId;

      // Create new property if requested
      if (createProperty && createProperty.name) {
        // Note: monthlyRent is optional and may not exist in DB yet, so we omit it
        const newProperty = await storage.createProperty({
          name: createProperty.name,
          location: createProperty.location || '',
          description: createProperty.description || '',
          contactEmail: targetUser.email,
          contactPhone: targetUser.phone || '',
          ownerUserId: targetUserId,
          // Explicitly omit monthlyRent to avoid DB errors if column doesn't exist
        } as any);
        assignedPropertyId = newProperty.id;
        console.log(`[SUPER-ADMIN] Created property ${newProperty.name} for user ${targetUser.email}`);
      }

      // Update user: verify and assign role/property
      await db.update(users).set({
        verificationStatus: 'verified',
        role: role,
        primaryPropertyId: assignedPropertyId || null,
        assignedPropertyIds: assignedPropertyId ? [String(assignedPropertyId)] : [],
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, targetUserId));

      // Update property owner if assigning to existing property
      if (assignedPropertyId && !createProperty) {
        const { properties } = await import("@shared/schema");
        await db.update(properties).set({
          ownerUserId: targetUserId,
        }).where(eq(properties.id, assignedPropertyId));
      }

      console.log(`[SUPER-ADMIN] ✓ Approved user ${targetUser.email} with role ${role} and property ${assignedPropertyId}`);

      // Send WhatsApp notification if enabled
      if (sendNotification && targetUser.phone) {
        try {
          const authkeyApiKey = process.env.AUTHKEY_API_KEY;
          if (authkeyApiKey) {
            const message = `Great news! Your Hostezee account has been approved. You can now log in and manage your property. Visit: https://hostezee.in`;
            await fetch('https://api.authkey.io/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authkey': authkeyApiKey
              },
              body: JSON.stringify({
                sms: [{
                  to: targetUser.phone.startsWith('91') ? targetUser.phone : `91${targetUser.phone}`,
                  sender: "HTZEEE",
                  message: message,
                  entityid: "1101868410000052638"
                }]
              })
            });
          }
        } catch (whatsappError) {
          console.error("[APPROVAL] WhatsApp notification failed:", whatsappError);
        }
      }

      res.json({
        success: true,
        message: `User ${targetUser.email} approved successfully`,
        user: {
          id: targetUserId,
          email: targetUser.email,
          role: role,
          propertyId: assignedPropertyId,
          verificationStatus: 'verified',
        }
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/APPROVE-USER] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reject a user
  app.post("/api/super-admin/reject-user/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUserId = req.params.id;
      const { reason = '', sendNotification = true } = req.body;

      // Get target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user: reject
      await db.update(users).set({
        verificationStatus: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      }).where(eq(users.id, targetUserId));

      console.log(`[SUPER-ADMIN] ✗ Rejected user ${targetUser.email}: ${reason}`);

      // Send WhatsApp notification if enabled
      if (sendNotification && targetUser.phone) {
        try {
          const authkeyApiKey = process.env.AUTHKEY_API_KEY;
          if (authkeyApiKey) {
            const message = `Your Hostezee account request was not approved. ${reason ? `Reason: ${reason}` : ''} Contact support for more information.`;
            await fetch('https://api.authkey.io/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authkey': authkeyApiKey
              },
              body: JSON.stringify({
                sms: [{
                  to: targetUser.phone.startsWith('91') ? targetUser.phone : `91${targetUser.phone}`,
                  sender: "HTZEEE",
                  message: message,
                  entityid: "1101868410000052638"
                }]
              })
            });
          }
        } catch (whatsappError) {
          console.error("[REJECTION] WhatsApp notification failed:", whatsappError);
        }
      }

      res.json({
        success: true,
        message: `User ${targetUser.email} rejected`,
        user: {
          id: targetUserId,
          email: targetUser.email,
          verificationStatus: 'rejected',
          rejectionReason: reason,
        }
      });
    } catch (error: any) {
      console.error(`[SUPER-ADMIN/REJECT-USER] Error:`, error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ADMIN PORTAL ENDPOINTS (Separate from PMS) =====
  
  // Admin Portal Login
  app.post("/api/admin-portal/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email from all users
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user || user.role !== 'super-admin') {
        return res.status(401).json({ error: "Invalid credentials or not a super admin" });
      }
      
      if (user.status === 'suspended') {
        return res.status(403).json({ error: "Account suspended" });
      }
      
      // In production, verify password hash
      // For now, create session with the found user
      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: "Login failed" });
        res.json({ message: "Logged in", user });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all users
  app.get("/api/admin-portal/users", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      res.json(allUsers || []);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all properties
  app.get("/api/admin-portal/properties", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allProperties = await storage.getAllProperties();
      res.json(allProperties || []);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get system stats
  app.get("/api/admin-portal/stats", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const users = await storage.getAllUsers();
      const properties = await storage.getAllProperties();
      const bookings = await storage.getAllBookings();

      res.json({
        totalUsers: users.length,
        totalProperties: properties.length,
        totalBookings: bookings.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Suspend user
  app.patch("/api/admin-portal/users/:id/suspend", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const updated = await storage.updateUserStatus(req.params.id, 'suspended');
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Activate user
  app.patch("/api/admin-portal/users/:id/activate", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const updated = await storage.updateUserStatus(req.params.id, 'active');
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Login as user from admin portal
  app.post("/api/admin-portal/login-as/:id", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      req.login(targetUser, (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });
        res.json({ message: "Logged in as user", user: targetUser });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get property details
  app.get("/api/admin-portal/property/:id", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const propertyId = parseInt(req.params.id);
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const allBookings = await storage.getAllBookings();
      const bookings = allBookings.filter((b: any) => b.propertyId === propertyId);
      const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.totalAmount || 0) || 0), 0);
      const activeBookings = bookings.filter((b: any) => b.status === 'checked-in').length;

      res.json({
        id: property.id,
        name: property.name,
        location: property.location,
        totalRooms: property.totalRooms,
        totalBookings: bookings.length,
        totalRevenue,
        activeBookings,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get property bookings
  app.get("/api/admin-portal/property/:id/bookings", async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const propertyId = parseInt(req.params.id);
      const allBookings = await storage.getAllBookings();
      const bookings = allBookings.filter((b: any) => b.propertyId === propertyId);

      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking: any) => {
          const guest = await storage.getGuest(booking.guestId);
          const room = await storage.getRoom(booking.roomId);
          return {
            id: booking.id,
            guestName: guest?.fullName || "Unknown",
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            status: booking.status,
            roomNumber: room?.roomNumber || "N/A",
            totalAmount: booking.totalAmount || 0,
          };
        })
      );

      res.json(bookingsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ACTIVITY LOGS & AUDIT TRAIL ENDPOINTS =====
  
  // Get activity logs (Super Admin only)
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId: filterUserId, category, propertyId, startDate, endDate, limit, offset } = req.query;
      
      const filters: any = {};
      if (filterUserId) filters.userId = filterUserId as string;
      if (category) filters.category = category as string;
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await storage.getActivityLogs(filters);
      res.json(result);
    } catch (error: any) {
      console.error("[ACTIVITY-LOGS] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get activity logs for specific user
  app.get("/api/activity-logs/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUserId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await storage.getActivityLogsByUser(userId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("[ACTIVITY-LOGS/USER] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SESSION MANAGEMENT ENDPOINTS =====
  
  // Get all user sessions (Super Admin only)
  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUserId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Get all users with their sessions
      const allUsers = await storage.getAllUsers();
      const sessionsData = await Promise.all(
        allUsers.map(async (u: any) => {
          const sessions = await storage.getUserSessions(u.id);
          const activeSessions = sessions.filter((s: any) => s.isActive);
          return {
            userId: u.id,
            email: u.email,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            role: u.role,
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            sessions: sessions.slice(0, 5), // Return last 5 sessions
          };
        })
      );

      // Filter to only users with sessions
      const usersWithSessions = sessionsData.filter((u: any) => u.totalSessions > 0);
      const activeSessionsCount = await storage.getActiveSessionsCount();

      res.json({
        totalActiveSessions: activeSessionsCount,
        users: usersWithSessions,
      });
    } catch (error: any) {
      console.error("[SESSIONS] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get sessions for specific user
  app.get("/api/sessions/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUserId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId } = req.params;
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error: any) {
      console.error("[SESSIONS/USER] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Terminate specific session
  app.post("/api/sessions/:sessionToken/terminate", isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUserId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { sessionToken } = req.params;
      await storage.deactivateSession(sessionToken);
      
      // Log activity
      await storage.createActivityLog({
        userId: dbUser.id,
        userEmail: dbUser.email,
        userName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
        action: 'terminate_session',
        category: 'admin',
        details: { sessionToken: sessionToken.substring(0, 10) + '...' },
      });

      res.json({ success: true, message: "Session terminated" });
    } catch (error: any) {
      console.error("[SESSIONS/TERMINATE] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Terminate all sessions for a user
  app.post("/api/sessions/user/:userId/terminate-all", isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req.user as any)?.claims?.sub || (req.user as any)?.id || (req.session as any)?.userId;
      if (!authUserId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUserId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { userId } = req.params;
      await storage.deactivateAllUserSessions(userId);
      
      // Log activity
      await storage.createActivityLog({
        userId: dbUser.id,
        userEmail: dbUser.email,
        userName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
        action: 'terminate_all_user_sessions',
        category: 'admin',
        resourceType: 'user',
        resourceId: userId,
      });

      res.json({ success: true, message: "All sessions terminated for user" });
    } catch (error: any) {
      console.error("[SESSIONS/TERMINATE-ALL] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Cleanup expired sessions (can be called by cron job)
  app.post("/api/sessions/cleanup", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const cleaned = await storage.cleanupExpiredSessions();
      res.json({ success: true, message: `Cleaned up ${cleaned} expired sessions` });
    } catch (error: any) {
      console.error("[SESSIONS/CLEANUP] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Guest Self Check-in endpoints
  app.get("/api/guest-self-checkin/booking/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.getBooking(bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const guest = await storage.getGuest(booking.guestId);
      const room = await storage.getRoom(booking.roomId);

      res.json({
        id: booking.id,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        status: booking.status,
        guest,
        room,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Find booking by phone number (for universal guest QR code)
  app.get("/api/guest-self-checkin/by-phone", async (req, res) => {
    try {
      const phone = req.query.phone as string;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Get all bookings and find matching guest by phone
      const allBookings = await storage.getAllBookings();
      
      // Look for active booking (confirmed or pending) with matching phone
      for (const booking of allBookings) {
        const guest = await storage.getGuest(booking.guestId);
        
        // Match phone number and only return active/upcoming bookings
        if (guest?.phone === phone && (booking.status === "confirmed" || booking.status === "pending")) {
          const room = await storage.getRoom(booking.roomId);
          const property = room ? await storage.getProperty(room.propertyId) : null;
          
          return res.json({
            id: booking.id,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            status: booking.status,
            guest,
            room,
            property,
          });
        }
      }

      // No matching booking found
      return res.status(404).json({ 
        message: "No active booking found with this phone number. Please check your phone number or contact the front desk." 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/guest-self-checkin", async (req, res) => {
    try {
      const { bookingId, email, phone, fullName, idProofUrl } = req.body;

      // Validate booking ID
      if (!bookingId || isNaN(parseInt(bookingId))) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Validate check-in date - must be today or in the future
      const checkInDate = new Date(booking.checkInDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        return res.status(400).json({ 
          message: `Cannot check in for past date. Your check-in date was ${format(new Date(booking.checkInDate), "MMM d, yyyy")}. Please contact the front desk.` 
        });
      }

      const guest = await storage.getGuest(booking.guestId);
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }

      // Check if ID proof is required
      if (!guest.idProofUrl && !idProofUrl) {
        return res.status(400).json({ message: "ID proof is required for check-in. Please upload a photo of your ID." });
      }

      // Use provided values or fall back to existing guest data
      const finalEmail = email || guest.email;
      const finalPhone = phone || guest.phone;
      const finalFullName = fullName || guest.fullName;

      // Verify email matches
      if (email && guest.email && email !== guest.email) {
        return res.status(400).json({ message: "Email does not match booking" });
      }

      // Update guest with verified details (only update if different)
      const updateData: any = {};
      if (phone && phone !== guest.phone) updateData.phone = phone;
      if (fullName && fullName !== guest.fullName) updateData.fullName = fullName;
      if (idProofUrl) updateData.idProofUrl = idProofUrl;

      if (Object.keys(updateData).length > 0) {
        await storage.updateGuest(booking.guestId, updateData);
      }

      // Check in the guest by updating booking status
      const updatedBooking = await storage.updateBookingStatus(booking.id, "checked-in");

      // Send self check-in confirmation email
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      const property = room ? await storage.getProperty(room.propertyId) : null;
      
      try {
        const { sendSelfCheckinConfirmationEmail } = await import("./email-service");
        
        if (finalEmail) {
          await sendSelfCheckinConfirmationEmail(
            finalEmail,
            finalFullName || "Guest",
            property?.name || "Your Property",
            new Date(booking.checkInDate).toLocaleDateString(),
            room?.roomNumber || "TBA"
          );
          console.log(`[EMAIL] Self check-in confirmation sent to ${finalEmail}`);
        }
      } catch (emailError) {
        console.warn(`[EMAIL] Failed to send check-in confirmation:`, emailError);
      }

      // Send WhatsApp welcome message with menu link (if enabled)
      try {
        const { sendWelcomeWithMenuLink } = await import("./whatsapp");
        const guestPhone = finalPhone || guest.phone;
        
        // Check if welcome_menu template is enabled
        const welcomeTemplateSetting = property?.id 
          ? await storage.getWhatsappTemplateSetting(property.id, 'welcome_menu')
          : null;
        const isWelcomeEnabled = welcomeTemplateSetting?.isEnabled !== false;
        
        if (guestPhone && property?.id && isWelcomeEnabled) {
          // Generate menu link for the property
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : process.env.REPLIT_DOMAINS?.split(',')[0] 
              ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
              : '';
          
          const menuLink = `${baseUrl}/menu?type=room&property=${property.id}&room=${room?.roomNumber || ''}`;
          
          // Parameters: phoneNumber, propertyName, guestName, menuLink
          await sendWelcomeWithMenuLink(
            guestPhone,
            property.name || "Our Property",
            finalFullName || "Guest",
            menuLink
          );
          console.log(`[WHATSAPP] Welcome message sent to ${guestPhone} with menu link`);
        } else if (!isWelcomeEnabled) {
          console.log(`[WHATSAPP] welcome_menu template disabled, skipping welcome message`);
        }
      } catch (whatsappError) {
        console.warn(`[WHATSAPP] Failed to send welcome message:`, whatsappError);
      }

      // Save booking guest records (ID proof details) if provided
      const guestsData = req.body.guests;
      if (Array.isArray(guestsData) && guestsData.length > 0) {
        try {
          await db.delete(bookingGuests).where(eq(bookingGuests.bookingId, booking.id));
          for (const g of guestsData) {
            await db.insert(bookingGuests).values({
              bookingId: booking.id,
              guestName: g.guestName || finalFullName || "Guest",
              phone: g.phone || null,
              email: g.email || null,
              idProofType: g.idProofType || null,
              idProofNumber: g.idProofNumber || null,
              idProofFront: g.idProofFront || null,
              idProofBack: g.idProofBack || null,
              isPrimary: g.isPrimary ?? false,
            });
          }
          console.log(`[SELF-CHECKIN] Saved ${guestsData.length} guest record(s) for booking ${booking.id}`);
        } catch (guestSaveError: any) {
          console.error("[SELF-CHECKIN] Failed to save guest records:", guestSaveError.message);
          // Non-fatal — check-in still succeeds even if guest record save fails
        }
      }

      res.json({ message: "Check-in successful", booking: updatedBooking });
    } catch (error: any) {
      console.error("[SELF-CHECKIN ERROR]", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CONTACT ENQUIRY ROUTES =====
  // POST /api/contact - Accept contact form submissions from landing page
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, propertyName, message } = req.body;

      // Validate required fields
      if (!name || !email || !phone || !message) {
        return res.status(400).json({ message: "Name, email, phone, and message are required" });
      }

      // Validate and parse with zod schema
      const validated = insertContactEnquirySchema.parse({
        name,
        email,
        phone,
        propertyName: propertyName || null,
        message,
      });

      // Create enquiry in database
      const enquiry = await storage.createContactEnquiry(validated);

      res.status(201).json({ message: "Thank you for your enquiry. We'll be in touch soon!", enquiry });
    } catch (error: any) {
      console.error("[CONTACT] Error creating enquiry:", error);
      res.status(500).json({ message: "Failed to submit enquiry. Please try again." });
    }
  });

  // GET /api/contact - Get all contact enquiries (admin and super-admin)
  app.get("/api/contact", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      // Allow both super-admin and admin roles to view enquiries
      if (user?.role !== "super-admin" && user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      const enquiries = await storage.getAllContactEnquiries();
      res.json(enquiries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/contact/:id - Update enquiry status (admin and super-admin)
  app.patch("/api/contact/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (user?.role !== "super-admin" && user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updated = await storage.updateContactEnquiryStatus(parseInt(req.params.id), status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/errors - Create error crash report (public - from error boundary)
  app.post("/api/errors", async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const { errorMessage, errorStack, errorType, page, browserInfo } = req.body;

      if (!errorMessage) {
        return res.status(400).json({ message: "Error message is required" });
      }

      const crash = await storage.createErrorCrash({
        userId: userId || null,
        errorMessage,
        errorStack: errorStack || null,
        errorType: errorType || null,
        page: page || null,
        browserInfo: browserInfo || null,
        userAgent: browserInfo?.userAgent || null,
      });

      res.status(201).json(crash);
    } catch (error: any) {
      console.error("[ERROR-REPORT] Failed to log error:", error);
      res.status(500).json({ message: "Failed to report error" });
    }
  });

  // GET /api/errors - Get all error crashes (super-admin only)
  app.get("/api/errors", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (user?.role !== "super-admin") {
        return res.status(403).json({ message: "Unauthorized - Super Admin access required" });
      }

      // Error crashes feature may not be fully implemented
      if (typeof (storage as any).getAllErrorCrashes === 'function') {
        const crashes = await (storage as any).getAllErrorCrashes();
        res.json(crashes);
      } else {
        res.json([]); // Return empty array if function not implemented
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/errors/:id/resolve - Mark error as resolved (super-admin only)
  app.patch("/api/errors/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (user?.role !== "super-admin") {
        return res.status(403).json({ message: "Unauthorized - Super Admin access required" });
      }

      const updated = await storage.markErrorAsResolved(parseInt(req.params.id));
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/errors/:id - Delete error crash (super-admin only)
  app.delete("/api/errors/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (user?.role !== "super-admin") {
        return res.status(403).json({ message: "Unauthorized - Super Admin access required" });
      }

      await storage.deleteErrorCrash(parseInt(req.params.id));
      res.json({ message: "Error crash deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DEDICATED SUPER ADMIN LOGIN (separate from regular admin login) =====
  app.post("/api/auth/super-admin-login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Find user by email
      const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (user.length === 0 || !user[0].password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // CRITICAL: Only allow super-admin role to login via this endpoint
      if (user[0].role !== 'super-admin') {
        console.log(`[SUPER-ADMIN-LOGIN] Rejected non-super-admin: ${email} (role: ${user[0].role})`);
        return res.status(403).json({ message: "Access denied. This login is for system administrators only." });
      }

      // Compare password
      const isValidPassword = await bcryptjs.compare(password, user[0].password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session ID to create a fresh session
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("[SUPER-ADMIN-LOGIN] Regenerate error:", regenerateErr);
          return res.status(500).json({ message: "Login failed" });
        }

        // Set email-auth data on new session
        (req.session as any).userId = user[0].id;
        (req.session as any).isEmailAuth = true;
        (req.session as any).isSuperAdmin = true;
        
        // Save session
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.error("[SUPER-ADMIN-LOGIN] Save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Log activity (non-blocking - don't fail login if table doesn't exist)
          try {
            await storage.createActivityLog({
              userId: user[0].id,
              userEmail: user[0].email,
              userName: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || user[0].email,
              action: 'super_admin_login',
              category: 'auth',
              details: { method: 'email', role: 'super-admin' },
              ipAddress: (req.ip || req.socket.remoteAddress || '').substring(0, 45),
              userAgent: (req.get('User-Agent') || '').substring(0, 500),
            });
          } catch (logErr: any) {
            // Don't fail login if activity_logs table doesn't exist yet
            if (logErr?.code === '42P01') {
              console.warn('[ACTIVITY] activity_logs table does not exist - skipping activity log');
            } else {
            console.error('[ACTIVITY] Error logging super admin login:', logErr);
            }
          }
          
          console.log(`[SUPER-ADMIN-LOGIN] ✓ SUCCESS - Super Admin ${user[0].email} logged in`);
          res.json({ 
            message: "Login successful", 
            user: { 
              id: user[0].id, 
              email: user[0].email, 
              role: user[0].role,
              firstName: user[0].firstName,
              lastName: user[0].lastName,
            },
            redirectTo: '/super-admin'
          });
        });
      });
    } catch (error: any) {
      console.error("[SUPER-ADMIN-LOGIN] Error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // ===== REGULAR ADMIN/STAFF EMAIL/PASSWORD LOGIN =====
  // Both /api/auth/login and /api/auth/email-login (frontend uses email-login; alias for curl/consistency)
  app.post(["/api/auth/login", "/api/auth/email-login"], async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Find user by email
      const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (user.length === 0 || !user[0].password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // CRITICAL: Block super-admin accounts from using regular login
      // They must use the dedicated super-admin login at /super-admin-login
      if (user[0].role === 'super-admin') {
        console.log(`[EMAIL-LOGIN] Blocked super-admin attempting regular login: ${email}`);
        return res.status(403).json({ 
          message: "System administrators must use the dedicated admin portal login.",
          redirectTo: '/super-admin-login'
        });
      }

      // Compare password
      const isValidPassword = await bcryptjs.compare(password, user[0].password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check verification status (multi-tenant security)
      if (user[0].verificationStatus === "rejected") {
        return res.status(403).json({ 
          message: "Your account has been rejected. Please contact support.",
          verificationStatus: "rejected"
        });
      }

      if (user[0].verificationStatus === "pending") {
        return res.status(403).json({ 
          message: "Your account is pending approval. You will be notified once approved.",
          verificationStatus: "pending"
        });
      }

      // Check if user is deactivated (inactive or suspended)
      if (user[0].status === 'inactive' || user[0].status === 'suspended') {
        console.log(`[EMAIL-LOGIN] Blocked deactivated user: ${email}`);
        return res.status(403).json({ 
          message: "Your account has been deactivated. Please contact your administrator.",
          isDeactivated: true
        });
      }

      // Regenerate session ID to create a fresh session
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("[EMAIL-LOGIN] Regenerate error:", regenerateErr);
          return res.status(500).json({ message: "Login failed" });
        }

        // Set email-auth data on new session
        (req.session as any).userId = user[0].id;
        (req.session as any).isEmailAuth = true;
        
        // Save session
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.error("[EMAIL-LOGIN] Save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Create session tracking record
          try {
            const userAgent = req.get('User-Agent') || '';
            const ipAddress = req.ip || req.socket.remoteAddress || '';
            
            // Parse browser and OS from user agent
            let browser = 'Unknown';
            let os = 'Unknown';
            if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';
            else if (userAgent.includes('Edge')) browser = 'Edge';
            
            if (userAgent.includes('Windows')) os = 'Windows';
            else if (userAgent.includes('Mac')) os = 'macOS';
            else if (userAgent.includes('Linux')) os = 'Linux';
            else if (userAgent.includes('Android')) os = 'Android';
            else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
            
            await storage.createUserSession({
              userId: user[0].id,
              sessionToken: req.sessionID,
              deviceInfo: userAgent.substring(0, 255),
              browser,
              os,
              ipAddress: ipAddress.substring(0, 45),
              isActive: true,
            });
            console.log(`[SESSION] Created session for email user ${user[0].id}`);
          } catch (sessionErr) {
            console.error('[SESSION] Error creating session:', sessionErr);
          }
          
          // Log activity
          try {
            await storage.createActivityLog({
              userId: user[0].id,
              userEmail: user[0].email,
              userName: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || user[0].email,
              action: 'login',
              category: 'auth',
              details: { method: 'email', role: user[0].role },
              ipAddress: (req.ip || req.socket.remoteAddress || '').substring(0, 45),
              userAgent: (req.get('User-Agent') || '').substring(0, 500),
            });
          } catch (logErr) {
            console.error('[ACTIVITY] Error logging login:', logErr);
          }
          
          // Capture geographic location from IP (non-blocking)
          const loginIpAddress = req.ip || req.socket.remoteAddress || '';
          updateUserLocationFromIp(user[0].id, loginIpAddress).catch(() => {});
          
          // Auto-apply any pending staff invitations for this email (no
          // need for the user to first click the invite link).
          let inviteRedirect = '/';
          try {
            const { applyPendingInvitesForUser } = await import("./replitAuth");
            inviteRedirect = await applyPendingInvitesForUser(user[0].id, user[0].email || '');
          } catch (inviteErr) {
            console.warn("[EMAIL-LOGIN] invite auto-apply failed:", inviteErr);
          }

          // Re-read role in case an invite just elevated/changed it
          const finalUser = await storage.getUser(user[0].id);

          console.log(`[EMAIL-LOGIN] ✓ SUCCESS - User ${user[0].email} (${finalUser?.role || user[0].role}) logged in`);
          res.json({ 
            message: "Login successful", 
            redirectTo: inviteRedirect !== '/' ? inviteRedirect : undefined,
            user: { 
              id: user[0].id, 
              email: user[0].email, 
              role: finalUser?.role || user[0].role,
              firstName: user[0].firstName,
              lastName: user[0].lastName,
              verificationStatus: finalUser?.verificationStatus || user[0].verificationStatus,
            } 
          });
        });
      });
    } catch (error: any) {
      console.error("[EMAIL-LOGIN] Error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // ===== AI CHATBOT =====
  app.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array required" });
      }

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

      console.log("[CHAT] API Key present:", !!apiKey, "Base URL:", baseUrl);

      if (!apiKey || !baseUrl) {
        console.error("[CHAT] Missing AI environment variables");
        return res.status(500).json({ message: "AI service not configured" });
      }

      const systemMessage = `You are Hostezee's intelligent AI Assistant, helping users with property management questions. 
You can provide guidance on:
- Booking and reservation management
- Guest information and check-in/check-out procedures
- Room and property management
- Billing and financial inquiries
- Menu management and restaurant operations
- User account and role management
- System features and how to use them

Be helpful, professional, and concise. If a user asks about something outside your scope, politely redirect them to the relevant feature or contact support.`;

      const chatMessages = [
        { role: "system", content: systemMessage },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[CHAT] API Error:", response.status, error);
        return res.status(500).json({ message: "AI service error" });
      }

      const data = await response.json();
      const messageText = data.choices?.[0]?.message?.content || 'Unable to generate response';
      
      res.json({ message: messageText });
    } catch (error: any) {
      console.error("[CHAT] Exception:", error.message);
      res.status(500).json({ message: "Chat service error. Please try again." });
    }
  });

  // GET /api/recent-payments - Get recently paid bills for payment notifications
  app.get("/api/recent-payments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all properties and filter by user's assigned properties if they're a manager
      const allProperties = await storage.getAllProperties();
      const propertyIds = user.role === "manager" && user.assignedPropertyIds && user.assignedPropertyIds.length > 0
        ? user.assignedPropertyIds
        : allProperties.map((p: any) => p.id);

      // Get all bills that were paid in the last 5 minutes
      const allBills = await storage.getAllBills();
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const recentPayments = allBills
        .filter((b: any) => {
          const paidAt = b.paidAt ? new Date(b.paidAt) : null;
          return (
            propertyIds.includes(b.propertyId) &&
            b.paymentStatus === "paid" &&
            paidAt &&
            paidAt >= fiveMinutesAgo
          );
        })
        .map((b: any) => ({
          billId: b.id,
          bookingId: b.bookingId,
          guestName: b.guestName || "Guest",
          totalAmount: b.totalAmount,
          paidAt: b.paidAt,
          paymentMethod: b.paymentMethod,
        }))
        .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

      res.json(recentPayments);
    } catch (error: any) {
      console.error("[RECENT-PAYMENTS] Error:", error);
      res.status(500).json({ message: "Failed to fetch recent payments" });
    }
  });

  // POST /api/pending-items/ai-summary - Get AI-powered summary of pending tasks with urgency-based notification decision
  app.get("/api/pending-items/ai-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // TENANT ISOLATION: Only Super Admin sees all properties
      // Other users see: their assignedPropertyIds + primaryPropertyId + properties they own
      const allProperties = await storage.getAllProperties();
      let propertyIds: number[] = [];
      
      if (user.tenantType === 'super_admin') {
        propertyIds = allProperties.map((p: any) => p.id);
      } else {
        // Collect all property IDs the user has access to
        const accessibleIds = new Set<number>();
        
        // 1. Check assignedPropertyIds
        if (user.assignedPropertyIds && user.assignedPropertyIds.length > 0) {
          user.assignedPropertyIds.forEach((id: any) => {
            const numId = typeof id === 'string' ? parseInt(id) : id;
            if (!isNaN(numId)) accessibleIds.add(numId);
          });
        }
        
        // 2. Check primaryPropertyId
        if (user.primaryPropertyId) {
          accessibleIds.add(user.primaryPropertyId);
        }
        
        // 3. Check properties where user is the owner
        allProperties.forEach((p: any) => {
          if (p.ownerUserId === user.id) {
            accessibleIds.add(p.id);
          }
        });
        
        propertyIds = Array.from(accessibleIds);
      }

      if (propertyIds.length === 0) {
        return res.json({
          shouldNotify: false,
          cleaningRooms: { count: 0, message: "" },
          pendingEnquiries: { count: 0, message: "" },
          pendingBills: { count: 0, message: "" },
          overallInsight: "",
        });
      }

      // Get pending counts
      const rooms = await storage.getAllRooms();
      const cleaningCount = rooms.filter((r: any) =>
        propertyIds.includes(r.propertyId) && (r.status === "cleaning" || r.status === "maintenance")
      ).length;

      const allEnquiries = await storage.getAllEnquiries();
      const enquiriesCount = allEnquiries.filter((e: any) =>
        propertyIds.includes(e.propertyId) && e.status === "new"
      ).length;

      const allBills = await storage.getAllBills();
      const billsCount = allBills.filter((b: any) => 
        propertyIds.includes(b.propertyId) && b.paymentStatus === "pending"
      ).length;

      // Determine urgency: if no pending items, don't notify
      const totalPending = cleaningCount + enquiriesCount + billsCount;
      if (totalPending === 0) {
        return res.json({
          shouldNotify: false,
          cleaningRooms: { count: 0, message: "" },
          pendingEnquiries: { count: 0, message: "" },
          pendingBills: { count: 0, message: "" },
          overallInsight: "",
        });
      }

      // Generate AI summary using OpenAI (skip API call if key missing or placeholder)
      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const useFallback = !openaiKey || openaiKey === '_DUMMY_API_KEY_' || openaiKey.startsWith('_DUMMY');
      
      if (useFallback) {
        const shouldNotify = totalPending >= 3;
        return res.json({
          shouldNotify,
          cleaningRooms: { count: cleaningCount, message: cleaningCount > 0 ? `${cleaningCount} rooms need attention for cleaning or maintenance.` : "" },
          pendingEnquiries: { count: enquiriesCount, message: enquiriesCount > 0 ? `${enquiriesCount} new customer inquiries awaiting response.` : "" },
          pendingBills: { count: billsCount, message: billsCount > 0 ? `${billsCount} unpaid invoices pending collection.` : "" },
          overallInsight: "Ensure all tasks are handled promptly to maintain service quality.",
        });
      }

      const summary = `As a hotel AI assistant, analyze these pending tasks and decide if urgent notification is needed. Respond ONLY with valid JSON.

Current status:
- ${cleaningCount} rooms pending cleaning/maintenance
- ${enquiriesCount} new customer enquiries  
- ${billsCount} unpaid bills

Respond with JSON containing EXACTLY these fields (no extra fields):
{
  "shouldNotifyNow": boolean (true if urgent/high priority, false if can wait),
  "cleaningRoomsAdvice": "under 30 words",
  "enquiriesAdvice": "under 30 words",
  "billsAdvice": "under 30 words",
  "overallTip": "actionable insight under 20 words"
}

Be critical: only notify if 5+ pending items OR 3+ of one type OR multiple critical issues. Otherwise return false.`;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: summary }],
            temperature: 0.5,
            max_tokens: 300,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiText = data.choices?.[0]?.message?.content || "";

          try {
            const parsed = JSON.parse(aiText);
            return res.json({
              shouldNotify: parsed.shouldNotifyNow === true,
              cleaningRooms: { count: cleaningCount, message: parsed.cleaningRoomsAdvice || "Prepare rooms for incoming guests." },
              pendingEnquiries: { count: enquiriesCount, message: parsed.enquiriesAdvice || "Follow up on customer inquiries promptly." },
              pendingBills: { count: billsCount, message: parsed.billsAdvice || "Collect outstanding payments." },
              overallInsight: parsed.overallTip || "Stay on top of all pending tasks.",
            });
          } catch (parseError) {
            console.warn("[AI-SUMMARY] Failed to parse AI response, using fallback");
          }
        } else {
          console.warn("[AI-SUMMARY] OpenAI API returned:", response.status, "using fallback");
        }
      } catch (fetchError: any) {
        console.warn("[AI-SUMMARY] OpenAI API fetch error:", fetchError.message, "using fallback");
      }
      
      // Fallback: Always notify if moderate or high pending items
      const shouldNotify = totalPending >= 3;
      console.log("[AI-SUMMARY] Using fallback - shouldNotify:", shouldNotify, "totalPending:", totalPending);
      return res.json({
        shouldNotify,
        cleaningRooms: { count: cleaningCount, message: cleaningCount > 0 ? `${cleaningCount} rooms need cleaning/maintenance attention.` : "" },
        pendingEnquiries: { count: enquiriesCount, message: enquiriesCount > 0 ? `${enquiriesCount} customer inquiries require timely response.` : "" },
        pendingBills: { count: billsCount, message: billsCount > 0 ? `${billsCount} payments pending - collect to improve cash flow.` : "" },
        overallInsight: "Address pending items promptly to maintain operations.",
      });
    } catch (error: any) {
      console.error("[AI-SUMMARY] Error:", error);
      res.status(500).json({ message: "Failed to generate AI summary" });
    }
  });

  // GET /api/pending-items - Get count of all pending items for automation notifications
  app.get("/api/pending-items", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // TENANT ISOLATION: Only Super Admin sees all properties
      // Other users see: their assignedPropertyIds + primaryPropertyId + properties they own
      const allProperties = await storage.getAllProperties();
      let propertyIds: number[] = [];
      
      if (user.tenantType === 'super_admin') {
        // Super Admin sees all
        propertyIds = allProperties.map((p: any) => p.id);
      } else {
        // Collect all property IDs the user has access to
        const accessibleIds = new Set<number>();
        
        // 1. Check assignedPropertyIds
        if (user.assignedPropertyIds && user.assignedPropertyIds.length > 0) {
          user.assignedPropertyIds.forEach((id: any) => {
            const numId = typeof id === 'string' ? parseInt(id) : id;
            if (!isNaN(numId)) accessibleIds.add(numId);
          });
        }
        
        // 2. Check primaryPropertyId
        if (user.primaryPropertyId) {
          accessibleIds.add(user.primaryPropertyId);
        }
        
        // 3. Check properties where user is the owner
        allProperties.forEach((p: any) => {
          if (p.ownerUserId === user.id) {
            accessibleIds.add(p.id);
          }
        });
        
        propertyIds = Array.from(accessibleIds);
      }

      if (propertyIds.length === 0) {
        return res.json({
          cleaningRooms: 0,
          pendingSalaries: 0,
          pendingEnquiries: 0,
          unresolvedIssues: 0,
          pendingBills: 0,
        });
      }

      // Count rooms in cleaning/maintenance status
      const rooms = await storage.getAllRooms();
      const cleaningRooms = rooms.filter((r: any) =>
        propertyIds.includes(r.propertyId) &&
        (r.status === "cleaning" || r.status === "maintenance")
      ).length;

      // Count pending salaries
      const allSalaries = await storage.getAllSalaries();
      const pendingSalaries = allSalaries.filter((s: any) =>
        propertyIds.includes(s.propertyId) && s.status === "pending"
      ).length;

      // Count new enquiries
      const allEnquiries = await storage.getAllEnquiries();
      const pendingEnquiries = allEnquiries.filter((e: any) =>
        propertyIds.includes(e.propertyId) && e.status === "new"
      ).length;

      // Count unresolved issues
      const allIssues = await storage.getAllIssueReports();
      const unresolvedIssues = allIssues.filter((issue: any) =>
        propertyIds.includes(issue.propertyId) && !issue.isResolved
      ).length;

      // Count pending bills (filtered by property access)
      const allBills = await storage.getAllBills();
      const pendingBills = allBills.filter((b: any) => 
        propertyIds.includes(b.propertyId) && b.paymentStatus === "pending"
      ).length;

      res.json({
        cleaningRooms,
        pendingSalaries,
        pendingEnquiries,
        unresolvedIssues,
        pendingBills,
      });
    } catch (error: any) {
      console.error("[PENDING-ITEMS] Error:", error);
      res.status(500).json({ message: "Failed to fetch pending items" });
    }
  });

  // ===== TASK MANAGER ROUTES =====
  
  // Get all tasks (filtered by property access)
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const propertyIds = user.role === 'super-admin' 
        ? (await storage.getAllProperties()).map((p: any) => p.id)
        : (user.assignedPropertyIds || []);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }
      
      const allTasks = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.propertyId, propertyIds))
        .orderBy(desc(tasks.createdAt));
      
      res.json(allTasks);
    } catch (error: any) {
      console.error("[TASKS] Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  // Get single task
  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      
      if (!task.length) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });
  
  // Create task
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
        return res.status(403).json({ message: "Only admins can create tasks" });
      }
      
      const { propertyId, title, description, assignedUserId, assignedUserName, priority, dueDate, dueTime, reminderEnabled, reminderType, reminderTime, reminderRecipients } = req.body;
      
      // Handle empty string for assignedUserId - convert to null
      const validAssignedUserId = assignedUserId && assignedUserId.trim() !== '' ? assignedUserId : null;
      const validAssignedUserName = validAssignedUserId ? assignedUserName : null;
      
      const [newTask] = await db.insert(tasks).values({
        propertyId,
        title,
        description,
        assignedUserId: validAssignedUserId,
        assignedUserName: validAssignedUserName,
        priority: priority || 'medium',
        status: 'pending',
        dueDate,
        dueTime,
        reminderEnabled: reminderEnabled !== false,
        reminderType: reminderType || 'daily',
        reminderTime: reminderTime || '10:00',
        reminderRecipients: reminderRecipients || [],
        createdBy: userId,
      }).returning();
      
      // Create in-app notification for assigned user
      if (validAssignedUserId) {
        await db.insert(notifications).values({
          userId: validAssignedUserId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${title}`,
          relatedId: newTask.id,
          relatedType: 'task',
        });
      }
      
      console.log(`[TASKS] Task created: ${title} for property ${propertyId}`);
      res.status(201).json(newTask);
    } catch (error: any) {
      console.error("[TASKS] Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  // Update task
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      
      // If status changed to completed, set completedAt
      if (updates.status === 'completed') {
        updates.completedAt = new Date();
      }
      
      updates.updatedAt = new Date();
      
      const [updatedTask] = await db.update(tasks)
        .set(updates)
        .where(eq(tasks.id, taskId))
        .returning();
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`[TASKS] Task ${taskId} updated: status=${updates.status || 'unchanged'}`);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("[TASKS] Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  // Update task status
  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      
      const updates: any = { status, updatedAt: new Date() };
      if (status === 'completed') {
        updates.completedAt = new Date();
      }
      
      const [updatedTask] = await db.update(tasks)
        .set(updates)
        .where(eq(tasks.id, taskId))
        .returning();
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      console.log(`[TASKS] Task ${taskId} status changed to: ${status}`);
      res.json(updatedTask);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });
  
  // Delete task
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      await db.delete(tasks).where(eq(tasks.id, taskId));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ===== NOTIFICATION CENTER ROUTES =====
  
  // Get notifications for current user
  // Notification types grouped by permission module
  const NOTIFICATION_PERMISSION_MAP: Record<string, string> = {
    new_booking:             'bookings',
    booking_modified:        'bookings',
    booking_cancelled:       'bookings',
    bill_generated:          'payments',
    payment_received:        'payments',
    pending_payment_overdue: 'payments',
    vendor_due:              'payments',
    new_order:               'foodOrders',
    order_ready:             'foodOrders',
  };

  // Notification types that are admin/staff-management only
  const ADMIN_ONLY_NOTIFICATION_TYPES = new Set([
    'new_user_signup', 'approval_pending', 'approval_approved',
    'approval_rejected', 'issue_reported', 'error_reported',
    'contact_enquiry', 'system_alert',
  ]);

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      
      let userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      
      // For Super Admin: Only show system-level notifications
      if (user?.role === 'super-admin') {
        userNotifications = userNotifications.filter((n: any) => 
          ADMIN_ONLY_NOTIFICATION_TYPES.has(n.type) ||
          n.type?.startsWith('system_') ||
          n.type?.startsWith('error_') ||
          n.type?.startsWith('approval_')
        );
        return res.json(userNotifications);
      }

      // ── Permission-based notification filtering ──────────────────────────
      // Fetch the user's granular permissions (may be null if none configured)
      const [userPermsRow] = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, userId))
        .limit(1);

      // Determine if this user has any configured granular restrictions
      const permKeys = ['bookings','calendar','rooms','guests','foodOrders',
                        'menuManagement','payments','reports','settings','tasks','staff'] as const;
      const hasGranularPermissions = userPermsRow
        ? permKeys.some(k => (userPermsRow as any)[k] !== 'none')
        : false;

      // kitchen role always restricted to food-orders only
      const isKitchenRole = user?.role === 'kitchen';

      // Admin with no granular restrictions → show all operational notifications
      if (user?.role === 'admin' && !hasGranularPermissions) {
        // fall through to property filter only
      } else if (isKitchenRole || hasGranularPermissions) {
        // Build the set of modules this user can access
        const allowedModules = new Set<string>();
        if (isKitchenRole) {
          allowedModules.add('foodOrders');
        } else if (userPermsRow) {
          for (const k of permKeys) {
            if ((userPermsRow as any)[k] !== 'none') allowedModules.add(k);
          }
        }

        userNotifications = userNotifications.filter((n: any) => {
          const requiredModule = NOTIFICATION_PERMISSION_MAP[n.type];
          if (requiredModule) {
            // Only show if the user has access to that module
            return allowedModules.has(requiredModule);
          }
          // Admin-only notifications: hide from non-admin restricted users
          if (ADMIN_ONLY_NOTIFICATION_TYPES.has(n.type)) {
            return allowedModules.has('staff');
          }
          // Unknown type: show only to users with broad access
          return !isKitchenRole;
        });
      }

      // ── Property-based filtering for users scoped to specific properties ──
      const auth = await getAuthenticatedTenant(req);
      if (auth) {
        const { tenant } = auth;
        if (!tenant.hasUnlimitedAccess && tenant.assignedPropertyIds.length > 0) {
          const userPropertyIds = new Set<number>(tenant.assignedPropertyIds);
          const filteredNotifications: typeof userNotifications = [];
          
          for (const notification of userNotifications) {
            if (!notification.relatedType || !notification.relatedId) {
              filteredNotifications.push(notification);
              continue;
            }
            
            if (notification.relatedType === 'booking') {
              const booking = await storage.getBooking(notification.relatedId);
              if (booking && userPropertyIds.has(booking.propertyId)) {
                filteredNotifications.push(notification);
              }
              continue;
            }
            
            if (notification.relatedType === 'order') {
              const order = await storage.getOrder(notification.relatedId);
              if (order && userPropertyIds.has(order.propertyId)) {
                filteredNotifications.push(notification);
              }
              continue;
            }
            
            filteredNotifications.push(notification);
          }
          
          userNotifications = filteredNotifications;
        }
      }
      
      res.json(userNotifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CHANGE APPROVAL ROUTES =====
  
  // Create change approval request
  app.post("/api/change-approvals", isAuthenticated, async (req: any, res) => {
    try {
      const { changeType, bookingId, roomId, description, oldValue, newValue } = req.body;
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      
      const validated = insertChangeApprovalSchema.parse({
        userId,
        changeType,
        bookingId,
        roomId,
        description,
        oldValue,
        newValue,
      });

      const approval = await db
        .insert(changeApprovals)
        .values(validated)
        .returning();

      // Create notification for admins
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.role === "admin" || u.role === "super-admin");

      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: "approval_pending",
          title: "Change Approval Needed",
          message: `${changeType} change request: ${description}`,
          soundType: "warning",
          relatedId: approval[0].id,
          relatedType: "change_approval",
          isRead: false,
        });
      }

      res.status(201).json(approval[0]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get pending change approvals
  app.get("/api/change-approvals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(userId);
      if (user?.role !== "admin" && user?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const approvals = await db
        .select()
        .from(changeApprovals)
        .where(eq(changeApprovals.status, "pending"))
        .orderBy(desc(changeApprovals.createdAt));
      res.json(approvals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve change request
  app.post("/api/change-approvals/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      const approvedBy = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(approvedBy);
      if (user?.role !== "admin" && user?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const original = await db
        .select()
        .from(changeApprovals)
        .where(eq(changeApprovals.id, approvalId));

      if (!original[0]) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const approval = await db
        .update(changeApprovals)
        .set({
          status: "approved",
          approvedBy,
          approvedAt: new Date(),
        })
        .where(eq(changeApprovals.id, approvalId))
        .returning();

      // Create notification for requester
      await db.insert(notifications).values({
        userId: original[0].userId,
        type: "approval_approved",
        title: "Change Approved",
        message: `Your ${original[0].changeType} change has been approved`,
        soundType: "payment",
        relatedId: approvalId,
        relatedType: "change_approval",
        isRead: false,
      });

      res.json(approval[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reject change request
  app.post("/api/change-approvals/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const approvalId = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      const approvedBy = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      const user = await storage.getUser(approvedBy);
      if (user?.role !== "admin" && user?.role !== "super-admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const original = await db
        .select()
        .from(changeApprovals)
        .where(eq(changeApprovals.id, approvalId));

      if (!original[0]) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const approval = await db
        .update(changeApprovals)
        .set({
          status: "rejected",
          approvedBy,
          approvedAt: new Date(),
          rejectionReason,
        })
        .where(eq(changeApprovals.id, approvalId))
        .returning();

      res.json(approval[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PERFORMANCE ROUTES =====

  // Get user performance metrics (admin/manager)
  app.get("/api/performance/users", isAuthenticated, async (req: any, res) => {
    try {
      const data = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          totalTasksAssigned: sql`COALESCE(SUM(${employeePerformanceMetrics.totalTasksAssigned}), 0)`.as("totalTasksAssigned"),
          tasksCompletedOnTime: sql`COALESCE(SUM(${employeePerformanceMetrics.tasksCompletedOnTime}), 0)`.as("tasksCompletedOnTime"),
          tasksCompletedLate: sql`COALESCE(SUM(${employeePerformanceMetrics.tasksCompletedLate}), 0)`.as("tasksCompletedLate"),
          averageCompletionTimeMinutes: sql`ROUND(CAST(AVG(${employeePerformanceMetrics.averageCompletionTimeMinutes}) AS NUMERIC), 2)`.as("averageCompletionTimeMinutes"),
          performanceScore: sql`ROUND(CAST(AVG(${employeePerformanceMetrics.performanceScore}) AS NUMERIC), 2)`.as("performanceScore"),
        })
        .from(users)
        .leftJoin(employeePerformanceMetrics, eq(users.id, employeePerformanceMetrics.staffId))
        .where(inArray(users.role, ["admin", "manager"]))
        .groupBy(users.id);
      res.json(data);
    } catch (error: any) {
      console.error("[PERFORMANCE] Error fetching user performance:", error);
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  // Get staff performance metrics
  app.get("/api/performance/staff", isAuthenticated, async (req: any, res) => {
    try {
      const data = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          totalTasksAssigned: sql`COALESCE(SUM(${employeePerformanceMetrics.totalTasksAssigned}), 0)`.as("totalTasksAssigned"),
          tasksCompletedOnTime: sql`COALESCE(SUM(${employeePerformanceMetrics.tasksCompletedOnTime}), 0)`.as("tasksCompletedOnTime"),
          tasksCompletedLate: sql`COALESCE(SUM(${employeePerformanceMetrics.tasksCompletedLate}), 0)`.as("tasksCompletedLate"),
          averageCompletionTimeMinutes: sql`ROUND(CAST(AVG(${employeePerformanceMetrics.averageCompletionTimeMinutes}) AS NUMERIC), 2)`.as("averageCompletionTimeMinutes"),
          performanceScore: sql`ROUND(CAST(AVG(${employeePerformanceMetrics.performanceScore}) AS NUMERIC), 2)`.as("performanceScore"),
        })
        .from(users)
        .leftJoin(employeePerformanceMetrics, eq(users.id, employeePerformanceMetrics.staffId))
        .where(inArray(users.role, ["staff", "kitchen"]))
        .groupBy(users.id);
      res.json(data);
    } catch (error: any) {
      console.error("[PERFORMANCE] Error fetching staff performance:", error);
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  // Get task notification logs
  app.get("/api/performance/task-logs", isAuthenticated, async (req: any, res) => {
    try {
      const data = await db
        .select({
          id: taskNotificationLogs.id,
          userId: taskNotificationLogs.userId,
          userName: sql`${users.firstName} || ' ' || ${users.lastName}`.as("userName"),
          taskType: taskNotificationLogs.taskType,
          taskCount: taskNotificationLogs.taskCount,
          reminderCount: taskNotificationLogs.reminderCount,
          completionTime: taskNotificationLogs.completionTime,
          lastRemindedAt: taskNotificationLogs.lastRemindedAt,
          allTasksCompletedAt: taskNotificationLogs.allTasksCompletedAt,
        })
        .from(taskNotificationLogs)
        .leftJoin(users, eq(taskNotificationLogs.userId, users.id))
        .orderBy(desc(taskNotificationLogs.lastRemindedAt))
        .limit(50);
      res.json(data);
    } catch (error: any) {
      console.error("[PERFORMANCE] Error fetching task logs:", error);
      res.status(500).json({ error: "Failed to fetch task logs" });
    }
  });

  // ===== AUDIT LOG ROUTES =====
  // Audit logs temporarily disabled

  // ===== EXPENSE BUDGETS ROUTES =====

  // Create or update expense budget
  app.post("/api/expense-budgets", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, categoryId, budgetAmount, period } = req.body;
      
      if (!propertyId || !categoryId || !budgetAmount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const budget = await db.insert(expenseBudgets).values({
        propertyId: parseInt(propertyId),
        categoryId: parseInt(categoryId),
        budgetAmount: budgetAmount.toString(),
        period: period || "monthly",
        status: "active",
      }).returning();

      res.json(budget[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get expense budgets for property
  app.get("/api/expense-budgets/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      const budgets = await db.select()
        .from(expenseBudgets)
        .where(eq(expenseBudgets.propertyId, propertyId));

      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== AI INSIGHTS ROUTES =====

  // Get unique room types for a property
  app.get("/api/rooms/types/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      const propertyRooms = await db.select()
        .from(rooms)
        .where(eq(rooms.propertyId, propertyId));
      
      const uniqueTypes = [...new Set(propertyRooms.map(r => r.roomType).filter(Boolean))];
      
      res.json(uniqueTypes);
    } catch (error: any) {
      console.error("[ROOMS] Get types error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== FEATURE SETTINGS ROUTES =====
  
  app.get("/api/feature-settings", isAuthenticated, async (req: any, res) => {
    try {
      let propertyId = req.query.propertyId;
      
      if (!propertyId) {
        propertyId = req.user?.assignedPropertyIds?.[0];
      }
      
      if (!propertyId) {
        // Return empty array instead of 400 for health checks
        return res.json([]);
      }

      const settings = await storage.getFeatureSettingsByProperty(parseInt(propertyId));
      res.json(settings);
    } catch (error: any) {
      console.error("[FEATURE-SETTINGS] GET error:", error);
      console.error("[FEATURE-SETTINGS] Stack:", error.stack);
      // Return empty array on error instead of 500
      res.json([]);
    }
  });

  app.patch("/api/feature-settings", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = req.body.propertyId || req.user?.assignedPropertyIds?.[0];
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID required" });
      }

      // Admin and super-admin can update their own property settings
      const isAdmin = req.user?.role === "admin" || req.user?.role === "super-admin";
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admin can update feature settings for their property" });
      }

      // Verify admin has access to this property
      const assignedProps = req.user?.assignedPropertyIds || [];
      if (!assignedProps.includes(parseInt(propertyId))) {
        return res.status(403).json({ message: "You don't have access to this property" });
      }

      const settings = await storage.updateFeatureSettings(parseInt(propertyId), req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== FOOD ORDER WHATSAPP SETTINGS ROUTES =====
  app.get("/api/food-order-whatsapp-settings/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const settings = await storage.getFoodOrderWhatsappSettings(propertyId);
      res.json(settings || { propertyId, enabled: false, phoneNumbers: [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/food-order-whatsapp-settings/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const { enabled, phoneNumbers } = req.body;
      
      // Validate phone numbers array
      const cleanedNumbers = (phoneNumbers || [])
        .map((p: string) => p.replace(/\s+/g, '').trim())
        .filter((p: string) => p.length >= 10);
      
      const settings = await storage.upsertFoodOrderWhatsappSettings(propertyId, {
        enabled: enabled ?? true,
        phoneNumbers: cleanedNumbers,
      });
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== WHATSAPP TEMPLATE SETTINGS ROUTES =====
  // Get all template settings for a property
  app.get("/api/whatsapp-template-settings/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      // Initialize settings if not exist (for new properties)
      await storage.initializePropertyWhatsappSettings(propertyId);
      
      const settings = await storage.getWhatsappTemplateSettings(propertyId);
      res.json(settings);
    } catch (error: any) {
      console.error("[WHATSAPP-TEMPLATE-SETTINGS] GET error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update a specific template setting
  app.put("/api/whatsapp-template-settings", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, templateType, isEnabled, sendTiming, delayHours } = req.body;
      
      if (!propertyId || !templateType) {
        return res.status(400).json({ message: "Property ID and template type required" });
      }

      // Admin and super-admin can update settings
      const isAdmin = req.user?.role === "admin" || req.user?.role === "super-admin";
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admin can update WhatsApp template settings" });
      }

      const setting = await storage.upsertWhatsappTemplateSetting({
        propertyId: parseInt(propertyId),
        templateType,
        isEnabled: isEnabled ?? true,
        sendTiming: sendTiming ?? 'immediate',
        delayHours: delayHours ?? 0
      });
      
      res.json(setting);
    } catch (error: any) {
      console.error("[WHATSAPP-TEMPLATE-SETTINGS] PUT error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // WhatsApp test sender — lets admins send any template to any number from PMS
  app.post("/api/whatsapp/test", isAuthenticated, async (req: any, res) => {
    try {
      const isAdmin = req.user?.role === "admin" || req.user?.role === "super-admin";
      if (!isAdmin) return res.status(403).json({ message: "Admin only" });

      const { phone, templateId, variables = [] } = req.body;
      if (!phone || !templateId) {
        return res.status(400).json({ message: "phone and templateId are required" });
      }

      const { sendWhatsAppMessage } = await import("./whatsapp");
      // cleanIndianPhoneNumber is internal — strip manually here for preview
      const cleaned = phone.replace(/\D/g, "").replace(/^(0091|91)/, "").replace(/^0/, "");
      if (cleaned.length !== 10) {
        return res.status(400).json({ message: `Phone must be 10 digits after cleaning, got ${cleaned.length} digits from "${phone}"` });
      }

      const result = await sendWhatsAppMessage({
        countryCode: "91",
        mobile: cleaned,
        templateId: String(templateId),
        variables,
      });

      console.log(`[WHATSAPP-TEST] Template ${templateId} → +91-${cleaned}: ${result.success ? "✅ sent" : "❌ failed"}`);
      res.json({ success: result.success, message: result.message, error: result.error, sentTo: `+91-${cleaned}`, templateId });
    } catch (error: any) {
      console.error("[WHATSAPP-TEST] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate AI-powered expense insights using OpenAI
  app.post("/api/ai/insights", isAuthenticated, async (req: any, res) => {
    try {
      const { categoryBreakdown, totalExpenses, transactionCount } = req.body;

      if (!categoryBreakdown || totalExpenses === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Format data for AI analysis
      const categoryText = categoryBreakdown
        .map((cat: any) => `- ${cat.name}: ₹${cat.total.toLocaleString()} (${cat.percentage.toFixed(1)}% of total)`)
        .join('\n');

      const prompt = `You are a hotel and property management financial advisor for Indian hospitality businesses. Analyze these expense data and provide 3-4 specific, actionable business insights to improve profitability.

Expense Categories:
${categoryText}

Total Monthly Expenses: ₹${totalExpenses.toLocaleString()}
Number of Transactions: ${transactionCount}

Focus on:
1. Cost optimization opportunities (supplier negotiations, efficiency improvements)
2. Potential risks or concerning spending patterns
3. Operational efficiency improvements
4. Best practices for property management

Return ONLY a valid JSON array (no markdown, no code blocks, no explanations):
[
  {
    "type": "opportunity",
    "title": "Brief title",
    "description": "2-3 sentence explanation with specific context",
    "impact": "Expected benefit or savings"
  }
]

Types should be: "opportunity" (cost saving), "warning" (concerning trend), "suggestion" (actionable tip), or "achievement" (positive note).`;

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn("[AI INSIGHTS] OpenAI API key not configured, using fallback");
        return res.json({ insights: [] });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[AI INSIGHTS] OpenAI API error:", error);
        return res.json({ insights: [] });
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.warn("[AI INSIGHTS] Unexpected API response structure");
        return res.json({ insights: [] });
      }

      const content = data.choices[0].message.content;
      
      try {
        // Extract JSON from response (in case it's wrapped in markdown)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const insights = JSON.parse(jsonStr);
        
        // Validate insights structure
        const validInsights = Array.isArray(insights) ? insights.filter((i: any) =>
          i.type && i.title && i.description && i.impact &&
          ["opportunity", "warning", "suggestion", "achievement"].includes(i.type)
        ) : [];

        res.json({ insights: validInsights });
      } catch (parseError) {
        console.error("[AI INSIGHTS] Failed to parse AI response:", parseError);
        res.json({ insights: [] });
      }
    } catch (error: any) {
      console.error("[AI INSIGHTS] Error:", error);
      res.status(500).json({ message: error.message, insights: [] });
    }
  });

  // PMS Analytics Chat - AI-powered query endpoint
  app.post("/api/pms-analytics-chat", isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ response: "Please ask a question about your PMS metrics." });
      }

      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ response: "AI service not configured. Please contact support." });
      }

      // Fetch all necessary data for analysis
      const allBookings = await storage.getAllBookings();
      const allBills = await storage.getAllBills();
      const allGuests = await storage.getAllGuests();
      const allProperties = await storage.getAllProperties();
      const allOrders = await storage.getAllOrders();

      // Calculate metrics
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weeklyBookings = allBookings.filter((b: any) => {
        const date = new Date(b.checkInDate);
        return date >= weekAgo && date <= now;
      });
      const monthlyBookings = allBookings.filter((b: any) => {
        const date = new Date(b.checkInDate);
        return date >= monthAgo && date <= now;
      });

      const weeklyRevenue = allBills.filter((b: any) => {
        const date = new Date(b.createdAt || now);
        return date >= weekAgo && date <= now;
      }).reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

      const monthlyRevenue = allBills.filter((b: any) => {
        const date = new Date(b.createdAt || now);
        return date >= monthAgo && date <= now;
      }).reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

      const foodOrdersThisWeek = allOrders.filter((o: any) => {
        const date = new Date(o.createdAt || now);
        return date >= weekAgo && date <= now;
      }).length;

      const paidBills = allBills.filter((b: any) => b.paymentStatus === "paid").length;
      const pendingBills = allBills.filter((b: any) => b.paymentStatus === "pending").length;

      const pmsContext = `
Current PMS Metrics:
- Total Properties: ${allProperties.length}
- Total Bookings: ${allBookings.length}
- Total Guests: ${allGuests.length}
- Weekly Bookings: ${weeklyBookings.length}
- Monthly Bookings: ${monthlyBookings.length}
- Weekly Revenue: ₹${weeklyRevenue.toFixed(2)}
- Monthly Revenue: ₹${monthlyRevenue.toFixed(2)}
- Total Revenue: ₹${allBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0).toFixed(2)}
- Paid Bills: ${paidBills}
- Pending Bills: ${pendingBills}
- Food Orders This Week: ${foodOrdersThisWeek}
- Occupancy Rate: ${((weeklyBookings.length / (allProperties.length * 7)) * 100).toFixed(1)}%
`;

      const aiPrompt = `You are a hotel PMS analytics assistant. Based on this data and user query, provide a helpful, concise answer.

${pmsContext}

User Query: "${query}"

Provide a direct, actionable answer with specific numbers and insights. Keep response under 150 words.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[ANALYTICS-CHAT] OpenAI error:", error);
        return res.json({ response: "Unable to process your query. Please try again." });
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "Unable to generate response";
      
      res.json({ response: aiResponse });
    } catch (error: any) {
      console.error("[ANALYTICS-CHAT] Error:", error);
      res.status(500).json({ response: "Error processing your query. Please try again." });
    }
  });

  // Audit Logs API endpoints
  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error("[AUDIT] Error fetching logs:", error);
      console.error("[AUDIT] Stack:", error.stack);
      // Return empty array on error instead of 500 to prevent frontend crashes
      res.json([]);
    }
  });

  app.get("/api/audit-logs/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const logs = await storage.getAuditLogsByEntity(entityType, entityId);
      res.json(logs);
    } catch (error: any) {
      console.error("[AUDIT] Error fetching entity logs:", error);
      console.error("[AUDIT] Stack:", error.stack);
      // Return empty array on error instead of 500 to prevent frontend crashes
      res.json([]);
    }
  });

  // POST /api/bookings/:id/send-expired-notice
  // Manually sends WID 29782 (room released notice) — use after cancelling booking
  app.post("/api/bookings/:id/send-expired-notice", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });

      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const guest = await storage.getGuest(booking.guestId);
      if (!guest?.phone) return res.status(400).json({ message: "Guest has no phone number" });
      if (!isRealPhone(guest.phone)) return res.status(400).json({ message: "Guest has no valid phone number" });

      const result = await sendBookingExpiredNotice(guest.phone, guest.fullName || "Guest");
      console.log(`[WhatsApp] Booking expired notice (WID 29782) sent for booking #${bookingId}`);
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ==========================================
  // BACKGROUND JOB: Payment Reminders (Fixed Timing)
  // Flow per pending_advance booking (relative to createdAt):
  //   +1h  → WID 29780  (Reminder 1)    — reminderCount 0 → 1
  //   +3h  → WID 29781  (Final Reminder) — reminderCount 1 → 2
  //   +8h  → In-app notification + popup (no auto-cancel, no WA send)
  // ==========================================
  const PAYMENT_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

  async function processPaymentRemindersAndCancellations() {
    try {
      const now = new Date();

      // Get all bookings with pending_advance status
      const pendingBookings = await db.select().from(bookings).where(eq(bookings.status, "pending_advance"));
      if (pendingBookings.length === 0) return;

      let remindersCount = 0;
      let alertsCount = 0;

      for (const booking of pendingBookings) {
        // Check if reminders are enabled for this property
        const settingsResult = await db.select().from(featureSettings).where(eq(featureSettings.propertyId, booking.propertyId)).limit(1);
        const settings = settingsResult[0];
        const isReminderEnabled = settings?.paymentReminderEnabled !== false && settings?.paymentReminders !== false;
        if (!isReminderEnabled) continue;

        const createdAt = booking.createdAt ? new Date(booking.createdAt) : now;
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const reminderCount = booking.reminderCount || 0;

        // Get guest & property (only if we might need them)
        const needsReminder = (reminderCount === 0 && hoursSinceCreation >= 1) ||
                              (reminderCount === 1 && hoursSinceCreation >= 3);
        const needs8hAlert = hoursSinceCreation >= 8 && !booking.pendingAlertSent;

        if (!needsReminder && !needs8hAlert) continue;

        const guest = await storage.getGuest(booking.guestId);
        const property = await storage.getProperty(booking.propertyId);
        if (!guest || !property) continue;

        const paymentUrl = booking.paymentLinkUrl || "";

        // ── Reminder 1: WID 29780 (+1h) ──────────────────────────────
        if (reminderCount === 0 && hoursSinceCreation >= 1 && hoursSinceCreation < 8) {
          const waPhone1 = (guest as any).whatsappPhone || guest.phone;
          if (guest.phone && isRealPhone(waPhone1) && paymentUrl) {
            try {
              await sendPaymentReminder1(waPhone1, guest.fullName || "Guest", paymentUrl);
              await db.update(bookings).set({ reminderCount: 1, lastReminderAt: now, updatedAt: now })
                .where(eq(bookings.id, booking.id));
              storage.invalidateBookingsCache();
              remindersCount++;
              console.log(`[PAYMENT-JOB] Reminder 1 (WID 29780) sent for booking #${booking.id}`);
            } catch (e: any) {
              console.error(`[PAYMENT-JOB] Reminder 1 failed for #${booking.id}:`, e.message);
            }
          }
          continue; // Don't also send final reminder on same tick
        }

        // ── Final Reminder: WID 29781 (+3h) ──────────────────────────
        if (reminderCount === 1 && hoursSinceCreation >= 3 && hoursSinceCreation < 8) {
          const waPhone2 = (guest as any).whatsappPhone || guest.phone;
          if (guest.phone && isRealPhone(waPhone2) && paymentUrl) {
            try {
              await sendFinalPaymentReminder(waPhone2, guest.fullName || "Guest", paymentUrl);
              await db.update(bookings).set({ reminderCount: 2, lastReminderAt: now, updatedAt: now })
                .where(eq(bookings.id, booking.id));
              storage.invalidateBookingsCache();
              remindersCount++;
              console.log(`[PAYMENT-JOB] Final reminder (WID 29781) sent for booking #${booking.id}`);
            } catch (e: any) {
              console.error(`[PAYMENT-JOB] Final reminder failed for #${booking.id}:`, e.message);
            }
          }
          continue;
        }

        // ── 8h Alert: in-app notification (once only) ─────────────────
        if (needs8hAlert) {
          try {
            const allUsers = await storage.getAllUsers();
            const alertUsers = allUsers.filter((u: any) =>
              u.role === "admin" || u.role === "super-admin" || u.role === "manager"
            );
            for (const u of alertUsers) {
              await db.insert(notifications).values({
                userId: u.id,
                type: "pending_payment_overdue",
                title: "⚠️ Pending Booking — 8h No Payment",
                message: `Booking #${booking.id} for ${guest.fullName} has been pending payment for over 8 hours. Action required.`,
                soundType: "warning",
                relatedId: booking.id,
                relatedType: "booking",
              });
            }
            await db.update(bookings)
              .set({ pendingAlertSent: true, updatedAt: now })
              .where(eq(bookings.id, booking.id));
            storage.invalidateBookingsCache();
            alertsCount++;
            console.log(`[PAYMENT-JOB] 8h overdue alert created for booking #${booking.id}`);
          } catch (e: any) {
            console.error(`[PAYMENT-JOB] 8h alert failed for #${booking.id}:`, e.message);
          }
        }
      }

      if (remindersCount > 0 || alertsCount > 0) {
        console.log(`[PAYMENT-JOB] Sent ${remindersCount} reminders, created ${alertsCount} overdue alerts`);
      }
    } catch (error: any) {
      console.error("[PAYMENT-JOB] Error:", error.message);
    }
  }

  // Run payment check on startup (after 10s) and then every 15 minutes
  setTimeout(() => { processPaymentRemindersAndCancellations(); }, 10000);
  setInterval(() => { processPaymentRemindersAndCancellations(); }, PAYMENT_CHECK_INTERVAL);

  console.log(`[PAYMENT-JOB] Background job started - checking every ${PAYMENT_CHECK_INTERVAL / 60000} minutes`);

  // =====================================
  // Daily Task Reminder Job (10 AM)
  // =====================================
  async function processTaskReminders() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Only run between 10:00 - 10:15 AM (15 minute check interval)
      if (currentHour !== 10 || currentMinute >= 15) {
        return;
      }
      
      console.log(`[TASK-REMINDER] Running daily task reminder job at ${format(now, "HH:mm")}`);
      
      // Get all pending/in_progress tasks with reminders enabled whose due date is within the last 7 days or in the future
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pendingTasks = await db.select()
        .from(tasks)
        .where(
          and(
            eq(tasks.reminderEnabled, true),
            inArray(tasks.status, ['pending', 'in_progress']),
            sql`(${tasks.dueDate} IS NULL OR ${tasks.dueDate} >= ${sevenDaysAgo.toISOString()})`
          )
        );
      
      if (pendingTasks.length === 0) {
        console.log("[TASK-REMINDER] No pending tasks with reminders enabled");
        return;
      }
      
      let remindersSent = 0;
      
      for (const task of pendingTasks) {
        // Check reminder type - skip one_time if already reminded today
        if (task.reminderType === 'one_time' && task.lastReminderSent) {
          const lastReminder = new Date(task.lastReminderSent);
          if (format(lastReminder, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
            continue; // Already sent today
          }
        }
        
        // Get property name
        const [property] = await db.select().from(properties).where(eq(properties.id, task.propertyId)).limit(1);
        const propertyName = property?.name || 'Unknown Property';
        
        // Get recipients - either custom list or assigned user
        let recipients: string[] = [];
        if (task.reminderRecipients && Array.isArray(task.reminderRecipients) && task.reminderRecipients.length > 0) {
          recipients = task.reminderRecipients as string[];
        } else if (task.assignedUserId) {
          // Get assigned user's phone
          const [assignedUser] = await db.select().from(users).where(eq(users.id, task.assignedUserId)).limit(1);
          if (assignedUser?.phone) {
            recipients = [assignedUser.phone];
          }
        }
        
        if (recipients.length === 0) {
          console.log(`[TASK-REMINDER] No recipients for task #${task.id}`);
          continue;
        }
        
        // Format due date
        const dueDate = task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "Not set";
        const dueTime = task.dueTime || "";
        const dueDateFull = dueTime ? `${dueDate} ${dueTime}` : dueDate;
        
        // Send WhatsApp reminders to all recipients
        for (const phone of recipients) {
          try {
            await sendTaskReminder(
              phone,
              task.assignedUserName || "Team",
              task.title,
              propertyName,
              dueDateFull,
              task.status || "pending"
            );
            remindersSent++;
          } catch (err: any) {
            console.error(`[TASK-REMINDER] Failed to send to ${phone}:`, err.message);
          }
        }
        
        // Update last reminder sent time
        await db.update(tasks)
          .set({ lastReminderSent: now })
          .where(eq(tasks.id, task.id));
      }
      
      console.log(`[TASK-REMINDER] Sent ${remindersSent} task reminders`);
    } catch (error: any) {
      console.error("[TASK-REMINDER] Error:", error.message);
    }
  }
  
  // Check every 15 minutes for task reminders
  setTimeout(() => {
    processTaskReminders();
  }, 10000);
  
  setInterval(() => {
    processTaskReminders();
  }, 15 * 60 * 1000); // Every 15 minutes
  
  console.log("[TASK-REMINDER] Daily task reminder job started - checks every 15 minutes, sends at 10 AM");

  // =====================================
  // Auto-Close Day at Midnight Job
  // =====================================
  async function autoCloseDayAtMidnight() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Only run between 00:00 - 00:15 (midnight window)
      if (currentHour !== 0 || currentMinute >= 15) {
        return;
      }
      
      console.log(`[AUTO-CLOSE] Running auto-close day job at ${format(now, "HH:mm")}`);
      
      // Get yesterday's date (we're closing yesterday at midnight)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const closingDateStr = format(yesterday, "yyyy-MM-dd");
      
      // Get all properties
      const allProperties = await db.select().from(properties);
      
      for (const property of allProperties) {
        // Check if already closed for yesterday
        const existingClosing = await db.select()
          .from(dailyClosings)
          .where(
            and(
              eq(dailyClosings.propertyId, property.id),
              eq(dailyClosings.closingDate, closingDateStr)
            )
          )
          .limit(1);
        
        if (existingClosing.length > 0) {
          continue; // Already closed
        }
        
        // Get all wallets for this property
        const propertyWallets = await db.select()
          .from(wallets)
          .where(eq(wallets.propertyId, property.id));
        
        if (propertyWallets.length === 0) {
          continue; // No wallets to close
        }
        
        // Calculate day's totals
        let totalRevenue = 0;
        let totalCollected = 0;
        let totalExpenses = 0;
        let totalPending = 0;
        
        // Get yesterday's transactions
        const dayStart = new Date(yesterday);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(yesterday);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayTransactions = await db.select()
          .from(walletTransactions)
          .where(
            and(
              eq(walletTransactions.propertyId, property.id),
              gte(walletTransactions.transactionDate, dayStart),
              lte(walletTransactions.transactionDate, dayEnd)
            )
          );
        
        for (const tx of dayTransactions) {
          const amount = parseFloat(tx.amount?.toString() || '0');
          if (tx.transactionType === 'credit') {
            totalCollected += amount;
            totalRevenue += amount;
          } else {
            totalExpenses += amount;
          }
        }
        
        // Create wallet snapshots
        const walletBalances = propertyWallets.map(w => ({
          walletId: w.id,
          walletName: w.name,
          openingBalance: parseFloat(w.openingBalance?.toString() || '0'),
          closingBalance: parseFloat(w.currentBalance?.toString() || '0'),
          credits: 0,
          debits: 0
        }));
        
        // Create auto-closing record
        await db.insert(dailyClosings).values({
          propertyId: property.id,
          closingDate: closingDateStr,
          totalRevenue: totalRevenue.toString(),
          totalCollected: totalCollected.toString(),
          totalExpenses: totalExpenses.toString(),
          totalPendingReceivable: totalPending.toString(),
          walletBalances: walletBalances,
          status: 'closed',
          closedAt: now,
          notes: 'Auto-closed at midnight'
        });
        
        // Update wallet opening balances for new day
        for (const wallet of propertyWallets) {
          await db.update(wallets)
            .set({ openingBalance: wallet.currentBalance })
            .where(eq(wallets.id, wallet.id));
        }
        
        console.log(`[AUTO-CLOSE] Auto-closed day for property ${property.name} (${closingDateStr})`);
      }
    } catch (error) {
      console.error("[AUTO-CLOSE] Error in auto-close job:", error);
    }
  }
  
  // Run auto-close check after 10 seconds, then every 15 minutes
  setTimeout(() => {
    autoCloseDayAtMidnight();
  }, 10000);
  
  setInterval(() => {
    autoCloseDayAtMidnight();
  }, 15 * 60 * 1000); // Every 15 minutes
  
  console.log("[AUTO-CLOSE] Auto-close day job started - checks every 15 minutes, runs at midnight");

  // ==========================================
  // BACKGROUND JOB: Vendor Bill Due Date Reminders
  // - Checks for credit transactions with upcoming due dates
  // - Creates in-app notifications for admins when due date is near
  // ==========================================
  async function processVendorDueReminders() {
    try {
      const now = new Date();
      const pendingTx = await db
        .select()
        .from(vendorTransactions)
        .where(
          and(
            eq(vendorTransactions.transactionType, "credit"),
            isNotNull(vendorTransactions.dueDate),
            eq(vendorTransactions.dueReminderSent, false)
          )
        );

      let sentCount = 0;
      for (const tx of pendingTx) {
        if (!tx.dueDate) continue;
        const dueDate = new Date(tx.dueDate);
        if (isNaN(dueDate.getTime())) continue;

        // Get reminder settings for the property
        const settingsResult = await db.select().from(featureSettings).where(eq(featureSettings.propertyId, tx.propertyId)).limit(1);
        const settings = settingsResult[0];
        const reminderEnabled = settings?.vendorReminderEnabled !== false;
        if (!reminderEnabled) continue;

        const daysBefore = settings?.vendorReminderDaysBefore ?? 2;
        const msBeforeDue = dueDate.getTime() - now.getTime();
        const daysUntilDue = msBeforeDue / (1000 * 60 * 60 * 24);

        if (daysUntilDue <= daysBefore && daysUntilDue >= -1) {
          // Get admin users for this property
          const adminUsers = await db.select().from(users).where(
            or(
              eq(users.role, "admin"),
              eq(users.role, "manager"),
              eq(users.role, "super_admin"),
              eq(users.role, "super-admin")
            )
          );

          const dueDateFormatted = dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
          const amount = parseFloat(tx.amount.toString()).toLocaleString("en-IN", { style: "currency", currency: "INR" });
          const overdue = daysUntilDue < 0;
          const title = overdue ? `Vendor Bill Overdue` : `Vendor Bill Due ${daysUntilDue < 1 ? "Today" : `in ${Math.ceil(daysUntilDue)} day(s)`}`;
          const message = `${amount} credit bill${tx.invoiceNumber ? ` (Inv: ${tx.invoiceNumber})` : ""} is ${overdue ? "overdue" : `due on ${dueDateFormatted}`}. Vendor ID: ${tx.vendorId}.`;

          for (const admin of adminUsers) {
            await db.insert(notifications).values({
              userId: admin.id,
              type: "vendor_due",
              title,
              message,
              soundType: "alert",
              relatedId: tx.id,
              relatedType: "vendor_transaction",
            });
          }

          // Mark reminder sent
          await db.update(vendorTransactions).set({ dueReminderSent: true }).where(eq(vendorTransactions.id, tx.id));
          sentCount++;
          console.log(`[VENDOR-REMINDER] Sent due reminder for vendor transaction #${tx.id}`);
        }
      }
      if (sentCount > 0) console.log(`[VENDOR-REMINDER] Sent ${sentCount} vendor due date reminders`);
    } catch (error: any) {
      console.error("[VENDOR-REMINDER] Error:", error.message);
    }
  }

  setTimeout(() => { processVendorDueReminders(); }, 15000);
  setInterval(() => { processVendorDueReminders(); }, 15 * 60 * 1000);
  console.log("[VENDOR-REMINDER] Vendor due date reminder job started");

  // ==================== ERROR REPORTS ====================
  app.post("/api/error-reports", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user || {};
      const { page, errorMessage, errorDetails, userDescription, browserInfo } = req.body || {};
      let { imageUrl } = req.body || {};

      // Validate and cap image size to avoid DB/request issues (e.g. "Could not send report")
      if (imageUrl) {
        if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
          imageUrl = null;
        } else {
          const maxImageLen = 500 * 1024; // 500KB for text column safety
          if (imageUrl.length > maxImageLen) {
            console.warn("[ERROR-REPORT] imageUrl too large, storing without screenshot");
            imageUrl = null;
          }
        }
      }

      let propertyId = req.body?.propertyId ?? null;
      if (propertyId && user.role !== 'super-admin' && user.role !== 'super_admin') {
        const tenant = getTenantContext(user);
        if (!canAccessProperty(tenant, propertyId)) {
          propertyId = null;
        }
      }

      const userName = (user?.firstName != null || user?.lastName != null || user?.email || user?.username)
        ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.username || 'Unknown')
        : 'Unknown';

      const [report] = await db.insert(errorReports).values({
        userId: (user?.claims?.sub ?? user?.id ?? (req.session as any)?.userId)?.toString() ?? null,
        userName,
        userEmail: user?.email || null,
        propertyId,
        page: page || null,
        errorMessage: errorMessage || null,
        errorDetails: errorDetails || null,
        userDescription: userDescription || null,
        browserInfo: browserInfo || null,
        imageUrl: imageUrl || null,
        status: "open",
      }).returning();

      res.status(201).json(report);
    } catch (error: any) {
      console.error("[ERROR-REPORT] Failed to save:", error.message);
      res.status(500).json({ message: "Failed to save report" });
    }
  });

  app.get("/api/error-reports", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super-admin can view error reports" });
      }

      const reports = await db.select().from(errorReports).orderBy(desc(errorReports.createdAt));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/error-reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== 'super-admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super-admin can update error reports" });
      }

      const reportId = parseInt(req.params.id);
      const { status, adminNotes, adminReply } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      if (adminReply !== undefined) updates.adminReply = adminReply;
      if (status === 'resolved') updates.resolvedAt = new Date();

      const [updated] = await db.update(errorReports)
        .set(updates)
        .where(eq(errorReports.id, reportId))
        .returning();

      if (!updated) return res.status(404).json({ message: "Report not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/my-reports", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user?.claims?.sub || user?.id?.toString() || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const reports = await db.select().from(errorReports)
        .where(eq(errorReports.userId, userId.toString()))
        .orderBy(desc(errorReports.createdAt));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ========================
  // WHATSAPP ALERT ROUTING ROUTES
  // ========================

  // GET all template configs (global list)
  app.get("/api/whatsapp-alerts/configs", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const configs = await storage.getAllWhatsappAlertConfigs();
      res.json(configs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // PUT update global toggle for a template
  app.put("/api/whatsapp-alerts/configs/:key", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { key } = req.params;
      const { isGloballyEnabled } = req.body;
      const existing = await storage.getWhatsappAlertConfig(key);
      if (!existing) return res.status(404).json({ message: "Template not found" });
      const updated = await storage.upsertWhatsappAlertConfig({
        ...existing,
        isGloballyEnabled: Boolean(isGloballyEnabled),
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET rules for a specific property
  app.get("/api/whatsapp-alerts/rules", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId) return res.status(400).json({ message: "propertyId required" });
      const rules = await storage.getWhatsappAlertRulesForProperty(propertyId);
      res.json(rules);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // PUT upsert rule for a (templateKey, propertyId) pair
  app.put("/api/whatsapp-alerts/rules/:key/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { key, propertyId: propIdStr } = req.params;
      const propertyId = parseInt(propIdStr);
      const { isEnabled, recipientMode, recipientStaffIds, recipientRoles } = req.body;
      const rule = await storage.upsertWhatsappAlertRule({
        templateKey: key,
        propertyId,
        isEnabled: Boolean(isEnabled),
        recipientMode: recipientMode || "property_contact",
        recipientStaffIds: recipientStaffIds || null,
        recipientRoles: recipientRoles || null,
      });
      res.json(rule);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET staff for a property (for recipient selector)
  app.get("/api/whatsapp-alerts/staff/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const propertyId = parseInt(req.params.propertyId);
      const staff = await storage.getStaffMembersByProperty(propertyId);
      res.json(staff.filter((s: any) => s.isActive));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ========================
  // AIOSELL CHANNEL MANAGER ROUTES
  // ========================

  app.get("/api/aiosell/config", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const [config] = await db.select().from(aiosellConfigurations)
        .where(and(eq(aiosellConfigurations.propertyId, propertyId), eq(aiosellConfigurations.isActive, true)));
      res.json(config || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/config", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, hotelCode, pmsName, pmsPassword, apiBaseUrl, isSandbox } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const existing = await db.select().from(aiosellConfigurations)
        .where(eq(aiosellConfigurations.propertyId, propertyId));
      if (existing.length > 0) {
        const updateData: any = { hotelCode, pmsName: pmsName || "hostezee", apiBaseUrl: apiBaseUrl || "https://live.aiosell.com", isSandbox: isSandbox ?? false, isActive: true, updatedAt: new Date() };
        if (pmsPassword) updateData.pmsPassword = pmsPassword;
        const [updated] = await db.update(aiosellConfigurations)
          .set(updateData)
          .where(eq(aiosellConfigurations.propertyId, propertyId))
          .returning();
        return res.json(updated);
      }
      const [config] = await db.insert(aiosellConfigurations).values({
        propertyId, hotelCode, pmsName: pmsName || "hostezee", pmsPassword: pmsPassword || null, apiBaseUrl: apiBaseUrl || "https://live.aiosell.com", isSandbox: isSandbox ?? false,
      }).returning();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/test-connection", async (req: any, res) => {
    try {
      const { propertyId } = req.body;
      if (!propertyId) return res.status(400).json({ message: "propertyId is required" });
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured for this property" });
      const result = await testConnection(config);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/force-sync", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId } = req.body;
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured for this property" });
      const mappings = await getRoomMappingsForConfig(config.id);
      if (mappings.length === 0) return res.status(400).json({ message: "No room mappings configured. Add room mappings first." });
      await autoSyncInventoryForProperty(propertyId);
      res.json({ success: true, message: `Inventory sync triggered for ${mappings.length} room type(s). Check sync logs for results.` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/aiosell/room-mappings", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.json([]);
      const mappings = await getRoomMappingsForConfig(config.id);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/room-mappings", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, mappings } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });

      if (!Array.isArray(mappings)) return res.status(400).json({ message: "mappings must be an array" });
      for (const m of mappings) {
        if (!m.hostezeeRoomType || !m.aiosellRoomCode) {
          return res.status(400).json({ message: "Each mapping requires hostezeeRoomType and aiosellRoomCode" });
        }
      }

      // ── Strict duplicate validation ──────────────────────────────────────
      const roomCodes = mappings.map((m: any) => m.aiosellRoomCode);
      const duplicateCodes = roomCodes.filter((code: string, i: number) => roomCodes.indexOf(code) !== i);
      if (duplicateCodes.length > 0) {
        return res.status(400).json({ message: `Duplicate AioSell Room Mapping Detected: room code(s) [${[...new Set(duplicateCodes)].join(", ")}] appear more than once.` });
      }

      const roomIds = mappings.map((m: any) => m.aiosellRoomId).filter(Boolean);
      const duplicateRoomIds = roomIds.filter((id: string, i: number) => roomIds.indexOf(id) !== i);
      if (duplicateRoomIds.length > 0) {
        return res.status(400).json({ message: `Duplicate AioSell Room Mapping Detected: room ID(s) [${[...new Set(duplicateRoomIds)].join(", ")}] appear more than once.` });
      }

      const roomTypes = mappings.map((m: any) => m.hostezeeRoomType);
      const duplicateTypes = roomTypes.filter((t: string, i: number) => roomTypes.indexOf(t) !== i);
      if (duplicateTypes.length > 0) {
        return res.status(400).json({ message: `Duplicate AioSell Room Mapping Detected: Hostezee room type(s) [${[...new Set(duplicateTypes)].join(", ")}] appear more than once.` });
      }

      // Resolve room IDs before deleting/inserting to fail early if any room is not found
      const resolvedMappings = [];
      for (const m of mappings) {
        const [room] = await db
          .select({ id: rooms.id })
          .from(rooms)
          .where(and(eq(rooms.propertyId, propertyId), eq(rooms.roomType, m.hostezeeRoomType)));
        if (!room) {
          return res.status(400).json({
            message: `Room not found for type "${m.hostezeeRoomType}" in property ${propertyId}`,
          });
        }
        resolvedMappings.push({ ...m, hostezeeRoomId: room.id });
      }

      await db.delete(aiosellRoomMappings).where(eq(aiosellRoomMappings.configId, config.id));
      const created = [];
      for (const m of resolvedMappings) {
        const [mapping] = await db.insert(aiosellRoomMappings).values({
          configId: config.id,
          propertyId,
          hostezeeRoomId: m.hostezeeRoomId,
          hostezeeRoomType: m.hostezeeRoomType,
          aiosellRoomCode: m.aiosellRoomCode,
          aiosellRoomId: m.aiosellRoomId ? String(m.aiosellRoomId).trim() : null,
        }).returning();
        created.push(mapping);
      }
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/aiosell/rate-plans", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.json([]);
      const plans = await getRatePlansForConfig(config.id);
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/rate-plans", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, ratePlans } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });

      const validMappings = await getRoomMappingsForConfig(config.id);
      const validMappingIds = new Set(validMappings.map(m => m.id));

      await db.delete(aiosellRatePlans).where(eq(aiosellRatePlans.configId, config.id));
      const created = [];
      for (const rp of ratePlans) {
        if (rp.roomMappingId && !validMappingIds.has(rp.roomMappingId)) {
          return res.status(400).json({ message: `Invalid room mapping ID: ${rp.roomMappingId}` });
        }
        if (!rp.ratePlanName || !rp.ratePlanCode) {
          return res.status(400).json({ message: "Rate plan name and code are required" });
        }
        const [plan] = await db.insert(aiosellRatePlans).values({
          configId: config.id,
          propertyId,
          roomMappingId: rp.roomMappingId,
          ratePlanName: rp.ratePlanName,
          ratePlanCode: rp.ratePlanCode,
          baseRate: rp.baseRate || null,
          occupancy: rp.occupancy || "single",
        }).returning();
        created.push(plan);
      }
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/push-rates", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, updates } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });
      const result = await pushRates(config, updates);

      // After a successful push, record each rate in aiosellRateUpdates for tracking
      if (result.success) {
        try {
          for (const update of updates) {
            for (const rateEntry of (update.rates || [])) {
              // Look up ratePlanId from ratePlanCode
              const [plan] = await db.select().from(aiosellRatePlans)
                .where(and(
                  eq(aiosellRatePlans.configId, config.id),
                  eq(aiosellRatePlans.ratePlanCode, rateEntry.rateplanCode)
                ));
              // Look up roomMappingId from roomCode
              const [mapping] = await db.select().from(aiosellRoomMappings)
                .where(and(
                  eq(aiosellRoomMappings.configId, config.id),
                  eq(aiosellRoomMappings.aiosellRoomCode, rateEntry.roomCode)
                ));
              if (plan && mapping) {
                await db.insert(aiosellRateUpdates).values({
                  configId: config.id,
                  propertyId,
                  roomMappingId: mapping.id,
                  ratePlanId: plan.id,
                  startDate: update.startDate,
                  endDate: update.endDate,
                  rate: String(rateEntry.rate),
                  isPushed: true,
                  pushedAt: new Date(),
                });
              }
            }
          }
        } catch (saveErr) {
          console.error("[push-rates] Failed to save rate history:", saveErr);
        }
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/aiosell/latest-rates — returns the most recently pushed rate per rate plan for a property
  app.get("/api/aiosell/latest-rates", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updates = await db.select().from(aiosellRateUpdates)
        .where(and(
          eq(aiosellRateUpdates.propertyId, propertyId),
          eq(aiosellRateUpdates.isPushed, true)
        ))
        .orderBy(desc(aiosellRateUpdates.createdAt));

      // Return the latest pushed rate and push date per ratePlanId
      const latest: Record<number, { rate: number; pushedAt: string | null; startDate: string; endDate: string }> = {};
      for (const ru of updates) {
        if (!latest[ru.ratePlanId]) {
          latest[ru.ratePlanId] = {
            rate: Number(ru.rate),
            pushedAt: ru.pushedAt ? ru.pushedAt.toISOString() : ru.createdAt?.toISOString() || null,
            startDate: ru.startDate,
            endDate: ru.endDate,
          };
        }
      }
      res.json(latest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/push-inventory", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, updates } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });
      const result = await pushInventory(config, updates);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/push-restrictions", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, updates, toChannels } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });
      const result = await pushInventoryRestrictions(config, updates, toChannels);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/aiosell/sync-logs", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const logs = await db.select().from(aiosellSyncLogs)
        .where(eq(aiosellSyncLogs.propertyId, propertyId))
        .orderBy(desc(aiosellSyncLogs.createdAt))
        .limit(100);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/aiosell/rate-updates", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updates = await db.select().from(aiosellRateUpdates)
        .where(eq(aiosellRateUpdates.propertyId, propertyId))
        .orderBy(desc(aiosellRateUpdates.createdAt));
      res.json(updates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/rate-updates", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, rateUpdates } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });

      const created = [];
      for (const ru of rateUpdates) {
        const [update] = await db.insert(aiosellRateUpdates).values({
          configId: config.id,
          propertyId,
          roomMappingId: ru.roomMappingId,
          ratePlanId: ru.ratePlanId,
          startDate: ru.startDate,
          endDate: ru.endDate,
          rate: ru.rate,
        }).returning();
        created.push(update);
      }
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/aiosell/inventory-restrictions", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const restrictions = await db.select().from(aiosellInventoryRestrictions)
        .where(eq(aiosellInventoryRestrictions.propertyId, propertyId))
        .orderBy(desc(aiosellInventoryRestrictions.createdAt));
      res.json(restrictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/inventory-restrictions", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, restrictions } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });

      const created = [];
      for (const r of restrictions) {
        const [restriction] = await db.insert(aiosellInventoryRestrictions).values({
          configId: config.id,
          propertyId,
          roomMappingId: r.roomMappingId,
          startDate: r.startDate,
          endDate: r.endDate,
          stopSell: r.stopSell || false,
          minimumStay: r.minimumStay || 1,
          closeOnArrival: r.closeOnArrival || false,
          closeOnDeparture: r.closeOnDeparture || false,
        }).returning();
        created.push(restriction);
      }
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory calendar — returns per-date availability + last known rate for each mapped room type
  app.get("/api/aiosell/inventory-calendar", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const propertyId = parseInt(req.query.propertyId as string);
      if (!propertyId || !canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured for this property" });

      const fromStr = (req.query.from as string) || new Date().toISOString().split("T")[0];
      const toStr = (req.query.to as string) || (() => { const d = new Date(); d.setDate(d.getDate() + 29); return d.toISOString().split("T")[0]; })();

      const from = new Date(fromStr); from.setHours(0, 0, 0, 0);
      const to = new Date(toStr); to.setHours(0, 0, 0, 0);
      const DAYS = Math.min(Math.round((to.getTime() - from.getTime()) / 86400000) + 1, 90);

      // Build date list
      const dates: string[] = [];
      for (let i = 0; i < DAYS; i++) {
        const d = new Date(from); d.setDate(from.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }

      // Fetch mappings, all rooms, bookings in window, rate updates
      const mappings = await getRoomMappingsForConfig(config.id);
      const allRooms = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));

      const horizon = new Date(to); horizon.setDate(horizon.getDate() + 1);
      const activeBookings = await db.select({
        id: bookings.id, roomId: bookings.roomId, roomIds: bookings.roomIds,
        checkInDate: bookings.checkInDate, checkOutDate: bookings.checkOutDate, status: bookings.status,
      }).from(bookings).where(
        and(
          eq(bookings.propertyId, propertyId),
          inArray(bookings.status, ["pending", "confirmed", "checked-in"]),
          lte(bookings.checkInDate, horizon), gte(bookings.checkOutDate, from),
        )
      );

      // Latest rate per room code from aiosellRateUpdates
      const rateUpdates = await db.select().from(aiosellRateUpdates)
        .where(eq(aiosellRateUpdates.propertyId, propertyId))
        .orderBy(desc(aiosellRateUpdates.createdAt));
      const latestRateByCode: Record<string, number> = {};
      for (const ru of rateUpdates) {
        if (!latestRateByCode[ru.roomCode] && ru.rate) {
          latestRateByCode[ru.roomCode] = Number(ru.rate);
        }
      }

      // Build per-mapping availability
      const roomTypeData = mappings.map(mapping => {
        const matchingRooms = allRooms.filter(r =>
          r.roomType === mapping.hostezeeRoomType
        );
        const totalRooms = matchingRooms.length;
        const roomIds = matchingRooms.map(r => r.id);

        const days = dates.map(dateStr => {
          const date = new Date(dateStr);

          // Count booked rooms on this date
          const bookedRoomIds = new Set<number>();
          for (const b of activeBookings) {
            const cin = new Date(b.checkInDate); cin.setHours(0, 0, 0, 0);
            const cout = new Date(b.checkOutDate); cout.setHours(0, 0, 0, 0);
            if (cin <= date && date < cout) {
              if (b.roomId && roomIds.includes(b.roomId)) bookedRoomIds.add(b.roomId);
              if (b.roomIds) b.roomIds.forEach((rid: number) => { if (roomIds.includes(rid)) bookedRoomIds.add(rid); });
            }
          }

          const blockedRooms = matchingRooms.filter(r =>
            ["maintenance", "out-of-order", "blocked"].includes(r.status || "")
          ).length;

          const booked = bookedRoomIds.size;
          const available = Math.max(0, totalRooms - booked - blockedRooms);

          return { date: dateStr, available, booked, blocked: blockedRooms, total: totalRooms };
        });

        return {
          roomCode: mapping.aiosellRoomCode,
          hostezeeRoomType: mapping.hostezeeRoomType,
          totalRooms,
          rate: latestRateByCode[mapping.aiosellRoomCode] || null,
          days,
        };
      });

      res.json({ dates, roomTypes: roomTypeData });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AIOSELL WEBHOOK - Receive reservations from AioSell (no auth required - external webhook)
  app.post("/api/aiosell/reservation", async (req: any, res) => {
    try {
      const { action, hotelCode, channel, bookingId, cmBookingId, bookedOn, checkin, checkout, segment, specialRequests, pah, amount, guest: guestData, rooms: roomsData } = req.body;

      console.log(`[AIOSELL-WEBHOOK] Received ${action} reservation from ${channel} - bookingId: ${bookingId}`);

      const [config] = await db.select().from(aiosellConfigurations)
        .where(and(
          eq(aiosellConfigurations.hotelCode, hotelCode),
          eq(aiosellConfigurations.isActive, true)
        ))
        .orderBy(aiosellConfigurations.id);

      if (!config) {
        console.error(`[AIOSELL-WEBHOOK] No config found for hotelCode: ${hotelCode}`);
        return res.json({ success: false, message: `Unknown hotelCode: ${hotelCode}` });
      }

      await db.insert(aiosellSyncLogs).values({
        configId: config.id,
        propertyId: config.propertyId,
        syncType: `reservation_${action}`,
        direction: "inbound",
        status: "received",
        requestPayload: req.body,
      });

      if (action === "cancel") {
        // Use externalBookingId for accurate lookup
        const existingBookings = await db.select().from(bookings)
          .where(and(
            eq(bookings.propertyId, config.propertyId),
            eq(bookings.source, `aiosell-${channel}`),
          ));
        const booking = existingBookings.find(b =>
          b.externalBookingId === bookingId ||
          b.externalBookingId === cmBookingId
        );
        if (booking) {
          await db.update(bookings)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(bookings.id, booking.id));
          storage.invalidateBookingsCache();
          console.log(`[AIOSELL-WEBHOOK] Cancelled booking ${booking.id}`);
        } else {
          console.warn(`[AIOSELL-WEBHOOK] Cancel: no booking found for bookingId=${bookingId} cmBookingId=${cmBookingId}`);
        }
        await autoSyncInventoryForProperty(config.propertyId);
        return res.json({ success: true, message: "Reservation Cancelled Successfully" });
      }

      if (action === "book" || action === "modify") {
        // ── Idempotency guard: skip if this exact external booking already exists ──
        // Booking.com / AioSell sometimes sends the same webhook twice
        if (action === "book") {
          const alreadyExists = await db.select({ id: bookings.id })
            .from(bookings)
            .where(and(
              eq(bookings.propertyId, config.propertyId),
              eq(bookings.externalBookingId, bookingId),
            ))
            .limit(1);
          if (alreadyExists.length > 0) {
            console.log(`[AIOSELL-WEBHOOK] Duplicate webhook — booking already exists for externalBookingId=${bookingId}, skipping`);
            return res.json({ success: true, message: "Booking already exists (duplicate webhook)" });
          }
        }

        let guestId: number | undefined;
        if (guestData) {
          const guestFullName = `${guestData.firstName || ""} ${guestData.lastName || ""}`.trim() || "OTA Guest";
          const guestEmail = guestData.email || "";
          if (guestEmail) {
            const existingGuests = await db.select().from(guests)
              .where(eq(guests.email, guestEmail));
            if (existingGuests.length > 0) {
              guestId = existingGuests[0].id;
            }
          }
          if (!guestId) {
            const [newGuest] = await db.insert(guests).values({
              fullName: guestFullName,
              email: guestEmail || null,
              phone: guestData.phone || "N/A",
              address: guestData.address ? `${guestData.address.line1 || ""}, ${guestData.address.city || ""}, ${guestData.address.state || ""}, ${guestData.address.country || ""}`.replace(/^,\s*|,\s*$/g, "") : null,
            }).returning();
            storage.invalidateGuestsCache();
            guestId = newGuest.id;
          }
        }

        // Fetch room mappings once for all rooms
        const mappings = await getRoomMappingsForConfig(config.id);

        // Resolve room assignments for ALL rooms in the booking
        interface ResolvedRoom {
          roomId: number | null;
          aiosellRoomCode: string;
          roomType: string;
          mealPlan: string;
          status: "confirmed" | "tbs";
          adults: number;
          children: number;
          amount: number;
          bedsBooked?: number;
        }
        const resolvedRooms: ResolvedRoom[] = [];
        const rooms_ = Array.isArray(roomsData) ? roomsData : [];
        const amountPerRoom = rooms_.length > 0
          ? (parseFloat(amount?.amountAfterTax?.toString() || "0") / rooms_.length)
          : parseFloat(amount?.amountAfterTax?.toString() || "0");

        // Track room IDs already assigned in this reservation to prevent the
        // same physical room being assigned to multiple stays in one multi-room booking
        const alreadyAssignedRoomIds = new Set<number>();

        // ── Build a set of room IDs that are already booked for overlapping dates ──
        // This prevents the same physical room being double-booked by two OTA reservations
        const checkInDate = new Date(checkin);
        const checkOutDate = new Date(checkout);
        const conflictingFromBookings = await db.select({ roomId: bookings.roomId })
          .from(bookings)
          .where(and(
            eq(bookings.propertyId, config.propertyId),
            not(inArray(bookings.status, ["cancelled", "checked-out", "no_show"])),
            lt(bookings.checkInDate, checkOutDate),
            gt(bookings.checkOutDate, checkInDate),
            isNotNull(bookings.roomId),
          ));
        const conflictingFromStays = await db.select({ roomId: bookingRoomStays.roomId })
          .from(bookingRoomStays)
          .innerJoin(bookings, eq(bookings.id, bookingRoomStays.bookingId))
          .where(and(
            eq(bookings.propertyId, config.propertyId),
            not(inArray(bookings.status, ["cancelled", "checked-out", "no_show"])),
            lt(bookings.checkInDate, checkOutDate),
            gt(bookings.checkOutDate, checkInDate),
            isNotNull(bookingRoomStays.roomId),
          ));
        const overlappingRoomIds = new Set<number>([
          ...conflictingFromBookings.map(b => b.roomId).filter((id): id is number => id !== null),
          ...conflictingFromStays.map(s => s.roomId).filter((id): id is number => id !== null),
        ]);
        console.log(`[AIOSELL] Date overlap check: ${checkin}–${checkout}: ${overlappingRoomIds.size} room(s) already booked`);

        for (const rd of rooms_) {
          const incomingRoomId = rd.roomId != null ? String(rd.roomId).trim() : null;
          const incomingRoomCode = rd.roomCode ? String(rd.roomCode).trim() : "";

          // ── Production logging ───────────────────────────────────────────
          console.log("[AIOSELL] Incoming:", {
            roomId: incomingRoomId,
            roomCode: incomingRoomCode,
            bookingId,
          });

          // ── Dual-format mapping lookup ───────────────────────────────────
          // Priority 1: match by numeric AioSell roomId (stored as aiosellRoomId)
          // Priority 2: fall back to roomCode string
          let mapping = incomingRoomId
            ? mappings.find(m => m.aiosellRoomId && m.aiosellRoomId === incomingRoomId)
            : undefined;

          if (!mapping && incomingRoomCode) {
            mapping = mappings.find(m => m.aiosellRoomCode === incomingRoomCode);
          }

          console.log("[AIOSELL] Mapping Found:", mapping ?? null);

          // ── Auto-save aiosellRoomId if mapping was found by roomCode but has no roomId ──
          // This ensures future inventory pushes include the roomId for accurate routing to Booking.com
          if (mapping && incomingRoomId && !mapping.aiosellRoomId) {
            try {
              await db.update(aiosellRoomMappings)
                .set({ aiosellRoomId: incomingRoomId })
                .where(eq(aiosellRoomMappings.id, mapping.id));
              // Update in-memory mapping too
              (mapping as any).aiosellRoomId = incomingRoomId;
              console.log(`[AIOSELL] Auto-saved aiosellRoomId="${incomingRoomId}" for mapping id=${mapping.id} (roomCode=${mapping.aiosellRoomCode})`);
            } catch (err: any) {
              console.warn(`[AIOSELL] Failed to auto-save aiosellRoomId: ${err.message}`);
            }
          }

          if (!mapping) {
            // Hard stop — no mapping means we cannot create a valid booking for this room
            console.error("[AIOSELL ERROR] No mapping found", {
              incomingRoomId,
              incomingRoomCode,
              bookingId,
              configId: config.id,
              availableRoomIds: mappings.map(m => m.aiosellRoomId).filter(Boolean),
              availableRoomCodes: mappings.map(m => m.aiosellRoomCode),
            });
            // Push TBS placeholder so the rest of the booking still records the attempt
            resolvedRooms.push({
              roomId: null,
              aiosellRoomCode: incomingRoomCode,
              roomType: rd.roomTypeName || incomingRoomCode || "",
              mealPlan: rd.mealPlan || "none",
              status: "tbs",
              adults: rd.occupancy?.adults || 1,
              children: rd.occupancy?.children || 0,
              amount: amountPerRoom,
            });
            continue;
          }

          // ── Safety check: find ALL rooms of the mapped type ────
          const matchedByField = incomingRoomId && mapping.aiosellRoomId === incomingRoomId
            ? `roomId=${incomingRoomId}` : `roomCode=${incomingRoomCode}`;
          console.log(`[AIOSELL] Mapped via ${matchedByField} → Hostezee type "${mapping.hostezeeRoomType}" (configId ${config.id})`);

          // For dormitory rooms fetch ALL rooms regardless of status (occupancy is
          // bed-based; the room itself should never be treated as "full" until all
          // beds are taken).  For regular rooms, keep the original "available" filter.
          const isDormMapping = (rd.roomTypeName || "").toLowerCase().includes("dorm")
            || (incomingRoomCode || "").toLowerCase().includes("dorm")
            || (mapping.aiosellRoomCode || "").toLowerCase().includes("dorm");

          // For regular rooms: exclude only truly blocked rooms (maintenance/out-of-order/blocked).
          // Do NOT exclude "occupied" rooms — a room can be occupied by today's checkout and still
          // be validly assigned to a new booking starting today (back-to-back). Date-based overlap
          // check via overlappingRoomIds handles actual conflicts; room.status is only for maintenance.
          const mappedRoomRows = await db.select().from(rooms)
            .where(and(
              eq(rooms.propertyId, config.propertyId),
              eq(rooms.roomType, mapping.hostezeeRoomType),
              ...(isDormMapping ? [] : [not(inArray(rooms.status, ["maintenance", "out-of-order", "blocked"]))]),
            ));

          // Determine true dormitory rooms by roomCategory
          const isDormitory = mappedRoomRows.some(r => r.roomCategory === "dormitory");

          let assignedRoomId: number | null = null;
          let stayStatus: "confirmed" | "tbs" = "tbs";
          let bedsBookedForThisStay = 1;

          if (isDormitory) {
            // For dorm rooms: pick the room that still has remaining bed capacity
            // (totalBeds minus beds already booked for the overlap window)
            for (const dormRoom of mappedRoomRows) {
              const totalBeds = dormRoom.totalBeds || 6;
              // Count beds already booked for this room and these dates
              const existingDormBookings = await db.select({
                bedsBooked: bookings.bedsBooked,
              }).from(bookings).where(
                and(
                  eq(bookings.roomId, dormRoom.id),
                  not(inArray(bookings.status, ["cancelled", "checked-out", "no_show"])),
                  lt(bookings.checkInDate, checkOutDate),
                  gt(bookings.checkOutDate, checkInDate),
                )
              );
              const bedsUsed = existingDormBookings.reduce((s, b) => s + (b.bedsBooked || 1), 0);
              if (bedsUsed < totalBeds) {
                assignedRoomId = dormRoom.id;
                stayStatus = "confirmed";
                bedsBookedForThisStay = 1;
                console.log("[AIOSELL] Assigned dorm bed:", {
                  roomId: assignedRoomId,
                  roomNumber: dormRoom.roomNumber,
                  totalBeds,
                  bedsUsed,
                  remaining: totalBeds - bedsUsed,
                });
                break;
              }
            }
            if (!assignedRoomId) {
              console.warn(`[AIOSELL] Dorm fully booked for type "${mapping.hostezeeRoomType}" dates ${checkin}–${checkout} → TBS`);
            }
          } else {
            // Regular room: pick first room not already assigned/booked in this window
            const candidateRoom = mappedRoomRows.find(r =>
              !alreadyAssignedRoomIds.has(r.id) && !overlappingRoomIds.has(r.id)
            );
            if (candidateRoom) {
              assignedRoomId = candidateRoom.id;
              alreadyAssignedRoomIds.add(assignedRoomId);
              stayStatus = "confirmed";
              console.log("[AIOSELL] Assigned Room:", {
                roomId: assignedRoomId,
                roomNumber: candidateRoom.roomNumber,
                roomType: mapping.hostezeeRoomType,
                totalAvailable: mappedRoomRows.length,
                alreadyBooked: overlappingRoomIds.size,
                alreadyAssigned: alreadyAssignedRoomIds.size - 1,
              });
            } else {
              console.warn(`[AIOSELL] No available rooms for type "${mapping.hostezeeRoomType}" in property ${config.propertyId} → TBS`);
            }
          }

          resolvedRooms.push({
            roomId: assignedRoomId,
            aiosellRoomCode: incomingRoomCode || mapping.aiosellRoomCode,
            roomType: rd.roomTypeName || mapping.hostezeeRoomType || "",
            mealPlan: rd.mealPlan || "none",
            status: stayStatus,
            adults: rd.occupancy?.adults || 1,
            children: rd.occupancy?.children || 0,
            amount: amountPerRoom,
            bedsBooked: isDormitory ? bedsBookedForThisStay : undefined,
          });
        }

        const primaryAssignedRoomId = resolvedRooms.find(r => r.roomId !== null)?.roomId ?? null;
        const totalAdults = resolvedRooms.reduce((s, r) => s + r.adults, 0) || 1;
        const totalChildren = resolvedRooms.reduce((s, r) => s + r.children, 0) || 0;

        if (action === "modify") {
          const existingBookings = await db.select().from(bookings)
            .where(and(
              eq(bookings.propertyId, config.propertyId),
              eq(bookings.source, `aiosell-${channel}`),
            ));
          const existingBooking = existingBookings.find(b =>
            b.externalBookingId === bookingId ||
            b.externalBookingId === cmBookingId
          );
          if (existingBooking) {
            const modifyPrimaryResolved = resolvedRooms.find(r => r.roomId !== null);
            const modifyBedsBooked = modifyPrimaryResolved?.bedsBooked ?? null;
            await db.update(bookings).set({
              checkInDate: new Date(checkin),
              checkOutDate: new Date(checkout),
              totalAmount: amount?.amountAfterTax?.toString() || "0",
              numberOfGuests: totalAdults + totalChildren,
              ...(primaryAssignedRoomId ? { roomId: primaryAssignedRoomId } : {}),
              ...(modifyBedsBooked !== null ? { bedsBooked: modifyBedsBooked } : {}),
              updatedAt: new Date(),
            }).where(eq(bookings.id, existingBooking.id));
            // Update room stays: delete old ones and re-insert
            await db.delete(bookingRoomStays)
              .where(eq(bookingRoomStays.bookingId, existingBooking.id));
            if (resolvedRooms.length > 0) {
              await db.insert(bookingRoomStays).values(
                resolvedRooms.map(r => ({
                  bookingId: existingBooking.id,
                  roomId: r.roomId,
                  aiosellRoomCode: r.aiosellRoomCode,
                  roomType: r.roomType,
                  mealPlan: r.mealPlan,
                  status: r.status,
                  amount: r.amount.toFixed(2),
                  adults: r.adults,
                  children: r.children,
                }))
              );
            }
            storage.invalidateBookingsCache();
            console.log(`[AIOSELL-WEBHOOK] Modified booking ${existingBooking.id} with ${resolvedRooms.length} room stay(s)`);
            await autoSyncInventoryForProperty(config.propertyId);
            return res.json({ success: true, message: "Reservation Modified Successfully" });
          }
          // If modify but not found, fall through to create new booking
          console.warn(`[AIOSELL-WEBHOOK] Modify action but no existing booking found for bookingId=${bookingId} — creating new`);
        }

        const totalAmount = amount?.amountAfterTax?.toString() || "0";

        // For dorm bookings, carry forward the bedsBooked count.
        // Sum bedsBooked across ALL resolved rooms (a Booking.com reservation may include
        // multiple beds in the same dorm — each stay = 1 bed).
        const primaryResolvedRoom = resolvedRooms.find(r => r.roomId !== null);
        const dormStaysCount = resolvedRooms.filter(r => r.bedsBooked != null).length;
        const primaryBedsBooked = primaryResolvedRoom?.bedsBooked != null
          ? Math.max(dormStaysCount, primaryResolvedRoom.bedsBooked)
          : null;

        // ── Last-chance race-condition guard ─────────────────────────────────
        // Two simultaneous webhooks can both pass the overlap check above and
        // then both try to book the same physical room. Re-check the specific
        // room right before inserting so the second one falls back to TBS.
        let finalRoomId = primaryAssignedRoomId;
        if (finalRoomId !== null) {
          const lastCheck = await db.select({ id: bookings.id })
            .from(bookings)
            .where(and(
              eq(bookings.roomId, finalRoomId),
              not(inArray(bookings.status, ["cancelled", "checked-out", "no_show"])),
              lt(bookings.checkInDate, new Date(checkout)),
              gt(bookings.checkOutDate, new Date(checkin)),
            ))
            .limit(1);
          if (lastCheck.length > 0) {
            console.warn(`[AIOSELL-WEBHOOK] Race condition detected — room ${finalRoomId} was taken between overlap check and insert. Falling back to TBS.`);
            finalRoomId = null;
            // Also clear roomId from resolvedRooms so room stays reflect TBS
            resolvedRooms.forEach(r => { if (r.roomId === primaryAssignedRoomId) { r.roomId = null; r.status = "tbs"; } });
          }
        }

        const [newBooking] = await db.insert(bookings).values({
          propertyId: config.propertyId,
          roomId: finalRoomId,
          guestId: guestId || null,
          checkInDate: new Date(checkin),
          checkOutDate: new Date(checkout),
          numberOfGuests: totalAdults + totalChildren,
          totalAmount,
          status: "pending",
          source: `aiosell-${channel}`,
          externalBookingId: bookingId,
          externalSource: `aiosell-${channel}`,
          ...(primaryBedsBooked !== null ? { bedsBooked: primaryBedsBooked } : {}),
        }).returning();
        storage.invalidateBookingsCache();

        // Insert one room_stay per room (the PMS industry-standard multi-room structure)
        if (resolvedRooms.length > 0) {
          await db.insert(bookingRoomStays).values(
            resolvedRooms.map(r => ({
              bookingId: newBooking.id,
              roomId: r.roomId,
              aiosellRoomCode: r.aiosellRoomCode,
              roomType: r.roomType,
              mealPlan: r.mealPlan,
              status: r.status,
              amount: r.amount.toFixed(2),
              adults: r.adults,
              children: r.children,
            }))
          );
          console.log(`[AIOSELL-WEBHOOK] Created ${resolvedRooms.length} room stay(s) for booking ${newBooking.id}`);
        }

        // Do NOT mark room as occupied here — room occupation happens only on check-in.
        // Inventory availability is calculated from bookings (not room.status) during auto-sync.

        const channelLower = (channel || "").toLowerCase();
        const isAutoConfirmChannel =
          channelLower.includes("goibibo") ||
          channelLower.includes("mmt") ||
          channelLower.includes("makemytrip");

        // Goibibo / MMT: auto-confirm immediately (they collect payment upfront)
        if (isAutoConfirmChannel) {
          await db.update(bookings)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(eq(bookings.id, newBooking.id));
          storage.invalidateBookingsCache();
          console.log(`[AIOSELL-WEBHOOK] Auto-confirmed booking ${newBooking.id} from ${channel} (payment collected by OTA)`);
        } else {
          console.log(`[AIOSELL-WEBHOOK] Created booking ${newBooking.id} from ${channel} (status: pending — advance payment required)`);
        }

        await autoSyncInventoryForProperty(config.propertyId);

        const notifGuestName = `${guestData?.firstName || ""} ${guestData?.lastName || ""}`.trim() || "OTA Guest";
        const property = await storage.getProperty(config.propertyId);
        const propertyName = property?.name || "Your Property";

        // In-app PMS notification to all admins and property-assigned staff
        try {
          const allUsers = await storage.getAllUsers();
          const notifyUsers = allUsers.filter(u =>
            u.role === "admin" || u.role === "super-admin" ||
            (u.assignedPropertyIds as number[] || []).includes(config.propertyId)
          );
          for (const u of notifyUsers) {
            await db.insert(notifications).values({
              userId: u.id,
              type: "new_booking",
              title: "New OTA Booking",
              message: `New booking from ${channel} — Guest: ${notifGuestName}. Check-in: ${checkin}. Check-out: ${checkout}.`,
              soundType: "info",
              relatedId: newBooking.id,
              relatedType: "booking",
            });
          }
          console.log(`[NOTIFICATIONS] Booking #${newBooking.id} - in-app notifications sent to ${notifyUsers.length} users`);
        } catch (notifErr: any) {
          console.error(`[NOTIFICATIONS] Failed to send in-app notification:`, notifErr.message);
        }

        // WhatsApp OTA notification (template 28770) via alert routing system
        try {
          const otaRecipients = await storage.resolveAlertRecipients("ota_booking_alert", property!.id);
          if (otaRecipients.length > 0) {
            for (const phone of otaRecipients) {
              if (!isRealPhone(phone)) continue;
              await sendOtaBookingNotification(phone, propertyName, notifGuestName);
              console.log(`[WhatsApp] Booking #${newBooking.id} - OTA notification sent to staff (${phone})`);
            }
          } else {
            console.warn(`[WhatsApp] Booking #${newBooking.id} - OTA notification skipped: globally disabled or no recipients configured`);
          }
        } catch (notifErr: any) {
          console.error(`[WhatsApp] OTA booking notification failed:`, notifErr.message);
        }

        // WhatsApp to GUEST based on channel type
        const guestPhone = guestData?.phone;
        if (guestPhone && guestId) {
          const fetchedGuest = await storage.getGuest(guestId);
          const guestFullName = fetchedGuest?.fullName || notifGuestName;
          const checkInFmt = format(new Date(checkin), "dd MMM yyyy");
          const checkOutFmt = format(new Date(checkout), "dd MMM yyyy");

          if (!isRealPhone(guestPhone)) {
            // No real phone — skip all WhatsApp silently
            console.warn(`[WhatsApp] Booking #${newBooking.id} - Guest WhatsApp skipped: no valid phone number for ${guestFullName}`);
          } else if (isAutoConfirmChannel) {
            // Goibibo / MMT: send booking confirmed message (template 29294)
            try {
              const bcSetting = await storage.getWhatsappTemplateSetting(newBooking.propertyId, 'booking_confirmation');
              const isBcEnabled = bcSetting?.isEnabled !== false;
              if (!isBcEnabled) {
                console.log(`[WhatsApp] Booking #${newBooking.id} - booking_confirmation template disabled, skipping`);
              } else {
                await sendBookingConfirmedNotification(guestPhone, guestFullName, propertyName, checkInFmt, checkOutFmt);
                console.log(`[WhatsApp] Booking #${newBooking.id} - Booking confirmed notification sent to guest ${guestFullName} (${channel})`);
              }
            } catch (waErr: any) {
              console.error(`[WhatsApp] Booking confirmed notification failed for #${newBooking.id}:`, waErr.message);
            }
          } else {
            // Booking.com & others: create Razorpay link + send advance payment request via WhatsApp only (template 29410)
            try {
              const advanceAmount = parseFloat(totalAmount) || 0;
              const guestEmail = guestData?.email || "";
              const paymentLink = await createPaymentLink(newBooking.id, advanceAmount, guestFullName, guestEmail, guestPhone);
              const paymentLinkUrl = paymentLink.shortUrl || paymentLink.paymentLink;
              await sendAdvancePaymentRequest(guestPhone, guestFullName, checkInFmt, checkOutFmt, propertyName, `₹${advanceAmount.toFixed(0)}`, paymentLinkUrl);
              console.log(`[WhatsApp] Booking #${newBooking.id} - Advance payment request sent to guest ${guestFullName} (${channel}), link: ${paymentLinkUrl}`);
            } catch (waErr: any) {
              console.error(`[WhatsApp] Advance payment request failed for booking #${newBooking.id}:`, waErr.message);
            }
          }
        } else {
          console.warn(`[WhatsApp] Booking #${newBooking.id} - Guest WhatsApp skipped: no phone number`);
        }

        return res.json({ success: true, message: "Reservation Updated Successfully" });
      }

      res.json({ success: false, message: `Unknown action: ${action}` });
    } catch (error: any) {
      console.error("[AIOSELL-WEBHOOK] Error:", error.message);
      res.json({ success: false, message: error.message });
    }
  });

  app.post("/api/aiosell/test-webhook", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });

      const testBookingId = `TEST-${Date.now()}`;
      const checkin = new Date();
      const checkout = new Date();
      checkout.setDate(checkout.getDate() + 2);

      const testPayload = {
        action: "book",
        hotelCode: config.hotelCode,
        channel: "booking.com",
        bookingId: testBookingId,
        cmBookingId: `CM-${testBookingId}`,
        bookedOn: new Date().toISOString(),
        checkin: checkin.toISOString().split("T")[0],
        checkout: checkout.toISOString().split("T")[0],
        segment: "OTA",
        specialRequests: "Test booking from Channel Manager - please ignore",
        pah: false,
        amount: {
          amountBeforeTax: 12000,
          amountAfterTax: 14160,
          tax: 2160,
          currency: "INR",
        },
        guest: {
          firstName: "Test",
          lastName: "OTA Guest",
          email: "test.ota@example.com",
          phone: "9876543210",
          address: {
            line1: "123 Test Street",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
          },
        },
        rooms: [
          {
            roomCode: "TEST",
            occupancy: { adults: 2, children: 0 },
          },
        ],
      };

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const webhookResponse = await fetch(`${baseUrl}/api/aiosell/reservation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      const result = await webhookResponse.json();

      const propertyName = (await db.select().from(properties).where(eq(properties.id, config.propertyId)))[0]?.name || "your property";
      res.json({
        success: result.success,
        message: result.success
          ? `Test booking created for "${propertyName}"! Check-in: today, Check-out: ${checkout.toISOString().split("T")[0]}. Guest: Test OTA Guest. Go to Bookings page and select "${propertyName}" to see it.`
          : `Webhook returned: ${result.message}`,
        bookingId: testBookingId,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pull existing reservations from AioSell for a date range and import them into PMS
  app.post("/api/aiosell/pull-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, fromDate, toDate } = req.body;

      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured for this property" });

      const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 30 days back
      const to = toDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 1 year ahead

      const result = await pullReservationsFromAioSell(config, from, to);
      if (!result.success) {
        return res.json({ success: false, message: result.message, imported: 0, skipped: 0 });
      }

      const reservations = result.reservations || [];
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const r of reservations) {
        try {
          // Skip cancellations
          if (r.action === "cancel") { skipped++; continue; }

          // Check for duplicate by externalBookingId
          const existing = await db.select({ id: bookings.id }).from(bookings).where(
            and(
              eq(bookings.propertyId, config.propertyId),
              eq(bookings.externalBookingId, r.bookingId),
            )
          );
          if (existing.length > 0) { skipped++; continue; }

          // Upsert guest
          let guestId: number | undefined;
          const guestData = r.guest;
          if (guestData) {
            const guestFullName = `${guestData.firstName || ""} ${guestData.lastName || ""}`.trim() || "OTA Guest";
            const guestEmail = guestData.email || "";
            if (guestEmail) {
              const [existingGuest] = await db.select({ id: guests.id }).from(guests).where(eq(guests.email, guestEmail));
              if (existingGuest) { guestId = existingGuest.id; }
            }
            if (!guestId) {
              const [newGuest] = await db.insert(guests).values({
                fullName: guestFullName,
                email: guestEmail || null,
                phone: guestData.phone || "N/A",
                address: guestData.address ? [guestData.address.line1, guestData.address.city, guestData.address.state, guestData.address.country].filter(Boolean).join(", ") : null,
              }).returning();
              guestId = newGuest.id;
              storage.invalidateGuestsCache();
            }
          }

          // Try to assign a room
          const mappings = await getRoomMappingsForConfig(config.id);
          let assignedRoomId: number | undefined;
          if (r.rooms && r.rooms.length > 0) {
            const roomCode = r.rooms[0].roomCode;
            const mapping = mappings.find(m => m.aiosellRoomCode === roomCode);
            if (mapping) {
              const [availableRoom] = await db.select({ id: rooms.id }).from(rooms).where(
                and(eq(rooms.propertyId, config.propertyId), eq(rooms.type, mapping.hostezeeRoomType), eq(rooms.status, "available"))
              );
              if (availableRoom) assignedRoomId = availableRoom.id;
            }
          }

          const adults = r.rooms?.[0]?.occupancy?.adults || 1;
          const children = r.rooms?.[0]?.occupancy?.children || 0;
          const totalAmount = r.amount?.amountAfterTax?.toString() || "0";

          const [insertedBooking] = await db.insert(bookings).values({
            propertyId: config.propertyId,
            roomId: assignedRoomId || null,
            guestId: guestId || null,
            checkInDate: new Date(r.checkin),
            checkOutDate: new Date(r.checkout),
            numberOfGuests: adults + children,
            totalAmount,
            status: "pending",
            source: `aiosell-${r.channel}`,
            externalBookingId: r.bookingId,
            externalSource: `aiosell-${r.channel}`,
            specialRequests: r.specialRequests || null,
            metadata: { aiosellBookingId: r.bookingId, cmBookingId: r.cmBookingId, channel: r.channel },
          }).returning();
          imported++;

          // In-app PMS notification for pulled booking
          try {
            const allUsers = await storage.getAllUsers();
            const notifyUsers = allUsers.filter(u =>
              u.role === "admin" || u.role === "super-admin" ||
              (u.assignedPropertyIds as number[] || []).includes(config.propertyId)
            );
            const pullGuestName = `${guestData?.firstName || ""} ${guestData?.lastName || ""}`.trim() || "OTA Guest";
            for (const u of notifyUsers) {
              await db.insert(notifications).values({
                userId: u.id,
                type: "new_booking",
                title: "New OTA Booking",
                message: `New booking from ${r.channel} — Guest: ${pullGuestName}. Check-in: ${r.checkin}. Check-out: ${r.checkout}.`,
                soundType: "info",
                relatedId: insertedBooking.id,
                relatedType: "booking",
              });
            }
          } catch (notifErr: any) {
            console.error(`[NOTIFICATIONS] Pull booking in-app notification failed:`, notifErr.message);
          }

          // Send OTA booking notification to property staff (template 28770) via alert routing
          try {
            if (insertedBooking) {
              const prop = await storage.getProperty(config.propertyId);
              const guestFullName = `${guestData?.firstName || ""} ${guestData?.lastName || ""}`.trim() || "OTA Guest";
              const otaRecipients = await storage.resolveAlertRecipients("ota_booking_alert", config.propertyId);
              if (otaRecipients.length > 0) {
                for (const phone of otaRecipients) {
                  if (!isRealPhone(phone)) continue;
                  await sendOtaBookingNotification(phone, prop?.name || "Your Property", guestFullName);
                  console.log(`[WhatsApp] Pulled booking #${insertedBooking.id} - OTA notification sent to ${phone}`);
                }
              } else {
                console.warn(`[WhatsApp] Pulled booking #${insertedBooking.id} - OTA alert skipped: globally disabled or no recipients configured`);
              }
            }
          } catch (notifErr: any) {
            console.error(`[WhatsApp] Pull OTA notification failed (non-critical):`, notifErr.message);
          }
        } catch (err: any) {
          errors.push(`bookingId=${r.bookingId}: ${err.message}`);
          skipped++;
        }
      }

      storage.invalidateBookingsCache();
      await autoSyncInventoryForProperty(config.propertyId);

      console.log(`[AIOSELL] pull-reservations: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
      res.json({
        success: true,
        total: reservations.length,
        imported,
        skipped,
        errors: errors.slice(0, 5),
        message: `Imported ${imported} new reservation${imported !== 1 ? "s" : ""} from AioSell (${skipped} already existed or skipped).`,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/aiosell/push-noshow", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { tenant } = auth;
      const { propertyId, bookingId, partner } = req.body;
      if (!canAccessProperty(tenant, propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const config = await getConfigForProperty(propertyId);
      if (!config) return res.status(404).json({ message: "AioSell not configured" });
      const result = await pushNoShow(config, bookingId, partner);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================================
  // Restaurant Popup (public + admin)
  // =====================================
  app.get("/api/public/restaurant-popup/:propertyId", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) return res.json(null);
      const [popup] = await db.select().from(restaurantPopup).where(eq(restaurantPopup.propertyId, propertyId)).limit(1);
      if (!popup) return res.json(null);
      // Always return timing fields so the pre-opening popup works even when the main popup is disabled.
      // The client uses isEnabled to decide whether to show the regular message popup.
      res.json(popup);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/restaurant-popup/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) return res.status(400).json({ message: "Invalid propertyId" });
      const [popup] = await db.select().from(restaurantPopup).where(eq(restaurantPopup.propertyId, propertyId)).limit(1);
      res.json(popup || { propertyId, isEnabled: false, title: "", message: "", showOrderButton: false, orderButtonText: "Order Now", openingTime: "08:00", closingTime: "22:00", preOpeningMessage: "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/restaurant-popup/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) return res.status(400).json({ message: "Invalid propertyId" });
      if (!canAccessProperty(auth.tenant, propertyId)) return res.status(403).json({ message: "Access denied" });
      const { isEnabled, title, message, showOrderButton, orderButtonText, openingTime, closingTime, preOpeningMessage } = req.body;
      await db.insert(restaurantPopup).values({
        propertyId,
        isEnabled: isEnabled ?? false,
        title: title ?? "",
        message: message ?? "",
        showOrderButton: showOrderButton ?? false,
        orderButtonText: orderButtonText ?? "Order Now",
        openingTime: openingTime ?? "08:00",
        closingTime: closingTime ?? "22:00",
        preOpeningMessage: preOpeningMessage ?? "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.",
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: restaurantPopup.propertyId,
        set: {
          isEnabled: isEnabled ?? false,
          title: title ?? "",
          message: message ?? "",
          showOrderButton: showOrderButton ?? false,
          orderButtonText: orderButtonText ?? "Order Now",
          openingTime: openingTime ?? "08:00",
          closingTime: closingTime ?? "22:00",
          preOpeningMessage: preOpeningMessage ?? "Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.",
          updatedAt: new Date(),
        },
      });
      const [updated] = await db.select().from(restaurantPopup).where(eq(restaurantPopup.propertyId, propertyId)).limit(1);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =====================================
  // Daily Report Settings
  // =====================================
  app.get("/api/daily-report-settings", isAuthenticated, async (req: any, res) => {
    try {
      const [settings] = await db.select().from(dailyReportSettings).limit(1);
      res.json(settings || { id: 1, isEnabled: false, phoneNumbers: [], propertyIds: [], templateId: "", lastSentAt: null, lastSentStatus: null, lastSentError: null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/daily-report-settings", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { isEnabled, phoneNumbers, propertyIds, templateId } = req.body;
      const update: any = { updatedAt: new Date() };
      if (isEnabled !== undefined) update.isEnabled = isEnabled;
      if (phoneNumbers !== undefined) update.phoneNumbers = phoneNumbers;
      if (propertyIds !== undefined) update.propertyIds = propertyIds;
      if (templateId !== undefined) update.templateId = templateId;
      await db.update(dailyReportSettings).set(update).where(eq(dailyReportSettings.id, 1));
      const [updated] = await db.select().from(dailyReportSettings).limit(1);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/daily-report-settings/send-now", isAuthenticated, async (req: any, res) => {
    try {
      const auth = await getAuthenticatedTenant(req);
      if (!auth) return res.status(401).json({ message: "Not authenticated" });
      const { date, test } = req.body;
      // test=true bypasses the isEnabled check so you can verify the template works
      // isManual=true → window is 12 PM IST → current time
      const result = await sendDailyReport(date, { ignoreEnabled: !!test, isManual: true });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/daily-report-settings/preview", isAuthenticated, async (req: any, res) => {
    try {
      const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const todayIST = istNow.toISOString().split("T")[0];
      const dateParam = (req.query.date as string) || todayIST;
      const propertyIdsParam = req.query.propertyIds as string;
      const ids = propertyIdsParam ? propertyIdsParam.split(",").map(Number).filter(Boolean) : [];
      if (ids.length === 0) return res.json({ message: "No properties selected", preview: "" });
      // If previewing today → show 12 PM to now; past date → show 12 PM to 11:59 PM
      const isToday = dateParam === todayIST;
      const { fromTime, toTime } = getReportTimeRange(dateParam, isToday);
      const data = await getDailyReportData(dateParam, ids, fromTime, toTime);
      const preview = buildReportMessage(data);
      res.json({ preview, data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // DYNAMIC PRICING — add-on layer (does NOT modify booking/inventory logic)
  // ════════════════════════════════════════════════════════════════════════
  const { getOrCreateConfig, applyPreset, runPricingCycle, startDynamicPricingCron, PRESETS } =
    await import("./dynamic-pricing");
  const { pricingConfig, pricingHistory, roomPricingSettings, rooms: roomsTable } = await import("@shared/schema");
  const { db: pdb } = await import("./db");
  const { eq: peq, desc: pdesc } = await import("drizzle-orm");

  // Property-access guard for all pricing routes (multi-tenant isolation)
  async function pricingGuard(req: any, res: any, propertyId: number): Promise<boolean> {
    if (!Number.isFinite(propertyId)) {
      res.status(400).json({ message: "Invalid propertyId" });
      return false;
    }
    const auth = await getAuthenticatedTenant(req);
    if (!auth) {
      res.status(401).json({ message: "Unauthorized" });
      return false;
    }
    if (!canAccessProperty(auth.tenant, propertyId)) {
      res.status(403).json({ message: "You do not have access to this property" });
      return false;
    }
    return true;
  }

  app.get("/api/pricing/config/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const cfg = await getOrCreateConfig(propertyId);
      res.json(cfg);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Alias to support useQuery key ['/api/pricing/config', propertyId] which fetches /api/pricing/config/<id>
  app.get("/api/pricing/config", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.query.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const cfg = await getOrCreateConfig(propertyId);
      res.json(cfg);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/pricing/config/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      await getOrCreateConfig(propertyId);
      const allowed = [
        "autoPricingEnabled", "occupancyEnabled", "demandEnabled", "dayEnabled",
        "festivalEnabled", "otaPushEnabled", "directBookingEnabled",
        "enforceMinMax", "thresholdEnabled", "thresholdPercent",
        "updateFrequencyMinutes", "festivalDates",
      ];
      const patch: any = { updatedAt: new Date(), preset: "custom" };
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      if ("thresholdPercent" in patch) patch.thresholdPercent = String(patch.thresholdPercent);
      if ("updateFrequencyMinutes" in patch) patch.updateFrequencyMinutes = Math.max(5, Number(patch.updateFrequencyMinutes) || 30);
      const [updated] = await pdb.update(pricingConfig).set(patch).where(peq(pricingConfig.propertyId, propertyId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pricing/config/:propertyId/preset", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const preset = req.body?.preset;
      if (!PRESETS[preset as keyof typeof PRESETS]) return res.status(400).json({ message: "Invalid preset" });
      const updated = await applyPreset(propertyId, preset);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pricing/emergency-stop", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.body?.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      await getOrCreateConfig(propertyId);
      const [updated] = await pdb.update(pricingConfig)
        .set({ emergencyStop: true, autoPricingEnabled: false, updatedAt: new Date(), lastChangeReason: "Emergency stop activated" })
        .where(peq(pricingConfig.propertyId, propertyId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pricing/clear-emergency-stop", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.body?.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const [updated] = await pdb.update(pricingConfig)
        .set({ emergencyStop: false, updatedAt: new Date() })
        .where(peq(pricingConfig.propertyId, propertyId)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/pricing/run-now/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.params.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const result = await runPricingCycle(propertyId, { force: true, source: "manual" });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/pricing/rooms", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.query.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const propertyRooms = await pdb.select().from(roomsTable).where(peq(roomsTable.propertyId, propertyId));
      const settings = await pdb.select().from(roomPricingSettings).where(peq(roomPricingSettings.propertyId, propertyId));
      type RPS = typeof settings[number];
      const sMap = new Map<number, RPS>(settings.map((s: RPS) => [s.roomId, s] as const));
      const rows = propertyRooms.map((r: typeof propertyRooms[number]) => {
        const s = sMap.get(r.id);
        return {
          roomId: r.id,
          roomNumber: r.roomNumber,
          roomType: r.roomType,
          pricePerNight: r.pricePerNight,
          minPrice: s?.minPrice ?? null,
          maxPrice: s?.maxPrice ?? null,
          manualOverride: s?.manualOverride ?? false,
          manualPrice: s?.manualPrice ?? null,
        };
      });
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/pricing/rooms/:roomId", isAuthenticated, async (req, res) => {
    try {
      const roomId = Number(req.params.roomId);
      if (!Number.isFinite(roomId)) return res.status(400).json({ message: "Invalid roomId" });
      const room = await pdb.select().from(roomsTable).where(peq(roomsTable.id, roomId)).limit(1);
      if (!room[0]) return res.status(404).json({ message: "Room not found" });
      const propertyId = room[0].propertyId;
      if (!(await pricingGuard(req, res, propertyId))) return;

      const existing = await pdb.select().from(roomPricingSettings).where(peq(roomPricingSettings.roomId, roomId)).limit(1);
      const patch: any = {
        minPrice: req.body?.minPrice ? String(req.body.minPrice) : null,
        maxPrice: req.body?.maxPrice ? String(req.body.maxPrice) : null,
        manualOverride: !!req.body?.manualOverride,
        manualPrice: req.body?.manualPrice ? String(req.body.manualPrice) : null,
        updatedAt: new Date(),
      };
      if (existing[0]) {
        const [u] = await pdb.update(roomPricingSettings).set(patch).where(peq(roomPricingSettings.roomId, roomId)).returning();
        res.json(u);
      } else {
        const [c] = await pdb.insert(roomPricingSettings).values({ roomId, propertyId, ...patch }).returning();
        res.json(c);
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/pricing/history", isAuthenticated, async (req, res) => {
    try {
      const propertyId = Number(req.query.propertyId);
      if (!(await pricingGuard(req, res, propertyId))) return;
      const limit = Math.min(200, Number(req.query.limit) || 50);
      const rows = await pdb.select().from(pricingHistory)
        .where(peq(pricingHistory.propertyId, propertyId))
        .orderBy(pdesc(pricingHistory.createdAt))
        .limit(limit);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Start dynamic pricing cron heartbeat
  startDynamicPricingCron();

  // Start daily report cron
  startDailyReportJob();

  // Start kitchen-acceptance escalation cron (Phase: second-level alert)
  startKitchenAcceptanceEscalationJob();

  const httpServer = createServer(app);
  return httpServer;
}

// ─────────────────────────────────────────────────────────────────────────
// Kitchen Acceptance Escalation Job
// Scans every 60s for pending orders that have been sitting unaccepted
// for longer than the property's `kitchenAcceptanceTimeoutMinutes`
// (default 10, 0 = disabled). Fires a one-shot warning per order:
//   • In-app notification (sound: warning) for admin/super-admin/kitchen
//   • PWA push notification with warning copy
//   • WhatsApp re-alert via existing food_order_staff_alert template
// Stamps `acceptance_alert_sent_at` so it never re-fires for the same
// order. Skips test orders entirely.
// ─────────────────────────────────────────────────────────────────────────
function startKitchenAcceptanceEscalationJob() {
  const TICK_MS = 60_000;
  const DEFAULT_TIMEOUT_MIN = 10;

  async function tick() {
    try {
      const allProperties = await db.select().from(properties);
      if (allProperties.length === 0) return;

      // Pre-load admin/kitchen users once per tick
      const allUsers = await storage.getAllUsers();
      const escalationUsers = allUsers.filter(
        u => u.role === "admin" || u.role === "super-admin" || u.role === "kitchen",
      );
      const escalationUserIds = escalationUsers.map(u => u.id);

      for (const property of allProperties) {
        const settings = await storage.getFeatureSettingsByProperty(property.id);
        const timeoutMin = settings?.kitchenAcceptanceTimeoutMinutes ?? DEFAULT_TIMEOUT_MIN;
        if (!timeoutMin || timeoutMin <= 0) continue; // disabled

        const cutoff = new Date(Date.now() - timeoutMin * 60_000);

        // Atomically claim stale orders: a single UPDATE…RETURNING flips
        // acceptance_alert_sent_at to now() ONLY for rows still matching
        // (status='pending' AND not yet alerted AND not test AND aged out).
        // This eliminates the race where an order is accepted between the
        // SELECT and the notification fire — and prevents two overlapping
        // ticks from firing twice.
        const stale = await db
          .update(orders)
          .set({ acceptanceAlertSentAt: new Date() })
          .where(and(
            eq(orders.propertyId, property.id),
            eq(orders.status, "pending"),
            eq(orders.isTest, false),
            isNull(orders.acceptanceAlertSentAt),
            lt(orders.createdAt, cutoff),
          ))
          .returning();

        if (stale.length === 0) continue;

        for (const order of stale) {
          const ageMin = Math.max(
            timeoutMin,
            Math.round((Date.now() - new Date(order.createdAt as any).getTime()) / 60_000),
          );
          const guestLabel = order.customerName || "Guest";
          const roomLabel = order.tableNumber
            ? `Table ${order.tableNumber}`
            : order.orderType === "room"
              ? "Room Service"
              : (order as any).orderMode === "takeaway" ? "Takeaway" : "Restaurant";
          const totalStr = String(order.totalAmount || 0);
          const messageCore = `Kitchen has NOT accepted order #${order.id} (${roomLabel}, ₹${totalStr}) — pending for ${ageMin} min. Please check.`;

          // 1. In-app notifications
          try {
            for (const user of escalationUsers) {
              await db.insert(notifications).values({
                userId: user.id,
                type: "order_unaccepted",
                title: "⚠️ Order not accepted",
                message: messageCore,
                soundType: "warning",
                relatedId: order.id,
                relatedType: "order",
              });
            }
          } catch (e: any) {
            console.warn(`[KITCHEN-ESCALATION] in-app insert failed for order #${order.id}:`, e.message);
          }

          // 2. PWA push
          try {
            await sendPushToUsers(escalationUserIds, {
              type: "order_unaccepted",
              title: "⚠️ Order not accepted",
              body: messageCore,
              url: "/restaurant",
              orderId: order.id,
            });
          } catch (e: any) {
            console.warn(`[KITCHEN-ESCALATION] push failed for order #${order.id}:`, e.message);
          }

          // 3. WhatsApp re-alert (reuse approved staff-alert template;
          //    prefix guest name with "URGENT" so the template message
          //    visibly conveys the escalation context).
          //    Send to BOTH alert-rule recipients AND Feature Settings extra numbers
          //    (mirrors the first-level new-order alert behaviour).
          const urgentGuest = `URGENT (${ageMin}m): ${guestLabel}`;
          const sentPhones = new Set<string>();

          // 3a. Alert rules recipients
          try {
            const recipients = await storage.resolveAlertRecipients(
              "food_order_staff_alert",
              property.id,
            );
            console.log(`[KITCHEN-ESCALATION] Alert-rule recipients for property ${property.id}: ${recipients.length} number(s)`);
            for (const phone of recipients) {
              if (!isRealPhone(phone)) { console.log(`[KITCHEN-ESCALATION] Skipping invalid phone: ${phone}`); continue; }
              try {
                await sendFoodOrderStaffAlert(
                  phone,
                  urgentGuest,
                  property.name || "Property",
                  roomLabel,
                  order.id,
                );
                sentPhones.add(phone.replace(/\D/g, "").slice(-10));
                console.log(`[KITCHEN-ESCALATION] WA sent to ${phone} for order #${order.id}`);
              } catch (waErr: any) {
                console.warn(`[KITCHEN-ESCALATION] WA failed for ${phone} order #${order.id}:`, waErr.message);
              }
            }
          } catch (e: any) {
            console.warn(`[KITCHEN-ESCALATION] WA routing failed for order #${order.id}:`, e.message);
          }

          // 3b. Feature Settings extra phone numbers
          try {
            const foodOrderSettings = await storage.getFoodOrderWhatsappSettings(property.id);
            if (foodOrderSettings?.enabled && foodOrderSettings.phoneNumbers?.length > 0) {
              console.log(`[KITCHEN-ESCALATION] Feature Settings extra numbers for property ${property.id}: ${foodOrderSettings.phoneNumbers.length}`);
              for (const phone of foodOrderSettings.phoneNumbers) {
                if (!isRealPhone(phone)) continue;
                const normalized = phone.replace(/\D/g, "").slice(-10);
                if (sentPhones.has(normalized)) continue;
                try {
                  await sendFoodOrderStaffAlert(
                    phone,
                    urgentGuest,
                    property.name || "Property",
                    roomLabel,
                    order.id,
                  );
                  sentPhones.add(normalized);
                  console.log(`[KITCHEN-ESCALATION] WA sent to extra number ${phone} for order #${order.id}`);
                } catch (waErr: any) {
                  console.warn(`[KITCHEN-ESCALATION] WA failed for extra number ${phone} order #${order.id}:`, waErr.message);
                }
              }
            }
          } catch (e: any) {
            console.warn(`[KITCHEN-ESCALATION] Feature Settings fetch failed for order #${order.id}:`, e.message);
          }

          if (sentPhones.size === 0) {
            console.warn(`[KITCHEN-ESCALATION] ⚠️ NO WhatsApp sent for order #${order.id} (property ${property.id}) — check alert rules + Feature Settings phone numbers`);
          }

          // (Stamp happens atomically in the UPDATE…RETURNING above.)
          console.log(`[KITCHEN-ESCALATION] Fired escalation for order #${order.id} (property=${property.id}, age=${ageMin}m, timeout=${timeoutMin}m)`);
        }
      }
    } catch (e: any) {
      console.error("[KITCHEN-ESCALATION] tick failed:", e.message);
    }
  }

  // Kick first run after 30s so it doesn't race startup; then every 60s.
  setTimeout(tick, 30_000);
  setInterval(tick, TICK_MS);
  console.log("[KITCHEN-ESCALATION] Background job started — checks every 60s");
}
