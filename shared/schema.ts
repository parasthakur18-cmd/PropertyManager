import { pgTable, serial, varchar, integer, text, timestamp, decimal, boolean, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - matches actual database with multi-tenant support
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
  status: varchar("status", { length: 20 }).notNull().default("active"),
  businessName: varchar("business_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Multi-tenant authentication fields
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default("pending"),
  tenantType: varchar("tenant_type", { length: 30 }).notNull().default("property_owner"),
  primaryPropertyId: integer("primary_property_id"),
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  signupMethod: varchar("signup_method", { length: 20 }).default("google"),
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false),
  // Geographic tracking
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  lastLoginAt: timestamp("last_login_at"),
  // Subscription/billing fields
  subscriptionPlanId: integer("subscription_plan_id"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("trial"), // trial, active, expired, cancelled
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 100 }),
  trialEndsAt: timestamp("trial_ends_at"),
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
  verificationStatus?: string | null;
  tenantType?: string | null;
  primaryPropertyId?: number | null;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  signupMethod?: string | null;
};

// Verification status types for multi-tenant security
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type TenantType = 'super_admin' | 'property_owner' | 'staff';
export type SignupMethod = 'google' | 'email' | 'phone';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';

// OTP Tokens table for mobile login
export const otpTokens = pgTable("otp_tokens", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  otp: varchar("otp", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull().default("login"),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpTokenSchema = createInsertSchema(otpTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertOtpToken = z.infer<typeof insertOtpTokenSchema>;
export type OtpToken = typeof otpTokens.$inferSelect;

// Password Reset OTPs table for forgot password
export const passwordResetOtps = pgTable("password_reset_otps", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  channel: varchar("channel", { length: 20 }).notNull().default("email"),
  otp: varchar("otp", { length: 6 }).notNull(),
  resetToken: varchar("reset_token", { length: 100 }),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetOtpSchema = createInsertSchema(passwordResetOtps).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetOtp = z.infer<typeof insertPasswordResetOtpSchema>;
export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;

// Properties table - matches actual database
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  totalRooms: integer("total_rooms"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
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
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  bankDetails: text("bank_details"),
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
  // Cancellation fields
  cancellationDate: timestamp("cancellation_date"),
  cancellationType: varchar("cancellation_type", { length: 20 }), // 'full_refund', 'partial_refund', 'no_refund'
  cancellationCharges: decimal("cancellation_charges", { precision: 10, scale: 2 }).default("0"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default("0"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by", { length: 255 }),
  // Actual check-in time (when guest actually checked in, vs scheduled checkInDate)
  actualCheckInTime: timestamp("actual_check_in_time"),
  // Razorpay Payment Link fields for advance payment
  paymentLinkId: varchar("payment_link_id", { length: 100 }),
  paymentLinkUrl: text("payment_link_url"),
  paymentLinkExpiry: timestamp("payment_link_expiry"),
  advancePaymentStatus: varchar("advance_payment_status", { length: 20 }).default("not_required"),
  // Payment reminder tracking
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  // External booking integration (Beds24, etc.)
  externalBookingId: varchar("external_booking_id", { length: 100 }),
  externalSource: varchar("external_source", { length: 50 }),
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
  variantName: varchar("variant_name", { length: 255 }).notNull(),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  displayOrder: integer("display_order").default(0),
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
  addOnName: varchar("add_on_name", { length: 255 }).notNull(),
  addOnPrice: decimal("add_on_price", { precision: 10, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0),
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

// Orders table - matches actual database
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id"),
  roomId: integer("room_id"),
  bookingId: integer("booking_id"),
  guestId: integer("guest_id"),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  orderSource: varchar("order_source", { length: 50 }).notNull(),
  orderType: varchar("order_type", { length: 50 }),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
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
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorContact: varchar("vendor_contact", { length: 20 }),
  commission: decimal("commission", { precision: 10, scale: 2 }),
  serviceDate: timestamp("service_date").notNull(),
});

export const insertExtraServiceSchema = createInsertSchema(extraServices).omit({
  id: true,
  createdAt: true,
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
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  serviceChargeRate: decimal("service_charge_rate", { precision: 5, scale: 2 }).default("0"),
  serviceChargeAmount: decimal("service_charge_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  mergedBookingIds: integer("merged_booking_ids").array(),
  advancePaid: decimal("advance_paid", { precision: 10, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).default("0"),
  discountType: varchar("discount_type", { length: 50 }),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  gstOnRooms: boolean("gst_on_rooms").default(true),
  gstOnFood: boolean("gst_on_food").default(false),
  includeServiceCharge: boolean("include_service_charge").default(false),
  dueDate: timestamp("due_date"),
  pendingReason: text("pending_reason"),
  paymentMethods: jsonb("payment_methods"),
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
  guestPhone: varchar("guest_phone", { length: 20 }).notNull(),
  guestEmail: varchar("guest_email", { length: 255 }),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  roomId: integer("room_id"),
  numberOfGuests: integer("number_of_guests").notNull(),
  priceQuoted: decimal("price_quoted", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripePaymentLinkUrl: text("stripe_payment_link_url"),
  twilioMessageSid: varchar("twilio_message_sid", { length: 255 }),
  specialRequests: text("special_requests"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  roomIds: integer("room_ids").array(),
  isGroupEnquiry: boolean("is_group_enquiry").default(false),
  mealPlan: varchar("meal_plan", { length: 50 }),
  bedsBooked: integer("beds_booked"),
  source: varchar("source", { length: 50 }),
  travelAgentId: integer("travel_agent_id").references(() => travelAgents.id),
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
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  paymentFrequency: varchar("payment_frequency", { length: 50 }),
  landlordName: varchar("landlord_name", { length: 255 }),
  landlordContact: varchar("landlord_contact", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  // New fields for carry-forward and yearly increment system
  leaseDurationYears: integer("lease_duration_years"),
  baseYearlyAmount: decimal("base_yearly_amount", { precision: 10, scale: 2 }),
  yearlyIncrementType: varchar("yearly_increment_type", { length: 20 }), // 'percentage' or 'fixed'
  yearlyIncrementValue: decimal("yearly_increment_value", { precision: 10, scale: 2 }),
  currentYearAmount: decimal("current_year_amount", { precision: 10, scale: 2 }),
  isOverridden: boolean("is_overridden").default(false),
  carryForwardAmount: decimal("carry_forward_amount", { precision: 10, scale: 2 }).default("0"),
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

// Lease History table - tracks all edits and changes to lease terms
export const leaseHistory = pgTable("lease_history", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  changeType: varchar("change_type", { length: 50 }).notNull(), // 'create', 'update', 'override', 'payment'
  fieldChanged: varchar("field_changed", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by", { length: 255 }),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LeaseHistory = typeof leaseHistory.$inferSelect;
export const insertLeaseHistorySchema = createInsertSchema(leaseHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertLeaseHistory = z.infer<typeof insertLeaseHistorySchema>;

// Lease Year Overrides table - custom amounts for specific lease years
export const leaseYearOverrides = pgTable("lease_year_overrides", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  yearNumber: integer("year_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LeaseYearOverride = typeof leaseYearOverrides.$inferSelect;
export const insertLeaseYearOverrideSchema = createInsertSchema(leaseYearOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeaseYearOverride = z.infer<typeof insertLeaseYearOverrideSchema>;

// Lease Payments table - matches actual database
export const leasePayments = pgTable("lease_payments", {
  id: serial("id").primaryKey(),
  leaseId: integer("lease_id").notNull().references(() => propertyLeases.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdBy: varchar("created_by", { length: 255 }),
  appliesToMonth: integer("applies_to_month"),
  appliesToYear: integer("applies_to_year"),
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
  category: varchar("category", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  description: text("description"),
  vendorName: varchar("vendor_name", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdBy: varchar("created_by", { length: 255 }),
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
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  keywords: text("keywords"), // Comma-separated keywords
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  leavingDate: timestamp("leaving_date"),
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
  advanceType: varchar("advance_type", { length: 20 }).default("regular"), // 'regular' or 'extra'
  paymentMode: varchar("payment_mode", { length: 20 }).default("cash"), // 'cash' or 'upi'
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
  salaryId: integer("salary_id").references(() => staffSalaries.id, { onDelete: 'cascade' }),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  paidBy: varchar("paid_by"),
  recordedBy: varchar("recorded_by"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SalaryPayment = typeof salaryPayments.$inferSelect;
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({
  id: true,
  createdAt: true,
});
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;

// Vendors table - for tracking vendor credits and payments
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  category: varchar("category", { length: 100 }), // grocery, supplies, maintenance, etc.
  gstNumber: varchar("gst_number", { length: 50 }),
  bankDetails: text("bank_details"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;

// Vendor Transactions table - for tracking credit purchases and payments
export const vendorTransactions = pgTable("vendor_transactions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'credit' for purchases, 'payment' for payments made
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, bank_transfer, upi, cheque
  referenceNumber: varchar("reference_number", { length: 100 }),
  expenseCategoryId: integer("expense_category_id").references(() => expenseCategories.id),
  createdBy: varchar("created_by", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type VendorTransaction = typeof vendorTransactions.$inferSelect;
export const insertVendorTransactionSchema = createInsertSchema(vendorTransactions).omit({
  id: true,
  createdAt: true,
});
export type InsertVendorTransaction = z.infer<typeof insertVendorTransactionSchema>;

// Attendance Records table - matches actual database
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id, { onDelete: 'cascade' }),
  attendanceDate: date("attendance_date").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  remarks: text("remarks"),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

// Feature Settings table
export const featureSettings = pgTable("feature_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  foodOrderNotifications: boolean("food_order_notifications").notNull().default(true),
  whatsappNotifications: boolean("whatsapp_notifications").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  paymentReminders: boolean("payment_reminders").notNull().default(true),
  autoCheckout: boolean("auto_checkout").notNull().default(true),
  autoSalaryCalculation: boolean("auto_salary_calculation").notNull().default(true),
  attendanceTracking: boolean("attendance_tracking").notNull().default(true),
  performanceAnalytics: boolean("performance_analytics").notNull().default(true),
  expenseForecasting: boolean("expense_forecasting").notNull().default(true),
  budgetAlerts: boolean("budget_alerts").notNull().default(true),
  // Advance Payment Settings
  advancePaymentEnabled: boolean("advance_payment_enabled").notNull().default(true),
  advancePaymentPercentage: decimal("advance_payment_percentage", { precision: 5, scale: 2 }).default("30"),
  advancePaymentExpiryHours: integer("advance_payment_expiry_hours").default(24),
  // Payment Reminder Settings
  paymentReminderEnabled: boolean("payment_reminder_enabled").notNull().default(true),
  paymentReminderHours: integer("payment_reminder_hours").default(6),
  maxPaymentReminders: integer("max_payment_reminders").default(3),
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

// Food Order WhatsApp Notification Settings table
export const foodOrderWhatsappSettings = pgTable("food_order_whatsapp_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").notNull().default(true),
  phoneNumbers: text("phone_numbers").array(), // Array of phone numbers to notify
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFoodOrderWhatsappSettingsSchema = createInsertSchema(foodOrderWhatsappSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FoodOrderWhatsappSettings = typeof foodOrderWhatsappSettings.$inferSelect;
export type InsertFoodOrderWhatsappSettings = z.infer<typeof insertFoodOrderWhatsappSettingsSchema>;

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
  otaName: varchar("ota_name", { length: 50 }).notNull(),
  propertyIdExternal: varchar("property_id_external", { length: 255 }),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  credentials: text("credentials"),
  enabled: boolean("enabled").notNull().default(true),
  syncStatus: varchar("sync_status", { length: 50 }),
  lastSyncAt: timestamp("last_sync_at"),
  syncErrorMessage: text("sync_error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type OtaIntegration = typeof otaIntegrations.$inferSelect;

// Beds24 Room Mappings table - maps Beds24 room IDs to Hostezee room types
export const beds24RoomMappings = pgTable("beds24_room_mappings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  beds24RoomId: varchar("beds24_room_id", { length: 50 }).notNull(),
  beds24RoomName: varchar("beds24_room_name", { length: 255 }),
  roomType: varchar("room_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBeds24RoomMappingSchema = createInsertSchema(beds24RoomMappings).omit({
  id: true,
  createdAt: true,
});

export type Beds24RoomMapping = typeof beds24RoomMappings.$inferSelect;
export type InsertBeds24RoomMapping = z.infer<typeof insertBeds24RoomMappingSchema>;

// Notifications table - matches actual database
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  soundType: varchar("sound_type", { length: 50 }),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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
  token: varchar("token", { length: 64 }).notNull().unique(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }),
  roomNumber: varchar("room_number", { length: 50 }),
  roomCharges: decimal("room_charges", { precision: 10, scale: 2 }).default("0"),
  foodCharges: decimal("food_charges", { precision: 10, scale: 2 }).default("0"),
  extraCharges: decimal("extra_charges", { precision: 10, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  advancePayment: decimal("advance_payment", { precision: 10, scale: 2 }).default("0"),
  foodItems: jsonb("food_items"),
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 20 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  propertyId: integer("property_id").references(() => properties.id),
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  nights: integer("nights").default(1),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  sentAt: timestamp("sent_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PreBill = typeof preBills.$inferSelect;
export const insertPreBillSchema = createInsertSchema(preBills).omit({
  id: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPreBill = z.infer<typeof insertPreBillSchema>;

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }),
  propertyContext: varchar("property_context", { length: 255 }).array(),
  changeSet: jsonb("change_set"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Change Approvals table - for change request approvals
export const changeApprovals = pgTable("change_approvals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: 'cascade' }),
  description: text("description"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChangeApproval = typeof changeApprovals.$inferSelect;
export const insertChangeApprovalSchema = createInsertSchema(changeApprovals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});
export type InsertChangeApproval = z.infer<typeof insertChangeApprovalSchema>;

// Employee Performance Metrics table
export const employeePerformanceMetrics = pgTable("employee_performance_metrics", {
  id: serial("id").primaryKey(),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalTasksAssigned: integer("total_tasks_assigned").notNull().default(0),
  tasksCompletedOnTime: integer("tasks_completed_on_time").notNull().default(0),
  tasksCompletedLate: integer("tasks_completed_late").notNull().default(0),
  averageCompletionTimeMinutes: integer("average_completion_time_minutes").notNull().default(0),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmployeePerformanceMetric = typeof employeePerformanceMetrics.$inferSelect;
export const insertEmployeePerformanceMetricSchema = createInsertSchema(employeePerformanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmployeePerformanceMetric = z.infer<typeof insertEmployeePerformanceMetricSchema>;

// Task Notification Logs table
export const taskNotificationLogs = pgTable("task_notification_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: varchar("task_type", { length: 100 }).notNull(),
  taskCount: integer("task_count").notNull().default(0),
  reminderCount: integer("reminder_count").notNull().default(0),
  completionTime: integer("completion_time").default(0),
  lastRemindedAt: timestamp("last_reminded_at"),
  allTasksCompletedAt: timestamp("all_tasks_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TaskNotificationLog = typeof taskNotificationLogs.$inferSelect;
export const insertTaskNotificationLogSchema = createInsertSchema(taskNotificationLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTaskNotificationLog = z.infer<typeof insertTaskNotificationLogSchema>;

// WhatsApp Template Settings table - per property configuration
export const whatsappTemplateSettings = pgTable("whatsapp_template_settings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sendTiming: varchar("send_timing", { length: 20 }).notNull().default("immediate"),
  delayHours: integer("delay_hours").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WhatsappTemplateSetting = typeof whatsappTemplateSettings.$inferSelect;
export const insertWhatsappTemplateSettingSchema = createInsertSchema(whatsappTemplateSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWhatsappTemplateSetting = z.infer<typeof insertWhatsappTemplateSettingSchema>;

// WhatsApp template types
export type WhatsappTemplateType = 
  | 'pending_payment'
  | 'payment_confirmation'
  | 'checkin_message'
  | 'addon_service'
  | 'checkout_message';

// ===== SUBSCRIPTION & BILLING SYSTEM =====

// Subscription Plans table - defines available tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }),
  maxProperties: integer("max_properties").notNull().default(1),
  maxRooms: integer("max_rooms").notNull().default(10),
  maxStaff: integer("max_staff").default(2),
  features: jsonb("features").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

// User Subscriptions table - tracks which plan each user has
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 100 }),
  lastPaymentAt: timestamp("last_payment_at"),
  nextBillingAt: timestamp("next_billing_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// Subscription Payments table - payment history
export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => userSubscriptions.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  invoiceUrl: text("invoice_url"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).omit({
  id: true,
  createdAt: true,
});

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

// Billing cycle type (SubscriptionStatus already defined above)
export type BillingCycle = 'monthly' | 'yearly';

// ===== ACTIVITY LOGS & AUDIT TRAIL =====

// Activity Logs table - tracks all user actions
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  userEmail: varchar("user_email", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 100 }),
  resourceName: varchar("resource_name", { length: 255 }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: 'set null' }),
  propertyName: varchar("property_name", { length: 255 }),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Activity log categories
export type ActivityCategory = 
  | 'auth'           // login, logout, password change
  | 'booking'        // create, update, cancel bookings
  | 'guest'          // guest management
  | 'payment'        // payments, refunds
  | 'property'       // property settings changes
  | 'room'           // room management
  | 'staff'          // staff management
  | 'order'          // food orders
  | 'expense'        // expenses, vendors
  | 'settings'       // feature settings, WhatsApp settings
  | 'admin';         // super admin actions

// ===== SESSION MANAGEMENT =====

// User Sessions table - tracks active user sessions
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  deviceInfo: varchar("device_info", { length: 255 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  location: varchar("location", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

// Express-session table (created by connect-pg-simple)
// This table is managed by express-session middleware, not by Drizzle
// We include it here to prevent Drizzle from trying to delete it
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

// ===== TASK MANAGER =====

// Tasks table - property-level task management
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id, { onDelete: 'set null' }),
  assignedUserName: varchar("assigned_user_name", { length: 255 }),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'), // low, medium, high
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, overdue
  dueDate: date("due_date").notNull(),
  dueTime: varchar("due_time", { length: 10 }), // HH:mm format
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  reminderType: varchar("reminder_type", { length: 20 }).default('daily'), // one_time, daily
  reminderTime: varchar("reminder_time", { length: 10 }).default('10:00'), // HH:mm format
  reminderRecipients: text("reminder_recipients").array(), // Array of phone numbers
  lastReminderSent: timestamp("last_reminder_sent"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastReminderSent: true,
  completedAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Task priority and status types
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

// Task reminder logs - tracks sent reminders
export const taskReminderLogs = pgTable("task_reminder_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  recipientPhone: varchar("recipient_phone", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // sent, failed, pending
  sentAt: timestamp("sent_at").defaultNow(),
  errorMessage: text("error_message"),
});

export const insertTaskReminderLogSchema = createInsertSchema(taskReminderLogs).omit({
  id: true,
  sentAt: true,
});

export type TaskReminderLog = typeof taskReminderLogs.$inferSelect;
export type InsertTaskReminderLog = z.infer<typeof insertTaskReminderLogSchema>;

// ===== USER PERMISSIONS =====

// User permissions table - granular permission control per user
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Module permissions - each is view/edit/none
  bookings: varchar("bookings", { length: 20 }).notNull().default('none'), // none, view, edit
  calendar: varchar("calendar", { length: 20 }).notNull().default('none'),
  rooms: varchar("rooms", { length: 20 }).notNull().default('none'),
  guests: varchar("guests", { length: 20 }).notNull().default('none'),
  foodOrders: varchar("food_orders", { length: 20 }).notNull().default('none'),
  menuManagement: varchar("menu_management", { length: 20 }).notNull().default('none'),
  payments: varchar("payments", { length: 20 }).notNull().default('none'),
  reports: varchar("reports", { length: 20 }).notNull().default('none'),
  settings: varchar("settings", { length: 20 }).notNull().default('none'),
  tasks: varchar("tasks", { length: 20 }).notNull().default('none'),
  staff: varchar("staff", { length: 20 }).notNull().default('none'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPermissionsSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPermissions = typeof userPermissions.$inferSelect;
export type InsertUserPermissions = z.infer<typeof insertUserPermissionsSchema>;

// Permission level types
export type PermissionLevel = 'none' | 'view' | 'edit';

// ===== STAFF INVITATIONS =====

// Staff invitations table - for inviting staff to join a property
export const staffInvitations = pgTable("staff_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 50 }).notNull().default('staff'), // staff, manager, kitchen
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteToken: varchar("invite_token", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, accepted, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffInvitationSchema = createInsertSchema(staffInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type StaffInvitation = typeof staffInvitations.$inferSelect;
export type InsertStaffInvitation = z.infer<typeof insertStaffInvitationSchema>;

// ===== MULTI-WALLET / ACCOUNT SYSTEM =====

// Wallet types for categorization
export type WalletType = 'cash' | 'bank' | 'upi' | 'ota_settlement' | 'other';

// Wallets/Accounts table - multiple accounts per property
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(), // "Cash Counter", "HDFC Salary Account", "GPay", etc.
  type: varchar("type", { length: 30 }).notNull(), // cash, bank, upi, ota_settlement, other
  bankName: varchar("bank_name", { length: 100 }), // For bank accounts: HDFC, SBI, ICICI
  accountNumber: varchar("account_number", { length: 50 }), // Last 4 digits for display
  ifscCode: varchar("ifsc_code", { length: 20 }),
  upiId: varchar("upi_id", { length: 100 }), // For UPI wallets
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  isDefault: boolean("is_default").default(false), // Default wallet for this type
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

// Transaction types for wallet movements
export type TransactionType = 'credit' | 'debit';
export type TransactionSource = 
  | 'booking_payment' 
  | 'food_order_payment' 
  | 'addon_payment'
  | 'expense' 
  | 'vendor_payment' 
  | 'salary_payment' 
  | 'salary_advance'
  | 'lease_payment'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'opening_balance'
  | 'day_closing_carry_forward';

// Wallet Transactions - detailed log of all money movements
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // credit, debit
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(), // booking_payment, expense, vendor_payment, etc.
  sourceId: integer("source_id"), // Reference to booking/order/expense/vendor_transaction ID
  description: text("description"),
  referenceNumber: varchar("reference_number", { length: 100 }), // UTR, cheque no, receipt no
  transactionDate: date("transaction_date").notNull(),
  dayClosingId: integer("day_closing_id"), // Links to daily closing if locked
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

// Daily Closing - locks day's transactions and stores final balances
export const dailyClosings = pgTable("daily_closings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: 'cascade' }),
  closingDate: date("closing_date").notNull(),
  
  // Summary amounts
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCollected: decimal("total_collected", { precision: 12, scale: 2 }).notNull().default("0"),
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPendingReceivable: decimal("total_pending_receivable", { precision: 12, scale: 2 }).notNull().default("0"),
  
  // Wallet-wise closing balances (JSON array)
  walletBalances: jsonb("wallet_balances").notNull().default([]), // [{walletId, name, type, openingBalance, closingBalance}]
  
  // Breakdowns
  revenueBreakdown: jsonb("revenue_breakdown").default({}), // {room: X, food: Y, addons: Z}
  collectionBreakdown: jsonb("collection_breakdown").default({}), // {cash: X, upi: Y, bank: Z}
  expenseBreakdown: jsonb("expense_breakdown").default({}), // {salary: X, vendor: Y, maintenance: Z}
  
  // Transaction counts
  bookingsCount: integer("bookings_count").default(0),
  checkInsCount: integer("check_ins_count").default(0),
  checkOutsCount: integer("check_outs_count").default(0),
  foodOrdersCount: integer("food_orders_count").default(0),
  expenseEntriesCount: integer("expense_entries_count").default(0),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, closed
  closedBy: varchar("closed_by").references(() => users.id),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDailyClosingSchema = createInsertSchema(dailyClosings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export type DailyClosing = typeof dailyClosings.$inferSelect;
export type InsertDailyClosing = z.infer<typeof insertDailyClosingSchema>;

export const errorReports = pgTable("error_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  propertyId: integer("property_id"),
  page: varchar("page", { length: 255 }),
  errorMessage: text("error_message"),
  errorDetails: text("error_details"),
  userDescription: text("user_description"),
  browserInfo: text("browser_info"),
  imageUrl: text("image_url"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  resolvedAt: timestamp("resolved_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertErrorReportSchema = createInsertSchema(errorReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type ErrorReport = typeof errorReports.$inferSelect;
export type InsertErrorReport = z.infer<typeof insertErrorReportSchema>;
