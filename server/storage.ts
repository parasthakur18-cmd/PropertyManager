import {
  users,
  properties,
  rooms,
  guests,
  travelAgents,
  bookings,
  menuCategories,
  menuItems,
  menuItemVariants,
  menuItemAddOns,
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
  staffMembers,
  staffSalaries,
  salaryAdvances,
  salaryPayments,
  attendanceRecords,
  featureSettings,
  otaIntegrations,
  whatsappNotificationSettings,
  auditLogs,
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
  type MenuCategory,
  type InsertMenuCategory,
  type MenuItem,
  type InsertMenuItem,
  type MenuItemVariant,
  type InsertMenuItemVariant,
  type MenuItemAddOn,
  type InsertMenuItemAddOn,
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
  type StaffMember,
  type InsertStaffMember,
  type StaffSalary,
  type InsertStaffSalary,
  type SalaryAdvance,
  type InsertSalaryAdvance,
  type SalaryPayment,
  type InsertSalaryPayment,
  issueReports,
  type IssueReport,
  contactEnquiries,
  type ContactEnquiry,
  type InsertContactEnquiry,
  preBills,
  type PreBill,
  type InsertPreBill,
  type FeatureSettings,
  type InsertFeatureSettings,
  type WhatsappNotificationSettings,
  type InsertWhatsappNotificationSettings,
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

  // Menu Category operations
  getAllMenuCategories(): Promise<MenuCategory[]>;
  getMenuCategoriesByProperty(propertyId: number): Promise<MenuCategory[]>;
  getMenuCategory(id: number): Promise<MenuCategory | undefined>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory>;
  deleteMenuCategory(id: number): Promise<void>;
  reorderMenuCategories(updates: { id: number; displayOrder: number }[]): Promise<void>;

  // Menu Item operations
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByProperty(propertyId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  reorderMenuItems(updates: { id: number; displayOrder: number }[]): Promise<void>;

  // Menu Item Variant operations
  getVariantsByMenuItem(menuItemId: number): Promise<MenuItemVariant[]>;
  createMenuItemVariant(variant: InsertMenuItemVariant): Promise<MenuItemVariant>;
  updateMenuItemVariant(id: number, variant: Partial<InsertMenuItemVariant>): Promise<MenuItemVariant>;
  deleteMenuItemVariant(id: number): Promise<void>;
  deleteVariantsByMenuItem(menuItemId: number): Promise<void>;

  // Menu Item Add-On operations
  getAddOnsByMenuItem(menuItemId: number): Promise<MenuItemAddOn[]>;
  createMenuItemAddOn(addOn: InsertMenuItemAddOn): Promise<MenuItemAddOn>;
  updateMenuItemAddOn(id: number, addOn: Partial<InsertMenuItemAddOn>): Promise<MenuItemAddOn>;
  deleteMenuItemAddOn(id: number): Promise<void>;
  deleteAddOnsByMenuItem(menuItemId: number): Promise<void>;

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

  // Staff Member operations (non-app staff)
  getAllStaffMembers(): Promise<StaffMember[]>;
  getStaffMembersByProperty(propertyId: number): Promise<StaffMember[]>;
  getStaffMember(id: number): Promise<StaffMember | undefined>;
  createStaffMember(member: InsertStaffMember): Promise<StaffMember>;
  updateStaffMember(id: number, member: Partial<InsertStaffMember>): Promise<StaffMember>;
  deleteStaffMember(id: number): Promise<void>;

  // Staff Salary operations
  getAllSalaries(): Promise<StaffSalary[]>;
  getSalariesByUser(userId: string): Promise<StaffSalary[]>;
  getSalariesByProperty(propertyId: number): Promise<StaffSalary[]>;
  getSalary(id: number): Promise<StaffSalary | undefined>;
  createSalary(salary: InsertStaffSalary): Promise<StaffSalary>;
  updateSalary(id: number, salary: Partial<InsertStaffSalary>): Promise<StaffSalary>;
  deleteSalary(id: number): Promise<void>;
  getDetailedStaffSalaries(propertyId: number, startDate: Date, endDate: Date): Promise<any[]>;

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

  // Super Admin operations
  updateUserStatus(userId: string, status: "active" | "suspended"): Promise<User>;
  getAllIssueReports(): Promise<IssueReport[]>;
  createIssueReport(report: InsertIssueReport): Promise<IssueReport>;

  // Password Reset operations
  createPasswordResetOtp(data: InsertPasswordResetOtp): Promise<any>;
  verifyPasswordResetOtp(channel: string, identifier: string, otp: string): Promise<{ resetToken: string }>;
  resetPassword(resetToken: string, newPassword: string): Promise<void>;

  // Pre-Bill operations
  getPreBill(id: number): Promise<PreBill | undefined>;
  getPreBillByBooking(bookingId: number): Promise<PreBill | undefined>;
  createPreBill(preBill: InsertPreBill): Promise<PreBill>;
  updatePreBillStatus(id: number, status: string, approvedBy?: string): Promise<PreBill>;

  // Contact Enquiry operations
  getAllContactEnquiries(): Promise<ContactEnquiry[]>;
  createContactEnquiry(enquiry: InsertContactEnquiry): Promise<ContactEnquiry>;
  updateContactEnquiryStatus(id: number, status: string): Promise<ContactEnquiry>;

  // Error Crash operations
  markErrorAsResolved(id: number): Promise<ErrorCrash>;

  // OTA Integrations operations (multi-portal support)
  getOtaIntegrationsByProperty(propertyId: number): Promise<any[]>;
  getOtaIntegration(id: number): Promise<any | undefined>;
  createOtaIntegration(integration: any): Promise<any>;
  updateOtaIntegration(id: number, integration: any): Promise<any>;
  deleteOtaIntegration(id: number): Promise<void>;
  updateOtaIntegrationSyncStatus(id: number, lastSyncAt: Date, syncErrorMessage?: string): Promise<any>;

  // Attendance operations
  getAllAttendance(): Promise<AttendanceRecord[]>;
  getAttendanceByStaffMember(staffId: number): Promise<AttendanceRecord[]>;
  getAttendanceByProperty(propertyId: number): Promise<AttendanceRecord[]>;
  getAttendanceByDate(attendanceDate: Date): Promise<AttendanceRecord[]>;
  createAttendance(attendance: InsertAttendanceRecord): Promise<AttendanceRecord>;
  updateAttendance(id: number, attendance: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord>;
  deleteAttendance(id: number): Promise<void>;

  // Dashboard stats
  getDashboardStats(propertyId?: number): Promise<any>;
  getAnalytics(propertyId?: number): Promise<any>;
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

  async updateUserStatus(userId: string, status: "active" | "suspended"): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Build update object with only defined fields to avoid overwriting with undefined
    const updateFields: any = {
      updatedAt: new Date(),
    };
    if (userData.email !== undefined) updateFields.email = userData.email;
    if (userData.firstName !== undefined) updateFields.firstName = userData.firstName;
    if (userData.lastName !== undefined) updateFields.lastName = userData.lastName;
    if (userData.profileImageUrl !== undefined) updateFields.profileImageUrl = userData.profileImageUrl;
    if (userData.role !== undefined) updateFields.role = userData.role;

    // Use onConflictDoUpdate to handle both insert and update cases
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: updateFields,
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
    // Check for ACTIVE bookings only (not historical/completed ones)
    // Allow deletion if bookings are checked-out or cancelled
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          or(
            eq(bookings.roomId, id),
            sql`${id} = ANY(${bookings.roomIds})`
          ),
          or(
            eq(bookings.status, "pending"),
            eq(bookings.status, "checked-in"),
            eq(bookings.status, "partial")
          )
        )
      )
      .limit(1);

    if (activeBookings.length > 0) {
      throw new Error("Cannot delete room with active bookings. Please complete or cancel bookings first.");
    }

    // Set foreign key references to NULL for historical data
    // This allows deletion while preserving billing history
    await db.update(bookings)
      .set({ roomId: null })
      .where(eq(bookings.roomId, id));

    await db.update(orders)
      .set({ roomId: null })
      .where(eq(orders.roomId, id));

    await db.update(enquiries)
      .set({ roomId: null })
      .where(eq(enquiries.roomId, id));

    // Now safe to delete the room
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  async getAvailableRooms(propertyId: number): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.status, "available")));
  }

  async getRoomsWithCheckedInGuests(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const roomsWithGuests = await db
      .select({
        roomId: rooms.id,
        roomNumber: rooms.roomNumber,
        roomType: rooms.roomType,
        propertyId: rooms.propertyId,
        guestName: guests.fullName,
        guestPhone: guests.phone,
        bookingId: bookings.id,
      })
      .from(rooms)
      .innerJoin(bookings, eq(bookings.roomId, rooms.id))
      .innerJoin(guests, eq(bookings.guestId, guests.id))
      .where(and(
        eq(bookings.status, "checked-in"),
        gte(bookings.checkOutDate, today) // Only show bookings that haven't checked out yet
      ))
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
    console.log('🔍 [STORAGE DEBUG] createBooking called with:', {
      roomId: booking.roomId,
      numberOfGuests: booking.numberOfGuests,
      bedsBooked: booking.bedsBooked,
      hasBedsBooked: 'bedsBooked' in booking,
      bedsBookedType: typeof booking.bedsBooked
    });
    
    // Auto-assign room if not provided
    if (!booking.roomId && booking.propertyId) {
      const availableRooms = await this.getAvailableRooms(booking.propertyId);
      if (availableRooms.length > 0) {
        booking.roomId = availableRooms[0].id;
      }
    }
    // NOTE: Room status is NOT changed here - availability is determined by checking booking dates
    // Room status is only changed for operational purposes (check-in, check-out, cleaning, maintenance)

    // Update guest's total stays
    await db
      .update(guests)
      .set({ totalStays: sql`${guests.totalStays} + 1` })
      .where(eq(guests.id, booking.guestId));

    console.log('🔍 [STORAGE DEBUG] About to insert booking with bedsBooked:', booking.bedsBooked);
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    console.log('🔍 [STORAGE DEBUG] Created booking:', {
      id: newBooking.id,
      bedsBooked: newBooking.bedsBooked,
      numberOfGuests: newBooking.numberOfGuests
    });
    
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
    
    // Update room status based on booking status - handle both single and group bookings
    if (booking) {
      // Determine which rooms to update
      const roomsToUpdate: number[] = [];
      
      if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
        // Group booking: update all rooms
        roomsToUpdate.push(...booking.roomIds);
      } else if (booking.roomId) {
        // Single room booking
        roomsToUpdate.push(booking.roomId);
      }
      
      // Update status for all rooms
      for (const roomId of roomsToUpdate) {
        if (status === "checked-in") {
          await this.updateRoomStatus(roomId, "occupied");
        } else if (status === "checked-out" || status === "cancelled") {
          await this.updateRoomStatus(roomId, "cleaning");
        }
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
    return await db.select().from(menuItems).orderBy(menuItems.name);
  }

  async getMenuItemsByProperty(propertyId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.propertyId, propertyId))
      .orderBy(menuItems.name);
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

  async reorderMenuItems(updates: { id: number; displayOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(menuItems)
        .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
        .where(eq(menuItems.id, update.id));
    }
  }

  // Menu Category operations
  async getAllMenuCategories(): Promise<MenuCategory[]> {
    return await db.select().from(menuCategories).orderBy(menuCategories.displayOrder, menuCategories.name);
  }

  async getMenuCategoriesByProperty(propertyId: number): Promise<MenuCategory[]> {
    return await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.propertyId, propertyId))
      .orderBy(menuCategories.displayOrder, menuCategories.name);
  }

  async getMenuCategory(id: number): Promise<MenuCategory | undefined> {
    const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, id));
    return category;
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const [newCategory] = await db.insert(menuCategories).values(category).returning();
    return newCategory;
  }

  async updateMenuCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const [updated] = await db
      .update(menuCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning();
    return updated;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  async reorderMenuCategories(updates: { id: number; displayOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(menuCategories)
        .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
        .where(eq(menuCategories.id, update.id));
    }
  }

  // Menu Item Variant operations
  async getVariantsByMenuItem(menuItemId: number): Promise<MenuItemVariant[]> {
    return await db
      .select()
      .from(menuItemVariants)
      .where(eq(menuItemVariants.menuItemId, menuItemId))
      .orderBy(menuItemVariants.displayOrder);
  }

  async createMenuItemVariant(variant: InsertMenuItemVariant): Promise<MenuItemVariant> {
    const [newVariant] = await db.insert(menuItemVariants).values(variant).returning();
    return newVariant;
  }

  async updateMenuItemVariant(id: number, variant: Partial<InsertMenuItemVariant>): Promise<MenuItemVariant> {
    const [updated] = await db
      .update(menuItemVariants)
      .set({ ...variant, updatedAt: new Date() })
      .where(eq(menuItemVariants.id, id))
      .returning();
    return updated;
  }

  async deleteMenuItemVariant(id: number): Promise<void> {
    await db.delete(menuItemVariants).where(eq(menuItemVariants.id, id));
  }

  async deleteVariantsByMenuItem(menuItemId: number): Promise<void> {
    await db.delete(menuItemVariants).where(eq(menuItemVariants.menuItemId, menuItemId));
  }

  // Menu Item Add-On operations
  async getAddOnsByMenuItem(menuItemId: number): Promise<MenuItemAddOn[]> {
    return await db
      .select()
      .from(menuItemAddOns)
      .where(eq(menuItemAddOns.menuItemId, menuItemId))
      .orderBy(menuItemAddOns.displayOrder);
  }

  async createMenuItemAddOn(addOn: InsertMenuItemAddOn): Promise<MenuItemAddOn> {
    const [newAddOn] = await db.insert(menuItemAddOns).values(addOn).returning();
    return newAddOn;
  }

  async updateMenuItemAddOn(id: number, addOn: Partial<InsertMenuItemAddOn>): Promise<MenuItemAddOn> {
    const [updated] = await db
      .update(menuItemAddOns)
      .set({ ...addOn, updatedAt: new Date() })
      .where(eq(menuItemAddOns.id, id))
      .returning();
    return updated;
  }

  async deleteMenuItemAddOn(id: number): Promise<void> {
    await db.delete(menuItemAddOns).where(eq(menuItemAddOns.id, id));
  }

  async deleteAddOnsByMenuItem(menuItemId: number): Promise<void> {
    await db.delete(menuItemAddOns).where(eq(menuItemAddOns.menuItemId, menuItemId));
  }

  // Order operations
  async getAllOrders(): Promise<any[]> {
    const ordersWithDetails = await db
      .select({
        order: orders,
        roomStatus: rooms.status,
        roomNumber: rooms.roomNumber,
        guestName: guests.fullName,
        guestPhone: guests.phone,
        // Check if there's an active checked-in booking for this room
        hasCheckedInBooking: sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookings} 
          WHERE ${bookings.roomId} = ${rooms.id} 
          AND ${bookings.status} = 'checked-in'
        )`,
      })
      .from(orders)
      .leftJoin(rooms, eq(orders.roomId, rooms.id))
      .leftJoin(bookings, orders.bookingId ? eq(orders.bookingId, bookings.id) : undefined)
      .leftJoin(guests, bookings.guestId ? eq(bookings.guestId, guests.id) : undefined)
      .orderBy(desc(orders.createdAt));
    
    return ordersWithDetails.map(row => ({
      ...row.order,
      roomStatus: row.roomStatus,
      roomNumber: row.roomNumber,
      customerName: row.guestName,
      customerPhone: row.guestPhone,
      hasCheckedInBooking: row.hasCheckedInBooking,
    }));
  }

  async getOrdersByProperty(propertyId: number): Promise<any[]> {
    const ordersWithDetails = await db
      .select({
        order: orders,
        roomStatus: rooms.status,
        roomNumber: rooms.roomNumber,
        guestName: guests.fullName,
        guestPhone: guests.phone,
        // Check if there's an active checked-in booking for this room
        hasCheckedInBooking: sql<boolean>`EXISTS (
          SELECT 1 FROM ${bookings} 
          WHERE ${bookings.roomId} = ${rooms.id} 
          AND ${bookings.status} = 'checked-in'
        )`,
      })
      .from(orders)
      .leftJoin(rooms, eq(orders.roomId, rooms.id))
      .leftJoin(bookings, orders.bookingId ? eq(orders.bookingId, bookings.id) : undefined)
      .leftJoin(guests, bookings.guestId ? eq(bookings.guestId, guests.id) : undefined)
      .where(eq(orders.propertyId, propertyId))
      .orderBy(desc(orders.createdAt));
    
    return ordersWithDetails.map(row => ({
      ...row.order,
      roomStatus: row.roomStatus,
      roomNumber: row.roomNumber,
      customerName: row.guestName,
      customerPhone: row.guestPhone,
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
    try {
      console.log("[Storage] getAllBills - starting query");
      const result = await db.select().from(bills).orderBy(desc(bills.createdAt));
      console.log("[Storage] getAllBills - success, count:", result.length);
      return result;
    } catch (error: any) {
      console.error("[Storage] getAllBills - ERROR:", error.message);
      console.error("[Storage] getAllBills - Stack:", error.stack);
      throw error;
    }
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillByBooking(bookingId: number): Promise<Bill | undefined> {
    // Return the LATEST bill for this booking (highest ID = most recent, including merged bills)
    const [bill] = await db.select().from(bills).where(eq(bills.bookingId, bookingId)).orderBy(desc(bills.id)).limit(1);
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

    // FIRST: Calculate total room charges from booking data (not from bills which may be empty)
    let totalRoomCharges = 0;
    for (const booking of allBookings) {
      if (booking) {
        // Calculate nights
        const checkInDate = new Date(booking.checkInDate);
        const checkOutDate = new Date(booking.checkOutDate);
        const calculatedNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const nights = Math.max(1, calculatedNights);
        
        // Calculate room charges for this booking
        let bookingRoomCharges = 0;
        if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
          // Group booking: calculate total for all rooms
          for (const roomId of booking.roomIds) {
            const room = await this.getRoom(roomId);
            if (room) {
              const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) / booking.roomIds.length : parseFloat(room.pricePerNight);
              bookingRoomCharges += pricePerNight * nights;
            }
          }
        } else {
          // Single room booking
          const room = booking.roomId ? await this.getRoom(booking.roomId) : null;
          const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
          bookingRoomCharges = pricePerNight * nights;
        }
        
        console.log(`[MERGE] Booking ${booking.id} calculated room charges: ${bookingRoomCharges} (${nights} nights)`);
        totalRoomCharges += bookingRoomCharges;
      }
    }
    console.log(`[MERGE] Total room charges from ${bookingIds.length} bookings:`, totalRoomCharges);

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

    // Calculate bill totals (service charge NOT included by default - only on user selection)
    const subtotal = totalRoomCharges + totalFoodCharges + totalExtraCharges;
    const gstRate = 5;
    const serviceChargeRate = 10;
    const gstAmount = (subtotal * gstRate) / 100;
    const serviceChargeAmount = 0; // Don't include service charge by default - only when user selects it
    const totalAmount = subtotal + gstAmount + serviceChargeAmount;

    // Calculate total advance from all bookings
    const totalAdvance = allBookings.reduce((sum, booking) => {
      return sum + parseFloat(booking?.advanceAmount || "0");
    }, 0);
    const balanceAmount = totalAmount - totalAdvance;

    console.log(`[MERGE] Calculated totals - Room: ${totalRoomCharges}, Food: ${totalFoodCharges}, Extra: ${totalExtraCharges}, Total: ${totalAmount}, Advance: ${totalAdvance}, Balance: ${balanceAmount}`);

    // Create merged bill with calculated totals
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
      gstOnRooms: true, // GST applied to room charges
      gstOnFood: false, // GST NOT applied to food by default
      includeServiceCharge: false, // Service charge NOT included by default for merged bills
      advancePaid: totalAdvance.toFixed(2),
      balanceAmount: balanceAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentStatus: "unpaid",
      mergedBookingIds: bookingIds,
    });

    // THEN: Set ALL secondary booking bills to ₹0 (merged into primary) - AFTER calculating totals
    console.log(`[MERGE] Zeroing out ALL secondary bills for bookings:`, bookingIds);
    for (const bookingId of bookingIds) {
      if (bookingId !== primaryBookingId) {
        console.log(`[MERGE] Zeroing all bills for secondary booking ${bookingId}`);
        // Update ALL bills for this secondary booking to show 0 amount (merged into primary)
        await db.update(bills).set({
          roomCharges: "0.00",
          foodCharges: "0.00",
          extraCharges: "0.00",
          subtotal: "0.00",
          gstAmount: "0.00",
          serviceChargeAmount: "0.00",
          totalAmount: "0.00",
          balanceAmount: "0.00",
          paymentStatus: "paid", // Mark as paid (since it's merged)
          updatedAt: new Date()
        }).where(eq(bills.bookingId, bookingId));
      }
    }

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

    // Skip seeding for now - database schema mismatch
    // Categories will be created on-demand by users
    return;
  }

  // Bank Transaction operations
  async getBankTransactionsByUpload(uploadId: string): Promise<BankTransaction[]> {
    return [];
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

  // Financial Reports - Standard (date-range based)
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

  // P&L Report - Lease-based (using lease period and total lease amount)
  async getPropertyPnLReport(propertyId: number, leaseId?: number): Promise<any> {
    // Get leases for this property
    let leases = await this.getLeasesByProperty(propertyId);
    
    // If specific leaseId provided, filter to that lease
    if (leaseId) {
      leases = leases.filter(l => l.id === leaseId);
    }

    // If no leases, return empty report
    if (leases.length === 0) {
      return {
        propertyId,
        message: "No active leases found for this property",
        leaseId: leaseId || null,
        pnlData: [],
        totalRevenue: 0,
        totalLeaseAmount: 0,
        totalExpenses: 0,
        finalProfit: 0,
      };
    }

    // Generate P&L for each lease
    const pnlData = [];

    for (const lease of leases) {
      const leaseStartDate = new Date(lease.startDate);
      const leaseEndDate = lease.endDate ? new Date(lease.endDate) : new Date();

      // Get revenue during lease period
      const [revenueResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${bills.totalAmount}), 0)` })
        .from(bills)
        .innerJoin(bookings, eq(bills.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.propertyId, propertyId),
            gte(bills.createdAt, leaseStartDate),
            lte(bills.createdAt, leaseEndDate)
          )
        );

      // Get expenses during lease period
      const [expensesResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${propertyExpenses.amount}), 0)` })
        .from(propertyExpenses)
        .where(
          and(
            eq(propertyExpenses.propertyId, propertyId),
            gte(propertyExpenses.expenseDate, leaseStartDate),
            lte(propertyExpenses.expenseDate, leaseEndDate)
          )
        );

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
            gte(propertyExpenses.expenseDate, leaseStartDate),
            lte(propertyExpenses.expenseDate, leaseEndDate)
          )
        )
        .groupBy(propertyExpenses.category);

      // Get salaries during lease period (using periodStart for date range)
      const [salariesResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${staffSalaries.netSalary}), 0)` })
        .from(staffSalaries)
        .where(
          and(
            eq(staffSalaries.propertyId, propertyId),
            gte(staffSalaries.periodStart, leaseStartDate),
            lte(staffSalaries.periodStart, leaseEndDate)
          )
        );

      const totalRevenue = parseFloat(revenueResult?.total || '0');
      const totalExpenses = parseFloat(expensesResult?.total || '0');
      const totalSalaries = parseFloat(salariesResult?.total || '0');
      const totalLeaseAmount = parseFloat(lease.totalAmount.toString());
      
      // P&L Calculation: Profit = Total Sales – (Total Lease Amount + Total Expenses + Salaries)
      const totalCosts = totalLeaseAmount + totalExpenses + totalSalaries;
      const finalProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? ((finalProfit / totalRevenue) * 100).toFixed(2) : '0';

      pnlData.push({
        leaseId: lease.id,
        leaseStartDate: leaseStartDate,
        leaseEndDate: leaseEndDate,
        landlordName: lease.landlordName || 'N/A',
        totalLeaseAmount,
        totalRevenue,
        totalExpenses,
        totalSalaries,
        expensesByCategory: expensesByCategory.map(c => ({
          category: c.category,
          total: parseFloat(c.total),
        })),
        finalProfit,
        profitMargin,
      });
    }

    // Summary across all leases
    const totalRevenue = pnlData.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalLeaseAmount = pnlData.reduce((sum, p) => sum + p.totalLeaseAmount, 0);
    const totalExpenses = pnlData.reduce((sum, p) => sum + p.totalExpenses, 0);
    const totalSalaries = pnlData.reduce((sum, p) => sum + p.totalSalaries, 0);
    const totalCosts = totalLeaseAmount + totalExpenses + totalSalaries;
    const finalProfit = totalRevenue - totalCosts;

    return {
      propertyId,
      leaseId: leaseId || null,
      pnlData,
      totalRevenue,
      totalLeaseAmount,
      totalExpenses,
      totalSalaries,
      totalCosts,
      finalProfit,
      profitMargin: totalRevenue > 0 ? ((finalProfit / totalRevenue) * 100).toFixed(2) : '0',
    };
  }

  // Dashboard stats - Premium KPI metrics
  async getDashboardStats(propertyId?: number): Promise<any> {
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

    const [activeUsersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.status, 'active'));

    // Use last 30 days instead of calendar month for more accurate KPIs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    let monthlyRevenueQuery = db
      .select({ total: sql<string>`COALESCE(SUM(bills.total_amount), 0)` })
      .from(bills)
      .where(gte(bills.createdAt, thirtyDaysAgo));

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
    const monthlyRevenue = parseFloat(monthlyRevenueResult.total);

    // Calculate ADR (Average Daily Rate) and RevPAR
    let adR = 0;
    let revPaR = 0;
    
    if (activeBookingsCount.count > 0) {
      // ADR = Monthly Revenue / Occupied Room Nights (approximation: active bookings as proxy)
      adR = Math.round(monthlyRevenue / Math.max(activeBookingsCount.count, 1));
    }
    
    if (roomsCount.count > 0) {
      // RevPAR = Monthly Revenue / Total Available Rooms
      revPaR = Math.round(monthlyRevenue / roomsCount.count);
    }

    return {
      totalProperties: propertiesCount.count,
      totalRooms: roomsCount.count,
      activeBookings: activeBookingsCount.count,
      totalGuests: guestsCount.count,
      activeUsers: activeUsersCount.count,
      occupancyRate,
      monthlyRevenue: Math.round(monthlyRevenue),
      adr: adR,
      revpar: revPaR,
      occupiedRooms: occupiedRoomsCount.count,
    };
  }

  async getAnalytics(propertyId?: number): Promise<any> {
    // Build property filter for bills (join with bookings to filter by property)
    const billsWithProperty = propertyId 
      ? db.select({ 
          totalAmount: bills.totalAmount,
          roomCharges: bills.roomCharges,
          foodCharges: bills.foodCharges,
          extraCharges: bills.extraCharges,
          paymentStatus: bills.paymentStatus,
          createdAt: bills.createdAt,
          balanceAmount: bills.balanceAmount,
          dueDate: bills.dueDate,
        })
        .from(bills)
        .leftJoin(bookings, eq(bills.bookingId, bookings.id))
        .where(eq(bookings.propertyId, propertyId))
        .as('filtered_bills')
      : null;

    const [totalRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
          .from(bills);

    const [paidRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.total_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(eq(bills.paymentStatus, "paid"), eq(bookings.propertyId, propertyId)))
      : await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
          .from(bills)
          .where(eq(bills.paymentStatus, "paid"));

    const [roomRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.room_charges), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ total: sql<string>`COALESCE(SUM(room_charges), 0)` })
          .from(bills);

    const [restaurantRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.food_charges), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ total: sql<string>`COALESCE(SUM(food_charges), 0)` })
          .from(bills);

    const [extraServicesRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.extra_charges), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ total: sql<string>`COALESCE(SUM(extra_charges), 0)` })
          .from(bills);

    const [bookingsCount] = propertyId 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(bookings)
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(bookings);

    const [guestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests);

    const [roomsCount] = propertyId 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(rooms)
          .where(eq(rooms.propertyId, propertyId))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(rooms);

    const [occupiedRoomsCount] = propertyId 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(rooms)
          .where(and(eq(rooms.status, "occupied"), eq(rooms.propertyId, propertyId)))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(rooms)
          .where(eq(rooms.status, "occupied"));

    const [propertiesCount] = propertyId 
      ? await db.select({ count: sql<number>`1` })
          .from(properties)
          .where(and(eq(properties.isActive, true), eq(properties.id, propertyId)))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(properties)
          .where(eq(properties.isActive, true));

    const [repeatGuestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(sql`total_stays > 1`);

    const [avgRoomRateResult] = propertyId 
      ? await db.select({ avg: sql<string>`COALESCE(AVG(price_per_night), 0)` })
          .from(rooms)
          .where(eq(rooms.propertyId, propertyId))
      : await db.select({ avg: sql<string>`COALESCE(AVG(price_per_night), 0)` })
          .from(rooms);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyRevenueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.total_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(gte(bills.createdAt, currentMonth), eq(bookings.propertyId, propertyId)))
      : await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
          .from(bills)
          .where(gte(bills.createdAt, currentMonth));

    const [monthlyPaidResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.total_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            gte(bills.createdAt, currentMonth),
            eq(bills.paymentStatus, "paid"),
            eq(bookings.propertyId, propertyId)
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
          .from(bills)
          .where(and(
            gte(bills.createdAt, currentMonth),
            eq(bills.paymentStatus, "paid")
          ));

    const popularRoomTypes = propertyId 
      ? await db.select({
            type: rooms.roomType,
            bookings: sql<number>`count(*)::int`,
          })
          .from(bookings)
          .leftJoin(rooms, eq(bookings.roomId, rooms.id))
          .where(eq(bookings.propertyId, propertyId))
          .groupBy(rooms.roomType)
          .orderBy(sql`count(*) DESC`)
          .limit(5)
      : await db.select({
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

    // Calculate pending receivables metrics
    const now = new Date();
    
    // Total pending and total bills for collection rate
    const [pendingResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)`, count: sql<number>`count(*)::int` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(eq(bills.paymentStatus, "pending"), eq(bookings.propertyId, propertyId)))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)`, count: sql<number>`count(*)::int` })
          .from(bills)
          .where(eq(bills.paymentStatus, "pending"));

    const [totalBillsCount] = propertyId 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(eq(bookings.propertyId, propertyId))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(bills);

    const [paidBillsCount] = propertyId 
      ? await db.select({ count: sql<number>`count(*)::int` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(eq(bills.paymentStatus, "paid"), eq(bookings.propertyId, propertyId)))
      : await db.select({ count: sql<number>`count(*)::int` })
          .from(bills)
          .where(eq(bills.paymentStatus, "paid"));

    // Calculate overdue amount (pending bills past their due date)
    const [overdueResult] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            eq(bills.paymentStatus, "pending"),
            eq(bookings.propertyId, propertyId),
            sql`${bills.dueDate} IS NOT NULL AND ${bills.dueDate} < CURRENT_DATE`
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)` })
          .from(bills)
          .where(and(
            eq(bills.paymentStatus, "pending"),
            sql`due_date IS NOT NULL AND due_date < CURRENT_DATE`
          ));

    // Calculate aging buckets
    const [currentBucket] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            eq(bills.paymentStatus, "pending"),
            eq(bookings.propertyId, propertyId),
            sql`(${bills.dueDate} IS NULL OR ${bills.dueDate} >= CURRENT_DATE)`
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)` })
          .from(bills)
          .where(and(
            eq(bills.paymentStatus, "pending"),
            sql`(due_date IS NULL OR due_date >= CURRENT_DATE)`
          ));

    const [day1to7Bucket] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            eq(bills.paymentStatus, "pending"),
            eq(bookings.propertyId, propertyId),
            sql`${bills.dueDate} IS NOT NULL AND ${bills.dueDate} BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE - INTERVAL '1 day'`
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)` })
          .from(bills)
          .where(and(
            eq(bills.paymentStatus, "pending"),
            sql`due_date IS NOT NULL AND due_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE - INTERVAL '1 day'`
          ));

    const [day8to30Bucket] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            eq(bills.paymentStatus, "pending"),
            eq(bookings.propertyId, propertyId),
            sql`${bills.dueDate} IS NOT NULL AND ${bills.dueDate} BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '8 days'`
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)` })
          .from(bills)
          .where(and(
            eq(bills.paymentStatus, "pending"),
            sql`due_date IS NOT NULL AND due_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '8 days'`
          ));

    const [over30Bucket] = propertyId 
      ? await db.select({ total: sql<string>`COALESCE(SUM(bills.balance_amount), 0)` })
          .from(bills)
          .leftJoin(bookings, eq(bills.bookingId, bookings.id))
          .where(and(
            eq(bills.paymentStatus, "pending"),
            eq(bookings.propertyId, propertyId),
            sql`${bills.dueDate} IS NOT NULL AND ${bills.dueDate} < CURRENT_DATE - INTERVAL '30 days'`
          ))
      : await db.select({ total: sql<string>`COALESCE(SUM(balance_amount), 0)` })
          .from(bills)
          .where(and(
            eq(bills.paymentStatus, "pending"),
            sql`due_date IS NOT NULL AND due_date < CURRENT_DATE - INTERVAL '30 days'`
          ));

    // Property breakdown
    const propertyBreakdown = await db
      .select({
        id: properties.id,
        name: properties.name,
        pendingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${bills.paymentStatus} = 'pending' THEN ${bills.balanceAmount} ELSE 0 END), 0)`,
        overdueAmount: sql<string>`COALESCE(SUM(CASE WHEN ${bills.paymentStatus} = 'pending' AND ${bills.dueDate} IS NOT NULL AND ${bills.dueDate} < CURRENT_DATE THEN ${bills.balanceAmount} ELSE 0 END), 0)`,
        count: sql<number>`COUNT(CASE WHEN ${bills.paymentStatus} = 'pending' THEN 1 END)::int`,
      })
      .from(properties)
      .leftJoin(rooms, eq(rooms.propertyId, properties.id))
      .leftJoin(bookings, eq(bookings.roomId, rooms.id))
      .leftJoin(bills, eq(bills.bookingId, bookings.id))
      .groupBy(properties.id, properties.name);

    // Travel agent breakdown
    const agentBreakdown = await db
      .select({
        id: sql<number>`COALESCE(${bookings.travelAgentId}, 0)`,
        name: sql<string>`COALESCE((SELECT name FROM travel_agents ta WHERE ta.id = ${bookings.travelAgentId}), 'Direct/Walk-in')`,
        pendingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${bills.paymentStatus} = 'pending' THEN ${bills.balanceAmount} ELSE 0 END), 0)`,
        overdueAmount: sql<string>`COALESCE(SUM(CASE WHEN ${bills.paymentStatus} = 'pending' AND ${bills.dueDate} IS NOT NULL AND ${bills.dueDate} < CURRENT_DATE THEN ${bills.balanceAmount} ELSE 0 END), 0)`,
        count: sql<number>`COUNT(CASE WHEN ${bills.paymentStatus} = 'pending' THEN 1 END)::int`,
      })
      .from(bills)
      .leftJoin(bookings, eq(bills.bookingId, bookings.id))
      .groupBy(bookings.travelAgentId);

    const collectionRate = totalBillsCount.count > 0
      ? Math.round((paidBillsCount.count / totalBillsCount.count) * 100)
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
      pendingReceivables: {
        totalPending: parseFloat(pendingResult.total),
        totalOverdue: parseFloat(overdueResult.total),
        collectionRate,
        agingBuckets: {
          current: parseFloat(currentBucket.total),
          day1to7: parseFloat(day1to7Bucket.total),
          day8to30: parseFloat(day8to30Bucket.total),
          over30: parseFloat(over30Bucket.total),
        },
        propertyBreakdown: propertyBreakdown.map((p: any) => ({
          id: p.id,
          name: p.name,
          pendingAmount: parseFloat(p.pendingAmount),
          overdueAmount: parseFloat(p.overdueAmount),
          count: p.count,
        })),
        agentBreakdown: agentBreakdown.map((a: any) => ({
          id: a.id,
          name: a.name,
          pendingAmount: parseFloat(a.pendingAmount),
          overdueAmount: parseFloat(a.overdueAmount),
          count: a.count,
        })),
      },
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      comparisonPeriod: undefined,
      cashCollected: parseFloat(monthlyPaidResult.total),
      writeOffs: 0, // TODO: Implement write-offs tracking
      generatedAt: now.toISOString(),
    };
  }

  // Staff Member operations (non-app staff)
  async getAllStaffMembers(): Promise<StaffMember[]> {
    return await db.select().from(staffMembers).orderBy(desc(staffMembers.createdAt));
  }

  async getStaffMembersByProperty(propertyId: number): Promise<StaffMember[]> {
    return await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.propertyId, propertyId))
      .orderBy(desc(staffMembers.createdAt));
  }

  async getStaffMember(id: number): Promise<StaffMember | undefined> {
    const [member] = await db.select().from(staffMembers).where(eq(staffMembers.id, id));
    return member;
  }

  async createStaffMember(member: InsertStaffMember): Promise<StaffMember> {
    const [created] = await db.insert(staffMembers).values(member).returning();
    eventBus.emit('staff-member:created', created);
    return created;
  }

  async updateStaffMember(id: number, member: Partial<InsertStaffMember>): Promise<StaffMember> {
    const [updated] = await db
      .update(staffMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(staffMembers.id, id))
      .returning();
    eventBus.emit('staff-member:updated', updated);
    return updated;
  }

  async deleteStaffMember(id: number): Promise<void> {
    await db.delete(staffMembers).where(eq(staffMembers.id, id));
    eventBus.emit('staff-member:deleted', { id });
  }

  // Attendance operations
  async getAllAttendance(): Promise<AttendanceRecord[]> {
    const results = await db.select().from(attendanceRecords).orderBy(desc(attendanceRecords.attendanceDate));
    console.log(`[STORAGE] getAllAttendance returned ${results.length} records`);
    if (results.length > 0) {
      console.log('[STORAGE] First record:', JSON.stringify(results[0], null, 2));
    }
    return results;
  }

  async getAttendanceByStaffMember(staffId: number): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.staffId, staffId))
      .orderBy(desc(attendanceRecords.attendanceDate));
  }

  async getAttendanceByProperty(propertyId: number): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.propertyId, propertyId))
      .orderBy(desc(attendanceRecords.attendanceDate));
  }

  async getAttendanceByDate(attendanceDate: Date): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startOfDay),
          lte(attendanceRecords.attendanceDate, endOfDay)
        )
      )
      .orderBy(desc(attendanceRecords.attendanceDate));
  }

  async createAttendance(attendance: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [created] = await db.insert(attendanceRecords).values(attendance).returning();
    eventBus.emit('attendance:created', created);
    return created;
  }

  async updateAttendance(id: number, attendance: Partial<InsertAttendanceRecord>): Promise<AttendanceRecord> {
    const [updated] = await db
      .update(attendanceRecords)
      .set({ ...attendance, updatedAt: new Date() })
      .where(eq(attendanceRecords.id, id))
      .returning();
    eventBus.emit('attendance:updated', updated);
    return updated;
  }

  async deleteAttendance(id: number): Promise<void> {
    await db.delete(attendanceRecords).where(eq(attendanceRecords.id, id));
    eventBus.emit('attendance:deleted', { id });
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

  // Get detailed staff salaries with attendance deductions
  async getDetailedStaffSalaries(propertyId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const staffList = await db.select().from(staffMembers).where(eq(staffMembers.propertyId, propertyId));
    
    const detailedSalaries = await Promise.all(
      staffList.map(async (staff) => {
        // Get attendance records for this period
        const attendanceList = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.propertyId, propertyId),
              gte(attendanceRecords.attendanceDate, startDate),
              lte(attendanceRecords.attendanceDate, endDate)
            )
          );

        // Count attendance by status
        const presentDays = attendanceList.filter(a => a.status === 'present').length;
        const absentDays = attendanceList.filter(a => a.status === 'absent').length;
        const leaveDays = attendanceList.filter(a => a.status === 'leave').length;
        const halfDays = attendanceList.filter(a => a.status === 'half-day').length;
        const totalWorkingDays = attendanceList.length;

        // Calculate deductions: 1 absent = 1 day deduction, 1 half-day = 0.5 day deduction
        const baseSalaryNum = staff.baseSalary ? parseFloat(staff.baseSalary.toString()) : 0;
        const dailyRate = baseSalaryNum / 30; // Assuming 30 days in a month
        const attendanceDeductions = (absentDays * dailyRate) + (halfDays * 0.5 * dailyRate);

        // Get all advances for this staff member in this period
        const advances = await db
          .select()
          .from(salaryAdvances)
          .where(
            and(
              eq(salaryAdvances.staffMemberId, staff.id),
              gte(salaryAdvances.advanceDate, startDate),
              lte(salaryAdvances.advanceDate, endDate)
            )
          );

        const totalAdvances = advances.reduce((sum, adv) => sum + parseFloat(adv.amount.toString()), 0);

        // Final salary calculation
        const finalSalary = baseSalaryNum - attendanceDeductions - totalAdvances;

        return {
          staffId: staff.id,
          staffName: staff.name,
          jobTitle: staff.jobTitle || 'N/A',
          baseSalary: baseSalaryNum,
          presentDays,
          absentDays,
          leaveDays,
          halfDays,
          totalWorkingDays,
          dailyRate: Math.round(dailyRate * 100) / 100,
          attendanceDeductions: Math.round(attendanceDeductions * 100) / 100,
          totalAdvances: Math.round(totalAdvances * 100) / 100,
          advances: advances.map(a => ({
            id: a.id,
            amount: parseFloat(a.amount.toString()),
            date: a.advanceDate,
            reason: a.reason,
          })),
          finalSalary: Math.round(finalSalary * 100) / 100,
          status: finalSalary > 0 ? 'pending' : finalSalary === 0 ? 'paid' : 'due',
        };
      })
    );

    return detailedSalaries.sort((a, b) => a.staffName.localeCompare(b.staffName));
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

  // Super Admin operations
  async getAllIssueReports(): Promise<IssueReport[]> {
    return await db.select().from(issueReports).orderBy(desc(issueReports.createdAt));
  }

  async createIssueReport(report: InsertIssueReport): Promise<IssueReport> {
    const [created] = await db.insert(issueReports).values(report).returning();
    eventBus.emit('issue-report:created', created);
    return created;
  }

  // Password Reset operations
  async createPasswordResetOtp(data: InsertPasswordResetOtp): Promise<any> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    const [created] = await db.insert(passwordResetOtps).values({
      email: data.email || null,
      phone: data.phone || null,
      channel: data.channel,
      otp,
      expiresAt,
      isUsed: false,
    }).returning();
    return created;
  }

  async verifyPasswordResetOtp(channel: string, identifier: string, otp: string): Promise<{ resetToken: string }> {
    const query = channel === "email" 
      ? eq(passwordResetOtps.email, identifier)
      : eq(passwordResetOtps.phone, identifier);
    
    const [record] = await db.select().from(passwordResetOtps)
      .where(and(query, eq(passwordResetOtps.otp, otp), eq(passwordResetOtps.isUsed, false)))
      .limit(1);
    
    if (!record || new Date() > record.expiresAt) {
      throw new Error("Invalid or expired OTP");
    }

    await db.update(passwordResetOtps).set({ isUsed: true }).where(eq(passwordResetOtps.id, record.id));

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    throw new Error("Password reset requires session token storage");
  }

  // Contact Enquiry operations
  async getAllContactEnquiries(): Promise<ContactEnquiry[]> {
    return await db.select().from(contactEnquiries).orderBy(desc(contactEnquiries.createdAt));
  }

  async createContactEnquiry(enquiry: InsertContactEnquiry): Promise<ContactEnquiry> {
    const [created] = await db.insert(contactEnquiries).values(enquiry).returning();
    eventBus.emit('contact-enquiry:created', created);
    return created;
  }

  async updateContactEnquiryStatus(id: number, status: string): Promise<ContactEnquiry> {
    const [updated] = await db
      .update(contactEnquiries)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactEnquiries.id, id))
      .returning();
    eventBus.emit('contact-enquiry:updated', updated);
    return updated;
  }

  // Feature Settings operations
  async getFeatureSettingsByProperty(propertyId: number): Promise<FeatureSettings | undefined> {
    const [settings] = await db.select().from(featureSettings).where(eq(featureSettings.propertyId, propertyId));
    if (!settings) {
      // Create default settings if not exists
      const [created] = await db.insert(featureSettings).values({
        propertyId,
        foodOrderNotifications: true,
        whatsappNotifications: true,
        emailNotifications: false,
        autoCheckout: true,
        autoSalaryCalculation: true,
        attendanceTracking: true,
        performanceAnalytics: true,
        expenseForecasting: true,
        budgetAlerts: true,
        paymentReminders: true,
      }).returning();
      return created;
    }
    return settings;
  }

  async updateFeatureSettings(propertyId: number, updates: Partial<InsertFeatureSettings>): Promise<FeatureSettings> {
    // Ensure settings exist
    await this.getFeatureSettingsByProperty(propertyId);
    
    const [updated] = await db
      .update(featureSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(featureSettings.propertyId, propertyId))
      .returning();
    return updated;
  }



  async getPreBillByBooking(bookingId: number): Promise<PreBill | undefined> {
    const [preBill] = await db.select().from(preBills).where(eq(preBills.bookingId, bookingId)).orderBy(desc(preBills.createdAt)).limit(1);
    return preBill;
  }

  async createPreBill(preBill: InsertPreBill): Promise<PreBill> {
    const [created] = await db.insert(preBills).values(preBill).returning();
    return created;
  }

  async updatePreBillStatus(id: number, status: string, approvedBy?: string): Promise<PreBill> {
    const updates: any = { status, updatedAt: new Date() };
    if (status === "approved" && approvedBy) {
      updates.approvedAt = new Date();
      updates.approvedBy = approvedBy;
    }
    const [updated] = await db.update(preBills).set(updates).where(eq(preBills.id, id)).returning();
    return updated;
  }

  // OTA Integrations operations
  async getOtaIntegrationsByProperty(propertyId: number): Promise<any[]> {
    const result = await db.select().from(otaIntegrations).where(eq(otaIntegrations.propertyId, propertyId)).orderBy(desc(otaIntegrations.createdAt));
    return result;
  }

  async getOtaIntegration(id: number): Promise<any | undefined> {
    const [result] = await db.select().from(otaIntegrations).where(eq(otaIntegrations.id, id));
    return result;
  }

  async createOtaIntegration(integration: any): Promise<any> {
    const [created] = await db.insert(otaIntegrations).values(integration).returning();
    return created;
  }

  async updateOtaIntegration(id: number, integration: any): Promise<any> {
    const [updated] = await db.update(otaIntegrations).set({ ...integration, updatedAt: new Date() }).where(eq(otaIntegrations.id, id)).returning();
    return updated;
  }

  async deleteOtaIntegration(id: number): Promise<void> {
    await db.delete(otaIntegrations).where(eq(otaIntegrations.id, id));
  }

  async updateOtaIntegrationSyncStatus(id: number, lastSyncAt: Date, syncErrorMessage?: string): Promise<any> {
    const updates: any = { lastSyncAt, updatedAt: new Date() };
    if (syncErrorMessage !== undefined) {
      updates.syncErrorMessage = syncErrorMessage;
    }
    const [updated] = await db.update(otaIntegrations).set(updates).where(eq(otaIntegrations.id, id)).returning();
    return updated;
  }

  // WhatsApp Notification Settings operations
  async getWhatsappSettingsByProperty(propertyId: number): Promise<WhatsappNotificationSettings | undefined> {
    const [settings] = await db.select().from(whatsappNotificationSettings).where(eq(whatsappNotificationSettings.propertyId, propertyId));
    if (!settings) {
      const [created] = await db.insert(whatsappNotificationSettings).values({
        propertyId,
        checkInEnabled: true,
        checkOutEnabled: true,
        enquiryConfirmationEnabled: true,
        paymentRequestEnabled: true,
        bookingConfirmationEnabled: true,
        reminderMessagesEnabled: true,
      }).returning();
      return created;
    }
    return settings;
  }

  async updateWhatsappSettings(propertyId: number, settings: Partial<InsertWhatsappNotificationSettings>): Promise<WhatsappNotificationSettings> {
    await this.getWhatsappSettingsByProperty(propertyId);
    const [updated] = await db
      .update(whatsappNotificationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(whatsappNotificationSettings.propertyId, propertyId))
      .returning();
    return updated;
  }

  // Audit Logs operations
  async createAuditLog(auditLog: any): Promise<any> {
    try {
      const [created] = await db.insert(auditLogs).values(auditLog).returning();
      return created;
    } catch (err) {
      console.warn("[Audit] Failed to create audit log (non-critical):", err);
      return null;
    }
  }

  async getAllAuditLogs(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: auditLogs.id,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          action: auditLogs.action,
          userId: auditLogs.userId,
          userName: sql`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`.as("userName"),
          userRole: users.role,
          propertyContext: auditLogs.propertyContext,
          changeSet: auditLogs.changeSet,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1000);
      return result;
    } catch (err) {
      console.warn("[Audit] Failed to fetch audit logs:", err);
      return [];
    }
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: auditLogs.id,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          action: auditLogs.action,
          userId: auditLogs.userId,
          userName: sql`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`.as("userName"),
          userRole: users.role,
          propertyContext: auditLogs.propertyContext,
          changeSet: auditLogs.changeSet,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
        .orderBy(desc(auditLogs.createdAt));
      return result;
    } catch (err) {
      console.warn("[Audit] Failed to fetch entity audit logs:", err);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
