import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertGuestSchema,
  insertBookingSchema,
  insertMenuItemSchema,
  insertOrderSchema,
  insertExtraServiceSchema,
  insertBillSchema,
  insertEnquirySchema,
  updateUserRoleSchema,
  insertExpenseCategorySchema,
  insertBankTransactionSchema,
  orders,
  bills,
  extraServices,
  enquiries,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { desc, sql, eq, and, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { createAuthkeyService } from "./authkey-service";
import { neon } from "@neondatabase/serverless";
import { eventBus, type DomainEvent } from "./eventBus";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed default expense categories
  await storage.seedDefaultCategories();

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
        // Handle restaurant orders
        orderData.customerName = customerName;
        orderData.customerPhone = customerPhone;
        // Restaurant orders aren't linked to a specific room or property
        // They are walk-in customers
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
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Auto-create user if doesn't exist (e.g., after database wipe)
      if (!user) {
        const email = req.user.claims.email || `${userId}@replit.user`;
        const name = req.user.claims.name || req.user.claims.email || 'User';
        
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
      
      // Include assigned property information if user has one
      let userWithProperty: any = { ...user };
      if (user.assignedPropertyId) {
        const property = await storage.getProperty(user.assignedPropertyId);
        if (property) {
          userWithProperty.assignedPropertyName = property.name;
        }
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
      const propertyId = currentUser.role === "manager" ? currentUser.assignedPropertyId : undefined;
      
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
        validated.assignedPropertyId
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
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyId) {
        properties = properties.filter(p => p.id === currentUser.assignedPropertyId);
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
      
      // If user is a manager, filter by assigned property
      if (currentUser.role === "manager") {
        if (currentUser.assignedPropertyId) {
          // Manager with assigned property sees only their property's rooms
          const rooms = await storage.getRoomsByProperty(currentUser.assignedPropertyId);
          res.json(rooms);
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
      res.status(500).json({ message: error.message });
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
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyId) {
        const allRooms = await storage.getAllRooms();
        bookings = bookings.filter(booking => {
          if (!booking.roomId) return false;
          const room = allRooms.find(r => r.id === booking.roomId);
          return room && room.propertyId === currentUser.assignedPropertyId;
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
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyId) {
        // Filter bookings by property through room relationship
        activeBookings = activeBookings.filter(booking => {
          if (!booking.roomId) return false;
          const room = allRooms.find(r => r.id === booking.roomId);
          return room && room.propertyId === currentUser.assignedPropertyId;
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
        const property = room?.propertyId ? allProperties.find(p => p.id === room.propertyId) : null;

        if (!guest || !room) {
          return null;
        }

        // Calculate nights stayed
        const checkInDate = new Date(booking.checkInDate);
        const now = new Date();
        const nightsStayed = Math.max(1, Math.ceil((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

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
        const foodCharges = bookingOrders.reduce((sum, order) => {
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
      if ((currentUser.role === 'manager' || currentUser.role === 'kitchen') && currentUser.assignedPropertyId) {
        allBookings = allBookings.filter(booking => {
          if (!booking.roomId) return false;
          const room = allRooms.find(r => r.id === booking.roomId);
          return room && room.propertyId === currentUser.assignedPropertyId;
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
      const booking = await storage.createBooking(data);
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
      const booking = await storage.updateBooking(parseInt(req.params.id), validatedData);
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
      
      // If trying to check in, validate the check-in date
      if (status === "checked-in") {
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
      }
      
      const booking = await storage.updateBookingStatus(bookingId, status);
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
      const { bookingId, paymentMethod, discountType, discountValue, discountAppliesTo = "total", includeGst = true, includeServiceCharge = true, manualCharges } = req.body;
      
      // Validate input
      if (!bookingId || !paymentMethod) {
        return res.status(400).json({ message: "Booking ID and payment method are required" });
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
      
      // Calculate nights
      const checkInDate = new Date(booking.checkInDate);
      const checkOutDate = new Date(booking.checkOutDate);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
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
      const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

      // Fetch and calculate extra service charges (now including manual charges)
      const allExtras = await storage.getAllExtraServices();
      const bookingExtras = allExtras.filter(e => e.bookingId === bookingId);
      const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

      // Calculate totals
      const subtotal = roomCharges + foodCharges + extraCharges;
      const gstRate = 5; // Changed from 18% to 5% (default when GST is applied)
      const gstAmount = includeGst ? (subtotal * gstRate) / 100 : 0;
      const serviceChargeRate = 10;
      const serviceChargeAmount = includeServiceCharge ? (subtotal * serviceChargeRate) / 100 : 0;
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
        balanceAmount: balanceAmount.toFixed(2),
        paymentStatus: "paid",
        paymentMethod,
        paidAt: new Date(),
      };
      
      const bill = await storage.createOrUpdateBill(billData);

      // Only update booking status after successful bill creation
      await storage.updateBookingStatus(bookingId, "checked-out");

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
      
      // If user is a manager or kitchen, filter by assigned property
      if ((currentUser.role === "manager" || currentUser.role === "kitchen") && currentUser.assignedPropertyId) {
        const items = await storage.getMenuItemsByProperty(currentUser.assignedPropertyId);
        res.json(items);
      } else if ((currentUser.role === "manager" || currentUser.role === "kitchen") && !currentUser.assignedPropertyId) {
        // Manager/Kitchen without assigned property sees no menu items
        res.json([]);
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
      
      // Security: If user is manager or kitchen, enforce they can only create items for their assigned property
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        if (!currentUser.assignedPropertyId) {
          return res.status(403).json({ message: "You must be assigned to a property to create menu items." });
        }
        
        // Override propertyId to ensure they can only create for their assigned property
        data.propertyId = currentUser.assignedPropertyId;
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
      
      // Security: If user is manager or kitchen, verify the menu item belongs to their property
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        const existingItem = await storage.getMenuItem(parseInt(req.params.id));
        
        if (!existingItem) {
          return res.status(404).json({ message: "Menu item not found" });
        }
        
        if (existingItem.propertyId !== currentUser.assignedPropertyId) {
          return res.status(403).json({ message: "You can only modify menu items from your assigned property." });
        }
        
        // Prevent changing propertyId
        if (req.body.propertyId && req.body.propertyId !== currentUser.assignedPropertyId) {
          return res.status(403).json({ message: "You cannot change the property of a menu item." });
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
      
      // Security: If user is manager or kitchen, verify the menu item belongs to their property
      if (currentUser.role === "manager" || currentUser.role === "kitchen") {
        const existingItem = await storage.getMenuItem(parseInt(req.params.id));
        
        if (!existingItem) {
          return res.status(404).json({ message: "Menu item not found" });
        }
        
        if (existingItem.propertyId !== currentUser.assignedPropertyId) {
          return res.status(403).json({ message: "You can only delete menu items from your assigned property." });
        }
      }
      
      await storage.deleteMenuItem(parseInt(req.params.id));
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
      
      // If user is a manager or kitchen, filter orders by assigned property
      if ((currentUser.role === "manager" || currentUser.role === "kitchen") && currentUser.assignedPropertyId) {
        const orders = await storage.getOrdersByProperty(currentUser.assignedPropertyId);
        res.json(orders);
      } else if ((currentUser.role === "manager" || currentUser.role === "kitchen") && !currentUser.assignedPropertyId) {
        // Manager/Kitchen without assigned property sees no orders
        res.json([]);
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

      // Fetch room
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;

      // Fetch property
      const property = room?.propertyId ? await storage.getProperty(room.propertyId) : null;

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
      const bill = await storage.updateBill(parseInt(req.params.id), req.body);
      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bills/merge", isAuthenticated, async (req, res) => {
    try {
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
      const updateSchema = insertEnquirySchema.omit({ status: true }).partial();
      const data = updateSchema.parse(req.body);
      const enquiry = await storage.updateEnquiry(parseInt(req.params.id), data);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
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

      // Validate enquiry has required guest information
      if (!enquiry.guestName || !enquiry.guestPhone) {
        console.log("Missing guest info - guestName:", enquiry.guestName, "guestPhone:", enquiry.guestPhone);
        return res.status(400).json({ message: "Enquiry is missing required guest information (name or phone)" });
      }

      // Create or find guest
      let guestId: number;
      const existingGuests = await storage.getAllGuests();
      const existingGuest = existingGuests.find(g => g.phone === enquiry.guestPhone);
      
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
      
      console.log("Creating booking with customPrice:", customPriceValue, "advanceAmount:", advanceAmountValue);
      
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

  // Room availability checking - ULTRA SIMPLIFIED
  app.get("/api/rooms/availability", isAuthenticated, async (req, res) => {
    console.log("🟢🟢🟢 NEW SIMPLIFIED CODE IS RUNNING 🟢🟢🟢");
    try {
      const { propertyId } = req.query;
      console.log("propertyId from query:", propertyId);
      
      if (!propertyId) {
        console.log("❌ No propertyId provided");
        return res.status(400).json({ message: "propertyId is required" });
      }

      const parsedPropertyId = parseInt(propertyId as string);
      console.log("Parsed propertyId:", parsedPropertyId);
      
      if (isNaN(parsedPropertyId)) {
        console.log("❌ Invalid propertyId");
        return res.status(400).json({ message: "Invalid propertyId" });
      }
      
      console.log("✓ About to query database for rooms...");
      // Just return all rooms for this property (simplified)
      const { rooms } = await import("@shared/schema");
      const allRooms = await db
        .select()
        .from(rooms)
        .where(eq(rooms.propertyId, parsedPropertyId));
      
      console.log("✓✓✓ SUCCESS! Found rooms:", allRooms.length);
      res.json(allRooms);
    } catch (error: any) {
      console.error('❌❌❌ Availability error:', error.message);
      console.error('Full error:', error);
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

  // Financial Reports endpoint
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

  const httpServer = createServer(app);
  return httpServer;
}
