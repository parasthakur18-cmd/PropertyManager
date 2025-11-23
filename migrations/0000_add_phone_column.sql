CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"user_id" varchar NOT NULL,
	"user_role" varchar(20),
	"property_context" integer[],
	"change_set" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"upload_id" varchar(100) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"suggested_category_id" integer,
	"assigned_category_id" integer,
	"is_imported" boolean DEFAULT false NOT NULL,
	"imported_expense_id" integer,
	"match_confidence" varchar(20),
	"raw_data" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"booking_id" integer NOT NULL,
	"guest_id" integer NOT NULL,
	"room_charges" numeric(10, 2) NOT NULL,
	"food_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"extra_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"gst_rate" numeric(5, 2) DEFAULT '18' NOT NULL,
	"gst_amount" numeric(10, 2) NOT NULL,
	"service_charge_rate" numeric(5, 2) DEFAULT '10' NOT NULL,
	"service_charge_amount" numeric(10, 2) NOT NULL,
	"include_gst" boolean DEFAULT true NOT NULL,
	"include_service_charge" boolean DEFAULT true NOT NULL,
	"discount_type" varchar(20),
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"advance_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"payment_method" varchar(50),
	"paid_at" timestamp,
	"due_date" timestamp,
	"pending_reason" text,
	"merged_booking_ids" integer[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bookings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"room_id" integer,
	"room_ids" integer[],
	"is_group_booking" boolean DEFAULT false NOT NULL,
	"beds_booked" integer,
	"guest_id" integer NOT NULL,
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"number_of_guests" integer DEFAULT 1 NOT NULL,
	"special_requests" text,
	"custom_price" numeric(10, 2),
	"advance_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2),
	"source" varchar(50) DEFAULT 'Walk-in' NOT NULL,
	"travel_agent_id" integer,
	"meal_plan" varchar(10) DEFAULT 'EP' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "communications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"enquiry_id" integer,
	"booking_id" integer,
	"recipient_phone" varchar(50) NOT NULL,
	"recipient_name" varchar(255),
	"message_type" varchar(20) DEFAULT 'sms' NOT NULL,
	"template_id" integer,
	"message_content" text NOT NULL,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"twilio_sid" varchar(100),
	"error_message" text,
	"sent_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "enquiries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"guest_name" varchar(255) NOT NULL,
	"guest_phone" varchar(50) NOT NULL,
	"guest_email" varchar(255),
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp NOT NULL,
	"room_id" integer,
	"room_ids" integer[],
	"is_group_enquiry" boolean DEFAULT false NOT NULL,
	"beds_booked" integer,
	"number_of_guests" integer DEFAULT 1 NOT NULL,
	"meal_plan" varchar(10) DEFAULT 'EP' NOT NULL,
	"source" varchar(50) DEFAULT 'Walk-in' NOT NULL,
	"travel_agent_id" integer,
	"price_quoted" numeric(10, 2),
	"advance_amount" numeric(10, 2),
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_payment_link_url" text,
	"twilio_message_sid" varchar(100),
	"special_requests" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expense_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer,
	"name" varchar(100) NOT NULL,
	"description" text,
	"keywords" text[],
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extra_services" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "extra_services_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"booking_id" integer NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"vendor_name" varchar(255),
	"vendor_contact" varchar(100),
	"commission" numeric(10, 2),
	"service_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50) NOT NULL,
	"id_proof_type" varchar(50),
	"id_proof_number" varchar(100),
	"id_proof_image" text,
	"address" text,
	"preferences" text,
	"total_stays" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issue_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "issue_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"reported_by_user_id" varchar NOT NULL,
	"property_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"screenshot" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lease_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lease_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lease_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_method" varchar(50),
	"reference_number" varchar(100),
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer,
	"name" varchar(255) NOT NULL,
	"image_url" text,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_add_ons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_item_add_ons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"menu_item_id" integer NOT NULL,
	"add_on_name" varchar(255) NOT NULL,
	"add_on_price" numeric(10, 2) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_item_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"menu_item_id" integer NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"actual_price" numeric(10, 2) NOT NULL,
	"discounted_price" numeric(10, 2),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer,
	"category_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"food_type" varchar(10) DEFAULT 'veg' NOT NULL,
	"actual_price" numeric(10, 2),
	"discounted_price" numeric(10, 2),
	"price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"has_variants" boolean DEFAULT false NOT NULL,
	"has_add_ons" boolean DEFAULT false NOT NULL,
	"preparation_time" integer,
	"image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "message_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"subject" varchar(255),
	"content" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer,
	"room_id" integer,
	"booking_id" integer,
	"guest_id" integer,
	"items" jsonb NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"order_source" varchar(20) DEFAULT 'staff' NOT NULL,
	"order_type" varchar(20),
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"special_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_otps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_otps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255),
	"phone" varchar(20),
	"channel" varchar(10) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "properties_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_user_id" varchar,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"description" text,
	"total_rooms" integer DEFAULT 0 NOT NULL,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"category_id" integer,
	"category" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"expense_date" timestamp NOT NULL,
	"description" text,
	"vendor_name" varchar(255),
	"payment_method" varchar(50),
	"receipt_number" varchar(100),
	"is_recurring" boolean DEFAULT false NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_leases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_leases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"payment_frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
	"landlord_name" varchar(255),
	"landlord_contact" varchar(100),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"room_number" varchar(50) NOT NULL,
	"room_type" varchar(100),
	"room_category" varchar(50) DEFAULT 'standard' NOT NULL,
	"total_beds" integer,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"price_per_night" numeric(10, 2) NOT NULL,
	"max_occupancy" integer DEFAULT 2 NOT NULL,
	"amenities" text[],
	"assigned_staff_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "salary_advances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar,
	"staff_member_id" integer,
	"salary_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"advance_date" timestamp NOT NULL,
	"reason" text,
	"repayment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"deducted_from_salary_id" integer,
	"approved_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "advance_payee_check" CHECK ((
    (user_id IS NOT NULL AND staff_member_id IS NULL) OR
    (user_id IS NULL AND staff_member_id IS NOT NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "salary_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "salary_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"salary_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_method" varchar(50),
	"reference_number" varchar(100),
	"paid_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"job_title" varchar(100),
	"property_id" integer NOT NULL,
	"joining_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"base_salary" numeric(12, 2),
	"payment_method" varchar(50),
	"bank_details" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_salaries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_salaries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar,
	"staff_member_id" integer,
	"property_id" integer,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"gross_salary" numeric(12, 2) NOT NULL,
	"deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_salary" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "salary_payee_check" CHECK ((
    (user_id IS NOT NULL AND staff_member_id IS NULL) OR
    (user_id IS NULL AND staff_member_id IS NOT NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "travel_agents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "travel_agents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"commission" numeric(5, 2),
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone" varchar(20),
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"business_name" varchar(255),
	"assigned_property_ids" integer[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_suggested_category_id_expense_categories_id_fk" FOREIGN KEY ("suggested_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_assigned_category_id_expense_categories_id_fk" FOREIGN KEY ("assigned_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_imported_expense_id_property_expenses_id_fk" FOREIGN KEY ("imported_expense_id") REFERENCES "public"."property_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_travel_agent_id_travel_agents_id_fk" FOREIGN KEY ("travel_agent_id") REFERENCES "public"."travel_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_travel_agent_id_travel_agents_id_fk" FOREIGN KEY ("travel_agent_id") REFERENCES "public"."travel_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_services" ADD CONSTRAINT "extra_services_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_lease_id_property_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."property_leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_add_ons" ADD CONSTRAINT "menu_item_add_ons_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_leases" ADD CONSTRAINT "property_leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_salary_id_staff_salaries_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_deducted_from_salary_id_staff_salaries_id_fk" FOREIGN KEY ("deducted_from_salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_salary_id_staff_salaries_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_agents" ADD CONSTRAINT "travel_agents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_advance_user" ON "salary_advances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_advance_staff_member" ON "salary_advances" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX "idx_advance_status" ON "salary_advances" USING btree ("repayment_status");--> statement-breakpoint
CREATE INDEX "idx_payment_salary" ON "salary_payments" USING btree ("salary_id");--> statement-breakpoint
CREATE INDEX "idx_payment_date" ON "salary_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_staff_member_property" ON "staff_members" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "idx_staff_member_active" ON "staff_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_salary_user" ON "staff_salaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_salary_staff_member" ON "staff_salaries" USING btree ("staff_member_id");--> statement-breakpoint
CREATE INDEX "idx_salary_period" ON "staff_salaries" USING btree ("period_start","period_end");