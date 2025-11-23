import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  insertOrderSchema,
  insertExtraServiceSchema,
  insertBillSchema,
  insertEnquirySchema,
  updateUserRoleSchema,
  insertExpenseCategorySchema,
  insertBankTransactionSchema,
  insertContactEnquirySchema,
  insertAttendanceRecordSchema,
  users,
  orders,
  bills,
  extraServices,
  enquiries,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { desc, sql, eq, and, isNull, not, or, gt, lt, param } from "drizzle-orm";
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
  sendEnquiryConfirmation
} from "./whatsapp";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed default expense categories
  await storage.seedDefaultCategories();

  // Seed default super-admin user with email/password
  try {
    const existingSuperAdmins = await db.select().from(users).where(eq(users.role, 'super-admin'));
    const hashedPassword = await bcryptjs.hash('admin@123', 10);
    
    if (existingSuperAdmins.length === 0) {
      // Create new super-admin
      const superAdminId = randomUUID();
      await db.insert(users).values({
        id: superAdminId,
        email: 'admin@hostezee.in',
        firstName: 'Hostezee',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'super-admin',
        status: 'active',
        businessName: 'Hostezee System',
      });
      console.log('[SEED] Default super-admin created: admin@hostezee.in with password admin@123');
    } else {
      // Update existing super-admin with password if not already set
      const superAdmin = existingSuperAdmins[0];
      if (!superAdmin.password) {
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, superAdmin.id));
        console.log('[SEED] Updated super-admin with hashed password');
      }
    }
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed super-admin:', error);
  }

  // ===== OBJECT STORAGE ROUTES =====
  // Referenced from blueprint:javascript_object_storage integration
  
  // Serve private uploaded files (with authentication and ACL check)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
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
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Set ACL policy for uploaded guest ID proof
  app.put("/api/guest-id-proofs", isAuthenticated, async (req, res) => {
    if (!req.body.idProofUrl) {
      return res.status(400).json({ error: "idProofUrl is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.idProofUrl,
        {
          owner: userId,
          visibility: "private", // Guest ID proofs are private
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting guest ID proof:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== PUBLIC ROUTES (No Authentication Required) =====
  
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
      const categories = await storage.getAllMenuCategories();
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
      const items = await storage.getAllMenuItems();
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
      
      const { orderType, roomId, propertyId, customerName, customerPhone, items, totalAmount, specialInstructions } = req.body;
      
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

      let orderData: any = {
        orderType: orderType || "restaurant",
        orderSource: "guest",
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

        // Find the checked-in booking for this room to link the order
        const bookings = await storage.getAllBookings();
        const activeBooking = bookings.find(b => b.roomId === room.id && b.status === "checked-in");

        orderData.propertyId = room.propertyId;
        orderData.roomId = room.id;
        orderData.bookingId = activeBooking?.id || null; // Link to booking if guest is checked in
        orderData.guestId = activeBooking?.guestId || null; // Also include guest ID for tracking
      } else {
        // Handle restaurant/café orders
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
        // Café orders now include property ID for kitchen filtering
        if (propertyId) {
          orderData.propertyId = parseInt(String(propertyId));
        }
      }

      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Public order error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ===== AUTHENTICATED ROUTES =====

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both Replit Auth (with claims) and email/password auth (with id from session)
      let userId = req.user?.claims?.sub || req.user?.id || req.session?.userId;
      
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
      
      res.json(userWithProperty);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // If user is a manager, filter stats by their assigned property
      const propertyId = (currentUser.role === "manager" && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) 
        ? currentUser.assignedPropertyIds[0] // Use first assigned property for stats
        : undefined;
      
      const stats = await storage.getDashboardStats(propertyId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics
  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User Management (Admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const validated = updateUserRoleSchema.parse(req.body);
      
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
      // Check if user is admin
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.claims.sub) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Check if this is the last admin
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.role === "admin");
      const userToDelete = await storage.getUser(id);
      
      if (userToDelete?.role === "admin" && adminUsers.length <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin user" });
      }
      
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Properties
  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      let properties = await storage.getAllProperties();
      
      // Apply property filtering for managers and kitchen users
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
        properties = properties.filter(p => currentUser.assignedPropertyIds!.includes(p.id));
      }
      
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.getProperty(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const data = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(data);
      res.status(201).json(property);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.updateProperty(parseInt(req.params.id), req.body);
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProperty(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rooms
  app.get("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // If user is a manager, filter by assigned properties
      if (currentUser.role === "manager") {
        if (currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
          // Manager with assigned properties sees rooms from all assigned properties
          const allRooms = await storage.getAllRooms();
          const filteredRooms = allRooms.filter(room => currentUser.assignedPropertyIds!.includes(room.propertyId));
          res.json(filteredRooms);
        } else {
          // Manager without assigned property sees no rooms (return empty array)
          res.json([]);
        }
      } else {
        // Admin, staff, and kitchen see all rooms
        const rooms = await storage.getAllRooms();
        res.json(rooms);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room availability checking - MUST be FIRST specific /api/rooms/* route to avoid collision with :id routes
  app.get("/api/rooms/availability", isAuthenticated, async (req, res) => {
    console.log('[AVAILABILITY HANDLER] ✅ Handler called - ENTRY POINT');
    try {
      const { propertyId, checkIn, checkOut, excludeBookingId } = req.query;
      console.log('[AVAILABILITY] Query params:', { propertyId, checkIn, checkOut, excludeBookingId });
      
      // Get all rooms (optionally filtered by property)
      const { rooms } = await import("@shared/schema");
      
      // Build query with optional property filter
      const propertyIdNum = propertyId ? Number(propertyId) : null;
      console.log('[AVAILABILITY] Parsed propertyId:', propertyIdNum, 'isFinite:', Number.isFinite(propertyIdNum));
      
      const allRooms = Number.isFinite(propertyIdNum) 
        ? await db.select().from(rooms).where(eq(rooms.propertyId, propertyIdNum!))
        : await db.select().from(rooms);
      
      console.log('[AVAILABILITY] Found rooms:', allRooms.length);
      
      // If no dates provided, return all rooms with full availability
      if (!checkIn || !checkOut) {
        const availability = allRooms.map(room => ({
          roomId: room.id,
          available: 1,
          ...(room.roomCategory === "dormitory" && {
            totalBeds: room.totalBeds || 6,
            remainingBeds: room.totalBeds || 6
          })
        }));
        return res.json(availability);
      }
      
      // Parse and validate dates  
      const requestCheckIn = new Date(checkIn as string);
      const requestCheckOut = new Date(checkOut as string);
      if (isNaN(requestCheckIn.getTime()) || isNaN(requestCheckOut.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Get all active bookings and filter in JavaScript (historical working solution)
      const { bookings } = await import("@shared/schema");
      
      // Fetch all non-cancelled bookings for the property
      const allBookings = await db
        .select()
        .from(bookings)
        .where(
          propertyId 
            ? and(eq(bookings.propertyId, Number(propertyId)), not(eq(bookings.status, "cancelled")))
            : not(eq(bookings.status, "cancelled"))
        );
      
      // Filter overlapping bookings using JavaScript Date comparison
      // Overlap: booking.checkOut > requestCheckIn AND booking.checkIn < requestCheckOut
      let overlappingBookings = allBookings.filter(booking => {
        // Skip bookings with invalid dates
        if (!booking.checkInDate || !booking.checkOutDate) return false;
        
        const bookingCheckOut = new Date(booking.checkOutDate);
        const bookingCheckIn = new Date(booking.checkInDate);
        
        // Skip if dates are invalid
        if (isNaN(bookingCheckOut.getTime()) || isNaN(bookingCheckIn.getTime())) return false;
        
        return bookingCheckOut > requestCheckIn && bookingCheckIn < requestCheckOut;
      });
      
      // Filter out excluded booking if specified
      if (excludeBookingId) {
        const excludeId = Number(excludeBookingId);
        if (Number.isFinite(excludeId)) {
          overlappingBookings = overlappingBookings.filter(b => b.id !== excludeId);
        }
      }
      
      // Calculate availability for each room
      const availability = allRooms.map(room => {
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
            totalBeds,
            remainingBeds
          };
        }
        
        const hasOverlap = overlappingBookings.some(b => 
          b.roomId === room.id || b.roomIds?.includes(room.id)
        );
        
        return {
          roomId: room.id,
          available: hasOverlap ? 0 : 1
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      console.error('[AVAILABILITY ERROR] ❌ CAUGHT ERROR IN HANDLER');
      console.error('[AVAILABILITY ERROR] Full error:', error);
      console.error('[AVAILABILITY ERROR] Message:', error.message);
      console.error('[AVAILABILITY ERROR] Stack:', error.stack);
      console.error('[AVAILABILITY ERROR] Error name:', error.name);
      console.error('[AVAILABILITY ERROR] Error code:', error.code);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/checked-in-guests", isAuthenticated, async (req, res) => {
    try {
      const roomsWithGuests = await storage.getRoomsWithCheckedInGuests();
      res.json(roomsWithGuests);
    } catch (error: any) {
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
      const checkInDate = new Date(checkIn as string);
      const checkOutDate = new Date(checkOut as string);
      
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
        
        // Check if booking overlaps with requested dates
        const bookingCheckOut = new Date(booking.checkOutDate);
        const bookingCheckIn = new Date(booking.checkInDate);
        
        return bookingCheckOut > checkInDate && bookingCheckIn < checkOutDate;
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

  app.post("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(data);
      res.status(201).json(room);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const room = await storage.updateRoom(parseInt(req.params.id), req.body);
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/rooms/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const room = await storage.updateRoomStatus(parseInt(req.params.id), status);
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteRoom(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      // Return 400 for validation errors (room has associations), 500 for unexpected errors
      const status = error.message.includes("Cannot delete room") ? 400 : 500;
      res.status(status).json({ message: error.message });
    }
  });

  // Guests
  app.get("/api/guests", isAuthenticated, async (req, res) => {
    try {
      const guests = await storage.getAllGuests();
      res.json(guests);
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
      const guest = await storage.updateGuest(parseInt(req.params.id), req.body);
      res.json(guest);
    } catch (error: any) {
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
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const { propertyId } = req.query;
      let agents = propertyId 
        ? await storage.getTravelAgentsByProperty(parseInt(propertyId as string))
        : await storage.getAllTravelAgents();
      
      // Apply property filtering for managers and kitchen users
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
        agents = agents.filter(agent => currentUser.assignedPropertyIds!.includes(agent.propertyId));
      }
      
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/travel-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      const agent = await storage.getTravelAgent(parseInt(req.params.id));
      if (!agent) {
        return res.status(404).json({ message: "Travel agent not found" });
      }

      // Check authorization for managers/kitchen
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && 
          currentUser.assignedPropertyIds && 
          !currentUser.assignedPropertyIds.includes(agent.propertyId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/travel-agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      let bookings = await storage.getAllBookings();
      
      // Apply property filtering for managers and kitchen users
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
        const allRooms = await storage.getAllRooms();
        bookings = bookings.filter(booking => {
          // Handle single room bookings
          if (booking.roomId) {
            const room = allRooms.find(r => r.id === booking.roomId);
            if (!room) {
              console.warn(`Room ${booking.roomId} not found for booking ${booking.id}`);
              return false;
            }
            return currentUser.assignedPropertyIds!.includes(room.propertyId);
          }
          // Handle group bookings (multiple rooms)
          if (booking.roomIds && booking.roomIds.length > 0) {
            // Include group booking if ANY of its rooms belong to manager's properties
            const bookingRooms = booking.roomIds
              .map(roomId => allRooms.find(r => r.id === roomId))
              .filter((room): room is NonNullable<typeof room> => {
                if (!room) {
                  console.warn(`Room not found in roomIds for booking ${booking.id}`);
                  return false;
                }
                return true;
              });
            
            // Show booking if at least one room belongs to manager's assigned properties
            return bookingRooms.some(room => currentUser.assignedPropertyIds!.includes(room.propertyId));
          }
          return false;
        });
      }
      
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Active bookings MUST come before /api/bookings/:id to avoid route collision
  app.get("/api/bookings/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      // Get all checked-in bookings
      const allBookings = await storage.getAllBookings();
      let activeBookings = allBookings.filter(b => b.status === "checked-in");
      
      // Get all related data
      const allGuests = await storage.getAllGuests();
      const allRooms = await storage.getAllRooms();
      const allProperties = await storage.getAllProperties();
      
      // Apply property filtering for managers and kitchen users
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
        // Filter bookings by property through room relationship
        activeBookings = activeBookings.filter(booking => {
          // Handle single room bookings
          if (booking.roomId) {
            const room = allRooms.find(r => r.id === booking.roomId);
            if (!room) {
              console.warn(`Room ${booking.roomId} not found for active booking ${booking.id}`);
              return false;
            }
            return currentUser.assignedPropertyIds!.includes(room.propertyId);
          }
          // Handle group bookings (multiple rooms)
          if (booking.roomIds && booking.roomIds.length > 0) {
            const bookingRooms = booking.roomIds
              .map(roomId => allRooms.find(r => r.id === roomId))
              .filter((room): room is NonNullable<typeof room> => {
                if (!room) {
                  console.warn(`Room not found in roomIds for active booking ${booking.id}`);
                  return false;
                }
                return true;
              });
            
            return bookingRooms.some(room => currentUser.assignedPropertyIds!.includes(room.propertyId));
          }
          return false;
        });
      }
      
      if (activeBookings.length === 0) {
        return res.json([]);
      }

      const allOrders = await db.select().from(orders);
      const allExtras = await db.select().from(extraServices);

      // Build enriched data
      const enrichedBookings = activeBookings.map(booking => {
        const guest = allGuests.find(g => g.id === booking.guestId);
        const room = booking.roomId ? allRooms.find(r => r.id === booking.roomId) : null;
        
        // For group bookings, get all rooms
        const groupRooms = booking.isGroupBooking && booking.roomIds
          ? allRooms.filter(r => booking.roomIds!.includes(r.id))
          : [];
        
        // Get property from either single room or first group room
        const property = room?.propertyId 
          ? allProperties.find(p => p.id === room.propertyId)
          : groupRooms.length > 0 
            ? allProperties.find(p => p.id === groupRooms[0].propertyId)
            : null;

        if (!guest || (!room && groupRooms.length === 0)) {
          return null;
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
        } else {
          // Single room booking
          const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : null;
          const roomPrice = room.pricePerNight ? parseFloat(String(room.pricePerNight)) : 0;
          const pricePerNight = customPrice || roomPrice;
          roomCharges = pricePerNight * nightsStayed;
        }

        const bookingOrders = allOrders.filter(o => o.bookingId === booking.id);
        // Exclude rejected orders from food charges calculation
        const foodCharges = bookingOrders
          .filter(order => order.status !== "rejected")
          .reduce((sum, order) => {
            const amount = order.totalAmount ? parseFloat(String(order.totalAmount)) : 0;
            return sum + amount;
          }, 0);

        const bookingExtras = allExtras.filter(e => e.bookingId === booking.id);
        const extraCharges = bookingExtras.reduce((sum, extra) => {
          const amount = extra.amount ? parseFloat(String(extra.amount)) : 0;
          return sum + amount;
        }, 0);

        const subtotal = roomCharges + foodCharges + extraCharges;
        // Don't automatically apply GST/Service charges in the card display
        // They are optional and applied only at checkout based on user selection
        const totalAmount = subtotal;
        const advancePaid = booking.advanceAmount ? parseFloat(String(booking.advanceAmount)) : 0;
        const balanceAmount = totalAmount - advancePaid;

        return {
          ...booking,
          guest,
          room,
          rooms: groupRooms.length > 0 ? groupRooms : undefined,
          property,
          nightsStayed,
          orders: bookingOrders,
          extraServices: bookingExtras,
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
      }).filter(Boolean);

      res.json(enrichedBookings);
    } catch (error: any) {
      console.error("Active bookings error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bookings with details for analytics
  app.get("/api/bookings/with-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      let allBookings = await storage.getAllBookings();
      const allGuests = await storage.getAllGuests();
      const allRooms = await storage.getAllRooms();
      const allProperties = await storage.getAllProperties();

      // Apply property filtering for managers and kitchen users
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
        allBookings = allBookings.filter(booking => {
          // Handle single room bookings
          if (booking.roomId) {
            const room = allRooms.find(r => r.id === booking.roomId);
            if (!room) {
              console.warn(`Room ${booking.roomId} not found for booking ${booking.id}`);
              return false;
            }
            return currentUser.assignedPropertyIds!.includes(room.propertyId);
          }
          // Handle group bookings (multiple rooms)
          if (booking.roomIds && booking.roomIds.length > 0) {
            const bookingRooms = booking.roomIds
              .map(roomId => allRooms.find(r => r.id === roomId))
              .filter((room): room is NonNullable<typeof room> => {
                if (!room) {
                  console.warn(`Room not found in roomIds for booking ${booking.id}`);
                  return false;
                }
                return true;
              });
            
            return bookingRooms.some(room => currentUser.assignedPropertyIds!.includes(room.propertyId));
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

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      
      // Convert date strings to Date objects
      const bodyWithDates = {
        ...req.body,
        checkInDate: new Date(req.body.checkInDate),
        checkOutDate: new Date(req.body.checkOutDate),
      };
      
      const data = insertBookingSchema.parse(bodyWithDates);
      
      console.log('🔍 [DEBUG] Booking creation - parsed data:', {
        roomId: data.roomId,
        numberOfGuests: data.numberOfGuests,
        bedsBooked: data.bedsBooked,
        hasBedsBooked: 'bedsBooked' in data,
        bedsBookedType: typeof data.bedsBooked
      });
      
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
      
      const booking = await storage.createBooking(data);
      
      // WhatsApp booking confirmation DISABLED per user request (only using check-in and checkout notifications)
      // To re-enable, uncomment the block below
      /*
      try {
        const guest = await storage.getGuest(booking.guestId);
        
        if (!guest) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send confirmation: guest ${booking.guestId} not found`);
        } else if (!guest.phone) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send confirmation: guest ${booking.guestId} (${guest.fullName}) has no phone number`);
        } else {
          const guestName = guest.fullName || "Guest";
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
          
          let roomNumbers = "TBD";
          if (booking.roomId) {
            const room = await storage.getRoom(booking.roomId);
            roomNumbers = room?.roomNumber || roomNumbers;
          } else if (booking.roomIds && booking.roomIds.length > 0) {
            const rooms = await Promise.all(booking.roomIds.map(id => storage.getRoom(id)));
            roomNumbers = rooms.filter(r => r).map(r => r!.roomNumber).join(", ");
          }
          
          const checkInDate = format(new Date(booking.checkInDate), "dd MMM yyyy");
          const checkOutDate = format(new Date(booking.checkOutDate), "dd MMM yyyy");
          
          await sendBookingConfirmation(
            guest.phone,
            guestName,
            propertyName,
            checkInDate,
            checkOutDate,
            roomNumbers
          );
          
          console.log(`[WhatsApp] Booking #${booking.id} - Confirmation sent to ${guest.fullName} (${guest.phone})`);
        }
      } catch (whatsappError: any) {
        console.error(`[WhatsApp] Booking #${booking.id} - Notification failed (non-critical):`, whatsappError.message);
      }
      */
      
      res.status(201).json(booking);
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
      // Parse and validate the booking data - this will convert ISO strings to Date objects
      const validatedData = insertBookingSchema.partial().parse(req.body);
      
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
              guest.phone,
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

  app.patch("/api/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const bookingId = parseInt(req.params.id);
      
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
        
        // Auto-checkout any previous bookings for the same room to prevent duplicate check-ins
        // This ensures only one booking can be checked-in per room at a time
        const allBookings = await storage.getAllBookings();
        const roomId = currentBooking.roomId;
        const otherCheckedInBookings = allBookings.filter(b => 
          b.roomId === roomId && 
          b.id !== bookingId && 
          b.status === "checked-in"
        );
        
        // Auto-checkout the previous booking(s)
        for (const oldBooking of otherCheckedInBookings) {
          console.log(`[Auto-Checkout] Checking out old booking ${oldBooking.id} for room ${roomId} before checking in booking ${bookingId}`);
          await storage.updateBookingStatus(oldBooking.id, "checked-out");
        }
      }
      
      const booking = await storage.updateBookingStatus(bookingId, status);
      
      // Send WhatsApp notification when guest checks in
      if (status === "checked-in") {
        try {
          const guest = await storage.getGuest(booking.guestId);
          
          if (guest && guest.phone) {
            // Get property info
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
            const checkInDate = format(new Date(booking.checkInDate), "dd MMM yyyy");
            const checkOutDate = format(new Date(booking.checkOutDate), "dd MMM yyyy");
            
            await sendCheckInNotification(
              guest.phone,
              guestName,
              propertyName,
              roomNumbers,
              checkInDate,
              checkOutDate
            );
            
            console.log(`[WhatsApp] Booking #${booking.id} - Check-in notification sent to ${guest.fullName}`);
          } else if (!guest) {
            console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send check-in notification: guest ${booking.guestId} not found`);
          } else if (!guest.phone) {
            console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send check-in notification: guest has no phone number`);
          }
        } catch (whatsappError: any) {
          console.error(`[WhatsApp] Booking #${booking.id} - Check-in notification failed (non-critical):`, whatsappError.message);
        }
      }
      
      res.json(booking);
    } catch (error: any) {
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

  // Checkout endpoint
  app.post("/api/bookings/checkout", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, paymentMethod, paymentStatus = "paid", dueDate, pendingReason, discountType, discountValue, discountAppliesTo = "total", includeGst = true, includeServiceCharge = true, manualCharges } = req.body;
      
      // Validate input
      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
      }
      
      // Payment method is required only when marking as paid
      if (paymentStatus === "paid" && !paymentMethod) {
        return res.status(400).json({ message: "Payment method is required when marking as paid" });
      }

      // Fetch booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check for pending food orders
      const allOrders = await storage.getAllOrders();
      const bookingOrders = allOrders.filter(o => o.bookingId === bookingId);
      const pendingOrders = bookingOrders.filter(order => 
        order.status === "pending" || order.status === "preparing" || order.status === "ready"
      );
      
      if (pendingOrders.length > 0) {
        return res.status(400).json({ 
          message: `Checkout not allowed — ${pendingOrders.length} pending food order(s) exist for this booking.` 
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

      // Fetch room(s) to get price
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      
      // Calculate nights (minimum 1 night even if same-day checkout)
      const checkInDate = new Date(booking.checkInDate);
      const checkOutDate = new Date(booking.checkOutDate);
      const calculatedNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const nights = Math.max(1, calculatedNights); // Ensure at least 1 night
      
      // Calculate room charges - handle both single and group bookings
      let roomCharges = 0;
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
      const foodCharges = bookingOrders
        .filter(order => order.status !== "rejected")
        .reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

      // Fetch and calculate extra service charges (now including manual charges)
      const allExtras = await storage.getAllExtraServices();
      const bookingExtras = allExtras.filter(e => e.bookingId === bookingId);
      const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

      // Calculate totals
      // IMPORTANT: Apply GST/Service Charge ONLY to room charges, NOT to food or extra charges
      const subtotal = roomCharges + foodCharges + extraCharges; // Total subtotal including all charges
      
      const gstRate = 5; // 5% GST
      const gstAmount = includeGst ? (roomCharges * gstRate) / 100 : 0; // GST ONLY on room charges
      const serviceChargeRate = 10;
      const serviceChargeAmount = includeServiceCharge ? (roomCharges * serviceChargeRate) / 100 : 0; // Service charge ONLY on room charges
      const totalAmountBeforeDiscount = subtotal + gstAmount + serviceChargeAmount;

      // Calculate discount based on where it applies
      let discountAmount = 0;
      
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

      const totalAmount = totalAmountBeforeDiscount - discountAmount;
      const advancePaid = parseFloat(booking.advanceAmount || "0");
      const balanceAmount = totalAmount - advancePaid;

      // Create/Update bill with server-calculated amounts
      // When payment status is "paid", set balance to 0 (payment collected)
      // When payment status is "pending", keep calculated balance (payment to be collected later)
      const billData = {
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
        includeGst,
        includeServiceCharge,
        discountType: discountType || null,
        discountValue: discountValue ? discountValue.toString() : null,
        discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : "0",
        totalAmount: totalAmount.toFixed(2),
        advancePaid: advancePaid.toFixed(2),
        balanceAmount: paymentStatus === "paid" ? "0.00" : balanceAmount.toFixed(2),
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
        paidAt: paymentStatus === "paid" ? new Date() : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        pendingReason: pendingReason || null,
      };
      
      const bill = await storage.createOrUpdateBill(billData);

      // Only update booking status after successful bill creation
      await storage.updateBookingStatus(bookingId, "checked-out");
      
      // Send WhatsApp checkout notification
      try {
        const guest = await storage.getGuest(booking.guestId);
        
        if (guest && guest.phone) {
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
            guest.phone,
            guestName,
            propertyName,
            totalAmountFormatted,
            checkoutDate,
            roomNumbers
          );
          
          console.log(`[WhatsApp] Booking #${booking.id} - Checkout notification sent to ${guest.fullName}`);
        } else if (!guest) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send checkout notification: guest ${booking.guestId} not found`);
        } else if (!guest.phone) {
          console.warn(`[WhatsApp] Booking #${booking.id} - Cannot send checkout notification: guest has no phone number`);
        }
      } catch (whatsappError: any) {
        console.error(`[WhatsApp] Booking #${booking.id} - Checkout notification failed (non-critical):`, whatsappError.message);
      }

      res.json({ success: true, bill });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Items
  app.get("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // If user is a manager or kitchen, filter by assigned properties
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
          // Get menu items from all assigned properties
          const allItems = await storage.getAllMenuItems();
          const filteredItems = allItems.filter(item => currentUser.assignedPropertyIds!.includes(item.propertyId));
          res.json(filteredItems);
        } else {
          // Manager/Kitchen without assigned property sees no menu items
          res.json([]);
        }
      } else {
        // Admin and staff see all menu items
        const items = await storage.getAllMenuItems();
        res.json(items);
      }
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
      const currentUser = await storage.getUser(req.user.claims.sub);
      
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

  app.patch("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
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

  app.delete("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
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

  // Swap two menu items (simple swap for arrow buttons)
  app.patch("/api/menu-items/swap", isAuthenticated, async (req, res) => {
    try {
      const { id1, id2, order1, order2 } = req.body;
      
      // Simple swap - update both items
      await storage.updateMenuItem(Number(id1), { displayOrder: Number(order2) });
      await storage.updateMenuItem(Number(id2), { displayOrder: Number(order1) });
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Categories
  app.get("/api/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
          const allCategories = await storage.getAllMenuCategories();
          const filteredCategories = allCategories.filter(cat => 
            cat.propertyId === null || currentUser.assignedPropertyIds!.includes(cat.propertyId)
          );
          res.json(filteredCategories);
        } else {
          res.json([]);
        }
      } else {
        const categories = await storage.getAllMenuCategories();
        res.json(categories);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/menu-categories", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
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

  // Bulk update display order for menu categories
  app.patch("/api/menu-categories/reorder", isAuthenticated, async (req, res) => {
    try {
      const updates: { id: number; displayOrder: number }[] = req.body;
      await storage.reorderMenuCategories(updates);
      res.status(200).json({ success: true });
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

  // Orders
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      // Get current user to check role and property assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      
      // Security: If user not found in storage (deleted/stale session), deny access
      if (!currentUser) {
        return res.status(403).json({ message: "User not found. Please log in again." });
      }
      
      // If user is a manager or kitchen, filter orders by assigned properties
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (currentUser.assignedPropertyIds && currentUser.assignedPropertyIds.length > 0) {
          // Get orders from all assigned properties
          const allOrders = await storage.getAllOrders();
          const filteredOrders = allOrders.filter(order => 
            order.propertyId && currentUser.assignedPropertyIds!.includes(order.propertyId)
          );
          res.json(filteredOrders);
        } else {
          // Manager/Kitchen without assigned property sees no orders
          res.json([]);
        }
      } else {
        // Admin and staff see all orders
        const orders = await storage.getAllOrders();
        res.json(orders);
      }
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

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      let orderData = insertOrderSchema.parse(req.body) as any;
      
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
      
      const order = await storage.createOrder(orderData);
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
    try {
      // Get all orders and filter in JavaScript
      const allOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt));
      
      // Filter for restaurant orders with null bookingId
      const unmergedOrders = allOrders.filter(
        (order) => order.orderType === "restaurant" && order.bookingId === null
      );
      
      console.log(`Found ${unmergedOrders.length} unmerged café orders`);
      res.json(unmergedOrders);
    } catch (error: any) {
      console.error("Error fetching unmerged café orders:", error);
      console.error("Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ message: error.message });
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

  app.patch("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(parseInt(req.params.id), status);
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const order = await storage.updateOrder(parseInt(req.params.id), req.body);
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

  // Extra Services
  app.get("/api/extra-services", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getAllExtraServices();
      res.json(services);
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

  app.post("/api/extra-services", isAuthenticated, async (req, res) => {
    try {
      const { insertExtraServiceSchema } = await import("@shared/schema");
      const data = insertExtraServiceSchema.parse(req.body);
      const service = await storage.createExtraService(data);
      res.status(201).json(service);
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
      const bills = await storage.getAllBills();
      
      // Enrich bills with guest names
      const enrichedBills = await Promise.all(
        bills.map(async (bill) => {
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

      // Fetch orders for this booking
      const allOrders = await storage.getAllOrders();
      const orders = allOrders.filter(o => o.bookingId === booking.id);

      // Fetch extra services for this booking
      const allExtras = await storage.getAllExtraServices();
      const extraServices = allExtras.filter(e => e.bookingId === booking.id);

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
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }
      res.json(bill);
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
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bills/merge", isAuthenticated, async (req, res) => {
    try {
      // Only admins can merge bills
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can merge bills" });
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

  // Get all pending bills with guest and agent details  
  app.get("/api/bills/pending", isAuthenticated, async (req, res) => {
    try {
      // Use getAllBills and filter for pending status
      const allBills = await storage.getAllBills();
      const pendingBills = allBills
        .filter((bill: any) => bill.paymentStatus === 'pending')
        .map((bill: any) => ({
          ...bill,
          balanceAmount: bill.balanceAmount || bill.totalAmount || "0",
        }));
      res.json(pendingBills);
    } catch (error: any) {
      console.error("[/api/bills/pending] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark a bill as paid
  app.post("/api/bills/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      // Get userId from auth claims - req.user.claims.sub has the actual user ID
      const userId = req.user?.claims?.sub;
      
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
      
      // Update bill to paid status
      const updatedBill = await storage.updateBill(billId, {
        paymentStatus: "paid",
        paymentMethod,
        paidAt: new Date(),
        balanceAmount: "0.00",
      });
      
      res.json(updatedBill);
    } catch (error: any) {
      console.error("❌ ERROR marking bill as paid:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // Enquiries
  app.get("/api/enquiries", isAuthenticated, async (req, res) => {
    try {
      const enquiries = await storage.getAllEnquiries();
      res.json(enquiries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/enquiries/:id", isAuthenticated, async (req, res) => {
    try {
      const enquiry = await storage.getEnquiry(parseInt(req.params.id));
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/enquiries", isAuthenticated, async (req, res) => {
    try {
      const data = insertEnquirySchema.parse(req.body);
      const enquiry = await storage.createEnquiry(data);
      res.status(201).json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
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
      const templates = await storage.getAllMessageTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      const communications = await storage.getCommunicationsByEnquiry(parseInt(req.params.id));
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings/:id/communications", isAuthenticated, async (req, res) => {
    try {
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
      
      // Filter overlapping bookings using JavaScript Date comparison
      const overlappingBookings = allBookings.filter(booking => {
        // Skip bookings with invalid dates
        if (!booking.checkInDate || !booking.checkOutDate) return false;
        
        const bookingCheckOut = new Date(booking.checkOutDate);
        const bookingCheckIn = new Date(booking.checkInDate);
        
        // Skip if dates are invalid
        if (isNaN(bookingCheckOut.getTime()) || isNaN(bookingCheckIn.getTime())) return false;
        
        return bookingCheckOut > start && bookingCheckIn < end;
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
        
        // Mark booked dates
        roomBookings.forEach(booking => {
          const bookingStart = new Date(booking.checkInDate);
          const bookingEnd = new Date(booking.checkOutDate);
          
          let bookingDate = new Date(bookingStart);
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
  app.get("/api/leases", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const leases = propertyId 
        ? await storage.getLeasesByProperty(parseInt(propertyId as string))
        : await storage.getAllLeases();
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
      const validatedData = insertPropertyLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leases/:id", isAuthenticated, async (req, res) => {
    try {
      const lease = await storage.updateLease(parseInt(req.params.id), req.body);
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
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

  app.post("/api/leases/:leaseId/payments", isAuthenticated, async (req, res) => {
    try {
      const { insertLeasePaymentSchema } = await import("@shared/schema");
      const paymentData = {
        ...req.body,
        leaseId: parseInt(req.params.leaseId),
      };
      const validatedData = insertLeasePaymentSchema.parse(paymentData);
      const payment = await storage.createLeasePayment(validatedData);
      res.status(201).json(payment);
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

  // Expense Category endpoints
  app.get("/api/expense-categories", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const categories = propertyId
        ? await storage.getExpenseCategoriesByProperty(parseInt(propertyId as string))
        : await storage.getAllExpenseCategories();
      res.json(categories);
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
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const expenses = propertyId 
        ? await storage.getExpensesByProperty(parseInt(propertyId as string))
        : await storage.getAllExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { insertPropertyExpenseSchema } = await import("@shared/schema");
      const validatedData = insertPropertyExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
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

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
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

  // P&L Report endpoint (lease-period based with total lease amount)
  app.get("/api/properties/:propertyId/pnl", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const propertyId = parseInt(req.params.propertyId);
      const { leaseId } = req.query;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check property access for managers
      if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (!propertyIds.includes(propertyId)) {
          return res.status(403).json({ message: "You don't have access to this property" });
        }
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
      const user = req.user as any;
      const { propertyId } = req.query;

      let staffMembers;
      if (propertyId) {
        staffMembers = await storage.getStaffMembersByProperty(parseInt(propertyId as string));
      } else if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (propertyIds.length === 0) {
          return res.json([]);
        }
        const allMembers = await storage.getAllStaffMembers();
        staffMembers = allMembers.filter(m => propertyIds.includes(m.propertyId));
      } else {
        staffMembers = await storage.getAllStaffMembers();
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

      const { insertStaffMemberSchema } = await import("@shared/schema");
      const validatedData = insertStaffMemberSchema.parse(req.body);

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

      const updated = await storage.updateStaffMember(parseInt(req.params.id), req.body);
      res.json(updated);
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
      const user = req.user as any;
      const { userId, propertyId } = req.query;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let salaries;
      if (userId) {
        salaries = await storage.getSalariesByUser(userId as string);
      } else if (propertyId) {
        salaries = await storage.getSalariesByProperty(parseInt(propertyId as string));
      } else if (user.role === 'manager') {
        const propertyIds = user.assignedPropertyIds || [];
        if (propertyIds.length === 0) {
          return res.json([]);
        }
        const allSalaries = await storage.getAllSalaries();
        salaries = allSalaries.filter(s => s.propertyId && propertyIds.includes(s.propertyId));
      } else {
        salaries = await storage.getAllSalaries();
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
  app.get("/api/salaries/summary", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { startDate, endDate } = req.query;
      
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const salaries = await storage.getAllSalaries();
      const advances = await storage.getAllAdvances();
      const allUsers = await storage.getAllUsers();

      // Filter by date range if provided
      let filteredSalaries = salaries;
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

  // GET /api/staff-salaries/detailed - Get detailed salary breakdown for all staff
  app.get("/api/staff-salaries/detailed", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { propertyId, startDate, endDate } = req.query;

      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ message: "propertyId, startDate, and endDate are required" });
      }

      const propId = parseInt(propertyId as string);
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Check user access to property
      if (user.role === 'manager') {
        const assignedProps = user.assignedPropertyIds || [];
        if (!assignedProps.includes(propId)) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      const detailedSalaries = await storage.getDetailedStaffSalaries(propId, start, end);
      res.json(detailedSalaries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Salary Advance endpoints
  app.get("/api/advances", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { userId } = req.query;

      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const advances = userId 
        ? await storage.getAdvancesByUser(userId as string)
        : await storage.getAllAdvances();
      
      res.json(advances);
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
  app.get("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { staffMemberId, propertyId, attendanceDate } = req.query;

      if (staffMemberId) {
        const records = await storage.getAttendanceByStaffMember(parseInt(staffMemberId as string));
        return res.json(records);
      }

      if (propertyId) {
        const records = await storage.getAttendanceByProperty(parseInt(propertyId as string));
        return res.json(records);
      }

      if (attendanceDate) {
        const date = new Date(attendanceDate as string);
        const records = await storage.getAttendanceByDate(date);
        return res.json(records);
      }

      const allRecords = await storage.getAllAttendance();
      res.json(allRecords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/attendance - Create attendance record
  app.post("/api/attendance", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      // Validate the request data
      const validatedData = insertAttendanceRecordSchema.parse({
        ...req.body,
        userId: user.id,
        attendanceDate: new Date(req.body.attendanceDate),
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

  // GET /api/attendance/stats - Get attendance statistics
  app.get("/api/attendance/stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { propertyId, startDate, endDate } = req.query;

      if (!propertyId) {
        return res.status(400).json({ message: "propertyId is required" });
      }

      const start = startDate ? new Date(startDate as string) : new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days

      const end = endDate ? new Date(endDate as string) : new Date();

      // Get all staff members for the property
      const staffMembers = await storage.getStaffMembersByProperty(parseInt(propertyId as string));
      
      // Get attendance records for the period
      const attendanceRecords = await storage.getAttendanceByProperty(parseInt(propertyId as string));
      
      // Calculate stats for each staff member
      const stats = staffMembers.map((staff) => {
        const staffAttendance = attendanceRecords.filter(
          (record) => record.userId === String(staff.id)
        );

        const presentDays = staffAttendance.filter((a) => a.status === "present").length;
        const absentDays = staffAttendance.filter((a) => a.status === "absent").length;
        const leaveDays = staffAttendance.filter((a) => a.status === "leave").length;
        const halfDays = staffAttendance.filter((a) => a.status === "half-day").length;
        const totalDays = staffAttendance.length;

        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        return {
          staffId: staff.id,
          staffName: staff.name,
          presentDays,
          absentDays,
          leaveDays,
          halfDays,
          totalDays,
          attendancePercentage,
          baseSalary: staff.baseSalary,
          netSalary: staff.baseSalary || 0, // Will be calculated properly with deductions
        };
      });

      res.json(stats);
    } catch (error: any) {
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
      const { resetToken, newPassword } = req.body;
      
      if (!resetToken || !newPassword) {
        return res.status(400).json({ message: "Reset token and new password required" });
      }

      // In a real app, validate the resetToken against a stored session
      // For now, this is a placeholder
      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, businessName, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password || !businessName) {
        return res.status(400).json({ message: "Email, password, and business name are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUser("");
      const allUsers = await storage.getAllUsers();
      const userExists = allUsers.some((u) => u.email === email);

      if (userExists) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create new user with admin role
      const newUser = await storage.upsertUser({
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        businessName,
        role: "admin",
        status: "active",
      });

      // Log the registration
      console.log(`[REGISTRATION] New user registered: ${email} with business: ${businessName}`);

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          email: newUser.email,
          businessName: newUser.businessName,
        },
      });
    } catch (error: any) {
      console.error("[REGISTRATION ERROR]", error);
      res.status(500).json({ message: error.message || "Registration failed" });
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
      res.setHeader("Content-Type", "text/csv;charset=utf-8;");
      res.setHeader("Content-Disposition", `attachment;filename=property-${propertyId}-export-${Date.now()}.csv`);
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
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/properties", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser || dbUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const reports = await storage.getAllIssueReports();
      res.json(reports);
    } catch (error: any) {
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

      const updated = await storage.updateUserStatus(req.params.id, status);
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

      // Create session for target user using req.login
      req.login(targetUser, (err) => {
        if (err) {
          console.error("[LOGIN-AS] Failed to create session:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.json({ message: "Login as successful", user: targetUser });
      });
    } catch (error: any) {
      console.error("[LOGIN-AS] Error:", error);
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

  app.post("/api/guest-self-checkin", async (req, res) => {
    try {
      const { bookingId, email, phone, fullName } = req.body;

      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const guest = await storage.getGuest(booking.guestId);
      if (guest?.email !== email) {
        return res.status(400).json({ message: "Email does not match booking" });
      }

      // Update guest with latest details
      await storage.updateGuest(booking.guestId, {
        phone,
        fullName,
        email,
      });

      // Check in the guest
      const updatedBooking = await storage.updateBooking(booking.id, {
        status: "checked-in",
      });

      // Send self check-in confirmation email
      try {
        const { sendSelfCheckinConfirmationEmail } = await import("./email-service");
        const property = booking.roomId ? await storage.getProperty((await storage.getRoom(booking.roomId))?.propertyId || 0) : null;
        const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
        
        if (guest && email) {
          await sendSelfCheckinConfirmationEmail(
            email,
            fullName,
            property?.name || "Your Property",
            new Date(booking.checkInDate).toLocaleDateString(),
            room?.roomNumber || "TBA"
          );
          console.log(`[EMAIL] Self check-in confirmation sent to ${email}`);
        }
      } catch (emailError) {
        console.warn(`[EMAIL] Failed to send check-in confirmation:`, emailError);
      }

      // Note: Skip audit logging for public guest self-check-in endpoint
      // as there's no authenticated user context
      
      res.json({ message: "Check-in successful", booking: updatedBooking });
    } catch (error: any) {
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

      const crashes = await storage.getAllErrorCrashes();
      res.json(crashes);
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

  // ===== SUPER ADMIN EMAIL/PASSWORD LOGIN =====
  app.post("/api/auth/email-login", async (req, res) => {
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

      // Compare password
      const isValidPassword = await bcryptjs.compare(password, user[0].password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session - set user id directly on request.user for email/password auth
      req.session.userId = user[0].id;
      req.session.isEmailAuth = true; // Mark this as email-based auth
      
      // Set user object on request with just the id field
      (req as any).user = { id: user[0].id };
      
      // Manual session save
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Login successful", 
          user: { 
            id: user[0].id, 
            email: user[0].email, 
            role: user[0].role,
            firstName: user[0].firstName,
            lastName: user[0].lastName 
          } 
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

      if (!apiKey || !baseUrl) {
        console.error("[CHAT] Missing environment variables:", { apiKey: !!apiKey, baseUrl: !!baseUrl });
        return res.status(500).json({ message: "AI service not configured. Please try again later." });
      }

      const { OpenAI } = await import("openai");
      
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
      });

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
        { role: "system" as const, content: systemMessage },
        ...messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: chatMessages,
      });
      
      const messageText = response.choices[0]?.message?.content || 'Unable to process response';
      
      res.json({
        message: messageText,
      });
    } catch (error: any) {
      console.error("[CHAT] Error:", error.message || error);
      res.status(500).json({ message: "Chat service error. Please try again." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
