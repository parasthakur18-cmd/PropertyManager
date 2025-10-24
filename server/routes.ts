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
  extraServices,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { desc, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed default expense categories
  await storage.seedDefaultCategories();

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
      console.log("Public order request:", JSON.stringify(req.body, null, 2));
      
      const { roomId, items, totalAmount, specialInstructions } = req.body;
      
      if (!roomId || !items || items.length === 0) {
        return res.status(400).json({ message: "Room number and items are required" });
      }

      // Look up room by room number (guest enters "101", we need the actual room ID)
      const roomNumber = String(roomId);
      const rooms = await storage.getAllRooms();
      const room = rooms.find(r => r.roomNumber === roomNumber);
      
      if (!room) {
        return res.status(400).json({ message: `Room ${roomNumber} not found. Please check your room number.` });
      }

      const orderData = {
        propertyId: 1, // Default property - you can make this dynamic
        roomId: room.id, // Use the actual room ID from the database
        items,
        totalAmount,
        specialInstructions: specialInstructions || null,
        status: "pending",
        orderSource: "guest", // Track that this order came from guest self-service
      };

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
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
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
      if (req.user?.claims?.role !== "admin") {
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

  // Properties
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
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
  app.get("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
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
  app.get("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Active bookings MUST come before /api/bookings/:id to avoid route collision
  app.get("/api/bookings/active", isAuthenticated, async (req, res) => {
    try {
      // Get all checked-in bookings
      const allBookings = await storage.getAllBookings();
      const activeBookings = allBookings.filter(b => b.status === "checked-in");
      
      if (activeBookings.length === 0) {
        return res.json([]);
      }

      // Get all related data
      const allGuests = await storage.getAllGuests();
      const allRooms = await storage.getAllRooms();
      const allProperties = await storage.getAllProperties();
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

        // Calculate charges
        const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : null;
        const roomPrice = room.pricePerNight ? parseFloat(String(room.pricePerNight)) : 0;
        const pricePerNight = customPrice || roomPrice;
        const roomCharges = pricePerNight * nightsStayed;

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
        const gstAmount = (subtotal * 18) / 100;
        const serviceChargeAmount = (subtotal * 10) / 100;
        const totalAmount = subtotal + gstAmount + serviceChargeAmount;
        const advancePaid = booking.advanceAmount ? parseFloat(String(booking.advanceAmount)) : 0;
        const balanceAmount = totalAmount - advancePaid;

        return {
          ...booking,
          guest,
          room,
          property,
          nightsStayed,
          orders: bookingOrders,
          charges: {
            roomCharges: roomCharges.toFixed(2),
            foodCharges: foodCharges.toFixed(2),
            extraCharges: extraCharges.toFixed(2),
            subtotal: subtotal.toFixed(2),
            gstAmount: gstAmount.toFixed(2),
            serviceChargeAmount: serviceChargeAmount.toFixed(2),
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
      console.log("Booking request body:", JSON.stringify(req.body, null, 2));
      
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
      const booking = await storage.updateBooking(parseInt(req.params.id), req.body);
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await storage.updateBookingStatus(parseInt(req.params.id), status);
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBooking(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Checkout endpoint (keep this in bookings section)
  app.post("/api/bookings/checkout", isAuthenticated, async (req, res) => {
    console.log("=== HANDLER STARTED ===");
    
    try {
      console.log("Inside try block");
      
      // Step 1: Get bookings
      console.log("STEP 1: Fetching bookings...");
      const allBookings = await storage.getAllBookings();
      console.log(`Got ${allBookings.length} total bookings`);
      
      const activeBookings = allBookings.filter(b => b.status === "checked-in");
      console.log(`Filtered to ${activeBookings.length} checked-in bookings`);

      // If no active bookings, return empty array
      if (activeBookings.length === 0) {
        console.log("Returning empty array");
        return res.json([]);
      }

      // Step 2: Get related data
      console.log("STEP 2: Fetching related data...");
      const allGuests = await storage.getAllGuests();
      console.log(`Got ${allGuests.length} guests`);
      
      const allRooms = await storage.getAllRooms();
      console.log(`Got ${allRooms.length} rooms`);
      
      const allProperties = await storage.getAllProperties();
      console.log(`Got ${allProperties.length} properties`);
      
      // Step 3: Get orders - this might be where the error is
      console.log("STEP 3: About to fetch orders...");
      let allOrders: any[] = [];
      try {
        console.log("Calling db.select().from(orders)...");
        allOrders = await db.select().from(orders);
        console.log(`SUCCESS: Got ${allOrders.length} orders`);
      } catch (ordersErr: any) {
        console.error("ORDERS ERROR:", ordersErr.message);
        console.error("ORDERS ERROR STACK:", ordersErr.stack);
        allOrders = [];
      }
      
      // Step 4: Get extras
      console.log("STEP 4: About to fetch extras...");
      let allExtras: any[] = [];
      try {
        console.log("Calling db.select().from(extraServices)...");
        allExtras = await db.select().from(extraServices);
        console.log(`SUCCESS: Got ${allExtras.length} extras`);
      } catch (extrasErr: any) {
        console.error("EXTRAS ERROR:", extrasErr.message);
        console.error("EXTRAS ERROR STACK:", extrasErr.stack);
        allExtras = [];
      }
      
      console.log("STEP 5: Building enriched data...");

      // Build enriched active booking data
      const enrichedBookings = activeBookings.filter(booking => {
        // Only include bookings with valid guest and room
        return booking.guestId && booking.roomId;
      }).map(booking => {
        const guest = allGuests.find(g => g.id === booking.guestId);
        const room = booking.roomId ? allRooms.find(r => r.id === booking.roomId) : null;
        const property = room?.propertyId ? allProperties.find(p => p.id === room.propertyId) : null;

        // Skip if no guest or room found
        if (!guest || !room) {
          console.warn(`Skipping booking ${booking.id}: missing guest or room`);
          return null;
        }

        // Calculate nights stayed (from check-in to now)
        const checkInDate = new Date(booking.checkInDate);
        const now = new Date();
        const nightsStayed = Math.max(1, Math.ceil((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

        // Calculate room charges safely
        const customPrice = booking.customPrice ? parseFloat(String(booking.customPrice)) : null;
        const roomPrice = room.pricePerNight ? parseFloat(String(room.pricePerNight)) : 0;
        const pricePerNight = customPrice || roomPrice;
        const roomCharges = pricePerNight * nightsStayed;

        // Calculate food charges
        const bookingOrders = allOrders.filter(o => o.bookingId === booking.id);
        const foodCharges = bookingOrders.reduce((sum, order) => {
          const amount = order.totalAmount ? parseFloat(String(order.totalAmount)) : 0;
          return sum + amount;
        }, 0);

        // Calculate extra charges
        const bookingExtras = allExtras.filter(e => e.bookingId === booking.id);
        const extraCharges = bookingExtras.reduce((sum, extra) => {
          const amount = extra.amount ? parseFloat(String(extra.amount)) : 0;
          return sum + amount;
        }, 0);

        // Calculate totals
        const subtotal = roomCharges + foodCharges + extraCharges;
        const gstAmount = (subtotal * 18) / 100;
        const serviceChargeAmount = (subtotal * 10) / 100;
        const totalAmount = subtotal + gstAmount + serviceChargeAmount;
        const advancePaid = booking.advanceAmount ? parseFloat(String(booking.advanceAmount)) : 0;
        const balanceAmount = totalAmount - advancePaid;

        return {
          ...booking,
          guest,
          room,
          property,
          nightsStayed,
          orders: bookingOrders,
          charges: {
            roomCharges: roomCharges.toFixed(2),
            foodCharges: foodCharges.toFixed(2),
            extraCharges: extraCharges.toFixed(2),
            subtotal: subtotal.toFixed(2),
            gstAmount: gstAmount.toFixed(2),
            serviceChargeAmount: serviceChargeAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            advancePaid: advancePaid.toFixed(2),
            balanceAmount: balanceAmount.toFixed(2),
          },
        };
      }).filter(Boolean);

      res.json(enrichedBookings);
    } catch (error: any) {
      console.error("=== ACTIVE BOOKINGS ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ message: error.message });
    }
  });

  // Checkout endpoint
  app.post("/api/bookings/checkout", isAuthenticated, async (req, res) => {
    try {
      const { bookingId, paymentMethod, discountType, discountValue } = req.body;
      
      // Validate input
      if (!bookingId || !paymentMethod) {
        return res.status(400).json({ message: "Booking ID and payment method are required" });
      }

      // Fetch booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Fetch room to get price
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      
      // Calculate nights
      const checkInDate = new Date(booking.checkInDate);
      const checkOutDate = new Date(booking.checkOutDate);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate room charges (use customPrice if available, otherwise room price)
      const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
      const roomCharges = pricePerNight * nights;

      // Fetch and calculate food charges
      const allOrders = await storage.getAllOrders();
      const bookingOrders = allOrders.filter(o => o.bookingId === bookingId);
      const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

      // Fetch and calculate extra service charges
      const allExtras = await storage.getAllExtraServices();
      const bookingExtras = allExtras.filter(e => e.bookingId === bookingId);
      const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

      // Calculate totals
      const subtotal = roomCharges + foodCharges + extraCharges;
      const gstRate = 18;
      const gstAmount = (subtotal * gstRate) / 100;
      const serviceChargeRate = 10;
      const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;
      const totalAmountBeforeDiscount = subtotal + gstAmount + serviceChargeAmount;

      // Calculate discount
      let discountAmount = 0;
      if (discountType && discountValue && discountType !== "none") {
        const discount = parseFloat(discountValue);
        if (discountType === "percentage") {
          discountAmount = (totalAmountBeforeDiscount * discount) / 100;
        } else if (discountType === "fixed") {
          discountAmount = discount;
        }
      }

      const totalAmount = totalAmountBeforeDiscount - discountAmount;
      const advancePaid = parseFloat(booking.advanceAmount || "0");
      const balanceAmount = totalAmount - advancePaid;

      // Create/Update bill with server-calculated amounts
      console.log(`Creating bill for booking ${bookingId} with discount: ${discountType} - ${discountValue}`);
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
      console.log("Bill data:", JSON.stringify(billData, null, 2));
      
      const bill = await storage.createOrUpdateBill(billData);
      console.log("Bill created successfully:", bill.id, "for booking:", bill.bookingId);

      // Only update booking status after successful bill creation
      await storage.updateBookingStatus(bookingId, "checked-out");
      console.log("Booking status updated to checked-out for booking:", bookingId);

      res.json({ success: true, bill });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Menu Items
  app.get("/api/menu-items", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAllMenuItems();
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

  app.post("/api/menu-items", isAuthenticated, async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/menu-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updateMenuItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/menu-items/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMenuItem(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Orders
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
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

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(data);
      res.status(201).json(order);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
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

  app.patch("/api/orders/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(parseInt(req.params.id), status);
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
      res.json(bills);
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

  // Room availability checking
  app.get("/api/rooms/availability", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, checkIn, checkOut } = req.query;
      
      if (!propertyId || !checkIn || !checkOut) {
        return res.status(400).json({ message: "propertyId, checkIn, and checkOut are required" });
      }

      console.log('Room availability request:', { propertyId, checkIn, checkOut });

      const availableRooms = await storage.getAvailableRoomsForDates(
        parseInt(propertyId as string),
        new Date(checkIn as string),
        new Date(checkOut as string)
      );
      
      res.json(availableRooms);
    } catch (error: any) {
      console.error('Room availability error:', error);
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
