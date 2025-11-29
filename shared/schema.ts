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
  serial,
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
  id: serial("id").primaryKey(),
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
  id: serial("id").primaryKey(),
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
  id: serial("id").primaryKey(),
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
  createdAt: true,
  updatedAt: true,
});

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Travel Agents table
export const travelAgents = pgTable("travel_agents", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("0"),
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
  roomId: integer("room_id").references(() => rooms.id, { onDelete: 'cascade' }),
  roomIds: integer("room_ids").array(), // For group bookings with multiple rooms
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  numberOfGuests: integer("number_of_guests").notNull(),
  numberOfNights: integer("number_of_nights").notNull(),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).notNull(),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"), // confirmed, checked-in, checked-out, cancelled
  source: varchar("source", { length: 50 }).default("direct"),
  mealPlan: varchar("meal_plan", { length: 50 }).default("none"), // none, breakfast, half-board, full-board
  specialRequests: text("special_requests"),
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Menu Categories table
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  image: text("image"),
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
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => menuCategories.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  preparationTime: integer("preparation_time"), // in minutes
  image: text("image"),
  isVegetarian: boolean("is_vegetarian").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
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

// Menu Item Variants table (for size, portion, etc.)
export const menuItemVariants = pgTable("menu_item_variants", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Small", "Large"
  priceModifier: decimal("price_modifier", { precision: 10, scale: 2 }).notNull().default("0"),
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
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  assignedStaffId: varchar("assigned_staff_id"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  deliveredAt: true,
  assignedStaffId: true,
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

// Bills table
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  mealCharges: decimal("meal_charges", { precision: 10, scale: 2 }).default("0"),
  serviceCharges: decimal("service_charges", { precision: 10, scale: 2 }).default("0"),
  otherCharges: decimal("other_charges", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, partial, paid
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
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
  relatedType: varchar("related_type", { length: 50 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;

// Issue Reports table
export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: integer("room_id").references(() => rooms.id),
  reportedBy: varchar("reported_by", { length: 255 }).notNull(),
  issueCategory: varchar("issue_category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
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

// Pre-Bills table
export const preBills = pgTable("pre_bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  mealCharges: decimal("meal_charges", { precision: 10, scale: 2 }).default("0"),
  serviceCharges: decimal("service_charges", { precision: 10, scale: 2 }).default("0"),
  otherCharges: decimal("other_charges", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
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

// Expense Categories table
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  keywords: text("keywords").array(),
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

// Bank Transactions table
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // income, expense
  date: date("date").notNull(),
  category: varchar("category", { length: 100 }),
  relatedBillId: integer("related_bill_id").references(() => bills.id),
  notes: text("notes"),
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
  phone: varchar("phone", { length: 50 }).notNull(),
  company: varchar("company", { length: 255 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new, contacted, converted
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

// Attendance Records table
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  status: varchar("status", { length: 20 }).notNull().default("present"), // present, absent, leave, half-day
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Salary Records table
export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  daysWorked: integer("days_worked").notNull(),
  daysAbsent: integer("days_absent").notNull().default(0),
  deductions: decimal("deductions", { precision: 12, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalaryRecordSchema = createInsertSchema(salaryRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalaryRecord = z.infer<typeof insertSalaryRecordSchema>;
export type SalaryRecord = typeof salaryRecords.$inferSelect;

// Lease Agreements table
export const leaseAgreements = pgTable("lease_agreements", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 50 }),
  ownerEmail: varchar("owner_email", { length: 255 }),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }).default("0"),
  leaseStartDate: date("lease_start_date").notNull(),
  leaseEndDate: date("lease_end_date"),
  renewalDate: date("renewal_date"),
  terms: text("terms"),
  documentUrl: text("document_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, expired, terminated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeaseAgreementSchema = createInsertSchema(leaseAgreements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaseAgreement = z.infer<typeof insertLeaseAgreementSchema>;
export type LeaseAgreement = typeof leaseAgreements.$inferSelect;

// Audit Log table - for tracking all system changes
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// Change Approvals table - for approving critical changes
export const changeApprovals = pgTable("change_approvals", {
  id: serial("id").primaryKey(),
  changeType: varchar("change_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  requestedBy: varchar("requested_by", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ChangeApproval = typeof changeApprovals.$inferSelect;
export const insertChangeApprovalSchema = createInsertSchema(changeApprovals).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChangeApproval = z.infer<typeof insertChangeApprovalSchema>;

// Expense Budgets table - for budget planning and alerts
export const expenseBudgets = pgTable("expense_budgets", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => expenseCategories.id, { onDelete: 'cascade' }),
  budgetAmount: decimal("budget_amount", { precision: 12, scale: 2 }).notNull(),
  period: varchar("period", { length: 20 }).notNull().default("monthly"), // monthly, quarterly, yearly
  month: integer("month"), // 1-12 for monthly budgets
  year: integer("year"), // Year of the budget
  alertThresholdYellow: integer("alert_threshold_yellow").notNull().default(70), // Alert at 70%
  alertThresholdRed: integer("alert_threshold_red").notNull().default(90), // Alert at 90%
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExpenseBudgetSchema = createInsertSchema(expenseBudgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExpenseBudget = z.infer<typeof insertExpenseBudgetSchema>;
export type ExpenseBudget = typeof expenseBudgets.$inferSelect;

// Task Notification Log table - tracks pending task reminders for employee behavior
export const taskNotificationLogs = pgTable("task_notification_logs", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: varchar("task_type", { length: 50 }).notNull(), // cleaning, enquiry, bill
  taskCount: integer("task_count").notNull(),
  reminderCount: integer("reminder_count").notNull().default(1), // How many times reminded
  lastRemindedAt: timestamp("last_reminded_at").notNull(),
  allTasksCompletedAt: timestamp("all_tasks_completed_at"), // When all tasks finished
  completionTime: integer("completion_time"), // minutes from first notification to completion
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskNotificationLogSchema = createInsertSchema(taskNotificationLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTaskNotificationLog = z.infer<typeof insertTaskNotificationLogSchema>;
export type TaskNotificationLog = typeof taskNotificationLogs.$inferSelect;

// Employee Performance Metrics table
export const employeePerformanceMetrics = pgTable("employee_performance_metrics", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalTasksAssigned: integer("total_tasks_assigned").notNull().default(0),
  tasksCompletedOnTime: integer("tasks_completed_on_time").notNull().default(0),
  tasksCompletedLate: integer("tasks_completed_late").notNull().default(0),
  averageCompletionTimeMinutes: decimal("average_completion_time_minutes", { precision: 10, scale: 2 }),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeePerformanceMetricsSchema = createInsertSchema(employeePerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeePerformanceMetrics = z.infer<typeof insertEmployeePerformanceMetricsSchema>;
export type EmployeePerformanceMetrics = typeof employeePerformanceMetrics.$inferSelect;

// Communications table - for enquiry communications tracking
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  enquiryId: integer("enquiry_id").notNull().references(() => enquiries.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  sentBy: varchar("sent_by", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export type Communication = typeof communications.$inferSelect;
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  sentAt: true,
});
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// Property Leases table
export const propertyLeases = pgTable("property_leases", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PropertyLease = typeof propertyLeases.$inferSelect;
export const insertPropertyLeaseSchema = createInsertSchema(propertyLeases).omit({
  id: true,
  createdAt: true,
});
export type InsertPropertyLease = z.infer<typeof insertPropertyLeaseSchema>;

// Lease Payments table
export const leasePayments = pgTable("lease_payments", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
});

export type LeasePayment = typeof leasePayments.$inferSelect;
export const insertLeasePaymentSchema = createInsertSchema(leasePayments).omit({
  id: true,
  paidAt: true,
});
export type InsertLeasePayment = z.infer<typeof insertLeasePaymentSchema>;

// Property Expenses table
export const propertyExpenses = pgTable("property_expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PropertyExpense = typeof propertyExpenses.$inferSelect;
export const insertPropertyExpenseSchema = createInsertSchema(propertyExpenses).omit({
  id: true,
  createdAt: true,
});
export type InsertPropertyExpense = z.infer<typeof insertPropertyExpenseSchema>;

// Staff Members table
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: varchar("position", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type StaffMember = typeof staffMembers.$inferSelect;
export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;

// Staff Salaries table
export const staffSalaries = pgTable("staff_salaries", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type StaffSalary = typeof staffSalaries.$inferSelect;
export const insertStaffSalarySchema = createInsertSchema(staffSalaries).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffSalary = z.infer<typeof insertStaffSalarySchema>;

// Salary Advances table
export const salaryAdvances = pgTable("salary_advances", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SalaryAdvance = typeof salaryAdvances.$inferSelect;
export const insertSalaryAdvanceSchema = createInsertSchema(salaryAdvances).omit({
  id: true,
  createdAt: true,
});
export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;

// Salary Payments table
export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  salaryId: integer("salary_id").notNull().references(() => staffSalaries.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
});

export type SalaryPayment = typeof salaryPayments.$inferSelect;
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  paidAt: true,
});
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;

// Feature Settings table - for super admin to enable/disable features
export const featureSettings = pgTable("feature_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  foodOrderNotifications: boolean("food_order_notifications").notNull().default(true), // Browser + WhatsApp alerts
  whatsappNotifications: boolean("whatsapp_notifications").notNull().default(true), // WhatsApp messaging
  emailNotifications: boolean("email_notifications").notNull().default(false), // Email alerts
  autoCheckout: boolean("auto_checkout").notNull().default(true), // Auto-checkout feature
  autoSalaryCalculation: boolean("auto_salary_calculation").notNull().default(true), // Auto salary calc
  attendanceTracking: boolean("attendance_tracking").notNull().default(true), // Staff attendance
  performanceAnalytics: boolean("performance_analytics").notNull().default(true), // Performance metrics
  expenseForecasting: boolean("expense_forecasting").notNull().default(true), // Forecast analytics
  budgetAlerts: boolean("budget_alerts").notNull().default(true), // Budget threshold alerts
  paymentReminders: boolean("payment_reminders").notNull().default(true), // Payment pending reminders
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

// OTA Integrations table
export const otaIntegrations = pgTable("ota_integrations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  otaName: varchar("ota_name", { length: 100 }).notNull(), // booking.com, airbnb, etc
  propertyId_external: varchar("property_id_external", { length: 255 }).notNull(), // Hotel ID on OTA platform
  apiKey: text("api_key"), // Encrypted API key
  apiSecret: text("api_secret"), // Encrypted API secret
  enabled: boolean("enabled").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrorMessage: text("sync_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOtaIntegrationSchema = createInsertSchema(otaIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
  syncErrorMessage: true,
});

export type InsertOtaIntegration = z.infer<typeof insertOtaIntegrationSchema>;
export type OtaIntegration = typeof otaIntegrations.$inferSelect;
