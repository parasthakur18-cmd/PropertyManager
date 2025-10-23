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
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

      const availableRooms = await storage.getAvailableRoomsForDates(
        parseInt(propertyId as string),
        new Date(checkIn as string),
        new Date(checkOut as string)
      );
      
      res.json(availableRooms);
    } catch (error: any) {
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
      const lease = await storage.createLease(req.body);
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
      const paymentData = {
        ...req.body,
        leaseId: parseInt(req.params.leaseId),
      };
      const payment = await storage.createLeasePayment(paymentData);
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
      const expense = await storage.createExpense(req.body);
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
