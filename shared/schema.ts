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
  check,
  date,
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
  phone: varchar("phone", { length: 20 }), // Phone number for SMS OTP
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // Hashed password for email/password auth
  role: varchar("role", { length: 20 }).notNull().default("staff"), // admin, super-admin, manager, staff, kitchen
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, suspended
  businessName: varchar("business_name", { length: 255 }), // For new registrations - user's business/company name
  assignedPropertyIds: integer("assigned_property_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User role update schema
export const updateUserRoleSchema = z.object({
  role: z.enum(["super-admin", "admin", "manager", "staff", "kitchen"]),
  assignedPropertyIds: z.array(z.number().int()).nullable().optional(),
});

export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;

// Properties table
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: 'cascade' }), // User who owns this property
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
  roomCategory: varchar("room_category", { length: 50 }).notNull().default("standard"), // standard, deluxe, suite, dormitory
  totalBeds: integer("total_beds"), // Only for dormitory rooms - number of beds available
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

// Travel Agents table
export const travelAgents = pgTable("travel_agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  commission: decimal("commission", { precision: 5, scale: 2 }), // Commission percentage
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTravelAgentSchema = createInsertSchema(travelAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTravelAgent = z.infer<typeof insertTravelAgentSchema>;
export type TravelAgent = typeof travelAgents.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id),
  roomId: integer("room_id").references(() => rooms.id), // Single room for standard bookings
  roomIds: integer("room_ids").array(), // Multiple rooms for group bookings
  isGroupBooking: boolean("is_group_booking").notNull().default(false), // True if booking multiple rooms
  bedsBooked: integer("beds_booked"), // For dormitory bookings - number of beds booked
  guestId: integer("guest_id").notNull().references(() => guests.id),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  numberOfGuests: integer("number_of_guests").notNull().default(1),
  specialRequests: text("special_requests"),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }), // Custom price per night (overrides room price if set)
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Advance payment received
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  source: varchar("source", { length: 50 }).notNull().default("Walk-in"), // Walk-in, Online, Booking.com, MMT, Airbnb, OTA, Travel Agent, Others
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id), // Only used when source is "Travel Agent"
  mealPlan: varchar("meal_plan", { length: 10 }).notNull().default("EP"), // EP, CP, MAP, AP
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

// Menu Categories table (for organizing menu items with images and time slots)
export const menuCategories = pgTable("menu_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }), // Nullable - null means "all properties"
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url"), // Category image
  startTime: varchar("start_time", { length: 10 }), // e.g., "09:00"
  endTime: varchar("end_time", { length: 10 }), // e.g., "11:30"
  displayOrder: integer("display_order").notNull().default(0), // For reordering categories
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

// Menu Items table (enhanced with veg/non-veg, discounted pricing, etc.)
export const menuItems = pgTable("menu_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }), // Nullable - null means "all properties"
  categoryId: integer("category_id").references(() => menuCategories.id, { onDelete: 'set null' }), // Link to category
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // Legacy field, kept for backward compatibility
  foodType: varchar("food_type", { length: 10 }).notNull().default("veg"), // "veg" or "non-veg"
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }), // Original price
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }), // Discounted price (if applicable)
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Current selling price (for backward compatibility)
  isAvailable: boolean("is_available").notNull().default(true), // Availability toggle
  hasVariants: boolean("has_variants").notNull().default(false), // True if item has variants
  hasAddOns: boolean("has_add_ons").notNull().default(false), // True if item has add-ons
  preparationTime: integer("preparation_time"), // In minutes
  imageUrl: text("image_url"), // Item image
  displayOrder: integer("display_order").notNull().default(0), // For reordering items within category
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

// Menu Item Variants table (for items with multiple price options like Small/Medium/Large)
export const menuItemVariants = pgTable("menu_item_variants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  variantName: varchar("variant_name", { length: 255 }).notNull(), // e.g., "Aloo Paratha Combo", "Small", "Medium"
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }).notNull(), // Original price for this variant
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }), // Discounted price for this variant
  displayOrder: integer("display_order").notNull().default(0), // For ordering variants
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemVariantSchema = createInsertSchema(menuItemVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItemVariant = z.infer<typeof insertMenuItemVariantSchema>;
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;

// Menu Item Add-Ons table (for optional extras like "Add Cheese", "Extra Coffee")
export const menuItemAddOns = pgTable("menu_item_add_ons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  addOnName: varchar("add_on_name", { length: 255 }).notNull(), // e.g., "Masala Tea", "Extra Cheese"
  addOnPrice: decimal("add_on_price", { precision: 10, scale: 2 }).notNull(), // Price for this add-on
  displayOrder: integer("display_order").notNull().default(0), // For ordering add-ons
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemAddOnSchema = createInsertSchema(menuItemAddOns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItemAddOn = z.infer<typeof insertMenuItemAddOnSchema>;
export type MenuItemAddOn = typeof menuItemAddOns.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").references(() => properties.id), // Nullable for restaurant/walk-in orders
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
  serviceType: varchar("service_type", { length: 50 }).notNull(), // taxi, guide, adventure, partner_commission
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorContact: varchar("vendor_contact", { length: 100 }),
  commission: decimal("commission", { precision: 10, scale: 2 }),
  serviceDate: timestamp("service_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExtraServiceSchema = createInsertSchema(extraServices).omit({
  id: true,
  createdAt: true,
}).extend({
  serviceDate: z.coerce.date(),
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
  includeGst: boolean("include_gst").notNull().default(true), // Whether to apply GST to the bill
  includeServiceCharge: boolean("include_service_charge").notNull().default(true), // Whether to apply service charge to the bill
  discountType: varchar("discount_type", { length: 20 }), // "percentage" or "fixed"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }), // The % or fixed amount entered
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"), // The calculated discount amount
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  advancePaid: decimal("advance_paid", { precision: 10, scale: 2 }).notNull().default("0"), // Advance amount received at booking
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull().default("0"), // Remaining amount to be paid
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"), // Optional due date for pending payments
  pendingReason: text("pending_reason"), // Optional note for why payment is pending (e.g., "Corporate client - monthly billing")
  mergedBookingIds: integer("merged_booking_ids").array(),
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
  roomId: integer("room_id").references(() => rooms.id), // Single room for standard enquiries
  roomIds: integer("room_ids").array(), // Multiple rooms for group enquiries
  isGroupEnquiry: boolean("is_group_enquiry").notNull().default(false), // True if enquiry for multiple rooms
  bedsBooked: integer("beds_booked"), // For dormitory enquiries - number of beds to book
  numberOfGuests: integer("number_of_guests").notNull().default(1),
  mealPlan: varchar("meal_plan", { length: 10 }).notNull().default("EP"), // EP, CP, MAP, AP
  source: varchar("source", { length: 50 }).notNull().default("Walk-in"), // Walk-in, Online, Booking.com, MMT, Airbnb, OTA, Travel Agent, Others
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id), // Only used when source is "Travel Agent"
  priceQuoted: decimal("price_quoted", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, received, refunded
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
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  status: z.enum(["new", "messaged", "payment_pending", "paid", "confirmed", "cancelled"]).default("new"),
  paymentStatus: z.enum(["pending", "received", "refunded"]).default("pending"),
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

// Message Templates table
export const messageTemplates = pgTable("message_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // payment_reminder, booking_confirmation, check_in_details, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// Communications table (logs all messages sent)
export const communications = pgTable("communications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  enquiryId: integer("enquiry_id").references(() => enquiries.id, { onDelete: 'cascade' }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  recipientPhone: varchar("recipient_phone", { length: 50 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  messageType: varchar("message_type", { length: 20 }).notNull().default("sms"), // sms, whatsapp, email
  templateId: integer("template_id").references(() => messageTemplates.id),
  messageContent: text("message_content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, delivered, failed, read
  twilioSid: varchar("twilio_sid", { length: 100 }),
  errorMessage: text("error_message"),
  sentBy: varchar("sent_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
});

export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

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

// Expense Categories table
export const expenseCategories = pgTable("expense_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  keywords: text("keywords").array(), // Keywords for auto-categorization
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

// Property Expenses table
export const propertyExpenses = pgTable("property_expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  category: varchar("category", { length: 50 }), // Legacy field, kept for backward compatibility
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

// Bank Transactions table (for imported transactions from bank statements)
export const bankTransactions = pgTable("bank_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  uploadId: varchar("upload_id", { length: 100 }).notNull(), // Groups transactions from same upload
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'debit' or 'credit'
  suggestedCategoryId: integer("suggested_category_id").references(() => expenseCategories.id),
  assignedCategoryId: integer("assigned_category_id").references(() => expenseCategories.id),
  isImported: boolean("is_imported").notNull().default(false), // True if converted to expense
  importedExpenseId: integer("imported_expense_id").references(() => propertyExpenses.id),
  matchConfidence: varchar("match_confidence", { length: 20 }), // 'high', 'medium', 'low', 'none'
  rawData: text("raw_data"), // Original transaction text
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  transactionDate: z.coerce.date(),
});

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  rooms: many(rooms),
  bookings: many(bookings),
  menuItems: many(menuItems),
  orders: many(orders),
  enquiries: many(enquiries),
  leases: many(propertyLeases),
  expenses: many(propertyExpenses),
  expenseCategories: many(expenseCategories),
  bankTransactions: many(bankTransactions),
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

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  property: one(properties, {
    fields: [expenseCategories.propertyId],
    references: [properties.id],
  }),
  expenses: many(propertyExpenses),
}));

export const propertyExpensesRelations = relations(propertyExpenses, ({ one }) => ({
  property: one(properties, {
    fields: [propertyExpenses.propertyId],
    references: [properties.id],
  }),
  category: one(expenseCategories, {
    fields: [propertyExpenses.categoryId],
    references: [expenseCategories.id],
  }),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  property: one(properties, {
    fields: [bankTransactions.propertyId],
    references: [properties.id],
  }),
  suggestedCategory: one(expenseCategories, {
    fields: [bankTransactions.suggestedCategoryId],
    references: [expenseCategories.id],
  }),
  assignedCategory: one(expenseCategories, {
    fields: [bankTransactions.assignedCategoryId],
    references: [expenseCategories.id],
  }),
  importedExpense: one(propertyExpenses, {
    fields: [bankTransactions.importedExpenseId],
    references: [propertyExpenses.id],
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
  communications: many(communications),
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

// Audit Log table - immutable append-only audit trail
export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // booking, user, lease, payment, etc.
  entityId: varchar("entity_id", { length: 255 }).notNull(), // ID of the affected entity
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, checkout, etc.
  userId: varchar("user_id").notNull().references(() => users.id), // Who made the change
  userRole: varchar("user_role", { length: 20 }), // Role at time of action
  propertyContext: integer("property_context").array(), // Property IDs relevant to this action
  changeSet: jsonb("change_set"), // { before: {...}, after: {...} } field-level diff
  metadata: jsonb("metadata"), // Additional context (IP, user agent, reason, notes, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_created").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Staff Members table - non-app staff for salary tracking
// Note: staff_members are assigned to a single property (unlike users who can have multiple)
export const staffMembers = pgTable("staff_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  jobTitle: varchar("job_title", { length: 100 }), // Job title/position (NOT RBAC role)
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }), // Single property assignment (required)
  joiningDate: timestamp("joining_date"), // Employee start date
  isActive: boolean("is_active").notNull().default(true),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }), // Default monthly salary
  paymentMethod: varchar("payment_method", { length: 50 }), // Preferred payment method (cash, bank transfer, UPI, etc.)
  bankDetails: text("bank_details"), // Bank account details if applicable
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_staff_member_property").on(table.propertyId),
  index("idx_staff_member_active").on(table.isActive),
]);

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  joiningDate: z.coerce.date().optional(),
  baseSalary: z.coerce.number().nonnegative().optional(),
  propertyId: z.number().int().positive(), // Required - staff members must be assigned to a property
});

export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;

// Staff Salaries table - monthly salary records (supports both app users and non-app staff)
// Constraint: Exactly one of userId or staffMemberId must be set
export const staffSalaries = pgTable("staff_salaries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // For app users
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id, { onDelete: 'cascade' }), // For non-app staff
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }), // Property context
  periodStart: timestamp("period_start").notNull(), // First day of salary period
  periodEnd: timestamp("period_end").notNull(), // Last day of salary period
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).notNull().default('0'),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_salary_user").on(table.userId),
  index("idx_salary_staff_member").on(table.staffMemberId),
  index("idx_salary_period").on(table.periodStart, table.periodEnd),
  check("salary_payee_check", sql`(
    (user_id IS NOT NULL AND staff_member_id IS NULL) OR
    (user_id IS NULL AND staff_member_id IS NOT NULL)
  )`),
]);

export const insertStaffSalarySchema = createInsertSchema(staffSalaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine((data) => {
  // Ensure exactly one of userId or staffMemberId is set
  return (data.userId && !data.staffMemberId) || (!data.userId && data.staffMemberId);
}, {
  message: "Exactly one of userId or staffMemberId must be provided",
});

export type InsertStaffSalary = z.infer<typeof insertStaffSalarySchema>;
export type StaffSalary = typeof staffSalaries.$inferSelect;

// Salary Advances table - advance payments linked to salary records (supports both app users and non-app staff)
// Constraint: Exactly one of userId or staffMemberId must be set
export const salaryAdvances = pgTable("salary_advances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // For app users
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id, { onDelete: 'cascade' }), // For non-app staff
  salaryId: integer("salary_id").references(() => staffSalaries.id, { onDelete: 'set null' }), // Linked salary period
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  advanceDate: timestamp("advance_date").notNull(),
  reason: text("reason"),
  repaymentStatus: varchar("repayment_status", { length: 20 }).notNull().default("pending"), // pending, deducted, cancelled
  deductedFromSalaryId: integer("deducted_from_salary_id").references(() => staffSalaries.id, { onDelete: 'set null' }),
  approvedBy: varchar("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_advance_user").on(table.userId),
  index("idx_advance_staff_member").on(table.staffMemberId),
  index("idx_advance_status").on(table.repaymentStatus),
  check("advance_payee_check", sql`(
    (user_id IS NOT NULL AND staff_member_id IS NULL) OR
    (user_id IS NULL AND staff_member_id IS NOT NULL)
  )`),
]);

export const insertSalaryAdvanceSchema = createInsertSchema(salaryAdvances).omit({
  id: true,
  createdAt: true,
}).extend({
  advanceDate: z.coerce.date(),
}).refine((data) => {
  // Ensure exactly one of userId or staffMemberId is set
  return (data.userId && !data.staffMemberId) || (!data.userId && data.staffMemberId);
}, {
  message: "Exactly one of userId or staffMemberId must be provided",
});

export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;
export type SalaryAdvance = typeof salaryAdvances.$inferSelect;

// Salary Payments table - actual disbursement records
export const salaryPayments = pgTable("salary_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  salaryId: integer("salary_id").notNull().references(() => staffSalaries.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, bank transfer, UPI, etc.
  referenceNumber: varchar("reference_number", { length: 100 }),
  paidBy: varchar("paid_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_salary").on(table.salaryId),
  index("idx_payment_date").on(table.paymentDate),
]);

export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDate: z.coerce.date(),
});

export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;

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

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  property: one(properties, {
    fields: [enquiries.propertyId],
    references: [properties.id],
  }),
  room: one(rooms, {
    fields: [enquiries.roomId],
    references: [rooms.id],
  }),
  communications: many(communications),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ many }) => ({
  communications: many(communications),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  enquiry: one(enquiries, {
    fields: [communications.enquiryId],
    references: [enquiries.id],
  }),
  booking: one(bookings, {
    fields: [communications.bookingId],
    references: [bookings.id],
  }),
  template: one(messageTemplates, {
    fields: [communications.templateId],
    references: [messageTemplates.id],
  }),
}));

// Analytics Response Types
export interface AgingBuckets {
  current: number;         // 0 days overdue (not due yet or due today)
  day1to7: number;        // 1-7 days overdue
  day8to30: number;       // 8-30 days overdue
  over30: number;         // Over 30 days overdue
}

export interface ReceivablesBreakdown {
  id: number;
  name: string;
  pendingAmount: number;
  overdueAmount: number;
  count: number;           // Number of pending bills
  collectionRate?: number; // Optional collection rate percentage
}

export interface PendingReceivables {
  totalPending: number;            // Total amount pending (not yet paid)
  totalOverdue: number;            // Total amount overdue (past due date)
  collectionRate: number;          // Percentage of bills paid vs total
  agingBuckets: AgingBuckets;      // Breakdown by aging
  propertyBreakdown: ReceivablesBreakdown[];
  agentBreakdown: ReceivablesBreakdown[];
}

export interface AnalyticsResponse {
  // Existing metrics
  totalRevenue: number;
  paidRevenue: number;
  monthlyRevenue: number;
  roomRevenue: number;
  restaurantRevenue: number;
  extraServicesRevenue: number;
  totalBookings: number;
  totalGuests: number;
  occupancyRate: number;
  avgRoomRate: number;
  activeProperties: number;
  repeatGuestRate: number;
  popularRoomTypes: Array<{ type: string; bookings: number }>;
  
  // Pending receivables metrics
  pendingReceivables: PendingReceivables;
  
  // Financial metadata for trend analysis and reconciliation
  period: string;              // Current period (e.g., "2025-11" for month, "2025" for year)
  comparisonPeriod?: string;   // Previous period for comparison
  cashCollected: number;       // Total cash collected in current period
  writeOffs: number;           // Total write-offs in current period
  
  // Metadata
  generatedAt: string;         // ISO date string
}

// Issue/Bug Reports table
export const issueReports = pgTable("issue_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportedByUserId: varchar("reported_by_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'set null' }), // Optional - may be reported from any context
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // bug, feature_request, documentation, performance, other
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  screenshot: text("screenshot"), // Base64 encoded screenshot
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, in_progress, resolved, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIssueReportSchema = createInsertSchema(issueReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIssueReport = z.infer<typeof insertIssueReportSchema>;
export type IssueReport = typeof issueReports.$inferSelect;

// Attendance Tracking table - daily attendance records for automatic salary deduction
export const attendanceRecords = pgTable("attendance_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  attendanceDate: date("attendance_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("present"), // present, absent, leave, half-day
  remarks: text("remarks"), // Notes about the attendance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_attendance_staff").on(table.staffId),
  index("idx_attendance_date").on(table.attendanceDate),
]);

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  attendanceDate: z.coerce.date(),
  propertyId: z.number().optional().nullable(),
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Password Reset OTP table - for secure password reset via email or SMS
export const passwordResetOtps = pgTable("password_reset_otps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }), // Phone number for SMS OTP
  channel: varchar("channel", { length: 10 }).notNull(), // "email" or "sms"
  otp: varchar("otp", { length: 10 }).notNull(), // 6-digit OTP
  expiresAt: timestamp("expires_at").notNull(), // OTP valid for 15 minutes
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetOtpSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  channel: z.enum(["email", "sms"]),
}).refine(
  (data) => (data.channel === "email" && data.email) || (data.channel === "sms" && data.phone),
  "Email required for email OTP or phone required for SMS OTP"
);

export type InsertPasswordResetOtp = z.infer<typeof insertPasswordResetOtpSchema>;

// Contact Enquiries table - for landing page contact form submissions
export const contactEnquiries = pgTable("contact_enquiries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  propertyName: varchar("property_name", { length: 255 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, contacted, resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactEnquirySchema = createInsertSchema(contactEnquiries).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContactEnquiry = z.infer<typeof insertContactEnquirySchema>;
export type ContactEnquiry = typeof contactEnquiries.$inferSelect;

// Error Crashes table - for automatic error reporting
export const errorCrashes = pgTable("error_crashes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  errorType: varchar("error_type", { length: 100 }), // TypeError, ReferenceError, etc
  page: varchar("page", { length: 255 }), // Current page/route
  browserInfo: jsonb("browser_info"), // Browser, OS, etc
  userAgent: text("user_agent"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertErrorCrashSchema = createInsertSchema(errorCrashes).omit({
  id: true,
  isResolved: true,
  createdAt: true,
});

export type InsertErrorCrash = z.infer<typeof insertErrorCrashSchema>;
export type ErrorCrash = typeof errorCrashes.$inferSelect;

// Pre-bills table - for tracking pre-bill approvals
export const preBills = pgTable("pre_bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).notNull(),
  roomNumber: varchar("room_number", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  sentAt: timestamp("sent_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"), // Guest name or identifier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPreBillSchema = createInsertSchema(preBills).omit({
  id: true,
  status: true,
  sentAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPreBill = z.infer<typeof insertPreBillSchema>;
export type PreBill = typeof preBills.$inferSelect;

// OTA Integrations table - Generic for all portals (Booking.com, MMT, Airbnb, OYO, etc.)
export const otaIntegrations = pgTable("ota_integrations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  otaName: varchar("ota_name", { length: 50 }).notNull(), // booking.com, mmt, airbnb, oyo, others
  propertyId_external: varchar("property_id_external", { length: 100 }).notNull(), // Hotel ID / Property ID on the OTA
  apiKey: text("api_key"), // Encrypted in production
  apiSecret: text("api_secret"), // Some portals need both key and secret
  credentials: jsonb("credentials"), // Flexible JSONB for any portal-specific data
  enabled: boolean("enabled").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("idle"), // idle, syncing, success, failed
  syncErrorMessage: text("sync_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOtaIntegrationSchema = createInsertSchema(otaIntegrations).omit({
  id: true,
  lastSyncAt: true,
  syncStatus: true,
  syncErrorMessage: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOtaIntegration = z.infer<typeof insertOtaIntegrationSchema>;
export type OtaIntegration = typeof otaIntegrations.$inferSelect;
