import { pgTable, serial, varchar, integer, text, timestamp, decimal, boolean, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - matches actual database
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  assignedPropertyIds: varchar("assigned_property_ids", { length: 255 }).array().default([]),
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 20 }),
  businessName: varchar("business_name", { length: 255 }),
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

export type UpsertUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string;
  assignedPropertyIds?: string[];
  phone?: string | null;
  status?: string | null;
  businessName?: string | null;
};

// Properties table - matches actual database
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  totalRooms: integer("total_rooms"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ownerUserId: varchar("owner_user_id").references(() => users.id),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Rooms table - matches actual database
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  roomType: varchar("room_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  maxOccupancy: integer("max_occupancy").notNull(),
  amenities: text("amenities").array(),
  assignedStaffId: varchar("assigned_staff_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  roomCategory: varchar("room_category", { length: 50 }),
  totalBeds: integer("total_beds").default(1),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// Guests table - matches actual database
export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  idProofType: varchar("id_proof_type", { length: 50 }),
  idProofNumber: varchar("id_proof_number", { length: 100 }),
  address: text("address"),
  preferences: text("preferences"),
  totalStays: integer("total_stays").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  idProofImage: text("id_proof_image"),
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Travel Agents table - matches actual database
export const travelAgents = pgTable("travel_agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  bankDetails: text("bank_details"),
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

// Bookings table - matches actual database
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: integer("room_id").references(() => rooms.id),
  guestId: integer("guest_id").references(() => guests.id),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  numberOfGuests: integer("number_of_guests"),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }).default("0"),
  source: varchar("source", { length: 50 }).default("direct"),
  mealPlan: varchar("meal_plan", { length: 50 }).default("none"),
  roomIds: integer("room_ids").array(),
  isGroupBooking: boolean("is_group_booking").default(false),
  bedsBooked: integer("beds_booked"),
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id),
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

// Menu Categories table
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
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
  propertyId: integer("property_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 255 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  preparationTime: integer("preparation_time"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  categoryId: integer("category_id"),
  foodType: varchar("food_type", { length: 50 }),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  hasVariants: boolean("has_variants").default(false),
  hasAddOns: boolean("has_add_ons").default(false),
  displayOrder: integer("display_order").default(0),
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
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMenuItemVariantSchema = createInsertSchema(menuItemVariants).omit({
  id: true,
  createdAt: true,
});

export type InsertMenuItemVariant = z.infer<typeof insertMenuItemVariantSchema>;
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;

// Menu Item Add-ons table
export const menuItemAddOns = pgTable("menu_item_add_ons", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMenuItemAddOnSchema = createInsertSchema(menuItemAddOns).omit({
  id: true,
  createdAt: true,
});

export type InsertMenuItemAddOn = z.infer<typeof insertMenuItemAddOnSchema>;
export type MenuItemAddOn = typeof menuItemAddOns.$inferSelect;

// Orders table - matches actual database
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  roomId: integer("room_id"),
  bookingId: integer("booking_id"),
  guestId: integer("guest_id"),
  orderId: varchar("order_id", { length: 100 }),
  items: jsonb("items").default([]),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  preparationTime: integer("preparation_time"),
  specialInstructions: text("special_instructions"),
  qrCodeUrl: text("qr_code_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  orderNumber: varchar("order_number", { length: 50 }),
  itemsSummary: varchar("items_summary", { length: 500 }),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Extra Services table - matches actual database
export const extraServices = pgTable("extra_services", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  serviceDescription: text("service_description"),
  serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertExtraServiceSchema = createInsertSchema(extraServices).omit({
  id: true,
  addedAt: true,
});

export type InsertExtraService = z.infer<typeof insertExtraServiceSchema>;
export type ExtraService = typeof extraServices.$inferSelect;

// Bills table - matches actual database
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").references(() => guests.id),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  foodCharges: decimal("food_charges", { precision: 10, scale: 2 }).default("0"),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  issuedDate: date("issued_date"),
  dueDate: date("due_date"),
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

// Enquiries table - matches actual database
export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  numberOfGuests: integer("number_of_guests"),
  roomPreference: varchar("room_preference", { length: 100 }),
  specialRequests: text("special_requests"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  conversions: integer("conversions").default(0),
});

export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;

// Message Templates table - matches actual database
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  templateType: varchar("template_type", { length: 50 }),
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

// Communications table - matches actual database
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  recipientId: integer("recipient_id"),
  subject: varchar("subject", { length: 255 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

// Property Leases table - matches actual database
export const propertyLeases = pgTable("property_leases", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  leaseStartDate: date("lease_start_date"),
  leaseEndDate: date("lease_end_date"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  leaseDocument: text("lease_document"),
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

// Lease Payments table - matches actual database
export const leasePayments = pgTable("lease_payments", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  paymentDate: date("payment_date"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).default("paid"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LeasePayment = typeof leasePayments.$inferSelect;
export const insertLeasePaymentSchema = createInsertSchema(leasePayments).omit({
  id: true,
  createdAt: true,
});
export type InsertLeasePayment = z.infer<typeof insertLeasePaymentSchema>;

// Property Expenses table - matches actual database
export const propertyExpenses = pgTable("property_expenses", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  expenseDate: date("expense_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending"),
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

// Expense Categories table - matches actual database
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
});
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

// Bank Transactions table - matches actual database
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  transactionType: varchar("transaction_type", { length: 50 }),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  description: text("description"),
  transactionDate: date("transaction_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BankTransaction = typeof bankTransactions.$inferSelect;
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;

// Staff Members table - matches actual database
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 50 }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  joiningDate: timestamp("joining_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  jobTitle: varchar("job_title", { length: 100 }),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  bankDetails: text("bank_details"),
});

export type StaffMember = typeof staffMembers.$inferSelect;
export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;

// Staff Salaries table - matches actual database
export const staffSalaries = pgTable("staff_salaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  grossSalary: decimal("gross_salary", { precision: 10, scale: 2 }),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id, { onDelete: 'cascade' }),
});

export type StaffSalary = typeof staffSalaries.$inferSelect;
export const insertStaffSalarySchema = createInsertSchema(staffSalaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaffSalary = z.infer<typeof insertStaffSalarySchema>;

// Salary Advances table - matches actual database
export const salaryAdvances = pgTable("salary_advances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  salaryId: integer("salary_id").references(() => staffSalaries.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  advanceDate: timestamp("advance_date"),
  reason: text("reason"),
  repaymentStatus: varchar("repayment_status", { length: 20 }),
  deductedFromSalaryId: integer("deducted_from_salary_id"),
  approvedBy: varchar("approved_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id, { onDelete: 'cascade' }),
});

export type SalaryAdvance = typeof salaryAdvances.$inferSelect;
export const insertSalaryAdvanceSchema = createInsertSchema(salaryAdvances).omit({
  id: true,
  createdAt: true,
});
export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;

// Salary Payments table - matches actual database
export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  salaryId: integer("salary_id").notNull().references(() => staffSalaries.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  paidBy: varchar("paid_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SalaryPayment = typeof salaryPayments.$inferSelect;
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  createdAt: true,
});
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;

// Attendance Records table - matches actual database
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  staffMemberId: integer("staff_member_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

// Feature Settings table
export const featureSettings = pgTable("feature_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureSettingsSchema = createInsertSchema(featureSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FeatureSettings = typeof featureSettings.$inferSelect;
export type InsertFeatureSettings = z.infer<typeof insertFeatureSettingsSchema>;

// WhatsApp Notification Settings table
export const whatsappNotificationSettings = pgTable("whatsapp_notification_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  checkInEnabled: boolean("check_in_enabled").notNull().default(true),
  checkOutEnabled: boolean("check_out_enabled").notNull().default(true),
  enquiryConfirmationEnabled: boolean("enquiry_confirmation_enabled").notNull().default(true),
  paymentRequestEnabled: boolean("payment_request_enabled").notNull().default(true),
  bookingConfirmationEnabled: boolean("booking_confirmation_enabled").notNull().default(true),
  reminderMessagesEnabled: boolean("reminder_messages_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsappNotificationSettingsSchema = createInsertSchema(whatsappNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WhatsappNotificationSettings = typeof whatsappNotificationSettings.$inferSelect;
export type InsertWhatsappNotificationSettings = z.infer<typeof insertWhatsappNotificationSettingsSchema>;

// Issue Reports table - matches actual database
export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  reportedByUserId: varchar("reported_by_user_id").references(() => users.id),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  severity: varchar("severity", { length: 20 }),
  screenshot: text("screenshot"),
  status: varchar("status", { length: 20 }).default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IssueReport = typeof issueReports.$inferSelect;

// OTA Integrations table - matches actual database
export const otaIntegrations = pgTable("ota_integrations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  otaPlatform: varchar("ota_platform", { length: 50 }).notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrorMessage: text("sync_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type OtaIntegration = typeof otaIntegrations.$inferSelect;

// Contact Enquiries table
export const contactEnquiries = pgTable("contact_enquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContactEnquiry = typeof contactEnquiries.$inferSelect;
export const insertContactEnquirySchema = createInsertSchema(contactEnquiries).omit({
  id: true,
  createdAt: true,
});
export type InsertContactEnquiry = z.infer<typeof insertContactEnquirySchema>;

// Pre-bills table
export const preBills = pgTable("pre_bills", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  preBillAmount: decimal("pre_bill_amount", { precision: 10, scale: 2 }).notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PreBill = typeof preBills.$inferSelect;
export const insertPreBillSchema = createInsertSchema(preBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPreBill = z.infer<typeof insertPreBillSchema>;
