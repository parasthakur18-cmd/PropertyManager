import {
  users,
  properties,
  rooms,
  guests,
  travelAgents,
  bookings,
  menuItems,
  orders,
  extraServices,
  bills,
  enquiries,
  messageTemplates,
  communications,
  propertyLeases,
  leasePayments,
  propertyExpenses,
  expenseCategories,
  bankTransactions,
  staffSalaries,
  salaryAdvances,
  salaryPayments,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type Guest,
  type InsertGuest,
  type TravelAgent,
  type InsertTravelAgent,
  type Booking,
  type InsertBooking,
  type MenuItem,
  type InsertMenuItem,
  type Order,
  type InsertOrder,
  type ExtraService,
  type InsertExtraService,
  type Bill,
  type InsertBill,
  type Enquiry,
  type InsertEnquiry,
  type MessageTemplate,
  type InsertMessageTemplate,
  type Communication,
  type InsertCommunication,
  type PropertyLease,
  type InsertPropertyLease,
  type LeasePayment,
  type InsertLeasePayment,
  type PropertyExpense,
  type InsertPropertyExpense,
  type ExpenseCategory,
  type InsertExpenseCategory,
  type BankTransaction,
  type InsertBankTransaction,
  type StaffSalary,
  type InsertStaffSalary,
  type SalaryAdvance,
  type InsertSalaryAdvance,
  type SalaryPayment,
  type InsertSalaryPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, lt, gt, sql, or, inArray } from "drizzle-orm";
import { eventBus, EventTypes } from "./eventBus";

export interface IStorage {
  // User operations (required for Replit Auth)
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string, assignedPropertyIds?: number[] | null): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Property operations
  getAllProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;

  // Room operations
  getAllRooms(): Promise<Room[]>;
  getRoomsByProperty(propertyId: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;
  updateRoomStatus(id: number, status: string): Promise<Room>;
  deleteRoom(id: number): Promise<void>;
  getAvailableRooms(propertyId: number): Promise<Room[]>;
  getRoomsWithCheckedInGuests(): Promise<any[]>;

  // Guest operations
  getAllGuests(): Promise<Guest[]>;
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest>;
  deleteGuest(id: number): Promise<void>;

  // Travel Agent operations
  getAllTravelAgents(): Promise<TravelAgent[]>;
  getTravelAgentsByProperty(propertyId: number): Promise<TravelAgent[]>;
  getTravelAgent(id: number): Promise<TravelAgent | undefined>;
  createTravelAgent(agent: InsertTravelAgent): Promise<TravelAgent>;
  updateTravelAgent(id: number, agent: Partial<InsertTravelAgent>): Promise<TravelAgent>;
  deleteTravelAgent(id: number): Promise<void>;

  // Booking operations
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;

  // Menu Item operations
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByProperty(propertyId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrdersByProperty(propertyId: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByBooking(bookingId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Extra Service operations
  getAllExtraServices(): Promise<ExtraService[]>;
  getExtraService(id: number): Promise<ExtraService | undefined>;
  getExtraServicesByBooking(bookingId: number): Promise<ExtraService[]>;
  createExtraService(service: InsertExtraService): Promise<ExtraService>;
  updateExtraService(id: number, service: Partial<InsertExtraService>): Promise<ExtraService>;
  deleteExtraService(id: number): Promise<void>;

  // Bill operations
  getAllBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillByBooking(bookingId: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill>;
  createOrUpdateBill(bill: InsertBill): Promise<Bill>;
  mergeBills(bookingIds: number[], primaryBookingId: number): Promise<Bill>;

  // Enquiry operations
  getAllEnquiries(): Promise<Enquiry[]>;
  getEnquiry(id: number): Promise<Enquiry | undefined>;
  createEnquiry(enquiry: InsertEnquiry): Promise<Enquiry>;
  updateEnquiry(id: number, enquiry: Partial<InsertEnquiry>): Promise<Enquiry>;
  updateEnquiryStatus(id: number, status: string): Promise<Enquiry>;
  updateEnquiryPaymentStatus(id: number, paymentStatus: string): Promise<Enquiry>;
  deleteEnquiry(id: number): Promise<void>;
  getAvailableRoomsForDates(propertyId: number, checkIn: Date, checkOut: Date): Promise<Room[]>;

  // Message Template operations
  getAllMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;

  // Communication operations
  sendMessage(communication: InsertCommunication): Promise<Communication>;
  getCommunicationsByEnquiry(enquiryId: number): Promise<Communication[]>;
  getCommunicationsByBooking(bookingId: number): Promise<Communication[]>;

  // Property Lease operations
  getAllLeases(): Promise<PropertyLease[]>;
  getLeasesByProperty(propertyId: number): Promise<PropertyLease[]>;
  getLease(id: number): Promise<PropertyLease | undefined>;
  createLease(lease: InsertPropertyLease): Promise<PropertyLease>;
  updateLease(id: number, lease: Partial<InsertPropertyLease>): Promise<PropertyLease>;
  deleteLease(id: number): Promise<void>;
  getLeaseWithPayments(id: number): Promise<any>;

  // Lease Payment operations
  getLeasePayments(leaseId: number): Promise<LeasePayment[]>;
  createLeasePayment(payment: InsertLeasePayment): Promise<LeasePayment>;
  deleteLeasePayment(id: number): Promise<void>;

  // Property Expense operations
  getAllExpenses(): Promise<PropertyExpense[]>;
  getExpensesByProperty(propertyId: number): Promise<PropertyExpense[]>;
  createExpense(expense: InsertPropertyExpense): Promise<PropertyExpense>;
  updateExpense(id: number, expense: Partial<InsertPropertyExpense>): Promise<PropertyExpense>;
  deleteExpense(id: number): Promise<void>;

  // Expense Category operations
  getAllExpenseCategories(): Promise<ExpenseCategory[]>;
  getExpenseCategoriesByProperty(propertyId: number | null): Promise<ExpenseCategory[]>;
  getExpenseCategory(id: number): Promise<ExpenseCategory | undefined>;
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory>;
  deleteExpenseCategory(id: number): Promise<void>;
  seedDefaultCategories(): Promise<void>;

  // Bank Transaction operations
  getBankTransactionsByUpload(uploadId: string): Promise<BankTransaction[]>;
  getBankTransactionsByProperty(propertyId: number): Promise<BankTransaction[]>;
  createBankTransactions(transactions: InsertBankTransaction[]): Promise<BankTransaction[]>;
  updateBankTransaction(id: number, transaction: Partial<InsertBankTransaction>): Promise<BankTransaction>;
  deleteBankTransaction(id: number): Promise<void>;
  importTransactionsToExpenses(transactionIds: number[]): Promise<PropertyExpense[]>;

  // Financial Reports
  getPropertyFinancials(propertyId: number, startDate?: Date, endDate?: Date): Promise<any>;

  // Staff Salary operations
  getAllSalaries(): Promise<StaffSalary[]>;
  getSalariesByUser(userId: string): Promise<StaffSalary[]>;
  getSalariesByProperty(propertyId: number): Promise<StaffSalary[]>;
  getSalary(id: number): Promise<StaffSalary | undefined>;
  createSalary(salary: InsertStaffSalary): Promise<StaffSalary>;
  updateSalary(id: number, salary: Partial<InsertStaffSalary>): Promise<StaffSalary>;
  deleteSalary(id: number): Promise<void>;

  // Salary Advance operations
  getAllAdvances(): Promise<SalaryAdvance[]>;
  getAdvancesByUser(userId: string): Promise<SalaryAdvance[]>;
  getAdvance(id: number): Promise<SalaryAdvance | undefined>;
  createAdvance(advance: InsertSalaryAdvance): Promise<SalaryAdvance>;
  updateAdvance(id: number, advance: Partial<InsertSalaryAdvance>): Promise<SalaryAdvance>;
  deleteAdvance(id: number): Promise<void>;

  // Salary Payment operations
  getPaymentsBySalary(salaryId: number): Promise<SalaryPayment[]>;
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  deleteSalaryPayment(id: number): Promise<void>;

  // Dashboard stats
  getDashboardStats(propertyId?: number): Promise<any>;
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserRole(id: string, role: string, assignedPropertyIds?: number[] | null): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ 
        role, 
        assignedPropertyIds: assignedPropertyIds !== undefined ? assignedPropertyIds : undefined,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user by email first
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUser) {
        // Update existing user
        const [updated] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updated;
      }
    }

    // Insert new user if no conflict
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Property operations
  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Room operations
  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms).orderBy(rooms.propertyId, rooms.roomNumber);
  }

  async getRoomsByProperty(propertyId: number): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room> {
    const [updated] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updated;
  }

  async updateRoomStatus(id: number, status: string): Promise<Room> {
    const [updated] = await db
      .update(rooms)
      .set({ status, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  async getAvailableRooms(propertyId: number): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.status, "available")));
  }

  async getRoomsWithCheckedInGuests(): Promise<any[]> {
    const roomsWithGuests = await db
      .select({
        roomId: rooms.id,
        roomNumber: rooms.roomNumber,
        roomType: rooms.roomType,
        guestName: guests.fullName,
        bookingId: bookings.id,
      })
      .from(rooms)
      .innerJoin(bookings, eq(bookings.roomId, rooms.id))
      .innerJoin(guests, eq(bookings.guestId, guests.id))
      .where(eq(bookings.status, "checked-in"))
      .orderBy(rooms.roomNumber);
    
    return roomsWithGuests;
  }

  // Guest operations
  async getAllGuests(): Promise<Guest[]> {
    return await db.select().from(guests).orderBy(desc(guests.createdAt));
  }

  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [newGuest] = await db.insert(guests).values(guest).returning();
    return newGuest;
  }

  async updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest> {
    const [updated] = await db
      .update(guests)
      .set({ ...guest, updatedAt: new Date() })
      .where(eq(guests.id, id))
      .returning();
    return updated;
  }

  async deleteGuest(id: number): Promise<void> {
    await db.delete(guests).where(eq(guests.id, id));
  }

  // Travel Agent operations
  async getAllTravelAgents(): Promise<TravelAgent[]> {
    return await db.select().from(travelAgents).orderBy(desc(travelAgents.createdAt));
  }

  async getTravelAgentsByProperty(propertyId: number): Promise<TravelAgent[]> {
    return await db
      .select()
      .from(travelAgents)
      .where(eq(travelAgents.propertyId, propertyId))
      .orderBy(desc(travelAgents.createdAt));
  }

  async getTravelAgent(id: number): Promise<TravelAgent | undefined> {
    const [agent] = await db.select().from(travelAgents).where(eq(travelAgents.id, id));
    return agent;
  }

  async createTravelAgent(agent: InsertTravelAgent): Promise<TravelAgent> {
    const [created] = await db.insert(travelAgents).values(agent).returning();
    return created;
  }

  async updateTravelAgent(id: number, agent: Partial<InsertTravelAgent>): Promise<TravelAgent> {
    const [updated] = await db
      .update(travelAgents)
      .set({ ...agent, updatedAt: new Date() })
      .where(eq(travelAgents.id, id))
      .returning();
    return updated;
  }

  async deleteTravelAgent(id: number): Promise<void> {
    await db.delete(travelAgents).where(eq(travelAgents.id, id));
  }

  // Booking operations
  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    // Auto-assign room if not provided
    if (!booking.roomId && booking.propertyId) {
      const availableRooms = await this.getAvailableRooms(booking.propertyId);
      if (availableRooms.length > 0) {
        booking.roomId = availableRooms[0].id;
        // Update room status to occupied
        await this.updateRoomStatus(availableRooms[0].id, "occupied");
      }
    } else if (booking.roomId) {
      // Update room status to occupied
      await this.updateRoomStatus(booking.roomId, "occupied");
    }

    // Update guest's total stays
    await db
      .update(guests)
      .set({ totalStays: sql`${guests.totalStays} + 1` })
      .where(eq(guests.id, booking.guestId));

    const [newBooking] = await db.insert(bookings).values(booking).returning();
    
    // Publish event for automatic propagation
    eventBus.publish({
      type: EventTypes.BOOKING_CREATED,
      data: newBooking,
      propertyId: newBooking.propertyId,
    });
    
    return newBooking;
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking> {
    const [updated] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const booking = await this.getBooking(id);
    
    // Handle room status changes based on booking status
    if (booking?.roomId) {
      if (status === "checked-in") {
        await this.updateRoomStatus(booking.roomId, "occupied");
      } else if (status === "checked-out" || status === "cancelled") {
        await this.updateRoomStatus(booking.roomId, "cleaning");
      }
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Menu Item operations
  async getAllMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  }

  async getMenuItemsByProperty(propertyId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.propertyId, propertyId))
      .orderBy(menuItems.category, menuItems.name);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(menuItem).returning();
    return newItem;
  }

  async updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db
      .update(menuItems)
      .set({ ...menuItem, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Order operations
  async getAllOrders(): Promise<any[]> {
    const ordersWithRoomStatus = await db
      .select({
        order: orders,
        roomStatus: rooms.status,
        roomNumber: rooms.roomNumber,
        // Check if there's an active checked-in booking for this room
        hasCheckedInBooking: sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookings} 
          WHERE ${bookings.roomId} = ${rooms.id} 
          AND ${bookings.status} = 'checked-in'
        )`,
      })
      .from(orders)
      .leftJoin(rooms, eq(orders.roomId, rooms.id))
      .orderBy(desc(orders.createdAt));
    
    return ordersWithRoomStatus.map(row => ({
      ...row.order,
      roomStatus: row.roomStatus,
      roomNumber: row.roomNumber,
      hasCheckedInBooking: row.hasCheckedInBooking,
    }));
  }

  async getOrdersByProperty(propertyId: number): Promise<any[]> {
    const ordersWithRoomStatus = await db
      .select({
        order: orders,
        roomStatus: rooms.status,
        roomNumber: rooms.roomNumber,
        // Check if there's an active checked-in booking for this room
        hasCheckedInBooking: sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookings} 
          WHERE ${bookings.roomId} = ${rooms.id} 
          AND ${bookings.status} = 'checked-in'
        )`,
      })
      .from(orders)
      .leftJoin(rooms, eq(orders.roomId, rooms.id))
      .where(eq(orders.propertyId, propertyId))
      .orderBy(desc(orders.createdAt));
    
    return ordersWithRoomStatus.map(row => ({
      ...row.order,
      roomStatus: row.roomStatus,
      roomNumber: row.roomNumber,
      hasCheckedInBooking: row.hasCheckedInBooking,
    }));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByBooking(bookingId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.bookingId, bookingId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // Extra Service operations
  async getAllExtraServices(): Promise<ExtraService[]> {
    return await db.select().from(extraServices).orderBy(desc(extraServices.createdAt));
  }

  async getExtraService(id: number): Promise<ExtraService | undefined> {
    const [service] = await db.select().from(extraServices).where(eq(extraServices.id, id));
    return service;
  }

  async getExtraServicesByBooking(bookingId: number): Promise<ExtraService[]> {
    return await db
      .select()
      .from(extraServices)
      .where(eq(extraServices.bookingId, bookingId))
      .orderBy(desc(extraServices.createdAt));
  }

  async createExtraService(service: InsertExtraService): Promise<ExtraService> {
    const [newService] = await db.insert(extraServices).values(service).returning();
    return newService;
  }

  async updateExtraService(id: number, service: Partial<InsertExtraService>): Promise<ExtraService> {
    const [updated] = await db
      .update(extraServices)
      .set(service)
      .where(eq(extraServices.id, id))
      .returning();
    return updated;
  }

  async deleteExtraService(id: number): Promise<void> {
    await db.delete(extraServices).where(eq(extraServices.id, id));
  }

  // Bill operations
  async getAllBills(): Promise<Bill[]> {
    return await db.select().from(bills).orderBy(desc(bills.createdAt));
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillByBooking(bookingId: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.bookingId, bookingId));
    return bill;
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db.insert(bills).values(bill).returning();
    return newBill;
  }

  async updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill> {
    const [updated] = await db
      .update(bills)
      .set({ ...bill, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return updated;
  }

  async createOrUpdateBill(bill: InsertBill): Promise<Bill> {
    // Check if a bill already exists for this booking
    const existingBill = await this.getBillByBooking(bill.bookingId);
    
    if (existingBill) {
      // Update existing bill
      return this.updateBill(existingBill.id, bill);
    } else {
      // Create new bill
      return this.createBill(bill);
    }
  }

  async mergeBills(bookingIds: number[], primaryBookingId: number): Promise<Bill> {
    // Fetch all bookings
    const allBookings = await Promise.all(
      bookingIds.map(id => this.getBooking(id))
    );
    
    // Ensure all bookings exist
    if (allBookings.some(b => !b)) {
      throw new Error("One or more bookings not found");
    }

    const primaryBooking = allBookings.find(b => b?.id === primaryBookingId);
    if (!primaryBooking) {
      throw new Error("Primary booking not found");
    }

    // Calculate total room charges from all bookings
    let totalRoomCharges = 0;
    for (const booking of allBookings) {
      if (booking) {
        totalRoomCharges += parseFloat(booking.totalAmount || "0");
      }
    }

    // Get all orders for these bookings
    const allOrders = await Promise.all(
      bookingIds.map(id => this.getOrdersByBooking(id))
    );
    const flatOrders = allOrders.flat();
    
    // Calculate total food charges
    const totalFoodCharges = flatOrders.reduce((sum, order) => {
      return sum + parseFloat(order.totalAmount);
    }, 0);

    // Get all extra services for these bookings
    const allServices = await Promise.all(
      bookingIds.map(id => this.getExtraServicesByBooking(id))
    );
    const flatServices = allServices.flat();
    
    // Calculate total extra charges
    const totalExtraCharges = flatServices.reduce((sum, service) => {
      return sum + parseFloat(service.amount);
    }, 0);

    // Calculate bill totals
    const subtotal = totalRoomCharges + totalFoodCharges + totalExtraCharges;
    const gstRate = 18;
    const serviceChargeRate = 10;
    const gstAmount = (subtotal * gstRate) / 100;
    const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;
    const totalAmount = subtotal + gstAmount + serviceChargeAmount;

    // Create merged bill
    const mergedBill = await this.createBill({
      bookingId: primaryBookingId,
      guestId: primaryBooking.guestId,
      roomCharges: totalRoomCharges.toFixed(2),
      foodCharges: totalFoodCharges.toFixed(2),
      extraCharges: totalExtraCharges.toFixed(2),
      subtotal: subtotal.toFixed(2),
      gstRate: gstRate.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      serviceChargeRate: serviceChargeRate.toFixed(2),
      serviceChargeAmount: serviceChargeAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentStatus: "unpaid",
      mergedBookingIds: bookingIds,
    });

    return mergedBill;
  }

  // Enquiry operations
  async getAllEnquiries(): Promise<Enquiry[]> {
    return await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
  }

  async getEnquiry(id: number): Promise<Enquiry | undefined> {
    const [enquiry] = await db.select().from(enquiries).where(eq(enquiries.id, id));
    return enquiry;
  }

  async createEnquiry(enquiryData: InsertEnquiry): Promise<Enquiry> {
    const [enquiry] = await db.insert(enquiries).values(enquiryData).returning();
    return enquiry;
  }

  async updateEnquiry(id: number, enquiryData: Partial<InsertEnquiry>): Promise<Enquiry> {
    const [enquiry] = await db
      .update(enquiries)
      .set({ ...enquiryData, updatedAt: new Date() })
      .where(eq(enquiries.id, id))
      .returning();
    return enquiry;
  }

  async updateEnquiryStatus(id: number, status: string): Promise<Enquiry> {
    const [enquiry] = await db
      .update(enquiries)
      .set({ status, updatedAt: new Date() })
      .where(eq(enquiries.id, id))
      .returning();
    return enquiry;
  }

  async updateEnquiryPaymentStatus(id: number, paymentStatus: string): Promise<Enquiry> {
    const [enquiry] = await db
      .update(enquiries)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(eq(enquiries.id, id))
      .returning();
    return enquiry;
  }

  async deleteEnquiry(id: number): Promise<void> {
    await db.delete(enquiries).where(eq(enquiries.id, id));
  }

  // Message Template operations
  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates).where(eq(messageTemplates.isActive, true));
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id));
    return template;
  }

  // Communication operations
  async sendMessage(communication: InsertCommunication): Promise<Communication> {
    // Note: Actual SMS/WhatsApp sending via Twilio would happen here if credentials are configured
    // For now, we just log the message to the database
    const [sent] = await db.insert(communications).values(communication).returning();
    return sent;
  }

  async getCommunicationsByEnquiry(enquiryId: number): Promise<Communication[]> {
    return await db
      .select()
      .from(communications)
      .where(eq(communications.enquiryId, enquiryId))
      .orderBy(desc(communications.createdAt));
  }

  async getCommunicationsByBooking(bookingId: number): Promise<Communication[]> {
    return await db
      .select()
      .from(communications)
      .where(eq(communications.bookingId, bookingId))
      .orderBy(desc(communications.createdAt));
  }

  async getAvailableRoomsForDates(propertyId: number, checkIn: Date, checkOut: Date): Promise<Room[]> {
    console.log('🔍 getAvailableRoomsForDates called');
    console.log('propertyId:', propertyId, 'type:', typeof propertyId);
    console.log('checkIn:', checkIn);
    console.log('checkOut:', checkOut);
    
    // Ensure propertyId is a valid number
    if (!propertyId || isNaN(propertyId)) {
      console.error('❌ Invalid propertyId:', propertyId);
      throw new Error(`Invalid propertyId: ${propertyId}`);
    }
    
    try {
      // Get all rooms for this property
      console.log('Querying rooms for propertyId:', propertyId);
      const allRooms = await db
        .select()
        .from(rooms)
        .where(eq(rooms.propertyId, propertyId));
      
      console.log('✅ Rooms fetched successfully:', allRooms.length);
      
      // For now, just return all rooms (we'll add booking conflict checking later)
      return allRooms;
    } catch (error: any) {
      console.error('❌ Error in getAvailableRoomsForDates:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Property Lease operations
  async getAllLeases(): Promise<any[]> {
    const leasesData = await db.select().from(propertyLeases).orderBy(desc(propertyLeases.createdAt));
    
    // Add payment totals and balance for each lease
    const leasesWithBalances = await Promise.all(
      leasesData.map(async (lease) => {
        const payments = await this.getLeasePayments(lease.id);
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalAmount = parseFloat(lease.totalAmount);
        const pendingBalance = totalAmount - totalPaid;
        
        return {
          ...lease,
          totalPaid,
          pendingBalance,
        };
      })
    );
    
    return leasesWithBalances;
  }

  async getLeasesByProperty(propertyId: number): Promise<any[]> {
    const leasesData = await db.select().from(propertyLeases)
      .where(eq(propertyLeases.propertyId, propertyId))
      .orderBy(desc(propertyLeases.startDate));
    
    // Add payment totals and balance for each lease
    const leasesWithBalances = await Promise.all(
      leasesData.map(async (lease) => {
        const payments = await this.getLeasePayments(lease.id);
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalAmount = parseFloat(lease.totalAmount);
        const pendingBalance = totalAmount - totalPaid;
        
        return {
          ...lease,
          totalPaid,
          pendingBalance,
        };
      })
    );
    
    return leasesWithBalances;
  }

  async getLease(id: number): Promise<PropertyLease | undefined> {
    const [lease] = await db.select().from(propertyLeases).where(eq(propertyLeases.id, id));
    return lease;
  }

  async createLease(leaseData: InsertPropertyLease): Promise<PropertyLease> {
    const [lease] = await db.insert(propertyLeases).values(leaseData).returning();
    return lease;
  }

  async updateLease(id: number, leaseData: Partial<InsertPropertyLease>): Promise<PropertyLease> {
    const [lease] = await db
      .update(propertyLeases)
      .set({ ...leaseData, updatedAt: new Date() })
      .where(eq(propertyLeases.id, id))
      .returning();
    return lease;
  }

  async deleteLease(id: number): Promise<void> {
    await db.delete(propertyLeases).where(eq(propertyLeases.id, id));
  }

  async getLeaseWithPayments(id: number): Promise<any> {
    const lease = await this.getLease(id);
    if (!lease) return null;

    const payments = await this.getLeasePayments(id);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(lease.totalAmount);
    const pendingBalance = totalAmount - totalPaid;

    return {
      ...lease,
      payments,
      totalPaid,
      pendingBalance,
    };
  }

  // Lease Payment operations
  async getLeasePayments(leaseId: number): Promise<LeasePayment[]> {
    return await db.select().from(leasePayments)
      .where(eq(leasePayments.leaseId, leaseId))
      .orderBy(desc(leasePayments.paymentDate));
  }

  async createLeasePayment(paymentData: InsertLeasePayment): Promise<LeasePayment> {
    const [payment] = await db.insert(leasePayments).values(paymentData).returning();
    return payment;
  }

  async deleteLeasePayment(id: number): Promise<void> {
    await db.delete(leasePayments).where(eq(leasePayments.id, id));
  }

  // Property Expense operations
  async getAllExpenses(): Promise<PropertyExpense[]> {
    return await db.select().from(propertyExpenses).orderBy(desc(propertyExpenses.expenseDate));
  }

  async getExpensesByProperty(propertyId: number): Promise<PropertyExpense[]> {
    return await db.select().from(propertyExpenses)
      .where(eq(propertyExpenses.propertyId, propertyId))
      .orderBy(desc(propertyExpenses.expenseDate));
  }

  async createExpense(expenseData: InsertPropertyExpense): Promise<PropertyExpense> {
    const [expense] = await db.insert(propertyExpenses).values(expenseData).returning();
    return expense;
  }

  async updateExpense(id: number, expenseData: Partial<InsertPropertyExpense>): Promise<PropertyExpense> {
    const [expense] = await db
      .update(propertyExpenses)
      .set({ ...expenseData, updatedAt: new Date() })
      .where(eq(propertyExpenses.id, id))
      .returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(propertyExpenses).where(eq(propertyExpenses.id, id));
  }

  // Expense Category operations
  async getAllExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).orderBy(expenseCategories.name);
  }

  async getExpenseCategoriesByProperty(propertyId: number | null): Promise<ExpenseCategory[]> {
    if (propertyId === null) {
      // Get default categories
      return await db.select().from(expenseCategories)
        .where(eq(expenseCategories.isDefault, true))
        .orderBy(expenseCategories.name);
    }
    
    // Get both default categories and property-specific categories
    return await db.select().from(expenseCategories)
      .where(
        sql`${expenseCategories.propertyId} IS NULL OR ${expenseCategories.propertyId} = ${propertyId}`
      )
      .orderBy(expenseCategories.name);
  }

  async getExpenseCategory(id: number): Promise<ExpenseCategory | undefined> {
    const [category] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, id));
    return category;
  }

  async createExpenseCategory(categoryData: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [category] = await db.insert(expenseCategories).values(categoryData).returning();
    return category;
  }

  async updateExpenseCategory(id: number, categoryData: Partial<InsertExpenseCategory>): Promise<ExpenseCategory> {
    const [category] = await db
      .update(expenseCategories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(expenseCategories.id, id))
      .returning();
    return category;
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  }

  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = [
      {
        name: "Rent",
        description: "Property lease and rent payments",
        keywords: ["rent", "lease", "landlord", "property payment"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Electricity",
        description: "Electricity and power bills",
        keywords: ["electricity", "power", "electric", "energy", "utility"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Groceries",
        description: "Food and grocery purchases",
        keywords: ["grocery", "food", "vegetables", "fruits", "market", "supplies"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Salaries",
        description: "Staff salaries and wages",
        keywords: ["salary", "wages", "payroll", "staff payment", "employee"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Maintenance",
        description: "Property maintenance and repairs",
        keywords: ["maintenance", "repair", "fix", "plumbing", "painting", "cleaning"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Water",
        description: "Water and sewage bills",
        keywords: ["water", "sewage", "drainage"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Internet & Phone",
        description: "Internet and telephone bills",
        keywords: ["internet", "wifi", "broadband", "phone", "telephone", "mobile"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Marketing",
        description: "Advertising and marketing expenses",
        keywords: ["marketing", "advertising", "promotion", "social media"],
        isDefault: true,
        propertyId: null,
      },
      {
        name: "Supplies",
        description: "General supplies and consumables",
        keywords: ["supplies", "consumables", "toiletries", "amenities"],
        isDefault: true,
        propertyId: null,
      },
    ];

    // Check if default categories already exist
    const existing = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.isDefault, true));

    if (existing.length === 0) {
      await db.insert(expenseCategories).values(defaultCategories);
    }
  }

  // Bank Transaction operations
  async getBankTransactionsByUpload(uploadId: string): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions)
      .where(eq(bankTransactions.uploadId, uploadId))
      .orderBy(desc(bankTransactions.transactionDate));
  }

  async getBankTransactionsByProperty(propertyId: number): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions)
      .where(eq(bankTransactions.propertyId, propertyId))
      .orderBy(desc(bankTransactions.transactionDate));
  }

  async createBankTransactions(transactionsData: InsertBankTransaction[]): Promise<BankTransaction[]> {
    const transactions = await db.insert(bankTransactions).values(transactionsData).returning();
    return transactions;
  }

  async updateBankTransaction(id: number, transactionData: Partial<InsertBankTransaction>): Promise<BankTransaction> {
    const [transaction] = await db
      .update(bankTransactions)
      .set({ ...transactionData, updatedAt: new Date() })
      .where(eq(bankTransactions.id, id))
      .returning();
    return transaction;
  }

  async deleteBankTransaction(id: number): Promise<void> {
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
  }

  async importTransactionsToExpenses(transactionIds: number[]): Promise<PropertyExpense[]> {
    // Get the transactions
    const transactions = await db.select().from(bankTransactions)
      .where(sql`${bankTransactions.id} = ANY(${transactionIds})`);

    const expenses: PropertyExpense[] = [];

    for (const transaction of transactions) {
      // Skip if already imported
      if (transaction.isImported) continue;

      // Create expense from transaction
      const categoryId = transaction.assignedCategoryId || transaction.suggestedCategoryId;
      
      const [expense] = await db.insert(propertyExpenses).values({
        propertyId: transaction.propertyId,
        categoryId: categoryId || null,
        amount: transaction.amount,
        expenseDate: transaction.transactionDate,
        description: transaction.description,
        vendorName: null,
        paymentMethod: "Bank Transfer",
        receiptNumber: null,
        isRecurring: false,
        createdBy: transaction.createdBy,
      }).returning();

      // Mark transaction as imported
      await db.update(bankTransactions)
        .set({ 
          isImported: true, 
          importedExpenseId: expense.id,
          updatedAt: new Date() 
        })
        .where(eq(bankTransactions.id, transaction.id));

      expenses.push(expense);
    }

    return expenses;
  }

  // Financial Reports
  async getPropertyFinancials(propertyId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const start = startDate || new Date(new Date().getFullYear(), 0, 1); // Default to start of year
    const end = endDate || new Date(); // Default to today

    // Get total revenue from bills
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${bills.totalAmount}), 0)` })
      .from(bills)
      .innerJoin(bookings, eq(bills.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          gte(bills.createdAt, start),
          lte(bills.createdAt, end)
        )
      );

    // Get total expenses
    const [expensesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${propertyExpenses.amount}), 0)` })
      .from(propertyExpenses)
      .where(
        and(
          eq(propertyExpenses.propertyId, propertyId),
          gte(propertyExpenses.expenseDate, start),
          lte(propertyExpenses.expenseDate, end)
        )
      );

    // Get lease payments made
    const leases = await this.getLeasesByProperty(propertyId);
    let totalLeasePayments = 0;
    for (const lease of leases) {
      const payments = await db
        .select()
        .from(leasePayments)
        .where(
          and(
            eq(leasePayments.leaseId, lease.id),
            gte(leasePayments.paymentDate, start),
            lte(leasePayments.paymentDate, end)
          )
        );
      totalLeasePayments += payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    }

    // Get expenses by category
    const expensesByCategory = await db
      .select({
        category: propertyExpenses.category,
        total: sql<string>`SUM(${propertyExpenses.amount})`,
      })
      .from(propertyExpenses)
      .where(
        and(
          eq(propertyExpenses.propertyId, propertyId),
          gte(propertyExpenses.expenseDate, start),
          lte(propertyExpenses.expenseDate, end)
        )
      )
      .groupBy(propertyExpenses.category);

    const totalRevenue = parseFloat(revenueResult?.total || '0');
    const totalExpenses = parseFloat(expensesResult?.total || '0') + totalLeasePayments;
    const netProfit = totalRevenue - totalExpenses;

    return {
      propertyId,
      startDate: start,
      endDate: end,
      totalRevenue,
      totalExpenses,
      totalLeasePayments,
      totalOtherExpenses: parseFloat(expensesResult?.total || '0'),
      netProfit,
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0',
      expensesByCategory: expensesByCategory.map(c => ({
        category: c.category,
        total: parseFloat(c.total),
      })),
    };
  }

  // Dashboard stats
  async getDashboardStats(propertyId?: number): Promise<any> {
    // If propertyId is provided, filter by that property (for managers)
    const propertyFilter = propertyId ? eq(properties.id, propertyId) : undefined;
    const roomPropertyFilter = propertyId ? eq(rooms.propertyId, propertyId) : undefined;

    const [propertiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(propertyFilter ? propertyFilter : sql`true`);

    const [roomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms)
      .where(roomPropertyFilter ? roomPropertyFilter : sql`true`);

    // For active bookings, we need to join with rooms to filter by property
    let activeBookingsQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(sql`status IN ('confirmed', 'checked-in')`);

    if (propertyId) {
      activeBookingsQuery = activeBookingsQuery
        .innerJoin(rooms, eq(bookings.roomId, rooms.id))
        .where(and(
          sql`bookings.status IN ('confirmed', 'checked-in')`,
          eq(rooms.propertyId, propertyId)
        ));
    }

    const [activeBookingsCount] = await activeBookingsQuery;

    const [guestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests);

    const [occupiedRoomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms)
      .where(roomPropertyFilter ? and(eq(rooms.status, "occupied"), roomPropertyFilter) : eq(rooms.status, "occupied"));

    const occupancyRate = roomsCount.count > 0
      ? Math.round((occupiedRoomsCount.count / roomsCount.count) * 100)
      : 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // For monthly revenue, filter by property through bookings->rooms join
    let monthlyRevenueQuery = db
      .select({ total: sql<string>`COALESCE(SUM(bills.total_amount), 0)` })
      .from(bills)
      .where(gte(bills.createdAt, currentMonth));

    if (propertyId) {
      monthlyRevenueQuery = monthlyRevenueQuery
        .innerJoin(bookings, eq(bills.bookingId, bookings.id))
        .innerJoin(rooms, eq(bookings.roomId, rooms.id))
        .where(and(
          gte(bills.createdAt, currentMonth),
          eq(rooms.propertyId, propertyId)
        ));
    }

    const [monthlyRevenueResult] = await monthlyRevenueQuery;

    return {
      totalProperties: propertiesCount.count,
      totalRooms: roomsCount.count,
      activeBookings: activeBookingsCount.count,
      totalGuests: guestsCount.count,
      occupancyRate,
      monthlyRevenue: parseFloat(monthlyRevenueResult.total),
    };
  }

  async getAnalytics(): Promise<any> {
    const [totalRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(bills);

    const [paidRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(bills)
      .where(eq(bills.paymentStatus, "paid"));

    const [roomRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(room_charges), 0)` })
      .from(bills);

    const [restaurantRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(food_charges), 0)` })
      .from(bills);

    const [extraServicesRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(extra_charges), 0)` })
      .from(bills);

    const [bookingsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings);

    const [guestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests);

    const [roomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms);

    const [occupiedRoomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms)
      .where(eq(rooms.status, "occupied"));

    const [propertiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(eq(properties.isActive, true));

    const [repeatGuestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(sql`total_stays > 1`);

    const [avgRoomRateResult] = await db
      .select({ avg: sql<string>`COALESCE(AVG(price_per_night), 0)` })
      .from(rooms);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(bills)
      .where(gte(bills.createdAt, currentMonth));

    const popularRoomTypes = await db
      .select({
        type: rooms.roomType,
        bookings: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .groupBy(rooms.roomType)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    const occupancyRate = roomsCount.count > 0
      ? Math.round((occupiedRoomsCount.count / roomsCount.count) * 100)
      : 0;

    const repeatGuestRate = guestsCount.count > 0
      ? Math.round((repeatGuestsCount.count / guestsCount.count) * 100)
      : 0;

    return {
      totalRevenue: parseFloat(totalRevenueResult.total),
      paidRevenue: parseFloat(paidRevenueResult.total),
      roomRevenue: parseFloat(roomRevenueResult.total),
      restaurantRevenue: parseFloat(restaurantRevenueResult.total),
      extraServicesRevenue: parseFloat(extraServicesRevenueResult.total),
      totalBookings: bookingsCount.count,
      totalGuests: guestsCount.count,
      occupancyRate,
      activeProperties: propertiesCount.count,
      repeatGuestRate,
      avgRoomRate: parseFloat(avgRoomRateResult.avg),
      monthlyRevenue: parseFloat(monthlyRevenueResult.total),
      popularRoomTypes,
    };
  }

  // Staff Salary operations
  async getAllSalaries(): Promise<StaffSalary[]> {
    return await db.select().from(staffSalaries).orderBy(desc(staffSalaries.createdAt));
  }

  async getSalariesByUser(userId: string): Promise<StaffSalary[]> {
    return await db
      .select()
      .from(staffSalaries)
      .where(eq(staffSalaries.userId, userId))
      .orderBy(desc(staffSalaries.periodStart));
  }

  async getSalariesByProperty(propertyId: number): Promise<StaffSalary[]> {
    return await db
      .select()
      .from(staffSalaries)
      .where(eq(staffSalaries.propertyId, propertyId))
      .orderBy(desc(staffSalaries.periodStart));
  }

  async getSalary(id: number): Promise<StaffSalary | undefined> {
    const [salary] = await db.select().from(staffSalaries).where(eq(staffSalaries.id, id));
    return salary;
  }

  async createSalary(salary: InsertStaffSalary): Promise<StaffSalary> {
    const [created] = await db.insert(staffSalaries).values(salary).returning();
    eventBus.emit('salary:created', created);
    return created;
  }

  async updateSalary(id: number, salary: Partial<InsertStaffSalary>): Promise<StaffSalary> {
    const [updated] = await db
      .update(staffSalaries)
      .set({ ...salary, updatedAt: new Date() })
      .where(eq(staffSalaries.id, id))
      .returning();
    eventBus.emit('salary:updated', updated);
    return updated;
  }

  async deleteSalary(id: number): Promise<void> {
    await db.delete(staffSalaries).where(eq(staffSalaries.id, id));
    eventBus.emit('salary:deleted', { id });
  }

  // Salary Advance operations
  async getAllAdvances(): Promise<SalaryAdvance[]> {
    return await db.select().from(salaryAdvances).orderBy(desc(salaryAdvances.createdAt));
  }

  async getAdvancesByUser(userId: string): Promise<SalaryAdvance[]> {
    return await db
      .select()
      .from(salaryAdvances)
      .where(eq(salaryAdvances.userId, userId))
      .orderBy(desc(salaryAdvances.advanceDate));
  }

  async getAdvance(id: number): Promise<SalaryAdvance | undefined> {
    const [advance] = await db.select().from(salaryAdvances).where(eq(salaryAdvances.id, id));
    return advance;
  }

  async createAdvance(advance: InsertSalaryAdvance): Promise<SalaryAdvance> {
    const [created] = await db.insert(salaryAdvances).values(advance).returning();
    eventBus.emit('advance:created', created);
    return created;
  }

  async updateAdvance(id: number, advance: Partial<InsertSalaryAdvance>): Promise<SalaryAdvance> {
    const [updated] = await db
      .update(salaryAdvances)
      .set(advance)
      .where(eq(salaryAdvances.id, id))
      .returning();
    eventBus.emit('advance:updated', updated);
    return updated;
  }

  async deleteAdvance(id: number): Promise<void> {
    await db.delete(salaryAdvances).where(eq(salaryAdvances.id, id));
    eventBus.emit('advance:deleted', { id });
  }

  // Salary Payment operations
  async getPaymentsBySalary(salaryId: number): Promise<SalaryPayment[]> {
    return await db
      .select()
      .from(salaryPayments)
      .where(eq(salaryPayments.salaryId, salaryId))
      .orderBy(desc(salaryPayments.paymentDate));
  }

  async createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment> {
    const [created] = await db.insert(salaryPayments).values(payment).returning();
    eventBus.emit('salary-payment:created', created);
    return created;
  }

  async deleteSalaryPayment(id: number): Promise<void> {
    await db.delete(salaryPayments).where(eq(salaryPayments.id, id));
    eventBus.emit('salary-payment:deleted', { id });
  }
}

export const storage = new DatabaseStorage();
