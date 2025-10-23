import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
  assignedPropertyId: integer("assigned_property_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Properties table
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  totalRooms: integer("total_rooms").notNull().default(0),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Rooms table
export const rooms = pgTable("rooms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  roomType: varchar("room_type", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  maxOccupancy: integer("max_occupancy").notNull().default(2),
  amenities: text("amenities").array(),
  assignedStaffId: varchar("assigned_staff_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// Guests table
export const guests = pgTable("guests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  idProofType: varchar("id_proof_type", { length: 50 }),
  idProofNumber: varchar("id_proof_number", { length: 100 }),
  idProofImage: text("id_proof_image"),
  address: text("address"),
  preferences: text("preferences"),
  totalStays: integer("total_stays").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  totalStays: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id),
  guestId: integer("guest_id").notNull().references(() => guests.id),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  numberOfGuests: integer("number_of_guests").notNull().default(1),
  specialRequests: text("special_requests"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  preparationTime: integer("preparation_time"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  guestId: integer("guest_id").references(() => guests.id),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  orderSource: varchar("order_source", { length: 20 }).notNull().default("staff"),
  orderType: varchar("order_type", { length: 20 }),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  roomId: z.number().optional(),
  orderType: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Extra Services table
export const extraServices = pgTable("extra_services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExtraServiceSchema = createInsertSchema(extraServices).omit({
  id: true,
  createdAt: true,
});

export type InsertExtraService = z.infer<typeof insertExtraServiceSchema>;
export type ExtraService = typeof extraServices.$inferSelect;

// Bills/Invoices table
export const bills = pgTable("bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  guestId: integer("guest_id").notNull().references(() => guests.id),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).notNull(),
  foodCharges: decimal("food_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).notNull(),
  serviceChargeRate: decimal("service_charge_rate", { precision: 5, scale: 2 }).notNull().default("10"),
  serviceChargeAmount: decimal("service_charge_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// Enquiries table
export const enquiries = pgTable("enquiries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  guestPhone: varchar("guest_phone", { length: 50 }).notNull(),
  guestEmail: varchar("guest_email", { length: 255 }),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  numberOfGuests: integer("number_of_guests").notNull().default(1),
  priceQuoted: decimal("price_quoted", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripePaymentLinkUrl: text("stripe_payment_link_url"),
  twilioMessageSid: varchar("twilio_message_sid", { length: 100 }),
  specialRequests: text("special_requests"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  status: z.enum(["new", "messaged", "payment_pending", "paid", "confirmed", "cancelled"]).default("new"),
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

// Property Leases table
export const propertyLeases = pgTable("property_leases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  paymentFrequency: varchar("payment_frequency", { length: 20 }).notNull().default("monthly"),
  landlordName: varchar("landlord_name", { length: 255 }),
  landlordContact: varchar("landlord_contact", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyLeaseSchema = createInsertSchema(propertyLeases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export type InsertPropertyLease = z.infer<typeof insertPropertyLeaseSchema>;
export type PropertyLease = typeof propertyLeases.$inferSelect;

// Lease Payments table
export const leasePayments = pgTable("lease_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeasePaymentSchema = createInsertSchema(leasePayments).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDate: z.coerce.date(),
});

export type InsertLeasePayment = z.infer<typeof insertLeasePaymentSchema>;
export type LeasePayment = typeof leasePayments.$inferSelect;

// Property Expenses table
export const propertyExpenses = pgTable("property_expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  description: text("description"),
  vendorName: varchar("vendor_name", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyExpenseSchema = createInsertSchema(propertyExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expenseDate: z.coerce.date(),
});

export type InsertPropertyExpense = z.infer<typeof insertPropertyExpenseSchema>;
export type PropertyExpense = typeof propertyExpenses.$inferSelect;

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  rooms: many(rooms),
  bookings: many(bookings),
  menuItems: many(menuItems),
  orders: many(orders),
  enquiries: many(enquiries),
  leases: many(propertyLeases),
  expenses: many(propertyExpenses),
}));

export const propertyLeasesRelations = relations(propertyLeases, ({ one, many }) => ({
  property: one(properties, {
    fields: [propertyLeases.propertyId],
    references: [properties.id],
  }),
  payments: many(leasePayments),
}));

export const leasePaymentsRelations = relations(leasePayments, ({ one }) => ({
  lease: one(propertyLeases, {
    fields: [leasePayments.leaseId],
    references: [propertyLeases.id],
  }),
}));

export const propertyExpensesRelations = relations(propertyExpenses, ({ one }) => ({
  property: one(properties, {
    fields: [propertyExpenses.propertyId],
    references: [properties.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  property: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
  bookings: many(bookings),
  orders: many(orders),
  enquiries: many(enquiries),
}));

export const guestsRelations = relations(guests, ({ many }) => ({
  bookings: many(bookings),
  orders: many(orders),
  bills: many(bills),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
  guest: one(guests, {
    fields: [bookings.guestId],
    references: [guests.id],
  }),
  orders: many(orders),
  extraServices: many(extraServices),
  bills: many(bills),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  property: one(properties, {
    fields: [menuItems.propertyId],
    references: [properties.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  property: one(properties, {
    fields: [orders.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, {
    fields: [orders.roomId],
    references: [rooms.id],
  }),
  booking: one(bookings, {
    fields: [orders.bookingId],
    references: [bookings.id],
  }),
  guest: one(guests, {
    fields: [orders.guestId],
    references: [guests.id],
  }),
}));

export const extraServicesRelations = relations(extraServices, ({ one }) => ({
  booking: one(bookings, {
    fields: [extraServices.bookingId],
    references: [bookings.id],
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  booking: one(bookings, {
    fields: [bills.bookingId],
    references: [bookings.id],
  }),
  guest: one(guests, {
    fields: [bills.guestId],
    references: [guests.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  property: one(properties, {
    fields: [enquiries.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, {
    fields: [enquiries.roomId],
    references: [rooms.id],
  }),
}));
