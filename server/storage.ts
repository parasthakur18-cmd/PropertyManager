import {
  users,
  properties,
  rooms,
  guests,
  bookings,
  menuItems,
  orders,
  extraServices,
  bills,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type Guest,
  type InsertGuest,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

  // Guest operations
  getAllGuests(): Promise<Guest[]>;
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest>;
  deleteGuest(id: number): Promise<void>;

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
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  deleteOrder(id: number): Promise<void>;

  // Extra Service operations
  getExtraServicesByBooking(bookingId: number): Promise<ExtraService[]>;
  createExtraService(service: InsertExtraService): Promise<ExtraService>;
  deleteExtraService(id: number): Promise<void>;

  // Bill operations
  getAllBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  getBillByBooking(bookingId: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;
  getAnalytics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
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
  async getExtraServicesByBooking(bookingId: number): Promise<ExtraService[]> {
    return await db
      .select()
      .from(extraServices)
      .where(eq(extraServices.bookingId, bookingId));
  }

  async createExtraService(service: InsertExtraService): Promise<ExtraService> {
    const [newService] = await db.insert(extraServices).values(service).returning();
    return newService;
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

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const [propertiesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties);

    const [roomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms);

    const [activeBookingsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(sql`status IN ('confirmed', 'checked-in')`);

    const [guestsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests);

    const [occupiedRoomsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rooms)
      .where(eq(rooms.status, "occupied"));

    const occupancyRate = roomsCount.count > 0
      ? Math.round((occupiedRoomsCount.count / roomsCount.count) * 100)
      : 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [monthlyRevenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(bills)
      .where(gte(bills.createdAt, currentMonth));

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
}

export const storage = new DatabaseStorage();
