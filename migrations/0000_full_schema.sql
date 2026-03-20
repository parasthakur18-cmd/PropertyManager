CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"user_email" varchar(255),
	"user_name" varchar(255),
	"action" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" varchar(100),
	"resource_name" varchar(255),
	"property_id" integer,
	"property_name" varchar(255),
	"details" jsonb,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"hotel_code" varchar(100) NOT NULL,
	"pms_name" varchar(100) DEFAULT 'hostezee' NOT NULL,
	"pms_password" varchar(255),
	"api_base_url" varchar(500) DEFAULT 'https://live.aiosell.com' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sandbox" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"webhook_secret" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_inventory_restrictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"room_mapping_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"stop_sell" boolean DEFAULT false NOT NULL,
	"minimum_stay" integer DEFAULT 1,
	"close_on_arrival" boolean DEFAULT false NOT NULL,
	"close_on_departure" boolean DEFAULT false NOT NULL,
	"is_pushed" boolean DEFAULT false NOT NULL,
	"pushed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_rate_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"room_mapping_id" integer NOT NULL,
	"rate_plan_name" varchar(100) NOT NULL,
	"rate_plan_code" varchar(100) NOT NULL,
	"base_rate" numeric(10, 2),
	"occupancy" varchar(20) DEFAULT 'single',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_rate_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"room_mapping_id" integer NOT NULL,
	"rate_plan_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"is_pushed" boolean DEFAULT false NOT NULL,
	"pushed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_room_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"hostezee_room_id" integer NOT NULL,
	"hostezee_room_type" varchar(100) NOT NULL,
	"aiosell_room_code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aiosell_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"direction" varchar(20) DEFAULT 'outbound' NOT NULL,
	"status" varchar(20) NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"remarks" text,
	"property_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"user_role" varchar(50),
	"property_context" varchar(255)[],
	"change_set" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"transaction_type" varchar(50),
	"amount" numeric(10, 2),
	"description" text,
	"transaction_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "beds24_room_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"beds24_room_id" varchar(50) NOT NULL,
	"beds24_room_name" varchar(255),
	"room_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"guest_id" integer,
	"room_charges" numeric(10, 2) DEFAULT '0',
	"food_charges" numeric(10, 2) DEFAULT '0',
	"extra_charges" numeric(10, 2) DEFAULT '0',
	"subtotal" numeric(10, 2) DEFAULT '0',
	"gst_rate" numeric(5, 2) DEFAULT '0',
	"gst_amount" numeric(10, 2) DEFAULT '0',
	"service_charge_rate" numeric(5, 2) DEFAULT '0',
	"service_charge_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50),
	"paid_at" timestamp,
	"merged_booking_ids" integer[],
	"advance_paid" numeric(10, 2) DEFAULT '0',
	"balance_amount" numeric(10, 2) DEFAULT '0',
	"discount_type" varchar(50),
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"gst_on_rooms" boolean DEFAULT true,
	"gst_on_food" boolean DEFAULT false,
	"include_service_charge" boolean DEFAULT false,
	"due_date" timestamp,
	"pending_reason" text,
	"payment_methods" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"guest_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"id_proof_type" varchar(50),
	"id_proof_number" varchar(100),
	"id_proof_front" text,
	"id_proof_back" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"room_id" integer,
	"guest_id" integer,
	"check_in_date" date NOT NULL,
	"check_out_date" date NOT NULL,
	"number_of_guests" integer,
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"total_amount" numeric(10, 2),
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"custom_price" numeric(10, 2),
	"advance_amount" numeric(10, 2) DEFAULT '0',
	"source" varchar(50) DEFAULT 'direct',
	"meal_plan" varchar(50) DEFAULT 'none',
	"room_ids" integer[],
	"is_group_booking" boolean DEFAULT false,
	"beds_booked" integer,
	"travel_agent_id" integer,
	"cancellation_date" timestamp,
	"cancellation_type" varchar(20),
	"cancellation_charges" numeric(10, 2) DEFAULT '0',
	"refund_amount" numeric(10, 2) DEFAULT '0',
	"cancellation_reason" text,
	"cancelled_by" varchar(255),
	"no_show_date" timestamp,
	"no_show_charges" numeric(10, 2) DEFAULT '0',
	"no_show_notes" text,
	"actual_check_in_time" timestamp,
	"payment_link_id" varchar(100),
	"payment_link_url" text,
	"payment_link_expiry" timestamp,
	"advance_payment_status" varchar(20) DEFAULT 'not_required',
	"advance_payment_method" varchar(20) DEFAULT 'cash',
	"reminder_count" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"external_booking_id" varchar(100),
	"external_source" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "change_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"booking_id" integer,
	"room_id" integer,
	"description" text,
	"old_value" text,
	"new_value" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"recipient_id" integer,
	"subject" varchar(255),
	"message" text,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'new',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_closings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"closing_date" date NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_collected" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_expenses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_pending_receivable" numeric(12, 2) DEFAULT '0' NOT NULL,
	"wallet_balances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revenue_breakdown" jsonb DEFAULT '{}'::jsonb,
	"collection_breakdown" jsonb DEFAULT '{}'::jsonb,
	"expense_breakdown" jsonb DEFAULT '{}'::jsonb,
	"bookings_count" integer DEFAULT 0,
	"check_ins_count" integer DEFAULT 0,
	"check_outs_count" integer DEFAULT 0,
	"food_orders_count" integer DEFAULT 0,
	"expense_entries_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"closed_by" varchar,
	"closed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" varchar NOT NULL,
	"total_tasks_assigned" integer DEFAULT 0 NOT NULL,
	"tasks_completed_on_time" integer DEFAULT 0 NOT NULL,
	"tasks_completed_late" integer DEFAULT 0 NOT NULL,
	"average_completion_time_minutes" integer DEFAULT 0 NOT NULL,
	"performance_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"guest_name" varchar(255) NOT NULL,
	"guest_phone" varchar(20) NOT NULL,
	"guest_email" varchar(255),
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp NOT NULL,
	"room_id" integer,
	"number_of_guests" integer NOT NULL,
	"price_quoted" numeric(10, 2),
	"advance_amount" numeric(10, 2),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_payment_link_url" text,
	"twilio_message_sid" varchar(255),
	"special_requests" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"room_ids" integer[],
	"is_group_enquiry" boolean DEFAULT false,
	"meal_plan" varchar(50),
	"beds_booked" integer,
	"source" varchar(50),
	"travel_agent_id" integer
);
--> statement-breakpoint
CREATE TABLE "error_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"user_name" varchar(255),
	"user_email" varchar(255),
	"property_id" integer,
	"page" varchar(255),
	"error_message" text,
	"error_details" text,
	"user_description" text,
	"browser_info" text,
	"image_url" text,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"admin_notes" text,
	"admin_reply" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"property_id" integer,
	"keywords" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extra_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"property_id" integer,
	"service_name" varchar(255) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"service_type" varchar(50) NOT NULL,
	"vendor_name" varchar(255),
	"vendor_contact" varchar(20),
	"commission" numeric(10, 2),
	"service_date" timestamp NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"payment_method" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "feature_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"food_order_notifications" boolean DEFAULT true NOT NULL,
	"whatsapp_notifications" boolean DEFAULT true NOT NULL,
	"email_notifications" boolean DEFAULT false NOT NULL,
	"payment_reminders" boolean DEFAULT true NOT NULL,
	"auto_checkout" boolean DEFAULT true NOT NULL,
	"auto_salary_calculation" boolean DEFAULT true NOT NULL,
	"attendance_tracking" boolean DEFAULT true NOT NULL,
	"performance_analytics" boolean DEFAULT true NOT NULL,
	"expense_forecasting" boolean DEFAULT true NOT NULL,
	"budget_alerts" boolean DEFAULT true NOT NULL,
	"advance_payment_enabled" boolean DEFAULT true NOT NULL,
	"advance_payment_percentage" numeric(5, 2) DEFAULT '30',
	"advance_payment_expiry_hours" integer DEFAULT 24,
	"payment_reminder_enabled" boolean DEFAULT true NOT NULL,
	"payment_reminder_hours" integer DEFAULT 6,
	"max_payment_reminders" integer DEFAULT 3,
	"vendor_reminder_enabled" boolean DEFAULT true,
	"vendor_reminder_days_before" integer DEFAULT 2,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "food_order_whatsapp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"phone_numbers" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20) NOT NULL,
	"id_proof_type" varchar(50),
	"id_proof_number" varchar(100),
	"address" text,
	"preferences" text,
	"total_stays" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"id_proof_image" text
);
--> statement-breakpoint
CREATE TABLE "issue_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reported_by_user_id" varchar,
	"property_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50),
	"severity" varchar(20),
	"screenshot" text,
	"status" varchar(20) DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lease_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"lease_id" integer NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"field_changed" varchar(100),
	"old_value" text,
	"new_value" text,
	"changed_by" varchar(255),
	"change_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lease_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lease_id" integer NOT NULL,
	"amount" numeric(10, 2),
	"payment_date" timestamp,
	"payment_method" varchar(50),
	"reference_number" varchar(100),
	"notes" text,
	"created_by" varchar(255),
	"applies_to_month" integer,
	"applies_to_year" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lease_year_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"lease_id" integer NOT NULL,
	"year_number" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"name" varchar(255) NOT NULL,
	"image_url" text,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_add_ons" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"add_on_name" varchar(255) NOT NULL,
	"add_on_price" numeric(10, 2) NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"variant_name" varchar(255) NOT NULL,
	"actual_price" numeric(10, 2),
	"discounted_price" numeric(10, 2),
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(255),
	"price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"preparation_time" integer,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"category_id" integer,
	"food_type" varchar(50),
	"actual_price" numeric(10, 2),
	"discounted_price" numeric(10, 2),
	"has_variants" boolean DEFAULT false,
	"has_add_ons" boolean DEFAULT false,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"template_type" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"sound_type" varchar(50),
	"related_id" integer,
	"related_type" varchar(50),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"room_id" integer,
	"booking_id" integer,
	"guest_id" integer,
	"items" jsonb NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"special_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"order_source" varchar(50) NOT NULL,
	"order_type" varchar(50),
	"customer_name" varchar(255),
	"customer_phone" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "ota_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"ota_name" varchar(50) NOT NULL,
	"property_id_external" varchar(255),
	"api_key" text,
	"api_secret" text,
	"credentials" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sync_status" varchar(50),
	"last_sync_at" timestamp,
	"sync_error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"otp" varchar(6) NOT NULL,
	"purpose" varchar(20) DEFAULT 'login' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"otp" varchar(6) NOT NULL,
	"reset_token" varchar(100),
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"balance_due" numeric(10, 2),
	"room_number" varchar(50),
	"room_charges" numeric(10, 2) DEFAULT '0',
	"food_charges" numeric(10, 2) DEFAULT '0',
	"extra_charges" numeric(10, 2) DEFAULT '0',
	"gst_amount" numeric(10, 2) DEFAULT '0',
	"discount" numeric(10, 2) DEFAULT '0',
	"advance_payment" numeric(10, 2) DEFAULT '0',
	"food_items" jsonb,
	"guest_name" varchar(255),
	"guest_phone" varchar(20),
	"guest_email" varchar(255),
	"property_id" integer,
	"check_in_date" date,
	"check_out_date" date,
	"nights" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pre_bills_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"description" text,
	"total_rooms" integer,
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"monthly_rent" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"disable_type" varchar(50),
	"disable_reason" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"owner_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "property_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"category_id" integer,
	"category" varchar(100),
	"amount" numeric(10, 2) NOT NULL,
	"expense_date" timestamp NOT NULL,
	"description" text,
	"vendor_name" varchar(255),
	"vendor_id" integer,
	"payment_method" varchar(50),
	"receipt_number" varchar(100),
	"is_recurring" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_leases" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"total_amount" numeric(10, 2),
	"start_date" timestamp,
	"end_date" timestamp,
	"payment_frequency" varchar(50),
	"landlord_name" varchar(255),
	"landlord_contact" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true,
	"lease_duration_years" integer,
	"base_yearly_amount" numeric(10, 2),
	"yearly_increment_type" varchar(20),
	"yearly_increment_value" numeric(10, 2),
	"current_year_amount" numeric(10, 2),
	"is_overridden" boolean DEFAULT false,
	"carry_forward_amount" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"room_number" varchar(50) NOT NULL,
	"room_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"price_per_night" numeric(10, 2) NOT NULL,
	"max_occupancy" integer NOT NULL,
	"amenities" text[],
	"assigned_staff_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"room_category" varchar(50),
	"total_beds" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "salary_advances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"salary_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"advance_date" timestamp,
	"reason" text,
	"repayment_status" varchar(20),
	"deducted_from_salary_id" integer,
	"approved_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"staff_member_id" integer,
	"advance_type" varchar(20) DEFAULT 'regular',
	"payment_mode" varchar(20) DEFAULT 'cash'
);
--> statement-breakpoint
CREATE TABLE "salary_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_id" integer,
	"staff_member_id" integer,
	"property_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"payment_date" timestamp,
	"payment_method" varchar(50),
	"reference_number" varchar(100),
	"paid_by" varchar,
	"recorded_by" varchar,
	"period_start" timestamp,
	"period_end" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"property_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"invited_by" varchar NOT NULL,
	"invite_token" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"role" varchar(50),
	"property_id" integer,
	"joining_date" timestamp,
	"leaving_date" timestamp,
	"is_active" boolean DEFAULT true,
	"exit_type" varchar(20),
	"exit_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"job_title" varchar(100),
	"base_salary" numeric(10, 2),
	"payment_method" varchar(50),
	"bank_details" text
);
--> statement-breakpoint
CREATE TABLE "staff_salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"property_id" integer,
	"period_start" timestamp,
	"period_end" timestamp,
	"gross_salary" numeric(10, 2),
	"deductions" numeric(10, 2) DEFAULT '0',
	"net_salary" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"staff_member_id" integer
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"razorpay_payment_id" varchar(100),
	"razorpay_order_id" varchar(100),
	"invoice_number" varchar(50),
	"invoice_url" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"monthly_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"yearly_price" numeric(10, 2),
	"max_properties" integer DEFAULT 1 NOT NULL,
	"max_rooms" integer DEFAULT 10 NOT NULL,
	"max_staff" integer DEFAULT 2,
	"features" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"task_type" varchar(100) NOT NULL,
	"task_count" integer DEFAULT 0 NOT NULL,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"completion_time" integer DEFAULT 0,
	"last_reminded_at" timestamp,
	"all_tasks_completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_reminder_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"recipient_phone" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assigned_user_id" varchar,
	"assigned_user_name" varchar(255),
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" date NOT NULL,
	"due_time" varchar(10),
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"reminder_type" varchar(20) DEFAULT 'daily',
	"reminder_time" varchar(10) DEFAULT '10:00',
	"reminder_recipients" text[],
	"last_reminder_sent" timestamp,
	"completed_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "travel_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(20),
	"email" varchar(255),
	"commission" numeric(5, 2),
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"bank_details" text
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"bookings" varchar(20) DEFAULT 'none' NOT NULL,
	"calendar" varchar(20) DEFAULT 'none' NOT NULL,
	"rooms" varchar(20) DEFAULT 'none' NOT NULL,
	"guests" varchar(20) DEFAULT 'none' NOT NULL,
	"food_orders" varchar(20) DEFAULT 'none' NOT NULL,
	"menu_management" varchar(20) DEFAULT 'none' NOT NULL,
	"payments" varchar(20) DEFAULT 'none' NOT NULL,
	"reports" varchar(20) DEFAULT 'none' NOT NULL,
	"settings" varchar(20) DEFAULT 'none' NOT NULL,
	"tasks" varchar(20) DEFAULT 'none' NOT NULL,
	"staff" varchar(20) DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"device_info" varchar(255),
	"browser" varchar(100),
	"os" varchar(100),
	"ip_address" varchar(50),
	"location" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"trial_ends_at" timestamp,
	"cancelled_at" timestamp,
	"razorpay_subscription_id" varchar(100),
	"razorpay_customer_id" varchar(100),
	"last_payment_at" timestamp,
	"next_billing_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"first_name" varchar(255),
	"last_name" varchar(255),
	"profile_image_url" varchar(500),
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"assigned_property_ids" varchar(255)[] DEFAULT '{}',
	"phone" varchar(20),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"business_name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tenant_type" varchar(30) DEFAULT 'property_owner' NOT NULL,
	"primary_property_id" integer,
	"rejection_reason" text,
	"approved_by" varchar(255),
	"approved_at" timestamp,
	"signup_method" varchar(20) DEFAULT 'google',
	"has_completed_onboarding" boolean DEFAULT false,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"last_login_ip" varchar(45),
	"last_login_at" timestamp,
	"subscription_plan_id" integer,
	"subscription_status" varchar(20) DEFAULT 'trial',
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"razorpay_subscription_id" varchar(100),
	"razorpay_customer_id" varchar(100),
	"trial_ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vendor_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"description" text,
	"invoice_number" varchar(100),
	"payment_method" varchar(50),
	"reference_number" varchar(100),
	"expense_category_id" integer,
	"created_by" varchar(255),
	"notes" text,
	"due_date" timestamp,
	"due_reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"category" varchar(100),
	"gst_number" varchar(50),
	"bank_details" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" integer,
	"description" text,
	"reference_number" varchar(100),
	"transaction_date" date NOT NULL,
	"day_closing_id" integer,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(30) NOT NULL,
	"bank_name" varchar(100),
	"account_number" varchar(50),
	"ifsc_code" varchar(20),
	"upi_id" varchar(100),
	"current_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"check_in_enabled" boolean DEFAULT true NOT NULL,
	"check_out_enabled" boolean DEFAULT true NOT NULL,
	"enquiry_confirmation_enabled" boolean DEFAULT true NOT NULL,
	"payment_request_enabled" boolean DEFAULT true NOT NULL,
	"booking_confirmation_enabled" boolean DEFAULT true NOT NULL,
	"reminder_messages_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_template_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"send_timing" varchar(20) DEFAULT 'immediate' NOT NULL,
	"delay_hours" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_staff_id_staff_members_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds24_room_mappings" ADD CONSTRAINT "beds24_room_mappings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_travel_agent_id_travel_agents_id_fk" FOREIGN KEY ("travel_agent_id") REFERENCES "public"."travel_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_approvals" ADD CONSTRAINT "change_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_approvals" ADD CONSTRAINT "change_approvals_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_approvals" ADD CONSTRAINT "change_approvals_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_approvals" ADD CONSTRAINT "change_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_performance_metrics" ADD CONSTRAINT "employee_performance_metrics_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_travel_agent_id_travel_agents_id_fk" FOREIGN KEY ("travel_agent_id") REFERENCES "public"."travel_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_services" ADD CONSTRAINT "extra_services_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_services" ADD CONSTRAINT "extra_services_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_settings" ADD CONSTRAINT "feature_settings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_order_whatsapp_settings" ADD CONSTRAINT "food_order_whatsapp_settings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_history" ADD CONSTRAINT "lease_history_lease_id_property_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."property_leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_lease_id_property_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."property_leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_year_overrides" ADD CONSTRAINT "lease_year_overrides_lease_id_property_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."property_leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_add_ons" ADD CONSTRAINT "menu_item_add_ons_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ota_integrations" ADD CONSTRAINT "ota_integrations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_bills" ADD CONSTRAINT "pre_bills_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_bills" ADD CONSTRAINT "pre_bills_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_leases" ADD CONSTRAINT "property_leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_salary_id_staff_salaries_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_salary_id_staff_salaries_id_fk" FOREIGN KEY ("salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_staff_member_id_staff_members_id_fk" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notification_logs" ADD CONSTRAINT "task_notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reminder_logs" ADD CONSTRAINT "task_reminder_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_agents" ADD CONSTRAINT "travel_agents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_transactions" ADD CONSTRAINT "vendor_transactions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_transactions" ADD CONSTRAINT "vendor_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_transactions" ADD CONSTRAINT "vendor_transactions_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_notification_settings" ADD CONSTRAINT "whatsapp_notification_settings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_template_settings" ADD CONSTRAINT "whatsapp_template_settings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;