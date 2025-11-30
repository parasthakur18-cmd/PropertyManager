import { pgTable, serial, varchar, integer, text, timestamp, decimal, boolean, date, jsonb, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"), // admin, super-admin, manager, staff, kitchen
  assignedPropertyIds: varchar("assigned_property_ids", { length: 255 }).array().default([]),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const updateUserRoleSchema = z.object({
  role: z.string().min(1),
  assignedPropertyIds: z.array(z.number()).optional(),
});

export type UpsertUser = InsertUser & { id?: string };

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  email: varchar("email", { length: 255 }),
  totalRooms: integer("total_rooms"),
  checkInTime: varchar("check_in_time", { length: 10 }).default("14:00"),
  checkOutTime: varchar("check_out_time", { length: 10 }).default("12:00"),
  gstNumber: varchar("gst_number", { length: 50 }),
  description: text("description"),
  propertyType: varchar("property_type", { length: 50 }), // hotel, resort, hostel, etc
  amenities: text("amenities").array(),
  images: text("images").array(),
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
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  roomType: varchar("room_type", { length: 50 }).notNull(), // single, double, suite, dormitory
  capacity: integer("capacity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("available"), // available, occupied, maintenance, blocked
  description: text("description"),
  amenities: text("amenities").array(),
  images: text("images").array(),
  bedsCount: integer("beds_count").default(1),
  bedDetails: jsonb("bed_details"), // [{bedType: "single", count: 1}, ...]
  isActive: boolean("is_active").notNull().default(true),
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
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  idProofType: varchar("id_proof_type", { length: 50 }), // passport, aadhar, license, etc
  idProofNumber: varchar("id_proof_number", { length: 100 }),
  idProofImageUrl: varchar("id_proof_image_url", { length: 500 }),
  country: varchar("country", { length: 100 }).default("India"),
  address: text("address"),
  guestSource: varchar("guest_source", { length: 50 }).default("direct"), // direct, booking.com, airbnb, etc
  guestType: varchar("guest_type", { length: 50 }).default("individual"), // individual, corporate, travel-agent
  isVip: boolean("is_vip").default(false),
  whatsappOptIn: boolean("whatsapp_opt_in").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Travel Agents table
export const travelAgents = pgTable("travel_agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  address: text("address"),
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
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  numberOfNights: integer("number_of_nights").notNull(),
  numberOfGuests: integer("number_of_guests").notNull(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }).default("0"),
  mealPlan: varchar("meal_plan", { length: 50 }).default("none"), // none, breakfast, half-board, full-board
  specialRequests: text("special_requests"),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"), // inquiry, confirmed, checked-in, checked-out, cancelled
  bookingSource: varchar("booking_source", { length: 50 }).default("direct"), // direct, booking.com, airbnb, etc
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id),
  isGroupBooking: boolean("is_group_booking").default(false),
  bedsBooked: integer("beds_booked"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  numberOfNights: true,
  checkedInAt: true,
  checkedOutAt: true,
}).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Menu Categories table
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
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

// Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  veg: boolean("veg").default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  preparationTime: integer("preparation_time"), // in minutes
  image: varchar("image", { length: 500 }),
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

// Menu Item Variants table
export const menuItemVariants = pgTable("menu_item_variants", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Small", "Medium", "Large"
  priceModifier: decimal("price_modifier", { precision: 10, scale: 2 }).default("0"),
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

// Menu Item Add-ons table
export const menuItemAddOns = pgTable("menu_item_add_ons", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Extra Cheese", "Spicy"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
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
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  roomId: integer("room_id").references(() => rooms.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  orderType: varchar("order_type", { length: 50 }).notNull().default("room-service"), // room-service, restaurant, delivery
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  items: jsonb("items").notNull(), // Array of {menuItemId, quantity, variantId?, addOnIds?, specialInstructions}
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, preparing, ready, completed, cancelled
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  orderSource: varchar("order_source", { length: 50 }),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Extra Services table
export const extraServices = pgTable("extra_services", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExtraServiceSchema = createInsertSchema(extraServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExtraService = z.infer<typeof insertExtraServiceSchema>;
export type ExtraService = typeof extraServices.$inferSelect;

// Bills table - FIXED to match actual database
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }),
  foodCharges: decimal("food_charges", { precision: 10, scale: 2 }),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  serviceChargeRate: decimal("service_charge_rate", { precision: 5, scale: 2 }),
  serviceChargeAmount: decimal("service_charge_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  mergedBookingIds: integer("merged_booking_ids").array(),
  advancePaid: decimal("advance_paid", { precision: 10, scale: 2 }),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }),
  discountType: varchar("discount_type", { length: 50 }),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  includeGst: boolean("include_gst"),
  includeServiceCharge: boolean("include_service_charge"),
  dueDate: timestamp("due_date"),
  pendingReason: text("pending_reason"),
  paymentMethods: jsonb("payment_methods"),
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
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  numberOfGuests: integer("number_of_guests"),
  numberOfRooms: integer("number_of_rooms"),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, in-progress, converted, rejected
  source: varchar("source", { length: 50 }).default("direct"),
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

// Message Templates table
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // confirmation, reminder, receipt, welcome
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  variables: text("variables").array(), // e.g., ["guestName", "checkInDate"]
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

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedId: integer("related_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Pre Bills table
export const preBills = pgTable("pre_bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id"),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  foodCharges: decimal("food_charges", { precision: 10, scale: 2 }).default("0"),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPreBillSchema = createInsertSchema(preBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPreBill = z.infer<typeof insertPreBillSchema>;
export type PreBill = typeof preBills.$inferSelect;

// Attendance Records table
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id"),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: varchar("status", { length: 20 }).notNull().default("absent"), // present, absent, half-day, leave
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Salary Records table
export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id"),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
  totalSalary: decimal("total_salary", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalarySchema = createInsertSchema(salaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  date: date("date").notNull(),
  notes: text("notes"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Expense Categories table
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  budgetLimit: decimal("budget_limit", { precision: 10, scale: 2 }),
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

// Bank Transactions table
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // deposit, withdrawal, transfer
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: varchar("description", { length: 255 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Contact Enquiries table
export const contactEnquiries = pgTable("contact_enquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  source: varchar("source", { length: 50 }),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactEnquirySchema = createInsertSchema(contactEnquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContactEnquiry = z.infer<typeof insertContactEnquirySchema>;
export type ContactEnquiry = typeof contactEnquiries.$inferSelect;

// Change Approval table
export const changeApprovals = pgTable("change_approvals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  reason: text("reason").notNull(),
  approval: varchar("approval", { length: 50 }).default("pending"), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approverNotes: text("approver_notes"),
});

export const insertChangeApprovalSchema = createInsertSchema(changeApprovals).omit({
  id: true,
  requestedAt: true,
  approvedAt: true,
});

export type InsertChangeApproval = z.infer<typeof insertChangeApprovalSchema>;
export type ChangeApproval = typeof changeApprovals.$inferSelect;

// Audit Log table
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  action: varchar("action", { length: 255 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  changes: jsonb("changes"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// OTA Integrations table
export const otaIntegrations = pgTable("ota_integrations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  platform: varchar("platform", { length: 50 }).notNull(), // booking.com, airbnb, oyo, agoda, expedia, mmt, tripadvisor
  apiKey: varchar("api_key", { length: 500 }).notNull(),
  apiSecret: varchar("api_secret", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status", { length: 50 }), // success, failed, in-progress
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOtaIntegrationSchema = createInsertSchema(otaIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
  lastSyncStatus: true,
  lastSyncError: true,
});

export type InsertOtaIntegration = z.infer<typeof insertOtaIntegrationSchema>;
export type OtaIntegration = typeof otaIntegrations.$inferSelect;

// Feature Settings table
export const featureSettings = pgTable("feature_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  foodOrderNotifications: boolean("food_order_notifications").default(true),
  whatsappNotifications: boolean("whatsapp_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  paymentReminders: boolean("payment_reminders").default(true),
  autoCheckout: boolean("auto_checkout").default(false),
  autoSalaryCalculation: boolean("auto_salary_calculation").default(true),
  attendanceTracking: boolean("attendance_tracking").default(true),
  performanceAnalytics: boolean("performance_analytics").default(true),
  expenseForecasting: boolean("expense_forecasting").default(false),
  budgetAlerts: boolean("budget_alerts").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureSettingsSchema = createInsertSchema(featureSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureSettings = z.infer<typeof insertFeatureSettingsSchema>;
export type FeatureSettings = typeof featureSettings.$inferSelect;

// Task Notification Logs table
export const taskNotificationLogs = pgTable("task_notification_logs", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  taskType: varchar("task_type", { length: 50 }).notNull(), // cleaning, payment, food-order, staff-attendance
  taskId: integer("task_id"),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  reminderSentAt: timestamp("reminder_sent_at"),
  isAutoDismissed: boolean("is_auto_dismissed").default(false),
  dismissedAt: timestamp("dismissed_at"),
  taskCompletedAt: timestamp("task_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TaskNotificationLog = typeof taskNotificationLogs.$inferSelect;

// Employee Performance Metrics table
export const employeePerformanceMetrics = pgTable("employee_performance_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  tasksCompleted: integer("tasks_completed").default(0),
  tasksOnTime: integer("tasks_on_time").default(0),
  attendanceScore: integer("attendance_score").default(0),
  qualityScore: integer("quality_score").default(0),
  performanceScore: integer("performance_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmployeePerformanceMetrics = typeof employeePerformanceMetrics.$inferSelect;

// Communications table
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message"),
  recipientId: varchar("recipient_id").references(() => users.id),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Communication = typeof communications.$inferSelect;
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// Property Leases table
export const propertyLeases = pgTable("property_leases", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }),
  leaseeDetails: text("leasee_details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PropertyLease = typeof propertyLeases.$inferSelect;
export const insertPropertyLeaseSchema = createInsertSchema(propertyLeases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPropertyLease = z.infer<typeof insertPropertyLeaseSchema>;

// Lease Payments table
export const leasePayments = pgTable("lease_payments", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  method: varchar("method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LeasePayment = typeof leasePayments.$inferSelect;
export const insertLeasePaymentSchema = createInsertSchema(leasePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeasePayment = z.infer<typeof insertLeasePaymentSchema>;

// Property Expenses table
export const propertyExpenses = pgTable("property_expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PropertyExpense = typeof propertyExpenses.$inferSelect;
export const insertPropertyExpenseSchema = createInsertSchema(propertyExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPropertyExpense = z.infer<typeof insertPropertyExpenseSchema>;

// Staff Members table
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  position: varchar("position", { length: 100 }).notNull(),
  joinDate: date("join_date").notNull(),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type StaffMember = typeof staffMembers.$inferSelect;
export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;

// Staff Salaries table
export const staffSalaries = pgTable("staff_salaries", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  month: varchar("month", { length: 7 }).notNull(),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type StaffSalary = typeof staffSalaries.$inferSelect;
export const insertStaffSalarySchema = createInsertSchema(staffSalaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaffSalary = z.infer<typeof insertStaffSalarySchema>;

// Salary Advances table
export const salaryAdvances = pgTable("salary_advances", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  requestDate: date("request_date").notNull(),
  approvalDate: date("approval_date"),
  repaymentDate: date("repayment_date"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SalaryAdvance = typeof salaryAdvances.$inferSelect;
export const insertSalaryAdvanceSchema = createInsertSchema(salaryAdvances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;

// Salary Payments table
export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  salaryId: integer("salary_id").notNull().references(() => staffSalaries.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  method: varchar("method", { length: 50 }),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SalaryPayment = typeof salaryPayments.$inferSelect;
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;

// Issue Reports table
export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  reportedBy: varchar("reported_by").references(() => users.id),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("open"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IssueReport = typeof issueReports.$inferSelect;
