--
-- PostgreSQL database dump
--

\restrict 6IaCkslXPN40xaEnH5pY55fUCGxFnMvlWOjeoiy6KGNpcHSqI0mZLvKhbYK4d3N

-- Dumped from database version 16.11 (df20cf9)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.whatsapp_template_settings DROP CONSTRAINT IF EXISTS whatsapp_template_settings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.whatsapp_notification_settings DROP CONSTRAINT IF EXISTS whatsapp_notification_settings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS wallets_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_transactions DROP CONSTRAINT IF EXISTS vendor_transactions_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_transactions DROP CONSTRAINT IF EXISTS vendor_transactions_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.vendor_transactions DROP CONSTRAINT IF EXISTS vendor_transactions_expense_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.travel_agents DROP CONSTRAINT IF EXISTS travel_agents_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_reminder_logs DROP CONSTRAINT IF EXISTS task_reminder_logs_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task_notification_logs DROP CONSTRAINT IF EXISTS task_notification_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscription_payments DROP CONSTRAINT IF EXISTS subscription_payments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.subscription_payments DROP CONSTRAINT IF EXISTS subscription_payments_subscription_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_staff_member_id_staff_members_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_members DROP CONSTRAINT IF EXISTS staff_members_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_invited_by_fkey;
ALTER TABLE IF EXISTS ONLY public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_staff_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_salary_id_staff_salaries_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_paid_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_staff_member_id_staff_members_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_salary_id_staff_salaries_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_deducted_from_salary_id_staff_salaries_id_fk;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_approved_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.rooms DROP CONSTRAINT IF EXISTS rooms_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.property_leases DROP CONSTRAINT IF EXISTS property_leases_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.property_expenses DROP CONSTRAINT IF EXISTS property_expenses_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.property_expenses DROP CONSTRAINT IF EXISTS property_expenses_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.property_expenses DROP CONSTRAINT IF EXISTS property_expenses_category_id_expense_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.properties DROP CONSTRAINT IF EXISTS properties_owner_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.pre_bills DROP CONSTRAINT IF EXISTS pre_bills_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pre_bills DROP CONSTRAINT IF EXISTS pre_bills_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.ota_integrations DROP CONSTRAINT IF EXISTS ota_integrations_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_room_id_rooms_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_guest_id_guests_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_menu_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_item_variants DROP CONSTRAINT IF EXISTS menu_item_variants_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_item_add_ons DROP CONSTRAINT IF EXISTS menu_item_add_ons_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.lease_year_overrides DROP CONSTRAINT IF EXISTS lease_year_overrides_lease_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lease_payments DROP CONSTRAINT IF EXISTS lease_payments_lease_id_property_leases_id_fk;
ALTER TABLE IF EXISTS ONLY public.lease_history DROP CONSTRAINT IF EXISTS lease_history_lease_id_fkey;
ALTER TABLE IF EXISTS ONLY public.issue_reports DROP CONSTRAINT IF EXISTS issue_reports_reported_by_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.issue_reports DROP CONSTRAINT IF EXISTS issue_reports_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.food_order_whatsapp_settings DROP CONSTRAINT IF EXISTS food_order_whatsapp_settings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.feature_settings DROP CONSTRAINT IF EXISTS feature_settings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.extra_services DROP CONSTRAINT IF EXISTS extra_services_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.error_crashes DROP CONSTRAINT IF EXISTS error_crashes_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.enquiries DROP CONSTRAINT IF EXISTS enquiries_travel_agent_id_travel_agents_id_fk;
ALTER TABLE IF EXISTS ONLY public.enquiries DROP CONSTRAINT IF EXISTS enquiries_room_id_rooms_id_fk;
ALTER TABLE IF EXISTS ONLY public.enquiries DROP CONSTRAINT IF EXISTS enquiries_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.employee_performance_metrics DROP CONSTRAINT IF EXISTS employee_performance_metrics_staff_id_fkey;
ALTER TABLE IF EXISTS ONLY public.daily_closings DROP CONSTRAINT IF EXISTS daily_closings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.daily_closings DROP CONSTRAINT IF EXISTS daily_closings_closed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.communications DROP CONSTRAINT IF EXISTS communications_template_id_message_templates_id_fk;
ALTER TABLE IF EXISTS ONLY public.communications DROP CONSTRAINT IF EXISTS communications_enquiry_id_enquiries_id_fk;
ALTER TABLE IF EXISTS ONLY public.communications DROP CONSTRAINT IF EXISTS communications_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.change_approvals DROP CONSTRAINT IF EXISTS change_approvals_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.change_approvals DROP CONSTRAINT IF EXISTS change_approvals_room_id_rooms_id_fk;
ALTER TABLE IF EXISTS ONLY public.change_approvals DROP CONSTRAINT IF EXISTS change_approvals_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.change_approvals DROP CONSTRAINT IF EXISTS change_approvals_approved_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_travel_agent_id_travel_agents_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_room_id_rooms_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_guest_id_guests_id_fk;
ALTER TABLE IF EXISTS ONLY public.bills DROP CONSTRAINT IF EXISTS bills_guest_id_guests_id_fk;
ALTER TABLE IF EXISTS ONLY public.bills DROP CONSTRAINT IF EXISTS bills_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.beds24_room_mappings DROP CONSTRAINT IF EXISTS beds24_room_mappings_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_suggested_category_id_expense_categories_id_f;
ALTER TABLE IF EXISTS ONLY public.bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_imported_expense_id_property_expenses_id_fk;
ALTER TABLE IF EXISTS ONLY public.bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_assigned_category_id_expense_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_staff_id_staff_members_id_fk;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.agent_payments DROP CONSTRAINT IF EXISTS agent_payments_property_id_fkey;
ALTER TABLE IF EXISTS ONLY public.agent_payments DROP CONSTRAINT IF EXISTS agent_payments_agent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_property_id_fkey;
DROP INDEX IF EXISTS public.idx_user_sessions_user_id;
DROP INDEX IF EXISTS public.idx_user_sessions_is_active;
DROP INDEX IF EXISTS public.idx_staff_member_property;
DROP INDEX IF EXISTS public.idx_staff_member_active;
DROP INDEX IF EXISTS public.idx_salary_user;
DROP INDEX IF EXISTS public.idx_salary_staff_member;
DROP INDEX IF EXISTS public.idx_salary_period;
DROP INDEX IF EXISTS public.idx_payment_salary;
DROP INDEX IF EXISTS public.idx_payment_date;
DROP INDEX IF EXISTS public.idx_audit_user;
DROP INDEX IF EXISTS public.idx_audit_entity;
DROP INDEX IF EXISTS public.idx_audit_created;
DROP INDEX IF EXISTS public.idx_attendance_staff;
DROP INDEX IF EXISTS public.idx_attendance_date;
DROP INDEX IF EXISTS public.idx_advance_user;
DROP INDEX IF EXISTS public.idx_advance_status;
DROP INDEX IF EXISTS public.idx_advance_staff_member;
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_activity_logs_property_id;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;
DROP INDEX IF EXISTS public.idx_activity_logs_category;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.whatsapp_template_settings DROP CONSTRAINT IF EXISTS whatsapp_template_settings_property_id_template_type_key;
ALTER TABLE IF EXISTS ONLY public.whatsapp_template_settings DROP CONSTRAINT IF EXISTS whatsapp_template_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.whatsapp_notification_settings DROP CONSTRAINT IF EXISTS whatsapp_notification_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.wallets DROP CONSTRAINT IF EXISTS wallets_pkey;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_transactions DROP CONSTRAINT IF EXISTS vendor_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_session_token_key;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.user_permissions DROP CONSTRAINT IF EXISTS user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.travel_agents DROP CONSTRAINT IF EXISTS travel_agents_pkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.task_reminder_logs DROP CONSTRAINT IF EXISTS task_reminder_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.task_notification_logs DROP CONSTRAINT IF EXISTS task_notification_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_slug_key;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_payments DROP CONSTRAINT IF EXISTS subscription_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_members DROP CONSTRAINT IF EXISTS staff_members_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_invitations DROP CONSTRAINT IF EXISTS staff_invitations_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.salary_payments DROP CONSTRAINT IF EXISTS salary_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.salary_advances DROP CONSTRAINT IF EXISTS salary_advances_pkey;
ALTER TABLE IF EXISTS ONLY public.rooms DROP CONSTRAINT IF EXISTS rooms_pkey;
ALTER TABLE IF EXISTS ONLY public.property_leases DROP CONSTRAINT IF EXISTS property_leases_pkey;
ALTER TABLE IF EXISTS ONLY public.property_expenses DROP CONSTRAINT IF EXISTS property_expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.properties DROP CONSTRAINT IF EXISTS properties_pkey;
ALTER TABLE IF EXISTS ONLY public.pre_bills DROP CONSTRAINT IF EXISTS pre_bills_pkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_otps DROP CONSTRAINT IF EXISTS password_reset_otps_pkey;
ALTER TABLE IF EXISTS ONLY public.otp_tokens DROP CONSTRAINT IF EXISTS otp_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.ota_integrations DROP CONSTRAINT IF EXISTS ota_integrations_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.message_templates DROP CONSTRAINT IF EXISTS message_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_item_variants DROP CONSTRAINT IF EXISTS menu_item_variants_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_item_add_ons DROP CONSTRAINT IF EXISTS menu_item_add_ons_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.lease_year_overrides DROP CONSTRAINT IF EXISTS lease_year_overrides_pkey;
ALTER TABLE IF EXISTS ONLY public.lease_payments DROP CONSTRAINT IF EXISTS lease_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.lease_history DROP CONSTRAINT IF EXISTS lease_history_pkey;
ALTER TABLE IF EXISTS ONLY public.issue_reports DROP CONSTRAINT IF EXISTS issue_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.guests DROP CONSTRAINT IF EXISTS guests_pkey;
ALTER TABLE IF EXISTS ONLY public.food_order_whatsapp_settings DROP CONSTRAINT IF EXISTS food_order_whatsapp_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.feature_settings DROP CONSTRAINT IF EXISTS feature_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.extra_services DROP CONSTRAINT IF EXISTS extra_services_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.error_crashes DROP CONSTRAINT IF EXISTS error_crashes_pkey;
ALTER TABLE IF EXISTS ONLY public.enquiries DROP CONSTRAINT IF EXISTS enquiries_pkey;
ALTER TABLE IF EXISTS ONLY public.employee_performance_metrics DROP CONSTRAINT IF EXISTS employee_performance_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_closings DROP CONSTRAINT IF EXISTS daily_closings_pkey;
ALTER TABLE IF EXISTS ONLY public.contact_enquiries DROP CONSTRAINT IF EXISTS contact_enquiries_pkey;
ALTER TABLE IF EXISTS ONLY public.communications DROP CONSTRAINT IF EXISTS communications_pkey;
ALTER TABLE IF EXISTS ONLY public.change_approvals DROP CONSTRAINT IF EXISTS change_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.bills DROP CONSTRAINT IF EXISTS bills_pkey;
ALTER TABLE IF EXISTS ONLY public.beds24_room_mappings DROP CONSTRAINT IF EXISTS beds24_room_mappings_property_id_beds24_room_id_key;
ALTER TABLE IF EXISTS ONLY public.beds24_room_mappings DROP CONSTRAINT IF EXISTS beds24_room_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_pkey;
ALTER TABLE IF EXISTS ONLY public.agent_payments DROP CONSTRAINT IF EXISTS agent_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.__drizzle_migrations DROP CONSTRAINT IF EXISTS __drizzle_migrations_pkey;
ALTER TABLE IF EXISTS public.whatsapp_template_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.whatsapp_notification_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.wallets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.wallet_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendor_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_subscriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.travel_agents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.task_reminder_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.task_notification_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscription_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscription_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_salaries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_members ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_invitations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.salary_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.salary_advances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rooms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.property_leases ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.property_expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.properties ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.pre_bills ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.password_reset_otps ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.otp_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ota_integrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.message_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_item_variants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_item_add_ons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lease_year_overrides ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lease_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lease_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.issue_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.guests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.food_order_whatsapp_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.feature_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.extra_services ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expense_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.error_crashes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.enquiries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.employee_performance_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_closings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contact_enquiries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.communications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.change_approvals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bookings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bills ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.beds24_room_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bank_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendance_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.agent_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.activity_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.__drizzle_migrations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.whatsapp_template_settings_id_seq;
DROP TABLE IF EXISTS public.whatsapp_template_settings;
DROP SEQUENCE IF EXISTS public.whatsapp_notification_settings_id_seq;
DROP TABLE IF EXISTS public.whatsapp_notification_settings;
DROP SEQUENCE IF EXISTS public.wallets_id_seq;
DROP TABLE IF EXISTS public.wallets;
DROP SEQUENCE IF EXISTS public.wallet_transactions_id_seq;
DROP TABLE IF EXISTS public.wallet_transactions;
DROP SEQUENCE IF EXISTS public.vendors_id_seq;
DROP TABLE IF EXISTS public.vendors;
DROP SEQUENCE IF EXISTS public.vendor_transactions_id_seq;
DROP TABLE IF EXISTS public.vendor_transactions;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_subscriptions_id_seq;
DROP TABLE IF EXISTS public.user_subscriptions;
DROP SEQUENCE IF EXISTS public.user_sessions_id_seq;
DROP TABLE IF EXISTS public.user_sessions;
DROP SEQUENCE IF EXISTS public.user_permissions_id_seq;
DROP TABLE IF EXISTS public.user_permissions;
DROP SEQUENCE IF EXISTS public.travel_agents_id_seq;
DROP TABLE IF EXISTS public.travel_agents;
DROP SEQUENCE IF EXISTS public.tasks_id_seq;
DROP TABLE IF EXISTS public.tasks;
DROP SEQUENCE IF EXISTS public.task_reminder_logs_id_seq;
DROP TABLE IF EXISTS public.task_reminder_logs;
DROP SEQUENCE IF EXISTS public.task_notification_logs_id_seq;
DROP TABLE IF EXISTS public.task_notification_logs;
DROP SEQUENCE IF EXISTS public.subscription_plans_id_seq;
DROP TABLE IF EXISTS public.subscription_plans;
DROP SEQUENCE IF EXISTS public.subscription_payments_id_seq;
DROP TABLE IF EXISTS public.subscription_payments;
DROP SEQUENCE IF EXISTS public.staff_salaries_id_seq;
DROP TABLE IF EXISTS public.staff_salaries;
DROP SEQUENCE IF EXISTS public.staff_members_id_seq;
DROP TABLE IF EXISTS public.staff_members;
DROP SEQUENCE IF EXISTS public.staff_invitations_id_seq;
DROP TABLE IF EXISTS public.staff_invitations;
DROP TABLE IF EXISTS public.sessions;
DROP SEQUENCE IF EXISTS public.salary_payments_id_seq;
DROP TABLE IF EXISTS public.salary_payments;
DROP SEQUENCE IF EXISTS public.salary_advances_id_seq;
DROP TABLE IF EXISTS public.salary_advances;
DROP SEQUENCE IF EXISTS public.rooms_id_seq;
DROP TABLE IF EXISTS public.rooms;
DROP SEQUENCE IF EXISTS public.property_leases_id_seq;
DROP TABLE IF EXISTS public.property_leases;
DROP SEQUENCE IF EXISTS public.property_expenses_id_seq;
DROP TABLE IF EXISTS public.property_expenses;
DROP SEQUENCE IF EXISTS public.properties_id_seq;
DROP TABLE IF EXISTS public.properties;
DROP SEQUENCE IF EXISTS public.pre_bills_id_seq;
DROP TABLE IF EXISTS public.pre_bills;
DROP SEQUENCE IF EXISTS public.password_reset_otps_id_seq;
DROP TABLE IF EXISTS public.password_reset_otps;
DROP SEQUENCE IF EXISTS public.otp_tokens_id_seq;
DROP TABLE IF EXISTS public.otp_tokens;
DROP SEQUENCE IF EXISTS public.ota_integrations_id_seq;
DROP TABLE IF EXISTS public.ota_integrations;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.message_templates_id_seq;
DROP TABLE IF EXISTS public.message_templates;
DROP SEQUENCE IF EXISTS public.menu_items_id_seq;
DROP TABLE IF EXISTS public.menu_items;
DROP SEQUENCE IF EXISTS public.menu_item_variants_id_seq;
DROP TABLE IF EXISTS public.menu_item_variants;
DROP SEQUENCE IF EXISTS public.menu_item_add_ons_id_seq;
DROP TABLE IF EXISTS public.menu_item_add_ons;
DROP SEQUENCE IF EXISTS public.menu_categories_id_seq;
DROP TABLE IF EXISTS public.menu_categories;
DROP SEQUENCE IF EXISTS public.lease_year_overrides_id_seq;
DROP TABLE IF EXISTS public.lease_year_overrides;
DROP SEQUENCE IF EXISTS public.lease_payments_id_seq;
DROP TABLE IF EXISTS public.lease_payments;
DROP SEQUENCE IF EXISTS public.lease_history_id_seq;
DROP TABLE IF EXISTS public.lease_history;
DROP SEQUENCE IF EXISTS public.issue_reports_id_seq;
DROP TABLE IF EXISTS public.issue_reports;
DROP SEQUENCE IF EXISTS public.guests_id_seq;
DROP TABLE IF EXISTS public.guests;
DROP SEQUENCE IF EXISTS public.food_order_whatsapp_settings_id_seq;
DROP TABLE IF EXISTS public.food_order_whatsapp_settings;
DROP SEQUENCE IF EXISTS public.feature_settings_id_seq;
DROP TABLE IF EXISTS public.feature_settings;
DROP SEQUENCE IF EXISTS public.extra_services_id_seq;
DROP TABLE IF EXISTS public.extra_services;
DROP SEQUENCE IF EXISTS public.expense_categories_id_seq;
DROP TABLE IF EXISTS public.expense_categories;
DROP SEQUENCE IF EXISTS public.error_crashes_id_seq;
DROP TABLE IF EXISTS public.error_crashes;
DROP SEQUENCE IF EXISTS public.enquiries_id_seq;
DROP TABLE IF EXISTS public.enquiries;
DROP SEQUENCE IF EXISTS public.employee_performance_metrics_id_seq;
DROP TABLE IF EXISTS public.employee_performance_metrics;
DROP SEQUENCE IF EXISTS public.daily_closings_id_seq;
DROP TABLE IF EXISTS public.daily_closings;
DROP SEQUENCE IF EXISTS public.contact_enquiries_id_seq;
DROP TABLE IF EXISTS public.contact_enquiries;
DROP SEQUENCE IF EXISTS public.communications_id_seq;
DROP TABLE IF EXISTS public.communications;
DROP SEQUENCE IF EXISTS public.change_approvals_id_seq;
DROP TABLE IF EXISTS public.change_approvals;
DROP SEQUENCE IF EXISTS public.bookings_id_seq;
DROP TABLE IF EXISTS public.bookings;
DROP SEQUENCE IF EXISTS public.bills_id_seq;
DROP TABLE IF EXISTS public.bills;
DROP SEQUENCE IF EXISTS public.beds24_room_mappings_id_seq;
DROP TABLE IF EXISTS public.beds24_room_mappings;
DROP SEQUENCE IF EXISTS public.bank_transactions_id_seq;
DROP TABLE IF EXISTS public.bank_transactions;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP SEQUENCE IF EXISTS public.audit_log_id_seq;
DROP TABLE IF EXISTS public.audit_log;
DROP SEQUENCE IF EXISTS public.attendance_records_id_seq;
DROP TABLE IF EXISTS public.attendance_records;
DROP SEQUENCE IF EXISTS public.agent_payments_id_seq;
DROP TABLE IF EXISTS public.agent_payments;
DROP SEQUENCE IF EXISTS public.activity_logs_id_seq;
DROP TABLE IF EXISTS public.activity_logs;
DROP SEQUENCE IF EXISTS public.__drizzle_migrations_id_seq;
DROP TABLE IF EXISTS public.__drizzle_migrations;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.__drizzle_migrations_id_seq OWNED BY public.__drizzle_migrations.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id character varying,
    user_email character varying(255),
    user_name character varying(255),
    action character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    resource_type character varying(50),
    resource_id character varying(100),
    resource_name character varying(255),
    property_id integer,
    property_name character varying(255),
    details jsonb,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: agent_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_payments (
    id integer NOT NULL,
    property_id integer NOT NULL,
    agent_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying NOT NULL,
    payment_date date NOT NULL,
    reference_number character varying(100),
    notes text,
    allocations jsonb,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_payments_id_seq OWNED BY public.agent_payments.id;


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    attendance_date date NOT NULL,
    status character varying(20) DEFAULT 'present'::character varying NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    property_id integer
);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    user_id character varying NOT NULL,
    user_role character varying(20),
    property_context integer[],
    change_set jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    user_id character varying(255) NOT NULL,
    user_role character varying(50),
    property_context character varying(255)[],
    change_set jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id integer NOT NULL,
    property_id integer NOT NULL,
    upload_id character varying(100) NOT NULL,
    transaction_date timestamp without time zone NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    suggested_category_id integer,
    assigned_category_id integer,
    is_imported boolean DEFAULT false NOT NULL,
    imported_expense_id integer,
    match_confidence character varying(20),
    raw_data text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_transactions_id_seq OWNED BY public.bank_transactions.id;


--
-- Name: beds24_room_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beds24_room_mappings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    beds24_room_id character varying(50) NOT NULL,
    room_type character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    beds24_room_name character varying(255)
);


--
-- Name: beds24_room_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.beds24_room_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: beds24_room_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.beds24_room_mappings_id_seq OWNED BY public.beds24_room_mappings.id;


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    guest_id integer NOT NULL,
    room_charges numeric(10,2) NOT NULL,
    food_charges numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    extra_charges numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    gst_rate numeric(5,2) DEFAULT '18'::numeric NOT NULL,
    gst_amount numeric(10,2) NOT NULL,
    service_charge_rate numeric(5,2) DEFAULT '10'::numeric NOT NULL,
    service_charge_amount numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying NOT NULL,
    payment_method character varying(50),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    merged_booking_ids integer[],
    advance_paid numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    balance_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount_type character varying(20),
    discount_value numeric(10,2),
    discount_amount numeric(10,2) DEFAULT '0'::numeric,
    include_gst boolean DEFAULT true NOT NULL,
    include_service_charge boolean DEFAULT true NOT NULL,
    due_date timestamp without time zone,
    pending_reason text,
    payment_methods jsonb,
    gst_on_rooms boolean DEFAULT true NOT NULL,
    gst_on_food boolean DEFAULT false NOT NULL
);


--
-- Name: bills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bills_id_seq OWNED BY public.bills.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    room_id integer,
    guest_id integer NOT NULL,
    check_in_date timestamp without time zone NOT NULL,
    check_out_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    number_of_guests integer DEFAULT 1 NOT NULL,
    special_requests text,
    total_amount numeric(10,2),
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_price numeric(10,2),
    advance_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    source character varying(50) DEFAULT 'Walk-in'::character varying NOT NULL,
    meal_plan character varying(10) DEFAULT 'EP'::character varying NOT NULL,
    room_ids integer[],
    is_group_booking boolean DEFAULT false NOT NULL,
    beds_booked integer,
    travel_agent_id integer,
    cancellation_date timestamp without time zone,
    cancellation_type character varying(20),
    cancellation_charges numeric(10,2) DEFAULT 0,
    refund_amount numeric(10,2) DEFAULT 0,
    cancellation_reason text,
    cancelled_by character varying(255),
    actual_check_in_time timestamp without time zone,
    payment_link_id character varying(100),
    payment_link_url text,
    payment_link_expiry timestamp without time zone,
    advance_payment_status character varying(20) DEFAULT 'not_required'::character varying,
    reminder_count integer DEFAULT 0,
    last_reminder_at timestamp without time zone,
    external_booking_id character varying(100),
    external_source character varying(50)
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: change_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_approvals (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    change_type character varying(50) NOT NULL,
    booking_id integer,
    room_id integer,
    description text NOT NULL,
    old_value character varying(255),
    new_value character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_by character varying,
    approved_at timestamp without time zone,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: change_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_approvals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_approvals_id_seq OWNED BY public.change_approvals.id;


--
-- Name: communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communications (
    id integer NOT NULL,
    enquiry_id integer,
    booking_id integer,
    recipient_phone character varying(50) NOT NULL,
    recipient_name character varying(255),
    message_type character varying(20) DEFAULT 'sms'::character varying NOT NULL,
    template_id integer,
    message_content text NOT NULL,
    status character varying(20) DEFAULT 'sent'::character varying NOT NULL,
    twilio_sid character varying(100),
    error_message text,
    sent_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: communications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communications_id_seq OWNED BY public.communications.id;


--
-- Name: contact_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_enquiries (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    property_name character varying(255),
    message text NOT NULL,
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    phone character varying(20)
);


--
-- Name: contact_enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_enquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_enquiries_id_seq OWNED BY public.contact_enquiries.id;


--
-- Name: daily_closings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_closings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    closing_date date NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0 NOT NULL,
    total_collected numeric(12,2) DEFAULT 0 NOT NULL,
    total_expenses numeric(12,2) DEFAULT 0 NOT NULL,
    total_pending_receivable numeric(12,2) DEFAULT 0 NOT NULL,
    wallet_balances jsonb DEFAULT '[]'::jsonb NOT NULL,
    revenue_breakdown jsonb DEFAULT '{}'::jsonb,
    collection_breakdown jsonb DEFAULT '{}'::jsonb,
    expense_breakdown jsonb DEFAULT '{}'::jsonb,
    bookings_count integer DEFAULT 0,
    check_ins_count integer DEFAULT 0,
    check_outs_count integer DEFAULT 0,
    food_orders_count integer DEFAULT 0,
    expense_entries_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    closed_by character varying,
    closed_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: daily_closings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_closings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_closings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_closings_id_seq OWNED BY public.daily_closings.id;


--
-- Name: employee_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_performance_metrics (
    id integer NOT NULL,
    staff_id character varying NOT NULL,
    total_tasks_assigned integer DEFAULT 0 NOT NULL,
    tasks_completed_on_time integer DEFAULT 0 NOT NULL,
    tasks_completed_late integer DEFAULT 0 NOT NULL,
    average_completion_time_minutes integer DEFAULT 0 NOT NULL,
    performance_score numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: employee_performance_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_performance_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_performance_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_performance_metrics_id_seq OWNED BY public.employee_performance_metrics.id;


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id integer NOT NULL,
    property_id integer NOT NULL,
    guest_name character varying(255) NOT NULL,
    guest_phone character varying(50) NOT NULL,
    guest_email character varying(255),
    check_in_date timestamp without time zone NOT NULL,
    check_out_date timestamp without time zone NOT NULL,
    room_id integer,
    number_of_guests integer DEFAULT 1 NOT NULL,
    price_quoted numeric(10,2),
    advance_amount numeric(10,2),
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    stripe_payment_intent_id character varying(255),
    stripe_payment_link_url text,
    twilio_message_sid character varying(100),
    special_requests text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    room_ids integer[],
    is_group_enquiry boolean DEFAULT false NOT NULL,
    meal_plan character varying(10) DEFAULT 'EP'::character varying NOT NULL,
    beds_booked integer,
    source character varying(50) DEFAULT 'Walk-in'::character varying NOT NULL,
    travel_agent_id integer
);


--
-- Name: enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enquiries_id_seq OWNED BY public.enquiries.id;


--
-- Name: error_crashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_crashes (
    id integer NOT NULL,
    user_id character varying,
    error_message text NOT NULL,
    error_stack text,
    error_type character varying(100),
    page character varying(255),
    browser_info jsonb,
    user_agent text,
    is_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: error_crashes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_crashes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_crashes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_crashes_id_seq OWNED BY public.error_crashes.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    property_id integer,
    name character varying(100) NOT NULL,
    description text,
    keywords text[],
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: extra_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extra_services (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    service_name character varying(255) NOT NULL,
    description text,
    amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    service_type character varying(50) NOT NULL,
    vendor_name character varying(255),
    vendor_contact character varying(100),
    commission numeric(10,2),
    service_date timestamp without time zone NOT NULL
);


--
-- Name: extra_services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extra_services_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: extra_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extra_services_id_seq OWNED BY public.extra_services.id;


--
-- Name: feature_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_settings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    food_order_notifications boolean DEFAULT true,
    whatsapp_notifications boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    payment_reminders boolean DEFAULT true,
    auto_checkout boolean DEFAULT false,
    auto_salary_calculation boolean DEFAULT true,
    attendance_tracking boolean DEFAULT true,
    performance_analytics boolean DEFAULT true,
    expense_forecasting boolean DEFAULT false,
    budget_alerts boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    advance_payment_enabled boolean DEFAULT true NOT NULL,
    advance_payment_percentage numeric(5,2) DEFAULT 30,
    advance_payment_expiry_hours integer DEFAULT 24,
    payment_reminder_enabled boolean DEFAULT true,
    payment_reminder_hours integer DEFAULT 6,
    max_payment_reminders integer DEFAULT 3
);


--
-- Name: feature_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_settings_id_seq OWNED BY public.feature_settings.id;


--
-- Name: food_order_whatsapp_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.food_order_whatsapp_settings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    phone_numbers text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: food_order_whatsapp_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.food_order_whatsapp_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: food_order_whatsapp_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.food_order_whatsapp_settings_id_seq OWNED BY public.food_order_whatsapp_settings.id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50) NOT NULL,
    id_proof_type character varying(50),
    id_proof_number character varying(100),
    address text,
    preferences text,
    total_stays integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    id_proof_image text
);


--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: issue_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_reports (
    id integer NOT NULL,
    reported_by_user_id character varying NOT NULL,
    property_id integer,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    screenshot text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: issue_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_reports_id_seq OWNED BY public.issue_reports.id;


--
-- Name: lease_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lease_history (
    id integer NOT NULL,
    lease_id integer NOT NULL,
    change_type character varying(50) NOT NULL,
    field_changed character varying(100),
    old_value text,
    new_value text,
    changed_by character varying(255),
    change_reason text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lease_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lease_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lease_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lease_history_id_seq OWNED BY public.lease_history.id;


--
-- Name: lease_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lease_payments (
    id integer NOT NULL,
    lease_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    payment_method character varying(50),
    reference_number character varying(100),
    notes text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lease_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lease_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lease_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lease_payments_id_seq OWNED BY public.lease_payments.id;


--
-- Name: lease_year_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lease_year_overrides (
    id integer NOT NULL,
    lease_id integer NOT NULL,
    year_number integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    reason text,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lease_year_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lease_year_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lease_year_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lease_year_overrides_id_seq OWNED BY public.lease_year_overrides.id;


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id integer NOT NULL,
    property_id integer,
    name character varying(255) NOT NULL,
    image_url text,
    start_time character varying(10),
    end_time character varying(10),
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: menu_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_categories_id_seq OWNED BY public.menu_categories.id;


--
-- Name: menu_item_add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_add_ons (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    add_on_name character varying(255) NOT NULL,
    add_on_price numeric(10,2) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: menu_item_add_ons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_add_ons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_add_ons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_add_ons_id_seq OWNED BY public.menu_item_add_ons.id;


--
-- Name: menu_item_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_variants (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    variant_name character varying(255) NOT NULL,
    actual_price numeric(10,2) NOT NULL,
    discounted_price numeric(10,2),
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: menu_item_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_variants_id_seq OWNED BY public.menu_item_variants.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    property_id integer,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    price numeric(10,2) NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    preparation_time integer,
    image_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    category_id integer,
    food_type character varying(10) DEFAULT 'veg'::character varying NOT NULL,
    actual_price numeric(10,2),
    discounted_price numeric(10,2),
    has_variants boolean DEFAULT false NOT NULL,
    has_add_ons boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    subject character varying(255),
    content text NOT NULL,
    category character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    sound_type character varying(20) DEFAULT 'info'::character varying,
    related_id integer,
    related_type character varying(50),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    property_id integer,
    room_id integer,
    booking_id integer,
    guest_id integer,
    items jsonb NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    special_instructions text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    order_source character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    order_type character varying(20),
    customer_name character varying(255),
    customer_phone character varying(50)
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: ota_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ota_integrations (
    id integer NOT NULL,
    property_id integer NOT NULL,
    ota_name character varying(50) NOT NULL,
    property_id_external character varying(100) NOT NULL,
    api_key text,
    api_secret text,
    credentials jsonb,
    enabled boolean DEFAULT true NOT NULL,
    last_sync_at timestamp without time zone,
    sync_status character varying(20) DEFAULT 'idle'::character varying NOT NULL,
    sync_error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: ota_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ota_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ota_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ota_integrations_id_seq OWNED BY public.ota_integrations.id;


--
-- Name: otp_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_tokens (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    otp character varying(6) NOT NULL,
    purpose character varying(20) DEFAULT 'login'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: otp_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.otp_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: otp_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.otp_tokens_id_seq OWNED BY public.otp_tokens.id;


--
-- Name: password_reset_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_otps (
    id integer NOT NULL,
    email character varying(255),
    phone character varying(20),
    channel character varying(10) NOT NULL,
    otp character varying(10) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    reset_token character varying(100)
);


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_otps_id_seq OWNED BY public.password_reset_otps.id;


--
-- Name: pre_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_bills (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    balance_due numeric(10,2) NOT NULL,
    room_number character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    sent_at timestamp without time zone DEFAULT now(),
    approved_at timestamp without time zone,
    approved_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    token character varying(64) NOT NULL,
    room_charges numeric(10,2) DEFAULT 0,
    food_charges numeric(10,2) DEFAULT 0,
    extra_charges numeric(10,2) DEFAULT 0,
    gst_amount numeric(10,2) DEFAULT 0,
    discount numeric(10,2) DEFAULT 0,
    advance_payment numeric(10,2) DEFAULT 0,
    food_items jsonb,
    guest_name character varying(255),
    guest_phone character varying(20),
    guest_email character varying(255),
    property_id integer,
    check_in_date date,
    check_out_date date,
    nights integer DEFAULT 1
);


--
-- Name: pre_bills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pre_bills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pre_bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pre_bills_id_seq OWNED BY public.pre_bills.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    location character varying(255),
    description text,
    total_rooms integer DEFAULT 0 NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    owner_user_id character varying,
    monthly_rent numeric(10,2)
);


--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.properties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- Name: property_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_expenses (
    id integer NOT NULL,
    property_id integer NOT NULL,
    category character varying(50),
    amount numeric(12,2) NOT NULL,
    expense_date timestamp without time zone NOT NULL,
    description text,
    vendor_name character varying(255),
    payment_method character varying(50),
    receipt_number character varying(100),
    is_recurring boolean DEFAULT false NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    category_id integer,
    vendor_id integer
);


--
-- Name: property_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.property_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.property_expenses_id_seq OWNED BY public.property_expenses.id;


--
-- Name: property_leases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_leases (
    id integer NOT NULL,
    property_id integer NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    payment_frequency character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    landlord_name character varying(255),
    landlord_contact character varying(100),
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    lease_duration_years integer,
    base_yearly_amount numeric(10,2),
    yearly_increment_type character varying(20),
    yearly_increment_value numeric(10,2),
    current_year_amount numeric(10,2),
    is_overridden boolean DEFAULT false,
    carry_forward_amount numeric(10,2) DEFAULT 0
);


--
-- Name: property_leases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.property_leases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_leases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.property_leases_id_seq OWNED BY public.property_leases.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    property_id integer NOT NULL,
    room_number character varying(50) NOT NULL,
    room_type character varying(100),
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    price_per_night numeric(10,2) NOT NULL,
    max_occupancy integer DEFAULT 2 NOT NULL,
    amenities text[],
    assigned_staff_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    room_category character varying(50) DEFAULT 'standard'::character varying NOT NULL,
    total_beds integer
);


--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: salary_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_advances (
    id integer NOT NULL,
    user_id character varying,
    salary_id integer,
    amount numeric(12,2) NOT NULL,
    advance_date timestamp without time zone NOT NULL,
    reason text,
    repayment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    deducted_from_salary_id integer,
    approved_by character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    staff_member_id integer,
    advance_type character varying(20) DEFAULT 'regular'::character varying,
    CONSTRAINT advance_payee_check CHECK ((((user_id IS NOT NULL) AND (staff_member_id IS NULL)) OR ((user_id IS NULL) AND (staff_member_id IS NOT NULL))))
);


--
-- Name: salary_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salary_advances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salary_advances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salary_advances_id_seq OWNED BY public.salary_advances.id;


--
-- Name: salary_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_payments (
    id integer NOT NULL,
    salary_id integer,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    payment_method character varying(50),
    reference_number character varying(100),
    paid_by character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    staff_member_id integer,
    property_id integer,
    recorded_by character varying,
    period_start timestamp without time zone,
    period_end timestamp without time zone
);


--
-- Name: salary_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salary_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salary_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salary_payments_id_seq OWNED BY public.salary_payments.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: staff_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_invitations (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    property_id integer NOT NULL,
    role character varying(50) DEFAULT 'staff'::character varying NOT NULL,
    invited_by character varying NOT NULL,
    invite_token character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: staff_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_invitations_id_seq OWNED BY public.staff_invitations.id;


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_members (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(255),
    role character varying(100),
    property_id integer NOT NULL,
    joining_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    job_title character varying(100),
    base_salary numeric(12,2),
    payment_method character varying(50),
    bank_details text,
    leaving_date timestamp without time zone
);


--
-- Name: staff_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_members_id_seq OWNED BY public.staff_members.id;


--
-- Name: staff_salaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_salaries (
    id integer NOT NULL,
    user_id character varying,
    property_id integer,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    gross_salary numeric(12,2) NOT NULL,
    deductions numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    net_salary numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    staff_member_id integer,
    CONSTRAINT salary_payee_check CHECK ((((user_id IS NOT NULL) AND (staff_member_id IS NULL)) OR ((user_id IS NULL) AND (staff_member_id IS NOT NULL))))
);


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_salaries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_salaries_id_seq OWNED BY public.staff_salaries.id;


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_payments (
    id integer NOT NULL,
    subscription_id integer NOT NULL,
    user_id character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    razorpay_payment_id character varying(100),
    razorpay_order_id character varying(100),
    invoice_number character varying(50),
    invoice_url text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_payments_id_seq OWNED BY public.subscription_payments.id;


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(50) NOT NULL,
    description text,
    monthly_price numeric(10,2) DEFAULT 0 NOT NULL,
    yearly_price numeric(10,2),
    max_properties integer DEFAULT 1 NOT NULL,
    max_rooms integer DEFAULT 10 NOT NULL,
    max_staff integer DEFAULT 2,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: task_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_notification_logs (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    task_type character varying(100) NOT NULL,
    task_count integer DEFAULT 0 NOT NULL,
    reminder_count integer DEFAULT 0 NOT NULL,
    completion_time integer DEFAULT 0,
    last_reminded_at timestamp without time zone,
    all_tasks_completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_notification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_notification_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_notification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_notification_logs_id_seq OWNED BY public.task_notification_logs.id;


--
-- Name: task_reminder_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_reminder_logs (
    id integer NOT NULL,
    task_id integer NOT NULL,
    recipient_phone character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    sent_at timestamp without time zone DEFAULT now(),
    error_message text
);


--
-- Name: task_reminder_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_reminder_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_reminder_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_reminder_logs_id_seq OWNED BY public.task_reminder_logs.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    property_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    assigned_user_id character varying,
    assigned_user_name character varying(255),
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    due_date date NOT NULL,
    due_time character varying(10),
    reminder_enabled boolean DEFAULT true NOT NULL,
    reminder_type character varying(20) DEFAULT 'daily'::character varying,
    reminder_time character varying(10) DEFAULT '10:00'::character varying,
    reminder_recipients text[],
    last_reminder_sent timestamp without time zone,
    completed_at timestamp without time zone,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: travel_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_agents (
    id integer NOT NULL,
    property_id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    commission numeric(5,2),
    address text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    bank_details text
);


--
-- Name: travel_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.travel_agents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: travel_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.travel_agents_id_seq OWNED BY public.travel_agents.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    bookings character varying(20) DEFAULT 'none'::character varying NOT NULL,
    calendar character varying(20) DEFAULT 'none'::character varying NOT NULL,
    rooms character varying(20) DEFAULT 'none'::character varying NOT NULL,
    guests character varying(20) DEFAULT 'none'::character varying NOT NULL,
    food_orders character varying(20) DEFAULT 'none'::character varying NOT NULL,
    menu_management character varying(20) DEFAULT 'none'::character varying NOT NULL,
    payments character varying(20) DEFAULT 'none'::character varying NOT NULL,
    reports character varying(20) DEFAULT 'none'::character varying NOT NULL,
    settings character varying(20) DEFAULT 'none'::character varying NOT NULL,
    tasks character varying(20) DEFAULT 'none'::character varying NOT NULL,
    staff character varying(20) DEFAULT 'none'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    session_token character varying(255) NOT NULL,
    device_info character varying(255),
    browser character varying(100),
    os character varying(100),
    ip_address character varying(50),
    location character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    last_activity_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subscriptions (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    plan_id integer NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone,
    trial_ends_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    razorpay_subscription_id character varying(100),
    razorpay_customer_id character varying(100),
    last_payment_at timestamp without time zone,
    next_billing_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_subscriptions_id_seq OWNED BY public.user_subscriptions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying(20) DEFAULT 'staff'::character varying NOT NULL,
    assigned_property_ids integer[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    phone character varying(20),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    business_name character varying(255),
    password character varying,
    verification_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_type character varying(30) DEFAULT 'property_owner'::character varying NOT NULL,
    primary_property_id integer,
    rejection_reason text,
    approved_by character varying(255),
    approved_at timestamp without time zone,
    signup_method character varying(20) DEFAULT 'google'::character varying,
    has_completed_onboarding boolean DEFAULT false,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    last_login_ip character varying(45),
    last_login_at timestamp without time zone,
    subscription_plan_id integer,
    subscription_status character varying(20) DEFAULT 'trial'::character varying,
    subscription_start_date timestamp without time zone,
    subscription_end_date timestamp without time zone,
    razorpay_subscription_id character varying(100),
    razorpay_customer_id character varying(100),
    trial_ends_at timestamp without time zone
);


--
-- Name: vendor_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_transactions (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    property_id integer NOT NULL,
    transaction_type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    transaction_date timestamp without time zone NOT NULL,
    description text,
    invoice_number character varying(100),
    payment_method character varying(50),
    reference_number character varying(100),
    expense_category_id integer,
    created_by character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vendor_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_transactions_id_seq OWNED BY public.vendor_transactions.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    property_id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(255),
    address text,
    category character varying(100),
    gst_number character varying(50),
    bank_details text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id integer NOT NULL,
    wallet_id integer NOT NULL,
    property_id integer NOT NULL,
    transaction_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    source character varying(50) NOT NULL,
    source_id integer,
    description text,
    reference_number character varying(100),
    transaction_date date NOT NULL,
    day_closing_id integer,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    property_id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(30) NOT NULL,
    bank_name character varying(100),
    account_number character varying(50),
    ifsc_code character varying(20),
    upi_id character varying(100),
    current_balance numeric(12,2) DEFAULT 0 NOT NULL,
    opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: whatsapp_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_notification_settings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    check_in_enabled boolean DEFAULT true,
    check_out_enabled boolean DEFAULT true,
    enquiry_confirmation_enabled boolean DEFAULT true,
    payment_request_enabled boolean DEFAULT true,
    booking_confirmation_enabled boolean DEFAULT true,
    reminder_messages_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_notification_settings_id_seq OWNED BY public.whatsapp_notification_settings.id;


--
-- Name: whatsapp_template_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_template_settings (
    id integer NOT NULL,
    property_id integer NOT NULL,
    template_type character varying(50) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    send_timing character varying(20) DEFAULT 'immediate'::character varying NOT NULL,
    delay_hours integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: whatsapp_template_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_template_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_template_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_template_settings_id_seq OWNED BY public.whatsapp_template_settings.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('public.__drizzle_migrations_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: agent_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_payments ALTER COLUMN id SET DEFAULT nextval('public.agent_payments_id_seq'::regclass);


--
-- Name: attendance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bank_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions ALTER COLUMN id SET DEFAULT nextval('public.bank_transactions_id_seq'::regclass);


--
-- Name: beds24_room_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds24_room_mappings ALTER COLUMN id SET DEFAULT nextval('public.beds24_room_mappings_id_seq'::regclass);


--
-- Name: bills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills ALTER COLUMN id SET DEFAULT nextval('public.bills_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: change_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals ALTER COLUMN id SET DEFAULT nextval('public.change_approvals_id_seq'::regclass);


--
-- Name: communications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications ALTER COLUMN id SET DEFAULT nextval('public.communications_id_seq'::regclass);


--
-- Name: contact_enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_enquiries ALTER COLUMN id SET DEFAULT nextval('public.contact_enquiries_id_seq'::regclass);


--
-- Name: daily_closings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closings ALTER COLUMN id SET DEFAULT nextval('public.daily_closings_id_seq'::regclass);


--
-- Name: employee_performance_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_performance_metrics ALTER COLUMN id SET DEFAULT nextval('public.employee_performance_metrics_id_seq'::regclass);


--
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- Name: error_crashes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_crashes ALTER COLUMN id SET DEFAULT nextval('public.error_crashes_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: extra_services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_services ALTER COLUMN id SET DEFAULT nextval('public.extra_services_id_seq'::regclass);


--
-- Name: feature_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_settings ALTER COLUMN id SET DEFAULT nextval('public.feature_settings_id_seq'::regclass);


--
-- Name: food_order_whatsapp_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_order_whatsapp_settings ALTER COLUMN id SET DEFAULT nextval('public.food_order_whatsapp_settings_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: issue_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports ALTER COLUMN id SET DEFAULT nextval('public.issue_reports_id_seq'::regclass);


--
-- Name: lease_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_history ALTER COLUMN id SET DEFAULT nextval('public.lease_history_id_seq'::regclass);


--
-- Name: lease_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_payments ALTER COLUMN id SET DEFAULT nextval('public.lease_payments_id_seq'::regclass);


--
-- Name: lease_year_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_year_overrides ALTER COLUMN id SET DEFAULT nextval('public.lease_year_overrides_id_seq'::regclass);


--
-- Name: menu_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories ALTER COLUMN id SET DEFAULT nextval('public.menu_categories_id_seq'::regclass);


--
-- Name: menu_item_add_ons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_add_ons ALTER COLUMN id SET DEFAULT nextval('public.menu_item_add_ons_id_seq'::regclass);


--
-- Name: menu_item_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants ALTER COLUMN id SET DEFAULT nextval('public.menu_item_variants_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: message_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates ALTER COLUMN id SET DEFAULT nextval('public.message_templates_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: ota_integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ota_integrations ALTER COLUMN id SET DEFAULT nextval('public.ota_integrations_id_seq'::regclass);


--
-- Name: otp_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_tokens ALTER COLUMN id SET DEFAULT nextval('public.otp_tokens_id_seq'::regclass);


--
-- Name: password_reset_otps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps ALTER COLUMN id SET DEFAULT nextval('public.password_reset_otps_id_seq'::regclass);


--
-- Name: pre_bills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_bills ALTER COLUMN id SET DEFAULT nextval('public.pre_bills_id_seq'::regclass);


--
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- Name: property_expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_expenses ALTER COLUMN id SET DEFAULT nextval('public.property_expenses_id_seq'::regclass);


--
-- Name: property_leases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_leases ALTER COLUMN id SET DEFAULT nextval('public.property_leases_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: salary_advances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances ALTER COLUMN id SET DEFAULT nextval('public.salary_advances_id_seq'::regclass);


--
-- Name: salary_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments ALTER COLUMN id SET DEFAULT nextval('public.salary_payments_id_seq'::regclass);


--
-- Name: staff_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations ALTER COLUMN id SET DEFAULT nextval('public.staff_invitations_id_seq'::regclass);


--
-- Name: staff_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members ALTER COLUMN id SET DEFAULT nextval('public.staff_members_id_seq'::regclass);


--
-- Name: staff_salaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries ALTER COLUMN id SET DEFAULT nextval('public.staff_salaries_id_seq'::regclass);


--
-- Name: subscription_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments ALTER COLUMN id SET DEFAULT nextval('public.subscription_payments_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: task_notification_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notification_logs ALTER COLUMN id SET DEFAULT nextval('public.task_notification_logs_id_seq'::regclass);


--
-- Name: task_reminder_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminder_logs ALTER COLUMN id SET DEFAULT nextval('public.task_reminder_logs_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: travel_agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_agents ALTER COLUMN id SET DEFAULT nextval('public.travel_agents_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.user_subscriptions_id_seq'::regclass);


--
-- Name: vendor_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions ALTER COLUMN id SET DEFAULT nextval('public.vendor_transactions_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: whatsapp_notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_notification_settings_id_seq'::regclass);


--
-- Name: whatsapp_template_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_template_settings ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_template_settings_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	0000_past_speed	1732774000000
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, user_id, user_email, user_name, action, category, resource_type, resource_id, resource_name, property_id, property_name, details, ip_address, user_agent, created_at) FROM stdin;
4	test-user-set2	test-set2@example.com	Test User	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.4.253	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-12-30 06:38:28.326647
5	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-30 06:41:34.875619
6	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.0.181	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-30 06:44:03.583629
7	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 03:40:30.14385
8	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 14:45:04.260364
9	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:01:08.664115
10	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.9.55	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:04:13.392737
11	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.11.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:06:49.169082
12	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:09:56.190712
13	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:10:22.397217
14	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:24:16.356613
15	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.11.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2025-12-31 16:24:45.324992
16	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-03 14:23:24.555132
17	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.13.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 05:34:27.57107
18	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.9.55	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 05:54:31.559051
19	user-1767506041702-opma4qx4p	backpackersheadquarter@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.13.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 06:00:52.582758
20	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.13.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 14:59:41.006354
21	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 15:00:08.139029
22	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 17:33:27.418534
23	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	158	Booking #158 - paras	10	Mount view 	{"roomId": 23, "checkIn": "2026-01-04 00:00:00", "checkOut": "2026-01-05 00:00:00", "guestName": "paras"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 17:35:50.577646
24	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	159	Booking #159 - paras	12	Mountain View Resort	{"roomId": 71, "checkIn": "2026-01-04 00:00:00", "checkOut": "2026-01-05 00:00:00", "guestName": "paras"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 17:51:55.421684
25	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	160	Booking #160 - ankit	12	Mountain View Resort	{"roomId": 71, "checkIn": "2026-01-04 00:00:00", "checkOut": "2026-01-05 00:00:00", "guestName": "ankit"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 17:52:49.515918
26	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 18:00:10.226315
27	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.4.180	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 18:07:37.663942
28	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	161	Booking #161 - paras	10	Mount view 	{"roomId": 24, "checkIn": "2026-01-04 00:00:00", "checkOut": "2026-01-05 00:00:00", "guestName": "paras"}	10.81.9.55	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 18:08:42.235355
29	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.6.140	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-04 18:21:58.243478
30	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 18:25:39.285763
31	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.9.55	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-04 18:26:36.073536
32	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.6.140	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 07:04:01.95914
33	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.6.140	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 07:06:35.669933
34	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.0.229	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 07:09:43.438349
35	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 08:59:39.901712
36	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:00:26.242991
37	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:07:50.495288
38	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.11.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:11:43.117556
39	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:44:28.030907
40	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:45:01.420162
41	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:47:09.090591
42	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.0.229	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 09:47:33.973634
43	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	162	Booking #162 - eshani	17	Prakriti Homestay	{"roomId": 94, "checkIn": "2026-01-06 00:00:00", "checkOut": "2026-01-07 00:00:00", "guestName": "eshani"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 10:09:45.3927
44	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	164	Booking #164 - ankita	17	Prakriti Homestay	{"roomId": 82, "checkIn": "2026-01-06 00:00:00", "checkOut": "2026-01-07 00:00:00", "guestName": "ankita"}	10.81.6.140	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 10:10:55.370903
45	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	165	Booking #165 - paras	17	Prakriti Homestay	{"roomId": 82, "checkIn": "2026-01-06 00:00:00", "checkOut": "2026-01-07 00:00:00", "guestName": "paras"}	10.81.5.166	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 10:11:29.785503
46	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	166	Booking #166 - sunita	17	Prakriti Homestay	{"roomId": 99, "checkIn": "2026-01-06 00:00:00", "checkOut": "2026-01-07 00:00:00", "guestName": "sunita"}	10.81.9.55	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-06 10:32:28.270054
47	test-admin-menu-reorder-super	super-admin-reorder@test.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:04:48.897137
48	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.0.229	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:06:27.588842
49	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:08:48.064518
50	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:10:20.086442
51	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.13.40	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:11:53.998169
52	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.7.16	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:13:52.364835
53	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.11.222	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:16:50.523601
54	super-admin-test	superadmin@hostezee.com	Super Admin	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.5.166	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-06 17:19:40.364049
55	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	167	Booking #167 - manoj	17	Prakriti Homestay	{"roomId": 103, "checkIn": "2026-01-07 00:00:00", "checkOut": "2026-01-08 00:00:00", "guestName": "manoj"}	10.81.14.51	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 03:22:59.972661
56	admin-hostezee	admin@hostezee.in	Admin Hostezee	super_admin_login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.13.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 04:33:51.96931
57	admin-hostezee	admin@hostezee.in	Admin Hostezee	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.1.66	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 04:34:09.023832
58	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.6.216	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 07:19:38.823132
59	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	168	Booking #168 - paras	10	Mount view 	{"roomId": 26, "checkIn": "2026-01-07 00:00:00", "checkOut": "2026-01-08 00:00:00", "guestName": "paras"}	10.81.0.113	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 07:20:28.498553
60	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.11.228	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 07:25:47.95173
61	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "email"}	10.81.9.171	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-07 07:26:34.697562
62	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	create_booking	booking	booking	169	Booking #169 - paras	17	Prakriti Homestay	{"roomId": 101, "checkIn": "2026-01-09 00:00:00", "checkOut": "2026-01-10 00:00:00", "guestName": "paras"}	10.81.1.66	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-09 11:06:59.882149
63	test-admin-awGd1t	admin9w3wBo@test.com	Test Admin	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.2.36	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-11 12:04:18.155079
85	3Z6gQW	3Z6gQW@example.com	John Doe	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.11.99	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-13 15:01:08.936627
64	\N	kanwar.jaswant25@gmail.com	paras kanwar	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "email"}	10.81.13.178	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-11 13:46:59.213625
65	user-1768206024832-bvrmz88	kanwar.jaswant25@gmail.com	Anupam Nagar	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "email"}	10.81.9.171	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 08:20:36.001015
66	user-1768206024832-bvrmz88	kanwar.jaswant25@gmail.com	Anupam Nagar	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.0.113	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 08:21:46.609481
67	user-1768206024832-bvrmz88	kanwar.jaswant25@gmail.com	Anupam Nagar	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "email"}	10.81.9.171	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 08:23:01.041174
68	user-1768206024832-bvrmz88	kanwar.jaswant25@gmail.com	Anupam Nagar	create_booking	booking	booking	170	Booking #170 - yogita	17	Prakriti Homestay	{"roomId": 103, "checkIn": "2026-01-12 00:00:00", "checkOut": "2026-01-13 00:00:00", "guestName": "yogita"}	10.81.6.75	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 08:30:55.112757
69	user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti  Kanwar	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.5.181	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 09:42:46.880445
70	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.0.113	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 13:12:17.786574
71	test-admin-salaries	salaries-test@example.com	Salary Admin	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.11.86	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-12 13:45:36.577423
72	test-wallet-user-001	wallettest@example.com	Wallet Tester	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.5.181	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-13 06:18:26.727813
73	test-wallet-user-002	wallettest2@example.com	Wallet Tester	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.6.75	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-13 06:19:41.67
74	test-wallet-user-003	\N	Wallet Tester	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.2.36	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-13 06:23:13.185502
86	test-admin-123	admin@test.com	Test Admin	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.13.176	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-14 10:14:06.810155
75	\N	thepahadistays@gmail.com	thepahadistays@gmail.com	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.0.113	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 06:42:40.735768
76	mUoHv8	mUoHv8@example.com	John Doe	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.2.36	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-13 08:04:21.209932
77	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	171	Booking #171 - paras	12	Mountain View Resort	{"roomId": 32, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "paras"}	10.81.5.181	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:17:10.764495
78	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	172	Booking #172 - anupam	12	Mountain View Resort	{"roomId": 33, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "anupam"}	10.81.2.36	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:27:10.780274
79	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	173	Booking #173 - anupam	11	woodpecker inn	{"roomId": 47, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "anupam"}	10.81.2.36	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:29:34.898769
88	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	177	Booking #177 - paras j	11	woodpecker inn	{"roomId": 28, "checkIn": "2026-01-18 00:00:00", "checkOut": "2026-01-20 00:00:00", "guestName": "paras j"}	10.81.4.87	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-16 11:54:28.452031
80	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	174	Booking #174 - paras	11	woodpecker inn	{"roomId": 49, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "paras"}	10.81.5.181	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:34:59.873737
81	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	175	Booking #175 - mama	11	woodpecker inn	{"roomId": 45, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "mama"}	10.81.0.113	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:38:44.230815
82	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	176	Booking #176 - mimi	11	woodpecker inn	{"roomId": 48, "checkIn": "2026-01-13 00:00:00", "checkOut": "2026-01-14 00:00:00", "guestName": "mimi"}	10.81.9.171	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:39:03.545038
83	user-1768293773564-udd5nhs	thepahadicompany@gmail.com	anupam singh	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "email"}	10.81.4.173	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:43:06.2365
84	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.2.36	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 08:58:02.702857
87	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.12.232	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-14 10:30:16.650823
89	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	178	Booking #178 - money k	11	woodpecker inn	{"roomId": 28, "checkIn": "2026-01-19 00:00:00", "checkOut": "2026-01-20 00:00:00", "guestName": "money k"}	10.81.0.108	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-16 11:55:42.392974
90	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	179	Booking #179 - paras	11	woodpecker inn	{"roomId": 28, "checkIn": "2026-01-20 00:00:00", "checkOut": "2026-01-19 00:00:00", "guestName": "paras"}	10.81.0.108	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-16 12:04:43.827935
91	62aZ8q	62aZ8q@example.com	John Doe	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "oauth"}	10.81.4.195	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 02:40:09.835523
92	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	180	Booking #180 - paras	12	Mountain View Resort	{"roomId": 32, "checkIn": "2026-01-17 00:00:00", "checkOut": "2026-01-18 00:00:00", "guestName": "paras"}	10.81.9.167	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 02:43:35.783804
93	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.1.210	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 02:56:22.00351
94	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	181	Booking #181 - momo	11	woodpecker inn	{"roomId": 28, "checkIn": "2026-01-17 00:00:00", "checkOut": "2026-01-18 00:00:00", "guestName": "momo"}	10.81.9.167	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 03:14:08.380907
95	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.5.21	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 06:16:50.356927
96	admin-hostezee	admin@hostezee.in	Admin Hostezee	super_admin_login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.5.21	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 06:47:06.001559
97	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.13.32	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 06:55:33.960157
98	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.6.178	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:06:52.36285
99	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.13.32	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:08:37.92184
100	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.4.213	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:12:25.007782
101	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.14.87	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:14:57.215839
102	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.0.144	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:17:58.390363
103	admin-hostezee	admin@hostezee.in	Admin Hostezee	login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "oauth"}	10.81.14.87	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-17 07:20:53.665982
104	48913322	paras.thakur18@gmail.com	Paras Thakur	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.6.178	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 08:23:24.659436
105	user-1768293773564-udd5nhs	thepahadicompany@gmail.com	anupam singh	login	auth	\N	\N	\N	\N	\N	{"role": "staff", "method": "email"}	10.81.14.87	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 08:32:43.570544
106	user-1768293773564-udd5nhs	thepahadicompany@gmail.com	anupam singh	logout	auth	\N	\N	\N	\N	\N	{"method": "oauth"}	10.81.0.144	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 16:35:36.899706
107	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.12.142	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-17 16:36:56.862646
112	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.4.223	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2026-01-21 19:04:24.587988
108	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	183	Booking #183 - paras	10	Mount view 	{"roomId": 23, "checkIn": "2026-01-19 00:00:00", "checkOut": "2026-01-22 00:00:00", "guestName": "paras"}	10.81.11.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-19 14:59:46.373975
109	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	184	Booking #184 - paras	12	Mountain View Resort	{"roomId": 71, "checkIn": "2026-01-21 00:00:00", "checkOut": "2026-01-22 00:00:00", "guestName": "paras"}	10.81.3.98	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-21 18:01:02.694044
110	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	185	Booking #185 - momo	12	Mountain View Resort	{"roomId": 71, "checkIn": "2026-01-21 00:00:00", "checkOut": "2026-01-22 00:00:00", "guestName": "momo"}	10.81.14.87	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-21 18:05:36.3967
111	48913322	paras.thakur18@gmail.com	Paras Thakur	create_booking	booking	booking	186	Booking #186 - paras	10	Mount view 	{"roomId": 31, "checkIn": "2026-01-22 00:00:00", "checkOut": "2026-01-23 00:00:00", "guestName": "paras"}	10.81.1.181	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-21 18:37:59.584549
113	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.12.93	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-25 07:50:05.878705
114	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.11.109	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-25 09:16:27.959384
115	48913322	paras.thakur18@gmail.com	Paras Thakur	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.16.135	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-02 08:54:29.955776
116	48947216	thepahadistays@gmail.com	thepahadistays@gmail.com	login	auth	\N	\N	\N	\N	\N	{"role": "admin", "method": "oauth"}	10.81.0.84	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-04 05:44:03.882592
117	admin-hostezee	admin@hostezee.in	Admin Hostezee	super_admin_login	auth	\N	\N	\N	\N	\N	{"role": "super-admin", "method": "email"}	10.81.14.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-04 05:45:23.463262
\.


--
-- Data for Name: agent_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agent_payments (id, property_id, agent_id, amount, payment_method, payment_date, reference_number, notes, allocations, created_by, created_at) FROM stdin;
1	10	2	1000.00	bank_transfer	2026-01-22			[{"amount": 1000, "billId": 74, "status": "partial", "bookingId": 186}]	48913322	2026-01-21 19:11:21.430771
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_records (id, staff_id, attendance_date, status, remarks, created_at, updated_at, property_id) FROM stdin;
4	6	2025-11-23	absent	\N	2025-11-23 18:22:47.977182	2025-11-23 18:22:47.977182	10
5	6	2025-11-23	absent	\N	2025-11-23 18:22:51.007317	2025-11-23 18:22:51.007317	10
6	6	2025-11-23	absent	\N	2025-11-23 18:28:26.62962	2025-11-23 18:28:26.62962	10
7	2	2025-11-23	absent	\N	2025-11-23 18:31:52.832855	2025-11-23 18:31:52.832855	12
8	6	2025-11-24	absent	\N	2025-11-24 03:16:35.974807	2025-11-24 03:16:35.974807	10
10	6	2026-01-12	absent	\N	2026-01-12 09:12:32.392996	2026-01-12 09:12:32.392996	10
11	3	2026-01-12	absent	\N	2026-01-12 09:12:42.660535	2026-01-12 09:12:42.660535	12
12	7	2026-01-12	absent	\N	2026-01-12 09:13:09.451476	2026-01-12 09:13:09.451476	10
13	6	2026-01-12	absent	\N	2026-01-12 09:17:53.433756	2026-01-12 09:17:53.433756	10
14	7	2026-01-12	absent	\N	2026-01-12 09:18:26.010575	2026-01-12 09:18:26.010575	10
15	7	2026-01-12	absent	\N	2026-01-12 09:18:27.22207	2026-01-12 09:18:27.22207	10
16	7	2026-01-12	absent	\N	2026-01-12 09:18:28.536342	2026-01-12 09:18:28.536342	10
17	7	2026-01-12	absent	\N	2026-01-12 09:18:35.606723	2026-01-12 09:18:35.606723	10
18	9	2026-01-12	absent	\N	2026-01-12 09:24:29.780047	2026-01-12 09:24:29.780047	17
19	7	2026-01-13	leave	\N	2026-01-13 07:52:47.931422	2026-01-13 07:52:47.931422	10
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, entity_type, entity_id, action, user_id, user_role, property_context, change_set, metadata, created_at) FROM stdin;
2	booking	84	create	48913322	admin	{10}	{"after": {"roomId": 23, "status": "confirmed", "guestName": "Test Guest"}}	{"action": "booking_created"}	2025-11-30 02:41:37.513952
3	room	23	update	48913322	admin	{10}	{"after": {"status": "occupied"}, "before": {"status": "available"}}	{"action": "room_status_changed"}	2025-11-30 03:41:37.513952
4	bill	38	create	48913322	admin	{10}	{"after": {"status": "pending", "totalAmount": 5000}}	{"action": "bill_generated"}	2025-11-30 04:11:37.513952
5	order	58	create	48913322	admin	{11}	{"after": {"items": ["Paneer Tikka", "Dal Makhani"], "totalAmount": 850}}	{"action": "food_order_placed"}	2025-11-30 04:26:37.513952
6	guest	96	update	48913322	admin	{10}	{"after": {"idProofUploaded": true}, "before": {"idProofUploaded": false}}	{"action": "id_proof_uploaded"}	2025-11-30 04:36:37.513952
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, entity_type, entity_id, action, user_id, user_role, property_context, change_set, metadata, created_at) FROM stdin;
1	booking	83	cancel	unknown	\N	\N	{"refundAmount": 0, "advanceAmount": 0, "cancellationType": "full_refund", "cancellationReason": "\\n", "cancellationCharges": 0}	{"guestId": 95, "propertyId": 10}	2025-11-30 10:48:40.890505
2	booking	53	cancel	48913322	admin	\N	{"refundAmount": 0, "advanceAmount": 0, "cancellationType": "full_refund", "cancellationReason": "ok", "cancellationCharges": 0}	{"guestId": 56, "propertyId": 10}	2025-12-01 16:29:47.225675
3	booking	100	update	48913322	admin	\N	{"roomId": 35, "source": "Walk-in", "status": "checked-in", "roomIds": null, "mealPlan": "EP", "bedsBooked": null, "checkInDate": "2025-12-02T00:00:00.000Z", "customPrice": null, "totalAmount": "2000.00", "checkOutDate": "2025-12-03T17:30:00.000Z", "advanceAmount": "0", "travelAgentId": null, "isGroupBooking": false, "numberOfGuests": 1}	{"newStatus": "checked-in", "updatedFields": ["roomId", "checkInDate", "checkOutDate", "numberOfGuests", "status", "totalAmount", "customPrice", "advanceAmount", "source", "mealPlan", "roomIds", "isGroupBooking", "bedsBooked", "travelAgentId"], "previousStatus": "checked-in"}	2025-12-02 03:09:51.949699
4	booking	86	update	48913322	admin	\N	{"roomId": null, "source": "Walk-in", "status": "confirmed", "roomIds": [27, 31, 37, 36, 35, 39, 34], "mealPlan": "MAP", "bedsBooked": null, "checkInDate": "2025-12-05T00:00:00.000Z", "customPrice": null, "totalAmount": "7000.00", "checkOutDate": "2025-12-06T00:00:00.000Z", "advanceAmount": "0", "travelAgentId": null, "isGroupBooking": false, "numberOfGuests": 1}	{"newStatus": "confirmed", "updatedFields": ["roomId", "checkInDate", "checkOutDate", "numberOfGuests", "status", "totalAmount", "customPrice", "advanceAmount", "source", "mealPlan", "roomIds", "isGroupBooking", "bedsBooked", "travelAgentId"], "previousStatus": "confirmed"}	2025-12-05 08:00:40.052961
5	booking	106	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-22T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "500"}, "before": {"checkInDate": "2025-12-21 00:00:00", "customPrice": "1000.00", "checkOutDate": "2025-12-22 00:00:00", "advanceAmount": "500.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 05:59:42.653527
6	booking	106	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-22T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "500"}, "before": {"checkInDate": "2025-12-22 00:00:00", "customPrice": "1000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "500.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 06:00:10.711694
7	booking	106	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-22T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "700"}, "before": {"checkInDate": "2025-12-22 00:00:00", "customPrice": "1000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "500.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 06:04:48.878753
8	booking	106	update	48913322	admin	\N	{"after": {"roomId": 24, "checkInDate": "2025-12-22T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "700"}, "before": {"roomId": 23, "checkInDate": "2025-12-22 00:00:00", "customPrice": "1000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "700.00"}}	{"newStatus": "pending", "updatedFields": ["roomId", "checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 06:05:37.039293
9	booking	106	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-21T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2025-12-22T00:00:00.000Z", "advanceAmount": "700"}, "before": {"checkInDate": "2025-12-22 00:00:00", "customPrice": "1000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "700.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 07:32:58.896003
10	booking	106	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-21T00:00:00.000Z", "customPrice": "1000", "totalAmount": "2000.00", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "700"}, "before": {"checkInDate": "2025-12-21 00:00:00", "customPrice": "1000.00", "totalAmount": "1000.00", "checkOutDate": "2025-12-22 00:00:00", "advanceAmount": "700.00"}}	{"newStatus": "checked-in", "updatedFields": ["checkInDate", "checkOutDate", "totalAmount", "customPrice", "advanceAmount"], "previousStatus": "checked-in"}	2025-12-21 07:41:04.360035
11	booking	110	update	48913322	admin	\N	{"after": {"roomId": null, "bedsBooked": null, "checkInDate": "2025-12-22T00:00:00.000Z", "totalAmount": "18000.00", "checkOutDate": "2025-12-24T00:00:00.000Z", "advanceAmount": "0", "isGroupBooking": false}, "before": {"roomId": 39, "bedsBooked": 9, "checkInDate": "2025-12-22 00:00:00", "totalAmount": "9000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "0.00", "isGroupBooking": true}}	{"newStatus": "pending", "updatedFields": ["roomId", "checkInDate", "checkOutDate", "totalAmount", "advanceAmount", "isGroupBooking", "bedsBooked"], "previousStatus": "pending"}	2025-12-21 09:21:19.127873
12	booking	110	update	48913322	admin	\N	{"after": {"source": "OTA", "mealPlan": "MAP", "checkInDate": "2025-12-22T00:00:00.000Z", "totalAmount": "9000.00", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "0"}, "before": {"source": "Walk-in", "mealPlan": "EP", "checkInDate": "2025-12-22 00:00:00", "totalAmount": "18000.00", "checkOutDate": "2025-12-24 00:00:00", "advanceAmount": "0.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "totalAmount", "advanceAmount", "source", "mealPlan"], "previousStatus": "pending"}	2025-12-21 09:21:50.609026
13	booking	110	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-22T00:00:00.000Z", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "500"}, "before": {"checkInDate": "2025-12-22 00:00:00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "0.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 12:21:07.292648
14	booking	110	update	48913322	admin	\N	{"after": {"checkInDate": "2025-12-21T00:00:00.000Z", "totalAmount": "18000.00", "checkOutDate": "2025-12-23T00:00:00.000Z", "advanceAmount": "500"}, "before": {"checkInDate": "2025-12-22 00:00:00", "totalAmount": "9000.00", "checkOutDate": "2025-12-23 00:00:00", "advanceAmount": "500.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "totalAmount", "advanceAmount"], "previousStatus": "pending"}	2025-12-21 12:55:11.514868
15	booking	118	update	user-1764918654799-kdd60a87r	\N	\N	{"after": {"checkInDate": "2025-12-25T00:00:00.000Z", "customPrice": "1000", "totalAmount": "1000.00", "checkOutDate": "2025-12-26T00:00:00.000Z", "advanceAmount": "0"}, "before": {"checkInDate": "2025-12-25 00:00:00", "customPrice": null, "totalAmount": "0.00", "checkOutDate": "2025-12-26 00:00:00", "advanceAmount": "0.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "totalAmount", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-25 15:54:53.032675
16	booking	119	update	user-1764918654799-kdd60a87r	\N	\N	{"after": {"checkInDate": "2025-12-25T00:00:00.000Z", "customPrice": "1000", "totalAmount": "1000.00", "checkOutDate": "2025-12-26T00:00:00.000Z", "advanceAmount": "0"}, "before": {"checkInDate": "2025-12-25 00:00:00", "customPrice": null, "totalAmount": "0.00", "checkOutDate": "2025-12-26 00:00:00", "advanceAmount": "0.00"}}	{"newStatus": "pending", "updatedFields": ["checkInDate", "checkOutDate", "totalAmount", "customPrice", "advanceAmount"], "previousStatus": "pending"}	2025-12-25 16:12:37.344127
17	booking	158	update	48913322	admin	\N	{"after": {"checkInDate": "2026-01-04T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2026-01-05T00:00:00.000Z", "advanceAmount": "300"}, "before": {"checkInDate": "2026-01-04 00:00:00", "customPrice": null, "checkOutDate": "2026-01-05 00:00:00", "advanceAmount": "300.00"}}	{"newStatus": "confirmed", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "confirmed"}	2026-01-04 17:38:17.191832
18	booking	158	update	48913322	admin	\N	{"after": {"checkInDate": "2026-01-04T00:00:00.000Z", "customPrice": "1000", "checkOutDate": "2026-01-05T00:00:00.000Z", "advanceAmount": "300"}, "before": {"checkInDate": "2026-01-04 00:00:00", "customPrice": "1000.00", "checkOutDate": "2026-01-05 00:00:00", "advanceAmount": "300.00"}}	{"newStatus": "confirmed", "updatedFields": ["checkInDate", "checkOutDate", "customPrice", "advanceAmount"], "previousStatus": "confirmed"}	2026-01-04 17:44:09.270736
\.


--
-- Data for Name: bank_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_transactions (id, property_id, upload_id, transaction_date, description, amount, transaction_type, suggested_category_id, assigned_category_id, is_imported, imported_expense_id, match_confidence, raw_data, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: beds24_room_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.beds24_room_mappings (id, property_id, beds24_room_id, room_type, created_at, beds24_room_name) FROM stdin;
1	14	637602	Deluxe Double Room with Balcony	2025-12-25 17:05:31.524764	\N
2	14	637603	Double Room with Balcony	2025-12-25 17:05:31.524764	\N
3	14	637604	King Room with Mountain View	2025-12-25 17:05:31.524764	\N
\.


--
-- Data for Name: bills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bills (id, booking_id, guest_id, room_charges, food_charges, extra_charges, subtotal, gst_rate, gst_amount, service_charge_rate, service_charge_amount, total_amount, payment_status, payment_method, paid_at, created_at, updated_at, merged_booking_ids, advance_paid, balance_amount, discount_type, discount_value, discount_amount, include_gst, include_service_charge, due_date, pending_reason, payment_methods, gst_on_rooms, gst_on_food) FROM stdin;
66	162	196	1500.00	0.00	0.00	1500.00	5.00	75.00	10.00	0.00	1575.00	paid	cash	2026-01-06 10:46:59.133	2026-01-06 10:37:30.346082	2026-01-06 10:46:59.156	{165,162}	650.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 925, "method": "cash"}]	f	f
67	168	202	4000.00	0.00	0.00	4000.00	5.00	200.00	10.00	0.00	4200.00	paid	cash	2026-01-13 07:15:35.741	2026-01-13 07:15:35.777189	2026-01-13 07:15:35.777189	\N	1200.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 3000, "method": "cash"}]	t	f
68	172	206	2000.00	0.00	0.00	2000.00	5.00	0.00	10.00	0.00	2000.00	paid	cash	2026-01-13 08:28:21.501	2026-01-13 08:28:21.535658	2026-01-13 08:28:21.535658	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 2000, "method": "cash"}]	f	f
69	173	207	10000.00	0.00	0.00	10000.00	5.00	0.00	10.00	0.00	10000.00	paid	cash	2026-01-13 08:30:04.362	2026-01-13 08:30:04.399623	2026-01-13 08:30:04.399623	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 10000, "method": "cash"}]	f	f
70	174	208	1000.00	0.00	0.00	1000.00	5.00	0.00	10.00	0.00	1000.00	paid	cash	2026-01-13 08:35:59.893	2026-01-13 08:35:59.926266	2026-01-13 08:35:59.926266	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 1000, "method": "cash"}]	f	f
71	176	210	10000.00	0.00	0.00	10000.00	5.00	0.00	10.00	0.00	10000.00	paid	split	2026-01-13 08:52:29.067	2026-01-13 08:52:29.107798	2026-01-13 08:52:29.107798	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 10000, "method": "split"}]	f	f
72	175	209	1000.00	0.00	0.00	1000.00	5.00	50.00	10.00	0.00	1050.00	paid	split	2026-01-17 02:14:01.091	2026-01-17 02:14:01.126775	2026-01-17 02:14:01.126775	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 1050, "method": "split"}]	t	f
73	181	218	4000.00	310.00	0.00	4310.00	5.00	200.00	10.00	0.00	4510.00	paid	split	2026-01-19 10:24:32.791	2026-01-19 10:24:32.829291	2026-01-19 10:24:32.829291	\N	0.00	0.00	\N	\N	0.00	t	f	\N	\N	[{"amount": 500, "method": "cash"}, {"amount": 1910, "method": "online"}]	t	f
74	186	224	4000.00	0.00	0.00	4000.00	5.00	200.00	10.00	0.00	4200.00	partial	\N	\N	2026-01-21 18:45:07.539124	2026-01-21 19:11:21.394	\N	1000.00	4200.00	\N	\N	0.00	t	f	2026-01-29 00:00:00	travel_agent	\N	t	f
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, property_id, room_id, guest_id, check_in_date, check_out_date, status, number_of_guests, special_requests, total_amount, created_by, created_at, updated_at, custom_price, advance_amount, source, meal_plan, room_ids, is_group_booking, beds_booked, travel_agent_id, cancellation_date, cancellation_type, cancellation_charges, refund_amount, cancellation_reason, cancelled_by, actual_check_in_time, payment_link_id, payment_link_url, payment_link_expiry, advance_payment_status, reminder_count, last_reminder_at, external_booking_id, external_source) FROM stdin;
168	10	26	202	2026-01-07 00:00:00	2026-01-08 00:00:00	checked-out	8	\N	4000.00	\N	2026-01-07 07:20:26.054583	2026-01-13 07:15:36.333	\N	1200.00	Walk-in	EP	{23,24,26,27}	t	4	\N	\N	\N	0.00	0.00	\N	\N	2026-01-07 07:21:11.961	plink_S0u74xk6LiOXP1	https://rzp.io/rzp/riln2FEc	2026-01-08 07:20:34	paid	0	\N	\N	\N
171	12	32	205	2026-01-13 00:00:00	2026-01-14 00:00:00	pending	1	\N	2000.00	\N	2026-01-13 08:17:09.168115	2026-01-13 08:17:09.168115	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
158	10	23	192	2026-01-04 00:00:00	2026-01-05 00:00:00	confirmed	1	\N	1000.00	\N	2026-01-04 17:35:49.171351	2026-01-04 17:44:09.237	1000.00	300.00	Booking.com	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	plink_Rzt0Et44Cfu5cI	https://rzp.io/rzp/maIKqKD	2026-01-05 17:36:24	paid	0	\N	\N	\N
161	10	24	195	2026-01-04 00:00:00	2026-01-05 00:00:00	pending	1	\N	800.00	\N	2026-01-04 18:08:41.14307	2026-01-04 18:08:41.14307	800.00	200.00	Airbnb	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
159	12	71	193	2026-01-04 00:00:00	2026-01-05 00:00:00	pending	1	\N	700.00	\N	2026-01-04 17:51:54.072493	2026-01-04 17:51:54.072493	\N	0.00	Walk-in	EP	\N	f	1	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
160	12	71	194	2026-01-04 00:00:00	2026-01-05 00:00:00	pending	1	\N	700.00	\N	2026-01-04 17:52:49.167325	2026-01-04 17:52:49.167325	\N	0.00	Walk-in	EP	\N	f	1	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
164	17	82	198	2026-01-06 00:00:00	2026-01-07 00:00:00	pending	1	\N	400.00	\N	2026-01-06 10:10:55.012591	2026-01-06 10:10:55.012591	400.00	400.00	Walk-in	EP	\N	f	1	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
185	12	71	223	2026-01-21 00:00:00	2026-01-22 00:00:00	pending	2	\N	700.00	\N	2026-01-21 18:05:35.915742	2026-01-21 18:05:35.915742	\N	0.00	Walk-in	EP	\N	f	2	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
172	12	33	206	2026-01-13 00:00:00	2026-01-14 00:00:00	checked-out	1	\N	2000.00	\N	2026-01-13 08:27:10.297435	2026-01-13 08:28:21.973	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-13 08:27:55.182	\N	\N	\N	not_required	0	\N	\N	\N
162	17	94	196	2026-01-06 00:00:00	2026-01-07 00:00:00	checked-out	1	\N	1000.00	\N	2026-01-06 10:09:44.965138	2026-01-06 10:46:59.448	1000.00	500.00	OTA	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-06 10:26:37.519	\N	\N	\N	not_required	0	\N	\N	\N
165	17	82	199	2026-01-06 00:00:00	2026-01-07 00:00:00	checked-out	2	\N	500.00	\N	2026-01-06 10:11:28.196231	2026-01-06 10:46:59.52	\N	150.00	Walk-in	EP	\N	f	2	\N	\N	\N	0.00	0.00	\N	\N	\N	plink_S0YfhPX8vAde8k	https://rzp.io/rzp/YJ2O5bh	2026-01-07 10:22:05	paid	0	\N	\N	\N
166	17	99	200	2026-01-06 00:00:00	2026-01-07 00:00:00	checked-in	1	\N	1200.00	\N	2026-01-06 10:32:27.894111	2026-01-06 10:32:27.894111	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-06 12:16:17.65	\N	\N	\N	not_required	0	\N	\N	\N
173	11	47	207	2026-01-13 00:00:00	2026-01-14 00:00:00	checked-out	1	\N	10000.00	\N	2026-01-13 08:29:34.427934	2026-01-13 08:30:04.839	10000.00	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-13 08:29:53.946	\N	\N	\N	not_required	0	\N	\N	\N
186	10	31	224	2026-01-22 00:00:00	2026-01-23 00:00:00	checked-out	1	\N	4000.00	\N	2026-01-21 18:37:58.092711	2026-01-21 18:45:08.052	\N	0.00	Travel Agent	MAP	{23,24,26,31}	t	4	2	\N	\N	0.00	0.00	\N	\N	2026-01-21 18:43:58.864	\N	\N	\N	not_required	0	\N	\N	\N
167	17	103	201	2026-01-07 00:00:00	2026-01-08 00:00:00	cancelled	1	\N	1200.00	\N	2026-01-07 03:22:59.517354	2026-01-09 10:21:08.137	\N	360.00	Walk-in	EP	\N	f	\N	\N	2026-01-09 10:21:08.137	\N	0.00	0.00	Auto-cancelled: Advance payment not received within 48 hours	\N	\N	plink_S0qLLn8hj5ZovE	https://rzp.io/rzp/yXEO9yIF	2026-01-08 03:39:18	cancelled	0	\N	\N	\N
174	11	49	208	2026-01-13 00:00:00	2026-01-14 00:00:00	checked-out	1	\N	1000.00	\N	2026-01-13 08:34:58.434448	2026-01-13 08:36:00.411	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-13 08:35:29.262	\N	\N	\N	not_required	0	\N	\N	\N
169	17	101	203	2026-01-09 00:00:00	2026-01-10 00:00:00	pending_advance	1	\N	1200.00	\N	2026-01-09 11:06:58.560873	2026-01-12 06:35:39.391	\N	360.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	plink_S1l2bscNZcpwvl	https://rzp.io/rzp/9YqCItxV	2026-01-10 11:07:06	pending	3	2026-01-12 06:35:39.391	\N	\N
170	17	103	204	2026-01-12 00:00:00	2026-01-13 00:00:00	checked-in	1	\N	1200.00	\N	2026-01-12 08:30:54.703567	2026-01-12 08:31:16.35	\N	360.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-12 08:31:39.959	plink_S2tzKMyopc8kj1	https://rzp.io/rzp/hNq3Cq77	2026-01-13 08:31:14	pending	0	\N	\N	\N
176	11	48	210	2026-01-13 00:00:00	2026-01-14 00:00:00	checked-out	1	\N	10000.00	\N	2026-01-13 08:39:03.034449	2026-01-13 08:52:29.605	10000.00	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-13 08:39:20.391	\N	\N	\N	not_required	0	\N	\N	\N
177	11	28	211	2026-01-18 00:00:00	2026-01-20 00:00:00	pending	1	\N	4000.00	\N	2026-01-16 11:54:26.925556	2026-01-16 11:54:26.925556	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
178	11	28	212	2026-01-19 00:00:00	2026-01-20 00:00:00	pending	1	\N	2000.00	\N	2026-01-16 11:55:41.190451	2026-01-16 11:55:41.190451	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
179	11	28	216	2026-01-19 00:00:00	2026-01-20 00:00:00	pending	1	\N	2000.00	\N	2026-01-16 12:04:42.394063	2026-01-16 12:04:42.394063	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
175	11	45	209	2026-01-13 00:00:00	2026-01-14 00:00:00	checked-out	1	\N	1000.00	\N	2026-01-13 08:38:43.757124	2026-01-17 02:14:01.653	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-13 08:39:31.55	\N	\N	\N	not_required	0	\N	\N	\N
180	12	32	217	2026-01-17 00:00:00	2026-01-18 00:00:00	checked-in	1	\N	2000.00	\N	2026-01-17 02:43:34.293962	2026-01-17 02:43:34.293962	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	2026-01-17 03:01:14.117	\N	\N	\N	not_required	0	\N	\N	\N
181	11	28	218	2026-01-17 00:00:00	2026-01-18 00:00:00	checked-out	1	\N	2000.00	\N	2026-01-17 03:14:06.737026	2026-01-19 10:24:33.394	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
182	12	32	219	2026-01-20 00:00:00	2026-01-21 00:00:00	confirmed	1	\N	2000.00	\N	2026-01-19 10:21:02.017828	2026-01-19 10:21:02.017828	\N	0.00	walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
183	10	23	220	2026-01-19 00:00:00	2026-01-22 00:00:00	pending	1	\N	3000.00	\N	2026-01-19 14:59:44.987299	2026-01-19 14:59:44.987299	\N	0.00	Walk-in	EP	\N	f	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
184	12	71	221	2026-01-21 00:00:00	2026-01-22 00:00:00	pending	2	\N	700.00	\N	2026-01-21 18:01:01.210092	2026-01-21 18:01:01.210092	\N	0.00	Walk-in	EP	\N	f	2	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	\N	not_required	0	\N	\N	\N
\.


--
-- Data for Name: change_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.change_approvals (id, user_id, change_type, booking_id, room_id, description, old_value, new_value, status, approved_by, approved_at, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.communications (id, enquiry_id, booking_id, recipient_phone, recipient_name, message_type, template_id, message_content, status, twilio_sid, error_message, sent_by, created_at) FROM stdin;
\.


--
-- Data for Name: contact_enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_enquiries (id, name, email, property_name, message, status, created_at, updated_at, phone) FROM stdin;
\.


--
-- Data for Name: daily_closings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_closings (id, property_id, closing_date, total_revenue, total_collected, total_expenses, total_pending_receivable, wallet_balances, revenue_breakdown, collection_breakdown, expense_breakdown, bookings_count, check_ins_count, check_outs_count, food_orders_count, expense_entries_count, status, closed_by, closed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_performance_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_performance_metrics (id, staff_id, total_tasks_assigned, tasks_completed_on_time, tasks_completed_late, average_completion_time_minutes, performance_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enquiries (id, property_id, guest_name, guest_phone, guest_email, check_in_date, check_out_date, room_id, number_of_guests, price_quoted, advance_amount, status, stripe_payment_intent_id, stripe_payment_link_url, twilio_message_sid, special_requests, created_by, created_at, updated_at, payment_status, room_ids, is_group_enquiry, meal_plan, beds_booked, source, travel_agent_id) FROM stdin;
29	12	nanu	9001949260	\N	2026-01-20 00:00:00	2026-01-21 00:00:00	32	1	\N	\N	confirmed	\N	\N	\N	\N	\N	2026-01-19 10:19:22.368378	2026-01-19 10:21:02.054	received	\N	f	EP	\N	Walk-in	\N
\.


--
-- Data for Name: error_crashes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.error_crashes (id, user_id, error_message, error_stack, error_type, page, browser_info, user_agent, is_resolved, created_at) FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_categories (id, property_id, name, description, keywords, is_default, created_at, updated_at) FROM stdin;
12	\N	Rent	Property lease and rent payments	{rent,lease,landlord,"property payment"}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
13	\N	Electricity	Electricity and power bills	{electricity,power,electric,energy,utility}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
14	\N	Groceries	Food and grocery purchases	{grocery,food,vegetables,fruits,market,supplies}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
15	\N	Salaries	Staff salaries and wages	{salary,wages,payroll,"staff payment",employee}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
16	\N	Maintenance	Property maintenance and repairs	{maintenance,repair,fix,plumbing,painting,cleaning}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
17	\N	Water	Water and sewage bills	{water,sewage,drainage}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
18	\N	Internet & Phone	Internet and telephone bills	{internet,wifi,broadband,phone,telephone,mobile}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
19	\N	Marketing	Advertising and marketing expenses	{marketing,advertising,promotion,"social media"}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
20	\N	Supplies	General supplies and consumables	{supplies,consumables,toiletries,amenities}	t	2025-10-29 11:45:38.014228	2025-10-29 11:45:38.014228
\.


--
-- Data for Name: extra_services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.extra_services (id, booking_id, service_name, description, amount, created_at, service_type, vendor_name, vendor_contact, commission, service_date) FROM stdin;
\.


--
-- Data for Name: feature_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_settings (id, property_id, food_order_notifications, whatsapp_notifications, email_notifications, payment_reminders, auto_checkout, auto_salary_calculation, attendance_tracking, performance_analytics, expense_forecasting, budget_alerts, created_at, updated_at, advance_payment_enabled, advance_payment_percentage, advance_payment_expiry_hours, payment_reminder_enabled, payment_reminder_hours, max_payment_reminders) FROM stdin;
1	10	t	t	t	t	f	t	t	t	f	t	2025-11-30 04:35:10.762426	2025-11-30 04:35:10.762426	t	30.00	24	t	6	3
2	11	t	t	t	t	f	t	t	t	f	t	2025-11-30 04:35:10.762426	2025-11-30 04:35:10.762426	t	30.00	24	t	6	3
3	12	t	t	t	t	f	t	t	t	f	t	2025-11-30 04:35:10.762426	2025-11-30 04:35:10.762426	t	30.00	24	t	6	3
4	17	t	t	f	t	t	t	t	t	t	t	2026-01-04 18:32:17.111946	2026-01-04 18:32:17.111946	t	30.00	24	t	6	3
\.


--
-- Data for Name: food_order_whatsapp_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.food_order_whatsapp_settings (id, property_id, enabled, phone_numbers, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guests (id, full_name, email, phone, id_proof_type, id_proof_number, address, preferences, total_stays, created_at, updated_at, id_proof_image) FROM stdin;
192	paras kanwar	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-04 17:35:48.699664	2026-01-04 17:44:08.689	\N
193	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-04 17:51:53.687371	2026-01-04 17:51:53.687371	\N
194	ankit	\N	9001949260	\N	\N	\N	\N	1	2026-01-04 17:52:48.764272	2026-01-04 17:52:48.764272	\N
195	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-04 18:08:40.750865	2026-01-04 18:08:40.750865	\N
197	ankita	\N	9001949260	\N	\N	\N	\N	1	2026-01-06 10:10:38.014208	2026-01-06 10:10:38.014208	\N
198	ankita	\N	9001949260	\N	\N	\N	\N	1	2026-01-06 10:10:54.631215	2026-01-06 10:10:54.631215	\N
224	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-21 18:37:57.442927	2026-01-21 18:39:12.505	/objects/uploads/c6479468-1386-4b5b-bbfb-70dea6567e60
199	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-06 10:11:27.796219	2026-01-06 10:25:05.963	\N
196	eshani	\N	9001949260	\N	\N	\N	\N	1	2026-01-06 10:09:44.583371	2026-01-06 10:26:37.095	/objects/uploads/e2422f2c-2a6e-4da2-abd9-d9de9ceb4398
200	sunita	\N	9001949260	\N	\N	\N	\N	1	2026-01-06 10:32:27.477206	2026-01-06 12:16:17.188	/objects/uploads/3376cf3e-b251-4be0-8824-22f3b0846f06
201	manoj	\N	9220757003	\N	\N	\N	\N	1	2026-01-07 03:22:59.120583	2026-01-07 03:22:59.120583	\N
202	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-07 07:20:25.617881	2026-01-07 07:21:11.335	/objects/uploads/5b9f3c14-22a1-4103-8685-185541bffd54
203	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-09 11:06:58.172349	2026-01-09 11:06:58.172349	\N
204	yogita	\N	9001949260	\N	\N	\N	\N	1	2026-01-12 08:30:54.316584	2026-01-12 08:31:39.422	/objects/uploads/b6bad8e9-37c6-4419-b644-2d3088e750e1
205	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-13 08:17:08.757226	2026-01-13 08:17:08.757226	\N
206	anupam	\N	9001949260	\N	\N	\N	\N	1	2026-01-13 08:27:09.883616	2026-01-13 08:27:54.738	/objects/uploads/4be31586-feda-4b26-bc2b-48d4cc618789
207	anupam	\N	9001949260	\N	\N	\N	\N	1	2026-01-13 08:29:34.038088	2026-01-13 08:29:53.36	/objects/uploads/61f4ce83-65da-4db7-8cf0-9ff0b51b291f
208	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-13 08:34:58.026369	2026-01-13 08:35:28.725	/objects/uploads/ba53369c-dd1c-4900-b52a-b43a863a9369
210	mimi	\N	9001949260	\N	\N	\N	\N	1	2026-01-13 08:39:02.65716	2026-01-13 08:39:19.779	/objects/uploads/3e2d9c29-1fd1-4672-afa0-e5b41c129015
209	mama	\N	9001949260	\N	\N	\N	\N	1	2026-01-13 08:38:43.365081	2026-01-13 08:39:31.085	/objects/uploads/01073010-37c5-462d-92cb-4e4c87d1f078
211	paras j	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-16 11:54:26.516084	2026-01-16 11:54:26.516084	\N
212	money k	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-16 11:55:40.798149	2026-01-16 11:55:40.798149	\N
213	mo	\N	9001949260	\N	\N	\N	\N	0	2026-01-16 12:01:42.210982	2026-01-16 12:01:42.210982	\N
214	mo	\N	9001949260	\N	\N	\N	\N	0	2026-01-16 12:01:56.003473	2026-01-16 12:01:56.003473	\N
215	paras	paras.thakur18@gmail.com	900	\N	\N	\N	\N	0	2026-01-16 12:03:46.413436	2026-01-16 12:03:46.413436	\N
216	paras	paras.thakur18@gmail.com	99	\N	\N	\N	\N	1	2026-01-16 12:04:41.947616	2026-01-16 12:04:41.947616	\N
217	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-17 02:43:33.790634	2026-01-17 03:01:13.522	/objects/uploads/238fec24-3ab2-412c-8a11-ed8e5b55255a
218	momo	\N	9001949260	\N	\N	\N	\N	1	2026-01-17 03:14:06.314974	2026-01-17 03:29:11.081	\N
219	nanu	\N	9001949260	\N	\N	\N	\N	1	2026-01-19 10:21:01.882917	2026-01-19 10:21:01.882917	\N
220	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-19 14:59:44.557645	2026-01-19 14:59:44.557645	\N
221	paras	paras.thakur18@gmail.com	9001949260	\N	\N	\N	\N	1	2026-01-21 18:01:00.78591	2026-01-21 18:01:00.78591	\N
222	MOMO	\N	9001949260	\N	\N	\N	\N	0	2026-01-21 18:02:05.691922	2026-01-21 18:02:05.691922	\N
223	momo	\N	9001949260	\N	\N	\N	\N	1	2026-01-21 18:05:35.483051	2026-01-21 18:05:35.483051	\N
\.


--
-- Data for Name: issue_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.issue_reports (id, reported_by_user_id, property_id, title, description, category, severity, screenshot, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lease_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lease_history (id, lease_id, change_type, field_changed, old_value, new_value, changed_by, change_reason, created_at) FROM stdin;
1	4	year_override	year_2_amount	\N	1530000	paras.thakur18@gmail.com	Set Year 2 amount to ₹1530000	2026-02-02 11:30:03.314039
2	4	year_override	year_3_amount	\N	1600000	paras.thakur18@gmail.com	Set Year 3 amount to ₹1600000	2026-02-02 11:30:24.193805
\.


--
-- Data for Name: lease_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lease_payments (id, lease_id, amount, payment_date, payment_method, reference_number, notes, created_by, created_at) FROM stdin;
2	4	500000.00	2025-09-18 00:00:00	bank_transfer	\N		\N	2026-01-12 15:24:59.841784
3	4	300000.00	2026-01-25 00:00:00	bank_transfer	\N		\N	2026-01-25 07:58:48.652505
4	4	600000.00	2026-01-25 00:00:00	bank_transfer	\N		\N	2026-01-25 07:59:36.147801
5	3	4000000.00	2026-02-02 00:00:00	bank_transfer	\N		\N	2026-02-02 11:31:41.666453
6	4	2000000.00	2025-01-02 00:00:00	bank_transfer	\N		\N	2026-02-02 11:32:53.714329
\.


--
-- Data for Name: lease_year_overrides; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lease_year_overrides (id, lease_id, year_number, amount, reason, created_by, created_at, updated_at) FROM stdin;
1	4	2	1530000.00	\N	paras.thakur18@gmail.com	2026-02-02 11:30:03.224025	2026-02-02 11:30:03.224025
2	4	3	1600000.00	\N	paras.thakur18@gmail.com	2026-02-02 11:30:24.169414	2026-02-02 11:30:24.169414
\.


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_categories (id, property_id, name, image_url, start_time, end_time, display_order, is_active, created_at, updated_at) FROM stdin;
24	17	Breakfast	\N	\N	\N	0	t	2026-01-06 16:50:40.258533	2026-01-06 16:50:40.258533
25	17	Starters	\N	\N	\N	0	t	2026-01-06 16:50:40.367867	2026-01-06 16:50:40.367867
26	17	Main Course	\N	\N	\N	0	t	2026-01-06 16:50:40.515814	2026-01-06 16:50:40.515814
27	17	Rice & Biryani	\N	\N	\N	0	t	2026-01-06 16:50:40.653331	2026-01-06 16:50:40.653331
28	17	Breads	\N	\N	\N	0	t	2026-01-06 16:50:40.813035	2026-01-06 16:50:40.813035
29	17	Beverages	\N	\N	\N	0	t	2026-01-06 16:50:40.892348	2026-01-06 16:50:40.892348
30	17	Desserts	\N	\N	\N	0	t	2026-01-06 16:50:41.00704	2026-01-06 16:50:41.00704
31	17	Soups	\N	\N	\N	0	t	2026-01-07 03:45:43.358572	2026-01-07 03:45:43.358572
32	17	Rice	\N	\N	\N	0	t	2026-01-07 03:45:44.73404	2026-01-07 03:45:44.73404
33	17	Biryani	\N	\N	\N	0	t	2026-01-07 03:45:44.926502	2026-01-07 03:45:44.926502
\.


--
-- Data for Name: menu_item_add_ons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_item_add_ons (id, menu_item_id, add_on_name, add_on_price, display_order, created_at, updated_at) FROM stdin;
120	236	Cheese	30.00	0	2026-01-07 04:01:24.611047	2026-01-07 04:01:24.611047
121	237	Cheese	30.00	0	2026-01-07 04:01:24.700259	2026-01-07 04:01:24.700259
122	238	Extra Egg	20.00	0	2026-01-07 04:01:24.789814	2026-01-07 04:01:24.789814
123	239	Butter	20.00	0	2026-01-07 04:01:24.879917	2026-01-07 04:01:24.879917
124	239	Curd	30.00	0	2026-01-07 04:01:24.901772	2026-01-07 04:01:24.901772
125	240	Butter	20.00	0	2026-01-07 04:01:24.989263	2026-01-07 04:01:24.989263
126	240	Curd	30.00	0	2026-01-07 04:01:25.011307	2026-01-07 04:01:25.011307
127	241	Extra Lemon	10.00	0	2026-01-07 04:01:25.115787	2026-01-07 04:01:25.115787
128	242	Honey	30.00	0	2026-01-07 04:01:25.203778	2026-01-07 04:01:25.203778
129	242	Chocolate Syrup	40.00	0	2026-01-07 04:01:25.225466	2026-01-07 04:01:25.225466
130	243	Croutons	20.00	0	2026-01-07 04:01:25.314808	2026-01-07 04:01:25.314808
131	244	Extra Veg	30.00	0	2026-01-07 04:01:25.402609	2026-01-07 04:01:25.402609
132	245	Extra Chicken	50.00	0	2026-01-07 04:01:25.490163	2026-01-07 04:01:25.490163
133	246	Extra Chutney	20.00	0	2026-01-07 04:01:25.576314	2026-01-07 04:01:25.576314
134	247	Extra Paneer	80.00	0	2026-01-07 04:01:25.663624	2026-01-07 04:01:25.663624
135	248	Extra Sauce	30.00	0	2026-01-07 04:01:25.747932	2026-01-07 04:01:25.747932
136	249	Extra Chicken	90.00	0	2026-01-07 04:01:25.83683	2026-01-07 04:01:25.83683
137	250	Extra Chicken	100.00	0	2026-01-07 04:01:25.923076	2026-01-07 04:01:25.923076
138	251	Extra Sauce	30.00	0	2026-01-07 04:01:26.011342	2026-01-07 04:01:26.011342
139	252	Extra Ghee	30.00	0	2026-01-07 04:01:26.103329	2026-01-07 04:01:26.103329
140	253	Extra Butter	40.00	0	2026-01-07 04:01:26.19158	2026-01-07 04:01:26.19158
141	254	Extra Paneer	90.00	0	2026-01-07 04:01:26.279171	2026-01-07 04:01:26.279171
142	255	Extra Veg	50.00	0	2026-01-07 04:01:26.367612	2026-01-07 04:01:26.367612
143	256	Extra Chicken	120.00	0	2026-01-07 04:01:26.454563	2026-01-07 04:01:26.454563
144	257	Extra Chicken	120.00	0	2026-01-07 04:01:26.54133	2026-01-07 04:01:26.54133
145	258	Extra Mutton	150.00	0	2026-01-07 04:01:26.634423	2026-01-07 04:01:26.634423
146	259	Extra Rice	60.00	0	2026-01-07 04:01:26.720655	2026-01-07 04:01:26.720655
147	260	Extra Rice	60.00	0	2026-01-07 04:01:26.807467	2026-01-07 04:01:26.807467
148	261	Extra Raita	40.00	0	2026-01-07 04:01:26.897788	2026-01-07 04:01:26.897788
149	262	Extra Raita	40.00	0	2026-01-07 04:01:26.984311	2026-01-07 04:01:26.984311
150	262	Extra Chicken	120.00	0	2026-01-07 04:01:27.006215	2026-01-07 04:01:27.006215
151	263	Extra Raita	40.00	0	2026-01-07 04:01:27.09083	2026-01-07 04:01:27.09083
152	264	Butter	10.00	0	2026-01-07 04:01:27.158437	2026-01-07 04:01:27.158437
153	265	Extra Butter	10.00	0	2026-01-07 04:01:27.23097	2026-01-07 04:01:27.23097
154	266	Butter	10.00	0	2026-01-07 04:01:27.306324	2026-01-07 04:01:27.306324
155	267	Extra Butter	10.00	0	2026-01-07 04:01:27.372119	2026-01-07 04:01:27.372119
156	268	Extra Garlic	20.00	0	2026-01-07 04:01:27.447307	2026-01-07 04:01:27.447307
157	269	Extra Sugar	10.00	0	2026-01-07 04:01:27.536129	2026-01-07 04:01:27.536129
158	270	Extra Milk	20.00	0	2026-01-07 04:01:27.624427	2026-01-07 04:01:27.624427
159	271	Extra Ice Cream	40.00	0	2026-01-07 04:01:27.71271	2026-01-07 04:01:27.71271
160	272	Mint	20.00	0	2026-01-07 04:01:27.800975	2026-01-07 04:01:27.800975
161	273	Ice	10.00	0	2026-01-07 04:01:27.887503	2026-01-07 04:01:27.887503
162	274	Extra Piece	30.00	0	2026-01-07 04:01:27.975277	2026-01-07 04:01:27.975277
163	275	Chocolate Syrup	30.00	0	2026-01-07 04:01:28.061975	2026-01-07 04:01:28.061975
164	276	Ice Cream	50.00	0	2026-01-07 04:01:28.12796	2026-01-07 04:01:28.12796
\.


--
-- Data for Name: menu_item_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_item_variants (id, menu_item_id, variant_name, actual_price, discounted_price, display_order, created_at, updated_at) FROM stdin;
172	236	Single	120.00	\N	0	2026-01-07 04:01:24.565964	2026-01-07 04:01:24.565964
173	236	Double	180.00	\N	0	2026-01-07 04:01:24.588664	2026-01-07 04:01:24.588664
174	237	Single	150.00	\N	0	2026-01-07 04:01:24.656208	2026-01-07 04:01:24.656208
175	237	Double	210.00	\N	0	2026-01-07 04:01:24.678182	2026-01-07 04:01:24.678182
176	238	2 Eggs	80.00	\N	0	2026-01-07 04:01:24.744778	2026-01-07 04:01:24.744778
177	238	4 Eggs	120.00	\N	0	2026-01-07 04:01:24.766957	2026-01-07 04:01:24.766957
178	239	Single	140.00	\N	0	2026-01-07 04:01:24.836137	2026-01-07 04:01:24.836137
179	239	Double	220.00	\N	0	2026-01-07 04:01:24.858177	2026-01-07 04:01:24.858177
180	240	Single	170.00	\N	0	2026-01-07 04:01:24.945435	2026-01-07 04:01:24.945435
181	240	Double	260.00	\N	0	2026-01-07 04:01:24.967359	2026-01-07 04:01:24.967359
182	241	Regular	120.00	\N	0	2026-01-07 04:01:25.071608	2026-01-07 04:01:25.071608
183	241	Jain	120.00	\N	0	2026-01-07 04:01:25.093714	2026-01-07 04:01:25.093714
184	242	2 pcs	220.00	\N	0	2026-01-07 04:01:25.159896	2026-01-07 04:01:25.159896
185	242	4 pcs	320.00	\N	0	2026-01-07 04:01:25.18189	2026-01-07 04:01:25.18189
186	243	Cup	160.00	\N	0	2026-01-07 04:01:25.27043	2026-01-07 04:01:25.27043
187	243	Bowl	200.00	\N	0	2026-01-07 04:01:25.293905	2026-01-07 04:01:25.293905
188	244	Cup	150.00	\N	0	2026-01-07 04:01:25.358238	2026-01-07 04:01:25.358238
189	244	Bowl	190.00	\N	0	2026-01-07 04:01:25.380469	2026-01-07 04:01:25.380469
190	245	Cup	190.00	\N	0	2026-01-07 04:01:25.446363	2026-01-07 04:01:25.446363
191	245	Bowl	240.00	\N	0	2026-01-07 04:01:25.468482	2026-01-07 04:01:25.468482
192	246	Half	180.00	\N	0	2026-01-07 04:01:25.534218	2026-01-07 04:01:25.534218
193	246	Full	300.00	\N	0	2026-01-07 04:01:25.55473	2026-01-07 04:01:25.55473
194	247	Half	280.00	\N	0	2026-01-07 04:01:25.620217	2026-01-07 04:01:25.620217
195	247	Full	430.00	\N	0	2026-01-07 04:01:25.642032	2026-01-07 04:01:25.642032
196	248	Half	260.00	\N	0	2026-01-07 04:01:25.705791	2026-01-07 04:01:25.705791
197	248	Full	400.00	\N	0	2026-01-07 04:01:25.726787	2026-01-07 04:01:25.726787
198	249	Half	260.00	\N	0	2026-01-07 04:01:25.793239	2026-01-07 04:01:25.793239
199	249	Full	420.00	\N	0	2026-01-07 04:01:25.815785	2026-01-07 04:01:25.815785
200	250	Half	320.00	\N	0	2026-01-07 04:01:25.879622	2026-01-07 04:01:25.879622
201	250	Full	500.00	\N	0	2026-01-07 04:01:25.901366	2026-01-07 04:01:25.901366
202	251	Half	300.00	\N	0	2026-01-07 04:01:25.967773	2026-01-07 04:01:25.967773
203	251	Full	460.00	\N	0	2026-01-07 04:01:25.989482	2026-01-07 04:01:25.989482
204	252	Half	240.00	\N	0	2026-01-07 04:01:26.057924	2026-01-07 04:01:26.057924
205	252	Full	380.00	\N	0	2026-01-07 04:01:26.080028	2026-01-07 04:01:26.080028
206	253	Half	280.00	\N	0	2026-01-07 04:01:26.146853	2026-01-07 04:01:26.146853
207	253	Full	440.00	\N	0	2026-01-07 04:01:26.169488	2026-01-07 04:01:26.169488
208	254	Half	320.00	\N	0	2026-01-07 04:01:26.235388	2026-01-07 04:01:26.235388
209	254	Full	500.00	\N	0	2026-01-07 04:01:26.257317	2026-01-07 04:01:26.257317
210	255	Half	260.00	\N	0	2026-01-07 04:01:26.323226	2026-01-07 04:01:26.323226
211	255	Full	410.00	\N	0	2026-01-07 04:01:26.345079	2026-01-07 04:01:26.345079
212	256	Half	340.00	\N	0	2026-01-07 04:01:26.410754	2026-01-07 04:01:26.410754
213	256	Full	540.00	\N	0	2026-01-07 04:01:26.432801	2026-01-07 04:01:26.432801
214	257	Half	380.00	\N	0	2026-01-07 04:01:26.497782	2026-01-07 04:01:26.497782
215	257	Full	600.00	\N	0	2026-01-07 04:01:26.519725	2026-01-07 04:01:26.519725
216	258	Half	420.00	\N	0	2026-01-07 04:01:26.590885	2026-01-07 04:01:26.590885
217	258	Full	680.00	\N	0	2026-01-07 04:01:26.612776	2026-01-07 04:01:26.612776
218	259	Half	120.00	\N	0	2026-01-07 04:01:26.678041	2026-01-07 04:01:26.678041
219	259	Full	200.00	\N	0	2026-01-07 04:01:26.699035	2026-01-07 04:01:26.699035
220	260	Half	160.00	\N	0	2026-01-07 04:01:26.763902	2026-01-07 04:01:26.763902
221	260	Full	250.00	\N	0	2026-01-07 04:01:26.785469	2026-01-07 04:01:26.785469
222	261	Half	320.00	\N	0	2026-01-07 04:01:26.85367	2026-01-07 04:01:26.85367
223	261	Full	480.00	\N	0	2026-01-07 04:01:26.875816	2026-01-07 04:01:26.875816
224	262	Half	380.00	\N	0	2026-01-07 04:01:26.94094	2026-01-07 04:01:26.94094
225	262	Full	560.00	\N	0	2026-01-07 04:01:26.962595	2026-01-07 04:01:26.962595
226	263	Half	460.00	\N	0	2026-01-07 04:01:27.04873	2026-01-07 04:01:27.04873
227	263	Full	680.00	\N	0	2026-01-07 04:01:27.070232	2026-01-07 04:01:27.070232
228	264	Single	30.00	\N	0	2026-01-07 04:01:27.135373	2026-01-07 04:01:27.135373
229	265	Single	40.00	\N	0	2026-01-07 04:01:27.208032	2026-01-07 04:01:27.208032
230	266	Single	70.00	\N	0	2026-01-07 04:01:27.284712	2026-01-07 04:01:27.284712
231	267	Single	90.00	\N	0	2026-01-07 04:01:27.350516	2026-01-07 04:01:27.350516
232	268	Single	110.00	\N	0	2026-01-07 04:01:27.416255	2026-01-07 04:01:27.416255
233	269	Small	50.00	\N	0	2026-01-07 04:01:27.492355	2026-01-07 04:01:27.492355
234	269	Large	70.00	\N	0	2026-01-07 04:01:27.514332	2026-01-07 04:01:27.514332
235	270	Small	70.00	\N	0	2026-01-07 04:01:27.579802	2026-01-07 04:01:27.579802
236	270	Large	100.00	\N	0	2026-01-07 04:01:27.60233	2026-01-07 04:01:27.60233
237	271	Regular	160.00	\N	0	2026-01-07 04:01:27.669003	2026-01-07 04:01:27.669003
238	271	Large	220.00	\N	0	2026-01-07 04:01:27.691009	2026-01-07 04:01:27.691009
239	272	Sweet	120.00	\N	0	2026-01-07 04:01:27.757518	2026-01-07 04:01:27.757518
240	272	Salted	120.00	\N	0	2026-01-07 04:01:27.779173	2026-01-07 04:01:27.779173
241	273	Can	80.00	\N	0	2026-01-07 04:01:27.843343	2026-01-07 04:01:27.843343
242	273	Bottle	120.00	\N	0	2026-01-07 04:01:27.865161	2026-01-07 04:01:27.865161
243	274	2 pcs	120.00	\N	0	2026-01-07 04:01:27.931161	2026-01-07 04:01:27.931161
244	274	4 pcs	180.00	\N	0	2026-01-07 04:01:27.953567	2026-01-07 04:01:27.953567
245	275	Single Scoop	150.00	\N	0	2026-01-07 04:01:28.018539	2026-01-07 04:01:28.018539
246	275	Double Scoop	230.00	\N	0	2026-01-07 04:01:28.040167	2026-01-07 04:01:28.040167
247	276	Single	220.00	\N	0	2026-01-07 04:01:28.105935	2026-01-07 04:01:28.105935
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_items (id, property_id, name, description, category, price, is_available, preparation_time, image_url, created_at, updated_at, category_id, food_type, actual_price, discounted_price, has_variants, has_add_ons, display_order) FROM stdin;
236	17	Plain Omelette	Two egg plain omelette	Breakfast	120.00	t	\N	\N	2026-01-07 04:01:24.543029	2026-01-07 04:01:24.543029	24	non-veg	\N	\N	t	t	1
237	17	Masala Omelette	Spicy masala omelette	Breakfast	150.00	t	\N	\N	2026-01-07 04:01:24.634094	2026-01-07 04:01:24.634094	24	non-veg	\N	\N	t	t	2
238	17	Boiled Eggs	Boiled eggs served with salt	Breakfast	80.00	t	\N	\N	2026-01-07 04:01:24.722753	2026-01-07 04:01:24.722753	24	non-veg	\N	\N	t	t	3
239	17	Aloo Paratha	Stuffed aloo paratha with butter	Breakfast	140.00	t	\N	\N	2026-01-07 04:01:24.810914	2026-01-07 04:01:24.810914	24	veg	\N	\N	t	t	4
240	17	Paneer Paratha	Paneer stuffed paratha	Breakfast	170.00	t	\N	\N	2026-01-07 04:01:24.92375	2026-01-07 04:01:24.92375	24	veg	\N	\N	t	t	5
241	17	Poha	Light poha with peanuts	Breakfast	120.00	t	\N	\N	2026-01-07 04:01:25.03587	2026-01-07 04:01:25.03587	24	veg	\N	\N	t	t	6
242	17	Pancakes	Pancakes served with syrup	Breakfast	220.00	t	\N	\N	2026-01-07 04:01:25.138022	2026-01-07 04:01:25.138022	24	veg	\N	\N	t	t	7
243	17	Tomato Soup	Creamy tomato soup	Soups	160.00	t	\N	\N	2026-01-07 04:01:25.248325	2026-01-07 04:01:25.248325	31	veg	\N	\N	t	t	8
244	17	Veg Clear Soup	Light vegetable soup	Soups	150.00	t	\N	\N	2026-01-07 04:01:25.335785	2026-01-07 04:01:25.335785	31	veg	\N	\N	t	t	9
245	17	Chicken Soup	Hot chicken soup	Soups	190.00	t	\N	\N	2026-01-07 04:01:25.42469	2026-01-07 04:01:25.42469	31	non-veg	\N	\N	t	t	10
246	17	Veg Pakora	Crispy mixed veg pakora	Starters	180.00	t	\N	\N	2026-01-07 04:01:25.512425	2026-01-07 04:01:25.512425	25	veg	\N	\N	t	t	11
247	17	Paneer Tikka	Tandoori paneer tikka	Starters	280.00	t	\N	\N	2026-01-07 04:01:25.59826	2026-01-07 04:01:25.59826	25	veg	\N	\N	t	t	12
248	17	Mushroom Chilli	Spicy chilli mushroom	Starters	260.00	t	\N	\N	2026-01-07 04:01:25.685044	2026-01-07 04:01:25.685044	25	veg	\N	\N	t	t	13
249	17	Chicken Pakora	Crispy chicken pakora	Starters	260.00	t	\N	\N	2026-01-07 04:01:25.770563	2026-01-07 04:01:25.770563	25	non-veg	\N	\N	t	t	14
250	17	Chicken Tikka	Smoky chicken tikka	Starters	320.00	t	\N	\N	2026-01-07 04:01:25.857895	2026-01-07 04:01:25.857895	25	non-veg	\N	\N	t	t	15
251	17	Chicken Chilli	Spicy chilli chicken	Starters	300.00	t	\N	\N	2026-01-07 04:01:25.945917	2026-01-07 04:01:25.945917	25	non-veg	\N	\N	t	t	16
252	17	Dal Tadka	Yellow dal with tadka	Main Course	240.00	t	\N	\N	2026-01-07 04:01:26.036062	2026-01-07 04:01:26.036062	26	veg	\N	\N	t	t	17
253	17	Dal Makhani	Creamy black dal	Main Course	280.00	t	\N	\N	2026-01-07 04:01:26.125835	2026-01-07 04:01:26.125835	26	veg	\N	\N	t	t	18
254	17	Shahi Paneer	Rich paneer gravy	Main Course	320.00	t	\N	\N	2026-01-07 04:01:26.21335	2026-01-07 04:01:26.21335	26	veg	\N	\N	t	t	19
255	17	Mix Veg	Seasonal vegetable curry	Main Course	260.00	t	\N	\N	2026-01-07 04:01:26.301337	2026-01-07 04:01:26.301337	26	veg	\N	\N	t	t	20
256	17	Chicken Curry	Traditional chicken curry	Main Course	340.00	t	\N	\N	2026-01-07 04:01:26.388869	2026-01-07 04:01:26.388869	26	non-veg	\N	\N	t	t	21
257	17	Butter Chicken	Creamy butter chicken	Main Course	380.00	t	\N	\N	2026-01-07 04:01:26.47706	2026-01-07 04:01:26.47706	26	non-veg	\N	\N	t	t	22
258	17	Mutton Curry	Slow cooked mutton curry	Main Course	420.00	t	\N	\N	2026-01-07 04:01:26.568674	2026-01-07 04:01:26.568674	26	non-veg	\N	\N	t	t	23
259	17	Plain Rice	Steamed basmati rice	Rice	120.00	t	\N	\N	2026-01-07 04:01:26.656205	2026-01-07 04:01:26.656205	32	veg	\N	\N	t	t	24
260	17	Jeera Rice	Jeera flavored rice	Rice	160.00	t	\N	\N	2026-01-07 04:01:26.742313	2026-01-07 04:01:26.742313	32	veg	\N	\N	t	t	25
261	17	Veg Biryani	Aromatic veg biryani	Biryani	320.00	t	\N	\N	2026-01-07 04:01:26.831816	2026-01-07 04:01:26.831816	33	veg	\N	\N	t	t	26
262	17	Chicken Biryani	Hyderabadi chicken biryani	Biryani	380.00	t	\N	\N	2026-01-07 04:01:26.919195	2026-01-07 04:01:26.919195	33	non-veg	\N	\N	t	t	27
263	17	Mutton Biryani	Slow cooked mutton biryani	Biryani	460.00	t	\N	\N	2026-01-07 04:01:27.028037	2026-01-07 04:01:27.028037	33	non-veg	\N	\N	t	t	28
264	17	Tandoori Roti	Clay oven roti	Breads	30.00	t	\N	\N	2026-01-07 04:01:27.112509	2026-01-07 04:01:27.112509	28	veg	\N	\N	t	t	29
265	17	Butter Roti	Roti with butter	Breads	40.00	t	\N	\N	2026-01-07 04:01:27.180529	2026-01-07 04:01:27.180529	28	veg	\N	\N	t	t	30
266	17	Plain Naan	Soft naan	Breads	70.00	t	\N	\N	2026-01-07 04:01:27.25392	2026-01-07 04:01:27.25392	28	veg	\N	\N	t	t	31
267	17	Butter Naan	Naan with butter	Breads	90.00	t	\N	\N	2026-01-07 04:01:27.328804	2026-01-07 04:01:27.328804	28	veg	\N	\N	t	t	32
268	17	Garlic Naan	Garlic flavoured naan	Breads	110.00	t	\N	\N	2026-01-07 04:01:27.394268	2026-01-07 04:01:27.394268	28	veg	\N	\N	t	t	33
269	17	Tea	Hot masala tea	Beverages	50.00	t	\N	\N	2026-01-07 04:01:27.470285	2026-01-07 04:01:27.470285	29	veg	\N	\N	t	t	34
270	17	Coffee	Hot coffee	Beverages	70.00	t	\N	\N	2026-01-07 04:01:27.557946	2026-01-07 04:01:27.557946	29	veg	\N	\N	t	t	35
271	17	Cold Coffee	Cold coffee with ice cream	Beverages	160.00	t	\N	\N	2026-01-07 04:01:27.646392	2026-01-07 04:01:27.646392	29	veg	\N	\N	t	t	36
272	17	Fresh Lime Soda	Refreshing lime soda	Beverages	120.00	t	\N	\N	2026-01-07 04:01:27.735577	2026-01-07 04:01:27.735577	29	veg	\N	\N	t	t	37
273	17	Soft Drink	Chilled soft drink	Beverages	80.00	t	\N	\N	2026-01-07 04:01:27.821709	2026-01-07 04:01:27.821709	29	veg	\N	\N	t	t	38
274	17	Gulab Jamun	Soft gulab jamun	Desserts	120.00	t	\N	\N	2026-01-07 04:01:27.909027	2026-01-07 04:01:27.909027	30	veg	\N	\N	t	t	39
275	17	Ice Cream	Vanilla ice cream scoop	Desserts	150.00	t	\N	\N	2026-01-07 04:01:27.996901	2026-01-07 04:01:27.996901	30	veg	\N	\N	t	t	40
276	17	Brownie	Chocolate brownie	Desserts	220.00	t	\N	\N	2026-01-07 04:01:28.083762	2026-01-07 04:01:28.083762	30	veg	\N	\N	t	t	41
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_templates (id, name, subject, content, category, is_active, created_at, updated_at) FROM stdin;
1	Payment Reminder	Payment Reminder for Booking	Dear {guestName}, this is a friendly reminder that your advance payment of ₹{advanceAmount} for your booking from {checkInDate} to {checkOutDate} at {propertyName} is pending. Please make the payment at your earliest convenience. Thank you!	payment_reminder	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
2	Booking Confirmation	Booking Confirmed	Dear {guestName}, your booking at {propertyName} has been confirmed! Check-in: {checkInDate}, Check-out: {checkOutDate}. Room: {roomType}. Looking forward to hosting you!	booking_confirmation	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
3	Check-in Details	Check-in Information	Hi {guestName}! Your check-in is scheduled for {checkInDate}. Our address is {propertyLocation}. Check-in time is after 2 PM. For any queries, call {propertyContact}. See you soon!	check_in_details	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
4	Payment Received	Payment Received Confirmation	Dear {guestName}, we have successfully received your payment of ₹{advanceAmount}. Your booking at {propertyName} is now confirmed. Thank you!	payment_confirmation	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
5	Check-out Reminder	Check-out Reminder	Hi {guestName}, this is a reminder that your check-out is scheduled for {checkOutDate} at 11 AM. Please ensure all belongings are collected. We hope you enjoyed your stay!	check_out_reminder	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
6	Welcome Message	Welcome to Our Property	Welcome to {propertyName}, {guestName}! We hope you have a wonderful stay. For any assistance, please contact us at {propertyContact}. Enjoy your visit!	welcome	t	2025-10-24 07:25:02.303989	2025-10-24 07:25:02.303989
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, sound_type, related_id, related_type, is_read, created_at) FROM stdin;
606	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #158 created for paras. Check-in: Jan 04, 2026	info	158	booking	f	2026-01-04 17:35:49.245319
607	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #158 created for paras. Check-in: Jan 04, 2026	info	158	booking	f	2026-01-04 17:35:49.272676
609	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #158 created for paras. Check-in: Jan 04, 2026	info	158	booking	f	2026-01-04 17:35:49.320161
610	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #158 created for paras. Check-in: Jan 04, 2026	info	158	booking	f	2026-01-04 17:35:49.343038
612	user-1767506041702-opma4qx4p	payment_received	Advance Payment Confirmed	Booking #158 confirmed! Advance of ₹300 received from paras	payment	158	booking	f	2026-01-04 17:36:37.379806
613	user-1767450663432-vicon0no9	payment_received	Advance Payment Confirmed	Booking #158 confirmed! Advance of ₹300 received from paras	payment	158	booking	f	2026-01-04 17:36:37.403645
615	d7417553-bfff-4867-948d-bb5b94da0c8c	payment_received	Advance Payment Confirmed	Booking #158 confirmed! Advance of ₹300 received from paras	payment	158	booking	f	2026-01-04 17:36:37.451241
616	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #158 confirmed! Advance of ₹300 received from paras	payment	158	booking	f	2026-01-04 17:36:37.473804
636	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #162 created for eshani. Check-in: Jan 06, 2026	info	162	booking	f	2026-01-06 10:09:45.107737
638	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #162 created for eshani. Check-in: Jan 06, 2026	info	162	booking	f	2026-01-06 10:09:45.158605
639	admin-hostezee	new_booking	New Booking Created	Booking #162 created for eshani. Check-in: Jan 06, 2026	info	162	booking	f	2026-01-06 10:09:45.179872
640	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #162 created for eshani. Check-in: Jan 06, 2026	info	162	booking	f	2026-01-06 10:09:45.201099
641	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #162 created for eshani. Check-in: Jan 06, 2026	info	162	booking	f	2026-01-06 10:09:45.222321
686	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	sunita checked in from Booking #166	info	166	booking	f	2026-01-06 12:16:17.726208
688	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	sunita checked in from Booking #166	info	166	booking	f	2026-01-06 12:16:17.830709
689	admin-hostezee	guest_checked_in	Guest Checked In	sunita checked in from Booking #166	info	166	booking	f	2026-01-06 12:16:17.852045
690	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	sunita checked in from Booking #166	info	166	booking	f	2026-01-06 12:16:17.873435
691	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	sunita checked in from Booking #166	info	166	booking	f	2026-01-06 12:16:17.894692
693	super-admin-test	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.617723
694	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.646304
696	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.694158
697	admin-hostezee	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.717971
698	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.74249
699	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #167 created for manoj. Check-in: Jan 07, 2026	info	167	booking	f	2026-01-07 03:22:59.767176
701	super-admin-test	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.13118
702	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.158812
704	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.204347
705	admin-hostezee	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.228041
706	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.251828
707	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #168 created for paras. Check-in: Jan 07, 2026	info	168	booking	f	2026-01-07 07:20:26.275126
618	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #159 created for paras. Check-in: Jan 04, 2026	info	159	booking	f	2026-01-04 17:51:54.163515
619	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #159 created for paras. Check-in: Jan 04, 2026	info	159	booking	f	2026-01-04 17:51:54.18847
621	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #159 created for paras. Check-in: Jan 04, 2026	info	159	booking	f	2026-01-04 17:51:54.234338
622	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #159 created for paras. Check-in: Jan 04, 2026	info	159	booking	f	2026-01-04 17:51:54.257651
624	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #160 created for ankit. Check-in: Jan 04, 2026	info	160	booking	f	2026-01-04 17:52:49.236421
625	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #160 created for ankit. Check-in: Jan 04, 2026	info	160	booking	f	2026-01-04 17:52:49.260343
627	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #160 created for ankit. Check-in: Jan 04, 2026	info	160	booking	f	2026-01-04 17:52:49.308366
628	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #160 created for ankit. Check-in: Jan 04, 2026	info	160	booking	f	2026-01-04 17:52:49.331853
643	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #164 created for ankita. Check-in: Jan 06, 2026	info	164	booking	f	2026-01-06 10:10:55.080842
645	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #164 created for ankita. Check-in: Jan 06, 2026	info	164	booking	f	2026-01-06 10:10:55.126406
646	admin-hostezee	new_booking	New Booking Created	Booking #164 created for ankita. Check-in: Jan 06, 2026	info	164	booking	f	2026-01-06 10:10:55.148802
647	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #164 created for ankita. Check-in: Jan 06, 2026	info	164	booking	f	2026-01-06 10:10:55.171313
648	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #164 created for ankita. Check-in: Jan 06, 2026	info	164	booking	f	2026-01-06 10:10:55.193824
650	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #165 created for paras. Check-in: Jan 06, 2026	info	165	booking	f	2026-01-06 10:11:28.272632
652	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #165 created for paras. Check-in: Jan 06, 2026	info	165	booking	f	2026-01-06 10:11:28.318125
653	admin-hostezee	new_booking	New Booking Created	Booking #165 created for paras. Check-in: Jan 06, 2026	info	165	booking	f	2026-01-06 10:11:28.340684
654	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #165 created for paras. Check-in: Jan 06, 2026	info	165	booking	f	2026-01-06 10:11:28.363193
655	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #165 created for paras. Check-in: Jan 06, 2026	info	165	booking	f	2026-01-06 10:11:28.386317
835	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.56395
836	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.589107
837	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.612656
838	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.636737
839	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.660748
840	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.684652
841	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.70904
842	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.732287
843	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #69 for anupam. Total: ₹10000.00, Balance: ₹0.00	info	69	bill	f	2026-01-13 08:30:04.756158
923	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.341051
924	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.363151
925	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.385848
926	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.408887
927	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.431711
928	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.454956
630	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #161 created for paras. Check-in: Jan 04, 2026	info	161	booking	f	2026-01-04 18:08:41.214793
631	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #161 created for paras. Check-in: Jan 04, 2026	info	161	booking	f	2026-01-04 18:08:41.237734
633	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #161 created for paras. Check-in: Jan 04, 2026	info	161	booking	f	2026-01-04 18:08:41.282947
634	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #161 created for paras. Check-in: Jan 04, 2026	info	161	booking	f	2026-01-04 18:08:41.305951
929	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.477647
657	user-1767506041702-opma4qx4p	payment_received	Advance Payment Confirmed	Booking #165 confirmed! Advance of ₹150 received from paras	payment	165	booking	f	2026-01-06 10:23:10.700691
659	user-1767450663432-vicon0no9	payment_received	Advance Payment Confirmed	Booking #165 confirmed! Advance of ₹150 received from paras	payment	165	booking	f	2026-01-06 10:23:10.748001
660	admin-hostezee	payment_received	Advance Payment Confirmed	Booking #165 confirmed! Advance of ₹150 received from paras	payment	165	booking	f	2026-01-06 10:23:10.771651
661	d7417553-bfff-4867-948d-bb5b94da0c8c	payment_received	Advance Payment Confirmed	Booking #165 confirmed! Advance of ₹150 received from paras	payment	165	booking	f	2026-01-06 10:23:10.79518
662	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #165 confirmed! Advance of ₹150 received from paras	payment	165	booking	f	2026-01-06 10:23:10.822585
709	super-admin-test	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:41.888201
710	user-1767506041702-opma4qx4p	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:41.912171
712	user-1767450663432-vicon0no9	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:41.959111
713	admin-hostezee	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:41.982445
714	d7417553-bfff-4867-948d-bb5b94da0c8c	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:42.005751
715	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #168 confirmed! Advance of ₹1,200 received from paras	payment	168	booking	f	2026-01-07 07:20:42.029009
717	super-admin-test	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.042665
718	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.065931
720	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.112793
721	admin-hostezee	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.138269
722	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.161764
723	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #168	info	168	booking	f	2026-01-07 07:21:12.185297
846	test-wallet-user-003	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.551008
847	test-wallet-user-002	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.574483
848	super-admin-test	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.597889
849	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.621607
850	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.644951
851	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.667232
852	admin-hostezee	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.690749
853	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.714476
854	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #174 created for paras. Check-in: Jan 13, 2026	info	174	booking	f	2026-01-13 08:34:58.737937
930	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.500713
931	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #71 for mimi. Total: ₹10000.00, Balance: ₹0.00	info	71	bill	f	2026-01-13 08:52:29.523291
974	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.503746
975	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.526896
976	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.549568
977	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.572482
1002	test-wallet-user-003	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:06.857717
1003	test-wallet-user-002	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:06.902316
1004	super-admin-test	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:07.098752
1005	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:07.124991
664	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	eshani checked in from Booking #162	info	162	booking	f	2026-01-06 10:26:37.604827
666	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	eshani checked in from Booking #162	info	162	booking	f	2026-01-06 10:26:37.653327
667	admin-hostezee	guest_checked_in	Guest Checked In	eshani checked in from Booking #162	info	162	booking	f	2026-01-06 10:26:37.676468
668	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	eshani checked in from Booking #162	info	162	booking	f	2026-01-06 10:26:37.700204
669	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	eshani checked in from Booking #162	info	162	booking	f	2026-01-06 10:26:37.723998
725	super-admin-test	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:14.27922
726	user-1767506041702-opma4qx4p	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:14.414662
728	user-1767450663432-vicon0no9	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:14.596818
729	admin-hostezee	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:14.988314
730	d7417553-bfff-4867-948d-bb5b94da0c8c	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:15.118402
731	user-1764918654799-kdd60a87r	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:15.155572
732	48913322	booking_cancelled	Booking Auto-Cancelled	Booking #167 for manoj was auto-cancelled - advance payment not received within 48 hours	warning	167	booking	f	2026-01-09 10:21:15.212338
733	super-admin-test	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.634456
734	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.659078
736	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.702557
737	admin-hostezee	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.724015
738	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.745843
739	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.767137
740	48913322	new_booking	New Booking Created	Booking #169 created for paras. Check-in: Jan 09, 2026	info	169	booking	f	2026-01-09 11:06:58.788396
741	super-admin-test	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.810473
742	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.841011
743	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.862046
744	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.883417
745	admin-hostezee	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.905594
746	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.925498
747	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.946316
748	48913322	new_booking	New Booking Created	Booking #170 created for yogita. Check-in: Jan 12, 2026	info	170	booking	f	2026-01-12 08:30:54.967122
758	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.019905
759	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.042303
760	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.064115
761	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.085454
762	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.106984
763	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.128301
764	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.14986
765	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.171119
766	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #67 for paras. Total: ₹4200.00, Balance: ₹0.00	info	67	bill	f	2026-01-13 07:15:36.192857
769	test-wallet-user-003	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.30824
770	test-wallet-user-002	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.330187
771	super-admin-test	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.352604
772	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.375325
773	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.397729
671	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #166 created for sunita. Check-in: Jan 06, 2026	info	166	booking	f	2026-01-06 10:32:27.983983
673	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #166 created for sunita. Check-in: Jan 06, 2026	info	166	booking	f	2026-01-06 10:32:28.029511
674	admin-hostezee	new_booking	New Booking Created	Booking #166 created for sunita. Check-in: Jan 06, 2026	info	166	booking	f	2026-01-06 10:32:28.051882
675	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #166 created for sunita. Check-in: Jan 06, 2026	info	166	booking	f	2026-01-06 10:32:28.073124
676	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #166 created for sunita. Check-in: Jan 06, 2026	info	166	booking	f	2026-01-06 10:32:28.095464
749	super-admin-test	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.038172
750	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.058806
751	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.079082
752	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.09939
753	admin-hostezee	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.12003
754	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.140273
755	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.160659
756	48913322	guest_checked_in	Guest Checked In	yogita checked in from Booking #170	info	170	booking	f	2026-01-12 08:31:40.181353
774	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.420347
775	admin-hostezee	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.443832
776	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.466911
777	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #171 created for paras. Check-in: Jan 13, 2026	info	171	booking	f	2026-01-13 08:17:09.491724
857	test-wallet-user-003	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.437489
858	test-wallet-user-002	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.460307
859	super-admin-test	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.482051
860	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.503831
861	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.52587
862	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.549624
863	admin-hostezee	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.57149
864	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.593176
865	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #174	info	174	booking	f	2026-01-13 08:35:29.614828
868	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.149263
869	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.170741
870	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.195262
871	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.224642
872	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.246084
447	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #120 created for paras. Check-in: Dec 25, 2025	info	120	booking	f	2025-12-25 16:35:40.235588
873	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.267531
874	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.289008
875	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.312587
876	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #70 for paras. Total: ₹1000.00, Balance: ₹0.00	info	70	bill	f	2026-01-13 08:36:00.33433
933	super-admin-test	new_user_signup	New User Registration	paras thakur (hostezee@gmail.com) registered with business: mimi	info	\N	user	f	2026-01-13 09:05:35.309514
934	admin-hostezee	new_user_signup	New User Registration	paras thakur (hostezee@gmail.com) registered with business: mimi	info	\N	user	f	2026-01-13 09:05:35.331705
936	test-wallet-user-003	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.058949
937	test-wallet-user-002	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.083197
938	super-admin-test	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.107284
939	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.131315
940	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.15488
453	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #120	info	120	booking	f	2025-12-25 16:36:18.041167
678	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #66 for eshani. Total: ₹1575.00, Balance: ₹0.00	info	66	bill	f	2026-01-06 10:46:59.242984
680	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #66 for eshani. Total: ₹1575.00, Balance: ₹0.00	info	66	bill	f	2026-01-06 10:46:59.29088
681	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #66 for eshani. Total: ₹1575.00, Balance: ₹0.00	info	66	bill	f	2026-01-06 10:46:59.314754
682	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #66 for eshani. Total: ₹1575.00, Balance: ₹0.00	info	66	bill	f	2026-01-06 10:46:59.337284
683	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #66 for eshani. Total: ₹1575.00, Balance: ₹0.00	info	66	bill	f	2026-01-06 10:46:59.361788
780	test-wallet-user-003	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.406388
781	test-wallet-user-002	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.428901
782	super-admin-test	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.460554
783	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.489167
784	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.510562
785	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.532773
786	admin-hostezee	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.554553
787	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.574905
788	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #172 created for anupam. Check-in: Jan 13, 2026	info	172	booking	f	2026-01-13 08:27:10.600583
879	test-wallet-user-003	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.868007
880	test-wallet-user-002	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.89016
881	super-admin-test	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.912757
882	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.935071
883	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.957363
884	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:43.980139
885	admin-hostezee	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:44.002492
886	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:44.025269
887	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #175 created for mama. Check-in: Jan 13, 2026	info	175	booking	f	2026-01-13 08:38:44.047825
941	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.178567
942	admin-hostezee	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.202479
943	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.225074
944	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #177 created for paras j. Check-in: Jan 18, 2026	info	177	booking	f	2026-01-16 11:54:27.250151
980	test-wallet-user-003	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.437522
981	test-wallet-user-002	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.460206
982	super-admin-test	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.483153
983	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.50609
984	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.529122
985	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.552391
986	admin-hostezee	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.575413
987	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.598398
988	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #180 created for paras. Check-in: Jan 17, 2026	info	180	booking	f	2026-01-17 02:43:34.621282
1006	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:07.154023
1007	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:07.180955
1008	admin-hostezee	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:07.204508
1009	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:08.010211
1010	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #181 created for momo. Check-in: Jan 17, 2026	info	181	booking	f	2026-01-17 03:14:08.036902
791	test-wallet-user-003	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.283176
792	test-wallet-user-002	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.305882
793	super-admin-test	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.328636
459	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #61 for paras. Total: ₹1130.00, Balance: ₹0.00	info	61	bill	f	2025-12-27 04:00:21.016827
794	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.351273
795	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.373682
796	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.396061
797	admin-hostezee	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.418392
798	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.440659
465	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #147 created for Sunita. Check-in: Dec 27, 2025	info	147	booking	f	2025-12-27 04:02:40.128002
799	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	anupam checked in from Booking #172	info	172	booking	f	2026-01-13 08:27:55.463221
802	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.716009
803	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.738344
471	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #147 confirmed! Advance of ₹600 received from Sunita	payment	147	booking	f	2025-12-27 04:03:43.171399
804	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.760599
805	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.782911
806	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.805242
807	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.827379
808	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.849736
477	user-1764918654799-kdd60a87r	booking_cancelled	Booking Auto-Cancelled	Booking #119 for Mukesh was auto-cancelled - advance payment not received within 48 hours	warning	119	booking	f	2025-12-28 08:12:20.75536
809	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.872109
810	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #68 for anupam. Total: ₹2000.00, Balance: ₹0.00	info	68	bill	f	2026-01-13 08:28:21.894738
890	test-wallet-user-003	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.152266
483	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #62 for paras. Total: ₹6000.00, Balance: ₹0.00	info	62	bill	f	2025-12-28 09:10:28.3396
891	test-wallet-user-002	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.176815
892	super-admin-test	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.211409
893	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.235326
894	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.258409
895	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.282541
489	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #148 created for paras. Check-in: Dec 28, 2025	info	148	booking	f	2025-12-28 09:28:48.671413
896	admin-hostezee	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.307197
897	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.331688
898	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #176 created for mimi. Check-in: Jan 13, 2026	info	176	booking	f	2026-01-13 08:39:03.358075
495	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #149 created for paras. Check-in: Dec 28, 2025	info	149	booking	f	2025-12-28 09:40:55.335487
947	test-wallet-user-003	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.300139
948	test-wallet-user-002	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.322438
949	super-admin-test	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.344905
501	user-1764918654799-kdd60a87r	booking_cancelled	Booking Auto-Cancelled	Booking #116 for priyanka was auto-cancelled - advance payment not received within 48 hours	warning	116	booking	f	2025-12-28 09:57:01.967065
555	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #153	info	153	booking	f	2025-12-28 17:07:11.82244
813	test-wallet-user-003	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.536945
814	test-wallet-user-002	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.559587
815	super-admin-test	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.58225
507	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #150 created for lakshita. Check-in: Dec 28, 2025	info	150	booking	f	2025-12-28 16:47:07.700504
816	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.604875
817	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.628036
818	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.651289
819	admin-hostezee	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.673701
820	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.696662
513	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #64 for ankita. Total: ₹2150.00, Balance: ₹1650.00	warning	64	bill	f	2025-12-28 16:48:40.180173
821	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #173 created for anupam. Check-in: Jan 13, 2026	info	173	booking	f	2026-01-13 08:29:34.719996
901	test-wallet-user-003	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.497475
902	test-wallet-user-002	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.520508
519	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #63 for paras. Total: ₹3381.00, Balance: ₹0.00	info	63	bill	f	2025-12-28 16:49:23.591942
903	super-admin-test	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.542988
904	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.565892
905	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.588717
906	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.610259
907	admin-hostezee	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.632599
525	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #65 for Paras kanwar. Total: ₹1000.00, Balance: ₹0.00	info	65	bill	f	2025-12-28 16:50:22.380952
908	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.655555
909	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	mimi checked in from Booking #176	info	176	booking	f	2026-01-13 08:39:20.677886
950	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.367615
951	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.390228
531	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #150 confirmed! Advance of ₹300 received from lakshita	payment	150	booking	f	2025-12-28 16:51:27.414415
952	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.412558
953	admin-hostezee	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.434918
954	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.457155
955	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #178 created for money k. Check-in: Jan 19, 2026	info	178	booking	f	2026-01-16 11:55:41.479808
537	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #151 created for ankita. Check-in: Dec 28, 2025	info	151	booking	f	2025-12-28 17:00:50.886117
991	test-wallet-user-003	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.224358
992	test-wallet-user-002	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.24841
993	super-admin-test	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.271596
994	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.2954
543	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #152 created for laks. Check-in: Dec 28, 2025	info	152	booking	f	2025-12-28 17:03:39.606523
995	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.323525
996	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.346925
997	admin-hostezee	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.37014
998	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.393129
999	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #180	info	180	booking	f	2026-01-17 03:01:14.416081
549	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #153 created for paras. Check-in: Dec 28, 2025	info	153	booking	f	2025-12-28 17:04:22.718608
1012	user-1768295135232-tmktwq859	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.054328
1014	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.116119
824	test-wallet-user-003	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.047624
825	test-wallet-user-002	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.069718
561	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #154 created for paras. Check-in: Dec 28, 2025	info	154	booking	f	2025-12-28 17:35:57.748364
826	super-admin-test	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.092551
827	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.11507
828	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.136917
829	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.158991
830	admin-hostezee	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.181274
567	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #154 confirmed! Advance of ₹300 received from paras	payment	154	booking	f	2025-12-28 17:39:31.920514
831	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.203659
832	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	anupam checked in from Booking #173	info	173	booking	f	2026-01-13 08:29:54.225554
912	test-wallet-user-003	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.653183
573	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #154 confirmed! Advance of ₹300 received from paras	payment	154	booking	f	2025-12-28 17:45:48.793452
913	test-wallet-user-002	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.676005
914	super-admin-test	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.698271
915	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.720504
916	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.742916
917	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.765322
579	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #155 created for paras. Check-in: Dec 29, 2025	info	155	booking	f	2025-12-29 03:42:16.509585
918	admin-hostezee	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.788927
919	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.811333
920	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	mama checked in from Booking #175	info	175	booking	f	2026-01-13 08:39:31.833554
585	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #156 created for yogita. Check-in: Dec 29, 2025	info	156	booking	f	2025-12-29 04:44:16.488956
958	test-wallet-user-003	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.512757
959	test-wallet-user-002	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.536092
960	super-admin-test	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.559566
961	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.582997
962	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.606426
591	user-1764918654799-kdd60a87r	payment_received	Advance Payment Confirmed	Booking #156 confirmed! Advance of ₹300 received from yogita	payment	156	booking	f	2025-12-29 04:47:18.520709
963	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.629366
964	admin-hostezee	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.652796
965	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.675992
966	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #179 created for paras. Check-in: Jan 20, 2026	info	179	booking	f	2026-01-16 12:04:42.699429
597	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #157 created for prakriti. Check-in: Dec 30, 2025	info	157	booking	f	2025-12-30 05:12:50.29121
969	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.388948
970	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.411998
971	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.43526
972	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.457897
973	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #72 for mama. Total: ₹1050.00, Balance: ₹0.00	info	72	bill	f	2026-01-17 02:14:01.48101
1015	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.140607
1016	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.165568
1017	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.1894
1018	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.214041
1019	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.238248
1020	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.26215
1021	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.28637
1022	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #73 for momo. Total: ₹2410.00, Balance: ₹0.00	info	73	bill	f	2026-01-19 10:24:33.309513
1024	user-1768295135232-tmktwq859	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.087521
1026	test-wallet-user-003	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.137869
1027	test-wallet-user-002	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.16026
1028	super-admin-test	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.181755
1029	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.204001
1030	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.227219
1031	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.249026
1032	admin-hostezee	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.270106
1033	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.292187
1034	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #183 created for paras. Check-in: Jan 19, 2026	info	183	booking	f	2026-01-19 14:59:45.313772
1036	user-1768295135232-tmktwq859	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.30452
1038	test-wallet-user-003	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.353102
1039	test-wallet-user-002	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.374322
1040	super-admin-test	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.396756
1041	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.418984
1042	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.441328
1043	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.463679
1044	admin-hostezee	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.485835
1045	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.507946
1046	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #184 created for paras. Check-in: Jan 21, 2026	info	184	booking	f	2026-01-21 18:01:01.530154
1048	user-1768295135232-tmktwq859	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.00495
1050	test-wallet-user-003	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.048576
1051	test-wallet-user-002	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.069825
1052	super-admin-test	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.091384
1053	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.113399
1054	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.135647
1055	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.157244
1056	admin-hostezee	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.178729
1057	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.199951
1058	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #185 created for momo. Check-in: Jan 21, 2026	info	185	booking	f	2026-01-21 18:05:36.221179
1060	user-1768295135232-tmktwq859	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.18258
1062	test-wallet-user-003	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.229889
1063	test-wallet-user-002	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.253766
1064	super-admin-test	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.281135
1065	user-1767506041702-opma4qx4p	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.303511
1066	user-1767505791148-wtgsgnm1d	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.326258
1067	user-1767450663432-vicon0no9	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.348943
1068	admin-hostezee	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.370666
1069	d7417553-bfff-4867-948d-bb5b94da0c8c	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.393798
1070	user-1764918654799-kdd60a87r	new_booking	New Booking Created	Booking #186 created for paras. Check-in: Jan 22, 2026	info	186	booking	f	2026-01-21 18:37:58.416634
1072	user-1768295135232-tmktwq859	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:58.967118
1074	test-wallet-user-003	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.016128
1075	test-wallet-user-002	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.039672
1076	super-admin-test	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.061857
1077	user-1767506041702-opma4qx4p	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.083981
1078	user-1767505791148-wtgsgnm1d	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.107598
1079	user-1767450663432-vicon0no9	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.132704
1080	admin-hostezee	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.155449
1081	d7417553-bfff-4867-948d-bb5b94da0c8c	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.178433
1082	user-1764918654799-kdd60a87r	guest_checked_in	Guest Checked In	paras checked in from Booking #186	info	186	booking	f	2026-01-21 18:43:59.201326
1084	user-1768295135232-tmktwq859	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.672514
1086	test-wallet-user-003	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.719209
1087	test-wallet-user-002	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.742292
1088	super-admin-test	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.766159
1089	user-1767506041702-opma4qx4p	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.789924
1090	user-1767505791148-wtgsgnm1d	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.811933
1091	user-1767450663432-vicon0no9	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.833793
1092	admin-hostezee	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.857133
1093	d7417553-bfff-4867-948d-bb5b94da0c8c	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.880363
1094	user-1764918654799-kdd60a87r	bill_generated	Bill Generated - Checkout Complete	Bill #74 for paras. Total: ₹4200.00, Balance: ₹4200.00	warning	74	bill	f	2026-01-21 18:45:07.903063
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, property_id, room_id, booking_id, guest_id, items, total_amount, status, special_instructions, created_at, updated_at, order_source, order_type, customer_name, customer_phone) FROM stdin;
65	17	99	166	200	[{"id": 229, "name": "Coffee (Small)", "price": "70.00", "quantity": 1}]	70.00	delivered	\N	2026-01-07 03:49:49.616957	2026-01-07 03:50:43.169	guest	room	\N	\N
67	11	28	181	218	[{"id": 626, "name": "Aloo Paratha (Single) + 1x Curd", "price": "170.00", "quantity": 1}]	170.00	delivered	\N	2026-01-17 06:10:12.099822	2026-01-17 06:10:57.592	guest	room	\N	\N
66	11	28	181	218	[{"id": 626, "name": "Aloo Paratha (Single)", "price": "140.00", "quantity": 1}]	140.00	delivered	\N	2026-01-17 05:52:27.37438	2026-01-17 06:10:28.864	guest	room	\N	\N
\.


--
-- Data for Name: ota_integrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ota_integrations (id, property_id, ota_name, property_id_external, api_key, api_secret, credentials, enabled, last_sync_at, sync_status, sync_error_message, created_at, updated_at) FROM stdin;
2	14	Beds24	propertykey123456789987654321	propertykey123456789987654321	\N	\N	t	2025-12-25 16:52:36.161737	success	\N	2025-12-25 16:49:49.095959	2025-12-25 16:49:49.095959
3	10	beds24	propertykey123456789987654321	propertykey123456789987654321	\N	\N	t	2025-12-25 17:24:53.503	idle	\N	2025-12-25 17:22:33.333703	2025-12-25 17:24:53.503
\.


--
-- Data for Name: otp_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otp_tokens (id, phone, email, otp, purpose, expires_at, is_used, attempts, created_at) FROM stdin;
1	9001949260	\N	598979	login	2025-12-05 07:01:14.471	f	0	2025-12-05 06:56:14.483895
\.


--
-- Data for Name: password_reset_otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_otps (id, email, phone, channel, otp, expires_at, is_used, created_at, reset_token) FROM stdin;
2	kanwarbeena9@gmail.com	\N	email	796952	2026-01-03 15:03:01.8	f	2026-01-03 14:48:01.81221	\N
3	kanwarbeena9@gmail.com	\N	email	738050	2026-01-03 15:07:17.322	f	2026-01-03 14:52:17.334173	\N
4	kanwarbeena9@gmail.com	\N	email	170646	2026-01-03 15:10:05.864	t	2026-01-03 14:55:05.876833	\N
5	kanwarbeena9@gmail.com	\N	email	384847	2026-01-03 15:12:50.814	t	2026-01-03 14:57:50.830171	\N
6	kanwarbeena9@gmail.com	\N	email	440597	2026-01-04 05:51:11.691	t	2026-01-04 05:36:11.776239	7o98on4p8qnsrebzpjd6r
7	kanwar.jaswant25@gmail.com	\N	email	425505	2026-01-11 15:25:06.223	f	2026-01-11 15:10:06.234484	\N
\.


--
-- Data for Name: pre_bills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pre_bills (id, booking_id, total_amount, balance_due, room_number, status, sent_at, approved_at, approved_by, created_at, updated_at, token, room_charges, food_charges, extra_charges, gst_amount, discount, advance_payment, food_items, guest_name, guest_phone, guest_email, property_id, check_in_date, check_out_date, nights) FROM stdin;
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.properties (id, name, location, description, total_rooms, contact_email, contact_phone, is_active, created_at, updated_at, owner_user_id, monthly_rent) FROM stdin;
10	Mount view 	Jibhi		4			t	2025-11-02 06:32:45.98969	2025-11-02 06:32:45.98969	\N	\N
11	woodpecker inn	Jibhi		10			t	2025-11-02 08:58:56.291011	2025-11-02 08:58:56.291011	\N	\N
12	Mountain View Resort	Shimla, India	A beautiful mountain resort	0	\N	\N	t	2025-11-03 06:53:26.841195	2025-11-03 06:53:26.841195	\N	\N
14	Venuemonk	delhi		0	parasthakur.vm@gmail.com	9001949260	t	2025-12-05 07:12:57.827239	2025-12-05 07:12:57.827239	user-1764918654799-kdd60a87r	\N
15	Royal 			0	beenakanwar9@gmail.com		t	2026-01-03 14:46:32.431356	2026-01-03 14:46:32.431356	user-1767450663432-vicon0no9	\N
16	SOjha 			0	backpackersheadquarter@gmail.com	9001949260	t	2026-01-04 06:00:32.841991	2026-01-04 06:00:32.841991	user-1767506041702-opma4qx4p	\N
17	Prakriti Homestay			0	kanwarbeena9@gmail.com		t	2026-01-04 18:26:06.831487	2026-01-04 18:26:06.831487	user-1767505791148-wtgsgnm1d	\N
19	Test Wallet Property	123 Test Street	Test property for wallet tests	10	owner@example.com	9999999999	t	2026-01-13 06:22:58.167297	2026-01-13 06:22:58.167297	test-wallet-user-003	0.00
20	mimi			0	hostezee@gmail.com	9001949260	t	2026-01-17 06:54:32.296785	2026-01-17 06:54:32.296785	user-1768295135232-tmktwq859	\N
\.


--
-- Data for Name: property_expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.property_expenses (id, property_id, category, amount, expense_date, description, vendor_name, payment_method, receipt_number, is_recurring, created_by, created_at, updated_at, category_id, vendor_id) FROM stdin;
2	10	\N	5000.00	2025-11-29 00:00:00		\N	\N	\N	f	\N	2025-11-29 02:53:29.366766	2025-11-29 02:53:29.366766	14	\N
3	10	\N	3000.00	2025-11-29 00:00:00	kjdbjwdb             ssjhc smssbsk x	\N	\N	\N	f	\N	2025-11-29 02:53:59.907667	2025-11-29 02:53:59.907667	16	\N
4	10	\N	50000.00	2025-11-29 00:00:00	groceries for group booking	\N	\N	\N	f	\N	2025-11-29 03:18:25.56888	2025-11-29 03:18:25.56888	14	\N
5	10	\N	1000.00	2025-12-10 00:00:00	\N	\N	\N	\N	f	\N	2025-12-10 04:40:26.421133	2025-12-10 04:40:26.421133	13	\N
6	10	\N	1000.00	2025-12-29 00:00:00	\N	\N	\N	\N	f	\N	2025-12-29 06:26:43.537704	2025-12-29 06:26:43.537704	18	\N
7	10	Groceries	1000.00	2025-12-29 06:38:06.88	\N	\N	\N	\N	f	paras.thakur18@gmail.com	2025-12-29 06:38:07.051912	2025-12-29 06:38:07.051912	\N	\N
8	10	Groceries	4000.00	2026-01-13 07:58:54.318	\N	paras	\N	\N	f	paras.thakur18@gmail.com	2026-01-13 07:58:53.910973	2026-01-13 07:58:53.910973	\N	\N
9	10	Internet & Phone	560.00	2026-01-13 08:15:33.819	\N	Miscellaneous	\N	\N	f	paras.thakur18@gmail.com	2026-01-13 08:15:33.420838	2026-01-13 08:15:33.420838	\N	\N
10	11	Electricity	1000.00	2026-01-21 20:11:11.379	\N	Miscellaneous	\N	\N	f	paras.thakur18@gmail.com	2026-01-21 20:11:11.592605	2026-01-21 20:11:11.592605	\N	\N
11	11	\N	10000.00	2026-01-21 00:00:00	\N	paras	cash	\N	f	\N	2026-01-21 20:30:53.451026	2026-01-21 20:30:53.451026	14	5
12	10	\N	5000.00	2026-01-21 00:00:00	\N	Sharma Kirana Store	bank_transfer	\N	f	\N	2026-01-21 20:39:15.611147	2026-01-21 20:39:15.611147	14	1
\.


--
-- Data for Name: property_leases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.property_leases (id, property_id, total_amount, start_date, end_date, payment_frequency, landlord_name, landlord_contact, notes, is_active, created_at, updated_at, lease_duration_years, base_yearly_amount, yearly_increment_type, yearly_increment_value, current_year_amount, is_overridden, carry_forward_amount) FROM stdin;
3	10	200000.00	2025-01-01 00:00:00	2025-12-31 00:00:00	monthly	Mr. Rajesh Kumar	9876000001	\N	t	2025-12-05 11:37:57.514359	2025-12-05 11:37:57.514359	\N	\N	\N	\N	\N	f	0.00
4	11	1500000.00	2022-01-01 00:00:00	2030-12-31 00:00:00	monthly	ankit	\N	\N	t	2026-01-12 15:19:32.51478	2026-02-02 11:25:16.129	5	1500000.00	percentage	5.00	\N	f	0.00
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rooms (id, property_id, room_number, room_type, status, price_per_night, max_occupancy, amenities, assigned_staff_id, created_at, updated_at, room_category, total_beds) FROM stdin;
27	10	104	Deluxe	cleaning	1000.00	2	{}	\N	2025-11-02 08:51:33.46598	2026-01-13 07:15:36.311	deluxe	\N
33	12	103		cleaning	2000.00	2	{}	\N	2025-11-04 06:21:28.705485	2026-01-13 08:28:21.95	standard	\N
49	11	113	Deluxe	cleaning	1000.00	2	{}	\N	2025-12-01 16:56:07.96666	2026-01-13 08:36:00.389	deluxe	\N
48	11	112	Deluxe	cleaning	1000.00	2	{}	\N	2025-12-01 16:56:07.965332	2026-01-13 08:52:29.582	deluxe	\N
45	11	109	Deluxe	cleaning	1000.00	2	{}	\N	2025-12-01 16:56:07.729177	2026-01-17 02:14:01.628	deluxe	\N
29	11	104		available	0.00	2	{}	\N	2025-11-02 09:53:51.361724	2025-12-01 16:32:54.003	dormitory	5
32	12	102		available	2000.00	2	{}	\N	2025-11-04 06:21:17.706401	2025-12-01 16:32:59.065	standard	\N
28	11	102	Deluxe	cleaning	2000.00	2	{}	\N	2025-11-02 08:59:19.94643	2026-01-19 10:24:33.369	deluxe	\N
42	11	106	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:07.149449	2025-12-01 16:56:07.149449	deluxe	\N
43	11	107	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:07.363194	2025-12-01 16:56:07.363194	deluxe	\N
44	11	108	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:07.515487	2025-12-01 16:56:07.515487	deluxe	\N
50	11	114	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:08.089392	2025-12-01 16:56:08.089392	deluxe	\N
60	14	101	Deluxe Double Room with Balcony	available	1000.00	2	{}	\N	2025-12-25 08:30:00.570809	2025-12-25 08:43:40.666	standard	\N
23	10	101		cleaning	1000.00	2	{}	\N	2025-11-02 06:33:25.081722	2026-01-21 18:45:07.959	standard	\N
61	14	102	Deluxe Double Room with Balcony	available	1000.00	2	{}	\N	2025-12-25 08:44:24.859211	2025-12-25 08:44:24.859211	standard	\N
64	14	104	Double Room with Balcony	available	1000.00	2	{}	\N	2025-12-25 08:44:25.127987	2025-12-25 08:44:25.127987	standard	\N
24	10	102		cleaning	1000.00	2	{}	\N	2025-11-02 06:34:32.96784	2026-01-21 18:45:07.982	standard	\N
26	10	103	Deluxe	cleaning	1000.00	2	{}	\N	2025-11-02 08:51:06.013945	2026-01-21 18:45:08.005	deluxe	5
31	10	105		cleaning	1000.00	2	{}	\N	2025-11-04 03:39:07.95463	2026-01-21 18:45:08.029	standard	\N
62	14	103	Double Room with Balcony	available	1000.00	2	{}	\N	2025-12-25 08:44:25.041718	2025-12-25 08:44:25.041718	standard	\N
63	14	105	King Room with Mountain View	available	1000.00	2	{}	\N	2025-12-25 08:44:25.124919	2025-12-25 08:44:25.124919	standard	\N
65	14	106	King Room with Mountain View	available	1000.00	2	{}	\N	2025-12-25 08:44:25.160974	2025-12-25 08:44:25.160974	standard	\N
41	11	105	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:06.999865	2025-12-02 02:37:51.251	deluxe	\N
37	10	106		available	1000.00	2	{}	\N	2025-11-27 04:04:13.054021	2025-12-28 09:10:28.555	standard	\N
36	10	107		available	1000.00	2	{}	\N	2025-11-27 04:04:13.016708	2025-12-28 09:10:28.579	standard	\N
35	10	108		available	1000.00	2	{}	\N	2025-11-27 04:04:12.876761	2025-12-28 09:10:28.603	standard	\N
39	10	109		available	1000.00	2	{}	\N	2025-11-27 04:04:13.130696	2025-12-28 09:10:28.626	standard	\N
34	10	111	Deluxe	available	1000.00	2	{}	\N	2025-11-11 05:34:50.451877	2025-12-28 09:10:28.65	deluxe	6
46	11	110	Deluxe	available	1000.00	2	{}	\N	2025-12-01 16:56:07.836317	2025-12-28 16:49:23.814	deluxe	\N
71	12	104		available	700.00	5	{}	\N	2026-01-04 17:51:07.00078	2026-01-04 17:51:07.00078	dormitory	5
83	17	113		available	500.00	5	{}	\N	2026-01-06 09:55:35.99876	2026-01-06 09:55:35.99876	dormitory	5
95	17	Room-2		available	1200.00	2	{}	\N	2026-01-06 10:08:11.119166	2026-01-06 10:08:11.119166	standard	\N
96	17	Room-5		available	1200.00	2	{}	\N	2026-01-06 10:08:11.205094	2026-01-06 10:08:11.205094	standard	\N
97	17	Room-4		available	1200.00	2	{}	\N	2026-01-06 10:08:11.207546	2026-01-06 10:08:11.207546	standard	\N
99	17	Room-6		available	1200.00	2	{}	\N	2026-01-06 10:08:11.369576	2026-01-06 10:08:11.369576	standard	\N
100	17	Room-7		available	1200.00	2	{}	\N	2026-01-06 10:08:11.495971	2026-01-06 10:08:11.495971	standard	\N
101	17	Room-8		available	1200.00	2	{}	\N	2026-01-06 10:08:11.576526	2026-01-06 10:08:11.576526	standard	\N
102	17	Room-9		available	1200.00	2	{}	\N	2026-01-06 10:08:11.577137	2026-01-06 10:08:11.577137	standard	\N
103	17	Room-1		available	1200.00	2	{}	\N	2026-01-06 10:08:11.590368	2026-01-06 10:08:45.781	standard	\N
94	17	Room-3		cleaning	1200.00	2	{}	\N	2026-01-06 10:08:10.990201	2026-01-06 10:46:59.423	standard	\N
82	17	112		cleaning	500.00	5	{}	\N	2026-01-06 09:55:35.840859	2026-01-06 10:46:59.497	dormitory	5
47	11	111	Deluxe	cleaning	1000.00	2	{}	\N	2025-12-01 16:56:07.964349	2026-01-13 08:30:04.814	deluxe	\N
\.


--
-- Data for Name: salary_advances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.salary_advances (id, user_id, salary_id, amount, advance_date, reason, repayment_status, deducted_from_salary_id, approved_by, notes, created_at, staff_member_id, advance_type) FROM stdin;
1	\N	\N	5000.00	2025-11-15 00:00:00	Personal Need	pending	\N	\N	\N	2025-11-23 08:17:29.260802	1	regular
2	\N	\N	3000.00	2025-11-10 00:00:00	Medical Emergency	pending	\N	\N	\N	2025-11-23 08:17:29.29268	2	regular
4	\N	\N	5000.00	2025-12-05 00:00:00	\N	pending	\N	48913322	\N	2025-12-05 11:09:52.40905	6	regular
5	\N	\N	100.00	2025-12-05 00:00:00	recharge	pending	\N	48913322	\N	2025-12-05 11:10:52.213581	6	regular
7	\N	\N	5000.00	2026-01-12 00:00:00	\N	pending	\N	48913322	\N	2026-01-12 13:14:27.081378	6	regular
8	\N	\N	10000.00	2026-01-13 00:00:00	\N	pending	\N	48913322	\N	2026-01-13 07:30:33.549599	6	regular
6	\N	\N	3000.00	2026-01-12 00:00:00	\N	pending	\N	48913322	\N	2026-01-12 09:41:19.353336	9	regular
9	\N	\N	50000.00	2026-01-25 00:00:00	\N	pending	\N	48913322	\N	2026-01-25 08:05:02.62111	6	regular
\.


--
-- Data for Name: salary_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.salary_payments (id, salary_id, amount, payment_date, payment_method, reference_number, paid_by, notes, created_at, staff_member_id, property_id, recorded_by, period_start, period_end) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
0GMkpBNmNPbAYeyY8nKA2JTUA_l_que9	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-10T12:04:20.443Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-admin-awGd1t", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768136657, "iat": 1768133057, "iss": "https://test-mock-oidc.replit.app/", "jti": "6cb59b2a297432886a68600142031b26", "sub": "test-admin-awGd1t", "email": "admin9w3wBo@test.com", "auth_time": 1768133057, "last_name": "Admin", "first_name": "Test"}, "expires_at": 1768136657, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4MTMzMDU3LCJleHAiOjE3NjgxMzY2NTcsInN1YiI6InRlc3QtYWRtaW4tYXdHZDF0IiwiZW1haWwiOiJhZG1pbjl3M3dCb0B0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJUZXN0IiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.mDBXQnWX0PYHJoJn-ApPpLFkAU73bxQUjNlxaLHw3ik_WHePK8fXZEvJ2Wv3QJLq4GbxNyGWZdMfj0270gYd4R75yD0JYEVtHapjDUox5ygvFPzDCpsi6z-bqevcNRKP2LCP6AJ4ZmcZaarjfEvZVy3DvuWkGx5oTH7gxaeVsaEUXSX61aU0K2eT79xS9iZhzr22OVDBaBzONBL0wguSqlSOweIo7HfsCd4lPoHMLYbf1elGWgMQxVDO76WpVvkpUw0GZjr3bi8OXuFEMNMiwbIFj2k6soO9XItsBhaL6qOx3-wvLbaMXBAp2OZTxUsmxZwO59lhFtxvzbfKPamOsw", "refresh_token": "eyJzdWIiOiJ0ZXN0LWFkbWluLWF3R2QxdCIsImVtYWlsIjoiYWRtaW45dzN3Qm9AdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiVGVzdCIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-10 12:04:21
H5h613sKTCLdnnHhyoeURGSvm1YCzkUt	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:06:31.700Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767722787, "iat": 1767719187, "iss": "https://test-mock-oidc.replit.app/", "jti": "f5c3b9dc6a5bb7afdc33cd9e887feea7", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "roles": ["super_admin"], "auth_time": 1767719187, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767722787, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5MTg3LCJleHAiOjE3Njc3MjI3ODcsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4iLCJyb2xlcyI6WyJzdXBlcl9hZG1pbiJdfQ.i62qE6jhAuegSh5mkQi-4b9tAmRL11ERgBDslnvRdt6p50JanVnJI_sC6FLrrqxhGQxLGkXu4lIAOg3-ejtJSYhjOziM_cdC9sFnblD0wF0DVeIIp9i94Kj53fdUgfmtyETsmrQswXYrGuDLPxHlu5A9qdDijxnFnIc4yJNlZlPUkWaWN7h40lBsOx0cex8fyygIZuMxjBmCkpSPa9r_D5SZM28HFiv3z7TBFdc47ZP7JQ0yl1GPqhQ_Fps3g84Z7VI79GY0FMFX7NSPeG9SX3jIuYf8O368sT1GVv6gyWcpRv_qku69Fp9BpY0DICh6Mu37wMI4iJpoJGIDZKVPWQ", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIiwicm9sZXMiOlsic3VwZXJfYWRtaW4iXX0", "assignedPropertyIds": null}}}	2026-02-05 17:06:42
e-7gRsSXZ0tkzaJrZShDjID6mncmAPYM	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T07:04:01.981Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "admin-hostezee", "isEmailAuth": true}	2026-02-05 07:04:48
fvlyLu9uzxcXyb-11PdMmdhtQcg9F7Ky	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T07:09:43.450Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "admin-hostezee", "isEmailAuth": true}	2026-02-05 07:11:10
L86QpU_uMGXEzNDEMBv8-GfpzXAAC59c	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T09:07:50.507Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "admin-hostezee", "isEmailAuth": true}	2026-02-05 09:10:53
3OsX2oBcbi7MnCFaUFGF38aW8CizDh2i	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T07:06:35.684Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "admin-hostezee", "isEmailAuth": true}	2026-02-05 07:08:17
QteFz4LDza-47cQyOb30X0ofd0uG_HqO	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T07:07:16.090Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "test-mock-oidc.replit.app": {"code_verifier": "nbpKQafAXWB6bH_BSwEY0skf2PMtCo7_Avq_9InPqoU"}}	2026-02-12 07:07:17
04FEOrzpMHCph5AXDGyCOg_6VaqwHkBt	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T08:04:23.162Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "mUoHv8", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768295060, "iat": 1768291460, "iss": "https://test-mock-oidc.replit.app/", "jti": "619e5bc24aa13824f80140a2ff9decd6", "sub": "mUoHv8", "email": "mUoHv8@example.com", "auth_time": 1768291460, "last_name": "Doe", "first_name": "John"}, "expires_at": 1768295060, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4MjkxNDYwLCJleHAiOjE3NjgyOTUwNjAsInN1YiI6Im1Vb0h2OCIsImVtYWlsIjoibVVvSHY4QGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IkpvaG4iLCJsYXN0X25hbWUiOiJEb2UifQ.pxhoIDD6keolKo0wRXkiuFd8yqg5UWvwPZJ07PdEwtu8rtIEgyMjxa2klBN7hIwTXWz1NAN7m6KeyB_KXYedqoLw1emFjBdkbzNbxbIkA7GzI4J0uLjgLcAuTCT0iPIW5ZXewNsC3_JctlRl1luGq7E5pgiD20Nal9qypXVKQv_Z52J5gWK6ZI3dANsktafEtcH_r91DlSGuUd-dFAodGSjC_ACbiccjnm4CdyA5DPSv2Q8DN6lHkMaYbVJFdkdIzPvSjYsY50Pc00ZDf95dyvnDTP_VWKTGE8sCz2BQ7t1QFPWYGfe5LmPKU9lEjlPRtJ3k_ExUhMzCrGPgnTqGZQ", "refresh_token": "eyJzdWIiOiJtVW9IdjgiLCJlbWFpbCI6Im1Vb0h2OEBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIn0", "assignedPropertyIds": null}}}	2026-02-12 08:04:24
b-NOFrAh_ubwXCKIT8zWeC_T-fV818gz	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T06:18:28.607Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-wallet-user-001", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768288706, "iat": 1768285106, "iss": "https://test-mock-oidc.replit.app/", "jti": "7ea44875d2dbc271740b527cf39b32f1", "sub": "test-wallet-user-001", "email": "wallettest@example.com", "auth_time": 1768285106, "last_name": "Tester", "first_name": "Wallet"}, "expires_at": 1768288706, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4Mjg1MTA2LCJleHAiOjE3NjgyODg3MDYsInN1YiI6InRlc3Qtd2FsbGV0LXVzZXItMDAxIiwiZW1haWwiOiJ3YWxsZXR0ZXN0QGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IldhbGxldCIsImxhc3RfbmFtZSI6IlRlc3RlciJ9.oAj9zAWlhcHIDr50mN-rOC_1129OFQHgGwEpZxKQ6SR3sH3xRDK9g_h0OFjfjIN-5TwkbWX5ZzIBejghTzzfss_b4Qn4JsCAozKy0XW06l14Pn4Vz6JIJvcMLaWhEj8wLiARhJxvyOw5j39TgIJTlmTMyMubViY0PmCsElmuRRxno7E3JZ1ZuSmVk_7pWoGxJFPMZtVT3h7McY_N9S9OP4nAdK61pcV2Ev03e9fjpwbn77FHrGVIynk74YhgPtjzMaWspuaP0D6lezLHpqVooTCCq4-vtUTRFC2lQBhMSUjtWCKXUGoKjpAnrfbJxB3xLXWBWOoKcHXiJFVhSTzwMg", "refresh_token": "eyJzdWIiOiJ0ZXN0LXdhbGxldC11c2VyLTAwMSIsImVtYWlsIjoid2FsbGV0dGVzdEBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJXYWxsZXQiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ", "assignedPropertyIds": null}}}	2026-02-12 06:18:29
2bawiJqR47NfKd1BZunW3EbRxCkdUTbW	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T06:23:15.022Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-wallet-user-003", "role": "admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768288993, "iat": 1768285393, "iss": "https://test-mock-oidc.replit.app/", "jti": "a4902d8d1b7318cd46cad878b2cfa250", "sub": "test-wallet-user-003", "email": "wallettest3@example.com", "auth_time": 1768285392, "last_name": "Tester", "first_name": "Wallet"}, "expires_at": 1768288993, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4Mjg1MzkzLCJleHAiOjE3NjgyODg5OTMsInN1YiI6InRlc3Qtd2FsbGV0LXVzZXItMDAzIiwiZW1haWwiOiJ3YWxsZXR0ZXN0M0BleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJXYWxsZXQiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ.IrOU-1MHdBPhmfAa3bbWII5yIu66pvJWvaWMsgFdza36ULkqqgkirpw7kzDGd3uqvGG69PaPE3GcOB-C1fkWGoHXMJpbYAAkVN5PfQTlea1ocAad6YDWI4hvVPLMmrmqZYvUyD5J5qRkP2aqXYqMuwqRj-JVs2HyRFtNIBHHWaa70coN1YtT-zsxxRds4pd1iu8-HdB-JLqhbjPbcUOx5C5z70JuXZALtXpbKsXlE8ZbJ5KDlwFIq11Iw3FVCVO8F6L_9YdRiq7pSdF_lmE7MjbdQhiMuFxPk89yavZvyXY5lzLhLTTCC947mOAdlCT95iBdOx-SSscTv4wWo3Xpnw", "refresh_token": "eyJzdWIiOiJ0ZXN0LXdhbGxldC11c2VyLTAwMyIsImVtYWlsIjoid2FsbGV0dGVzdDNAZXhhbXBsZS5jb20iLCJmaXJzdF9uYW1lIjoiV2FsbGV0IiwibGFzdF9uYW1lIjoiVGVzdGVyIn0", "assignedPropertyIds": [19]}}}	2026-02-12 06:24:00
rUZcL9KHDQytY_8c2J1TlhsuD52x32e1	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T06:19:43.388Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-wallet-user-002", "role": "admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768288781, "iat": 1768285181, "iss": "https://test-mock-oidc.replit.app/", "jti": "8fca1c6aaf3ee9b288f7702559e6661c", "sub": "test-wallet-user-002", "email": "wallettest2@example.com", "auth_time": 1768285181, "last_name": "Tester", "first_name": "Wallet"}, "expires_at": 1768288781, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4Mjg1MTgxLCJleHAiOjE3NjgyODg3ODEsInN1YiI6InRlc3Qtd2FsbGV0LXVzZXItMDAyIiwiZW1haWwiOiJ3YWxsZXR0ZXN0MkBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJXYWxsZXQiLCJsYXN0X25hbWUiOiJUZXN0ZXIifQ.XvNDbv7IOjMjEGnGYlJ1LebsCe--qcIGL2Xbg85vlefTAakdtIvoO0NgxKy9svNEZEELu1IxXU6V2AFQ5HXm4o7AiNm_pARtOKewFIkBdi1jh3-_5rLyxm7OcnL9qWHcmJTNmOlfEp0idbKp8RyR6sPX6na2l86pSrqrqPXxHU0kS6pWbGuPbeIY7WDmMiC2YLKhsVqrH3eibncPqNl7N8h57f4nBQSaXz3hIts6qGPw9Lv_No9TNMfF-Zdnv4oN4CmynevNEpz-rxF-A71zvkAwywevrYm3Pqvp9ZngVAAXF9ys9prQW1PaYS-CjxyxtlJgDE80kia-Jt4u15yLVg", "refresh_token": "eyJzdWIiOiJ0ZXN0LXdhbGxldC11c2VyLTAwMiIsImVtYWlsIjoid2FsbGV0dGVzdDJAZXhhbXBsZS5jb20iLCJmaXJzdF9uYW1lIjoiV2FsbGV0IiwibGFzdF9uYW1lIjoiVGVzdGVyIn0", "assignedPropertyIds": null}}}	2026-02-12 06:20:45
sNiAe2ayuGapu3FShzjnxBDhh3xCBU_C	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:16:58.500Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767723410, "iat": 1767719810, "iss": "https://test-mock-oidc.replit.app/", "jti": "02497f0ef359f037f219956cc25c12a5", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719810, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767723410, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5ODEwLCJleHAiOjE3Njc3MjM0MTAsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.BtQ91UFl5yTHtbHm9RYIHGNrTE2yVRA9OQPZPT2v1UIM64azpKeiXrk1QtkVFC_Kys0XFz_LElvRdB6WxMAmq35rUajha9hreXA1CAHxmIZvtrqdMkgcj1TrVkqCedD7-UdZR5Ca9j_9CxUWLUyDtDNgwQkcKnuGvM4p6R9tSCWPbol6KopXSRx3Vh5QkQicur-_e25Ds2hf61aADQZoymFbOISo9ZSi-ZAvLKXJmjnsgOlS5kinIlSfj_Wbx0KNpPUYXGxvLvnIEqLKWam1qNVq_36oo0LLXPIMqyxo3Q-hZYWyCbRDjzxSgvKEMgNZK6cgzoIxX6VvG38Y458tFA", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": [17]}}}	2026-02-05 17:17:48
07vE1GLVQhuQjUmAigSSrRm66n7YK2VA	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-11T13:45:38.350Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-admin-salaries", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768229136, "iat": 1768225536, "iss": "https://test-mock-oidc.replit.app/", "jti": "6c4e9cafdd2d860e59114564f78eb3ae", "sub": "test-admin-salaries", "email": "salaries-test@example.com", "auth_time": 1768225536, "last_name": "Admin", "first_name": "Salary"}, "expires_at": 1768229136, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4MjI1NTM2LCJleHAiOjE3NjgyMjkxMzYsInN1YiI6InRlc3QtYWRtaW4tc2FsYXJpZXMiLCJlbWFpbCI6InNhbGFyaWVzLXRlc3RAZXhhbXBsZS5jb20iLCJmaXJzdF9uYW1lIjoiU2FsYXJ5IiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.UFONdYmwDs2Q5DqW2RXfgMN6QFWG2VaCITFB0rPLNmb1yVdHhoa-IStOgeVmi27fy7t6pRcJm0To6eEuXiR6CUgHmi1hXWNBxs5w9Y17RAuxdb3U9nolVO5CApAGmfLcqRE1pa76uSI5NNGMMVXsQ3DqBRjE8JvbFHmaB9Ceua1odXry7g7wHRIbO25q8iavikYxp0T0V31jyrIgpnxU4jDtZw1WrS1RUe2KCLkgy2fN55JAoBM31IO90M_v_B3nbynGvb5IXBgHRQPxW-dW6dvfSTeyyoCSl4_xaxtfSABBtamctJP7fCL1CGirzSNOAYGWcwC-8a75oEW9Jb0NSQ", "refresh_token": "eyJzdWIiOiJ0ZXN0LWFkbWluLXNhbGFyaWVzIiwiZW1haWwiOiJzYWxhcmllcy10ZXN0QGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IlNhbGFyeSIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-11 13:45:39
rm9GOvjGIZeVG5d5R_g8vcNlmpLBzAWl	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:04:56.386Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-admin-menu-reorder-super", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767722688, "iat": 1767719088, "iss": "https://test-mock-oidc.replit.app/", "jti": "d0decf16dc7ffd8c8e2610073196bf90", "sub": "test-admin-menu-reorder-super", "email": "super-admin-reorder@test.com", "auth_time": 1767719088, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767722688, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5MDg4LCJleHAiOjE3Njc3MjI2ODgsInN1YiI6InRlc3QtYWRtaW4tbWVudS1yZW9yZGVyLXN1cGVyIiwiZW1haWwiOiJzdXBlci1hZG1pbi1yZW9yZGVyQHRlc3QuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.G7GjikDsBsogLfOEAVP3amKHNkwrmAhl2nwexMfm6SISypsMSBRZw_2NaZyT0M8z6UIkGy7z3kSF_kqIrf9MZj-dMbDhcEXoBJ2volJ_h1wHSqHsM6GFbDU6HbXsgkiSktz6OelGzmj7pxOajy1UF0SRSEN8bprc58P6tz0saXmaFXP63TRU1DvJXAgCFYpureNYlDZIOAFUNAqU00P2Km4W4lSlbBiiTeF54eKgENmSMdD73C2IEK6Ux-32h46tAmbo-lZnG_74UjUIkLsEGEV7E5n1ZZazK0FSX0eFyWLI_ZoaGi8i-tB4j_Py-LJ804XVk7ShWIJJuE-4IJwg2g", "refresh_token": "eyJzdWIiOiJ0ZXN0LWFkbWluLW1lbnUtcmVvcmRlci1zdXBlciIsImVtYWlsIjoic3VwZXItYWRtaW4tcmVvcmRlckB0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-05 17:04:57
WsiVIn8i2OaQLOl3VMYp3AzptxKl3t7_	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:06:54.608Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768637212, "iat": 1768633612, "iss": "https://test-mock-oidc.replit.app/", "jti": "768bbf1fe9792f9f3803bd25878df66e", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768633612, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768637212, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjMzNjEyLCJleHAiOjE3Njg2MzcyMTIsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.WXBJ3Rc-WfgUySFDidQclMF2CqHZw7O3MbMzEVkBAftdYiEB89D7SO64JhbhKkAevqIBje42XRiFj4kbelnT4CAkFOZBAUHlWBja-3gyFhDnQxl_9lN0VnPtE9w0iWYqpD6_1bwpzbe0lFLUSxtWYidYwj6ajlzUDyyntKtyMjcrhZLPcpDwfStu2OLe1Fk9fDxX8PoW3fjyanJDk_ztaaNcrs6apoei96kTHbt7DdLOA5KlpYzt6wAioht32BWGcAlJSej0IA8mm9XPiClcIdWLRenD-HiBqKdju18Fql5V_clMJtRThikXrgdnT2llVTomtGaQYfV5OJyQK3BhEA", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:07:28
v5hYHC-dBxR5CUfpaigIXmP6NgN1POsA	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-11T08:23:01.051Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "user-1768206024832-bvrmz88", "isEmailAuth": true}	2026-02-11 15:32:44
XePDmpSmjiJDM-9_114DYk2PS_OmvXrp	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T05:45:23.475Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "admin-hostezee", "isEmailAuth": true, "isSuperAdmin": true}	2026-03-06 05:54:35
t518AhW0yh7m_D5Z3TuH6Nx6MUq5oD3m	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:13:55.368Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767723232, "iat": 1767719632, "iss": "https://test-mock-oidc.replit.app/", "jti": "cf8fc9ec303c698940aeb096c078defc", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719632, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767723232, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5NjMyLCJleHAiOjE3Njc3MjMyMzIsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.Wj_7oUoj5-VHsJzRcSnU6KMAjWk9VoRDQDaLKQ_Wz_tyTxugq7DDvOjcxAnJNlV4tMDKLZdOypKg-dTCSpUkAzlEfNTC6Y_4rLuwA5hU57kaxAKbN3iJA2ioIZmysT8sYuxnZklihHHHFODiDGRSfTh-dIZyL9E_4rB-Cem_BKbETqo2x33sgDhd1RCfdvCblwlLuVnAdJFULXPUhxDTiUxgJH3qCsHGzXkrWhIoqvwDLATbHc8p33WShvPpVOt7hrKajnuh0ZFCNXTBtEZXJzeAJxnlgb9EsEpzePkjyZIq9Fd5acNXJ4eRwTpQpdlUTkCD96G-oB3zMRtLMvYvaw", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": [17]}}}	2026-02-05 17:14:46
GdB4hMvm3bhNFmvubSvDyAbtm7IVzAei	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:10:36.884Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767723019, "iat": 1767719419, "iss": "https://test-mock-oidc.replit.app/", "jti": "ea22d9a612f6a883cb080c8200f056d9", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719419, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767723019, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5NDE5LCJleHAiOjE3Njc3MjMwMTksInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.RnsPqWh41_AasZpzF2augSPJKg1ZDRpK5J7fyIXaenZDzrbKPyJqLGar7BbvqVCSppddcbBeFtRSV9NreRQmIU0sLAH3kkAka4WgsVYA5gOhFiEkkZB2oOOIXerEUZ0Xo9lLyAJxlCQM4Ttvv9ZA5Me7zlkIzotNRJqkOIxn1LIJ72bcerVjosou4Xp89a6xYDcfV5YH3PMQwv3KpDdjpA0XSvp5YAKnoPbzyVV8i11tHvcI6WONUbzRydDk4ex0J0nf4eU84PZuyJ-68MRnPJWn5SDR-RFswuDWjFxrI40gmeRqwoD_M3Lds_DsKbe2UIuYfzYpYj_2Xx2USla7pg", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-05 17:10:43
YGmR0i4CmabxjDxrWU_bZm0MTfEsXmNW	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:08:51.939Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767722927, "iat": 1767719327, "iss": "https://test-mock-oidc.replit.app/", "jti": "31ba5ac0c7ec4e62d1b303d981a514a0", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719327, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767722927, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5MzI3LCJleHAiOjE3Njc3MjI5MjcsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.iRLYgyYK8NSAV_aq5EG_m7hlo3cxjZ3VaQgFXiW8WtnbN-BmFztVfvGNNDVXEODqDBH_ZV0qU4Saz3jvxjQcrU18Q6NA21fKbZGW6OrkF2rezZ5G6F7oJ13g1aEarHF1Zf0VH1a9UpB6OsIClH8QCzY3KzVpVquqF3yvVtfT-K-_qtYEoQwD0kMLiVgY9pFIyudrQb86n4yiOr2MnGD7VemNHWSV5aNFjL-CuD_9aRPb6N4x-YTChhilP_s56Shkert97S17Xo-kUMxP9iEWlknKfcw1yRBBtwpgNiUQW2tjs0ZWE6dj2KeRve5jdmTo40k33KC7rPSbZitAivCXWw", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-05 17:08:59
DjeCNLBcABdcFkqD_UEp_2-T6KnCW5HJ	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T15:01:13.944Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "3Z6gQW", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768320068, "iat": 1768316468, "iss": "https://test-mock-oidc.replit.app/", "jti": "5409000b9537337f5e56d6bf0b2d54eb", "sub": "3Z6gQW", "email": "3Z6gQW@example.com", "auth_time": 1768316468, "last_name": "Doe", "first_name": "John"}, "expires_at": 1768320068, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4MzE2NDY4LCJleHAiOjE3NjgzMjAwNjgsInN1YiI6IjNaNmdRVyIsImVtYWlsIjoiM1o2Z1FXQGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IkpvaG4iLCJsYXN0X25hbWUiOiJEb2UifQ.maXF57bZs0VFveRi1LXr-KBRLROqyOeRoCaV--TWIku8Up3WWhWakG0mtt7KYUiQQydApY29cx86g-lOK1AdZjzQMquhU2_Pb9eaWoaGZvwcdfaVHIa4ON_cQJj2_barD9BcitcgFcfl1os1Hr4rHJQEgY4X6zAb4-XGNluxIqlmYkZyyCWj_az-__2ZgAv2MnU1EilcERoNIFTCOnWtgG7WW6UajsLNEOrQSWtZjkKrOb6jhMyASH-nEZD7_42K62jLswJdXf7ADaTcZxBHF06V-mG4vKrPYkT2YrgXGHofiF7r9nqHO2_gcJMBj8wvMbi6h7LPJojqlTpyJRltTg", "refresh_token": "eyJzdWIiOiIzWjZnUVciLCJlbWFpbCI6IjNaNmdRV0BleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIn0", "assignedPropertyIds": null}}}	2026-02-12 15:01:14
WB56kOnqhwjaYnl_dFaCNobmcDvoK7TP	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:11:57.303Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767723113, "iat": 1767719513, "iss": "https://test-mock-oidc.replit.app/", "jti": "1650f3b744c479a18529d770eb19a20d", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719513, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767723113, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5NTEzLCJleHAiOjE3Njc3MjMxMTMsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.X3rM2BgBOsFCtvvxGX-9RGYpNx24_ndWt66HwKGAo5FL4bRNeqllK_GJUNN_IKHowCAHhGWsCNqgXnD-texob_t3xlpwz2Yms2hBIaRrbtmRvH1y0pgaf3QSGvWhHn8aovgKyPg2LWuHOnoq5kQBmr7T1SpuoR7YPfl_Kk9_0EWjFcWxokwoQkWTxE4ERZJilZvX0DpMUQ60fEuE4DCveZ-DI0up3obhwBL4b6S7DtAzlN78970wJ-1SOcyQLDVCZxD7qWkN4fsh1CTpQtFkNaBefpFdU4rhDb-66-gpgpZnWFQsIuk9Lopt35DCHE3pQzvgLbarjthspO4ae9nAlw", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": [17]}}}	2026-02-05 17:12:24
oDiTTxnclmDWzWwg5GGk1sNmnNSnXcsj	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-13T10:14:08.719Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "test-admin-123", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768389246, "iat": 1768385646, "iss": "https://test-mock-oidc.replit.app/", "jti": "06a7b76c4dd7989a670c180461187765", "sub": "test-admin-123", "email": "admin@test.com", "auth_time": 1768385646, "last_name": "Admin", "first_name": "Test"}, "expires_at": 1768389246, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4Mzg1NjQ2LCJleHAiOjE3NjgzODkyNDYsInN1YiI6InRlc3QtYWRtaW4tMTIzIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsImZpcnN0X25hbWUiOiJUZXN0IiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.qYAIMNWprxUiHdIWfv_SF2lzNbRg62t_oISIB_PlPFnlhzOzvT2bpVynCodptCNbc8JJKE8CyjSIKYD8M-j1-I2mcFc_cVYO7JcgbGOWJIJGOyV9QY3eSzBGNh35FcLhG-Qq1G0YOjGGbQmGkyvfJ-LSbj1pVjYkefkCMv8d17-BQ9crpll0GqX6WmYbnlMi4sZXmkNBN2_EseFtHyAnbvwcpT_Q8uxoX-kM5q5MLCPAtxl2ul0J60Pv2VF6e4sawsNpZorXuFMidftYIP8dzI_BVSlrzBdMRkEVsBQpkEv45qmDDDI1DOBDtQ4Anpan7nKjAkFFbC1j6T4ooMzc9Q", "refresh_token": "eyJzdWIiOiJ0ZXN0LWFkbWluLTEyMyIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJmaXJzdF9uYW1lIjoiVGVzdCIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": null}}}	2026-02-13 10:14:09
SJhe175lmiEGHf3uEMxqHNJuEkSV0XAf	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-05T17:19:45.717Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "super-admin-test", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1767723580, "iat": 1767719980, "iss": "https://test-mock-oidc.replit.app/", "jti": "3f3d1b129512a274235890842451a465", "sub": "super-admin-test", "email": "superadmin@hostezee.com", "auth_time": 1767719980, "last_name": "Admin", "first_name": "Super"}, "expires_at": 1767723580, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY3NzE5OTgwLCJleHAiOjE3Njc3MjM1ODAsInN1YiI6InN1cGVyLWFkbWluLXRlc3QiLCJlbWFpbCI6InN1cGVyYWRtaW5AaG9zdGV6ZWUuY29tIiwiZmlyc3RfbmFtZSI6IlN1cGVyIiwibGFzdF9uYW1lIjoiQWRtaW4ifQ.OO_6AlJSIOGoWmrlazx5u03VSGx2wRFfM5rKvLW5f0aE8_RfMinUmZPHRR97MwvlhoLCJzm222tczkT4blcS_UKrgvUTaEbYpnp8YMBWd9cxZ9xt2OjULVjaPHugnPVH89WR4v1lFTSxBYRUB9K6tSnqhAAyVxLBIu3xi7yoMBcF6NGBBhXHK6MrjskVOTIGr-PQHi9y3hx2LKUm-zsVd_oomztdNRi_4oxKj5YvdbpcxrzWupS87faJ32stnZFr7EhwEqGF60pftOxdmota9vj81z3DDK2SsRihSxi7KMfnV__pYDtSaAjuJaukP5BqTXMfDs2UoHHaWMitPcy0Rg", "refresh_token": "eyJzdWIiOiJzdXBlci1hZG1pbi10ZXN0IiwiZW1haWwiOiJzdXBlcmFkbWluQGhvc3RlemVlLmNvbSIsImZpcnN0X25hbWUiOiJTdXBlciIsImxhc3RfbmFtZSI6IkFkbWluIn0", "assignedPropertyIds": [17]}}}	2026-02-05 17:20:20
URMix591jjc0EBB1IIJmmlkdeo0Hl4dF	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-12T08:43:06.249Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "userId": "user-1768293773564-udd5nhs", "isEmailAuth": true}	2026-02-12 15:15:38
SbQ2X8u62C-NYvRSxWyNyr3Vy6lJRD0T	{"cookie": {"path": "/", "secure": false, "expires": "2026-03-06T05:46:16.233Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "48947216", "role": "admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1770187443, "iat": 1770183843, "iss": "https://replit.com/oidc", "sub": "48947216", "email": "thepahadistays@gmail.com", "at_hash": "JatmzACg1e-7L4eS1aeeSQ", "username": "thepahadistays", "auth_time": 1770183842, "last_name": null, "first_name": null, "email_verified": true}, "expires_at": 1770187443, "access_token": "EBaCHhwGCr25e2lmj5PboujhTfuufClyWJTd28U-dld", "refresh_token": "fjAUmAdL8KJ7oYOB_vuTg9-7Oo32lFtDvSTuIV9Uwzc", "assignedPropertyIds": null}}}	2026-03-06 05:46:18
nXF7wPtvCg5GQaQDFtNLWWZLVq0P04UD	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:20:56.047Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768638053, "iat": 1768634453, "iss": "https://test-mock-oidc.replit.app/", "jti": "c9393bc6d3975f2294258f42636cff70", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768634453, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768638053, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjM0NDUzLCJleHAiOjE3Njg2MzgwNTMsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.AAk486D9XzFF9bCkPHXlBPfyzhUKquz0y5_UaZlb-VlwGQ6Ju-wClMLQw7AblVCsMatG5IRUXRhSYqbElL8fRSRAEBRBasLPzm8sZa655dbD8obpozGkCGoOHct30J7mhjECOkVHwqoT0NeHv0sAN9Zs9Kv0lSM7g9BL16V6XHPXrGr0aOedDSXlQ9lsVX8GZfTkv3F26RGB1aP05LKmt62A4WzUyP_7qME1-NQaNf9R-ftLAunTZBigonpEvVBPFF3wizKO_RIuGu9qovzArf7tkLywX_JtSYgtRR79tg3V8aft3j-Mv67ejCKuK_SMxV3Q7B48Mwb7x5wXtW38Fg", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:21:30
2ycgNmLOmpk4GTFQ6VYk4bv5z_ixuOSb	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-20T19:04:26.892Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "48913322", "role": "admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1769025864, "iat": 1769022264, "iss": "https://test-mock-oidc.replit.app/", "jti": "07bfadb4c022f2ddfb796bce8dac006f", "sub": "48913322", "email": "paras.thakur18@gmail.com", "auth_time": 1769022264, "last_name": "Thakur", "first_name": "Paras"}, "expires_at": 1769025864, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY5MDIyMjY0LCJleHAiOjE3NjkwMjU4NjQsInN1YiI6IjQ4OTEzMzIyIiwiZW1haWwiOiJwYXJhcy50aGFrdXIxOEBnbWFpbC5jb20iLCJmaXJzdF9uYW1lIjoiUGFyYXMiLCJsYXN0X25hbWUiOiJUaGFrdXIifQ.BERbsFnfQ08qfh6MM2AMojrJ4D3gWxP0togFalWptIJWjXMOJOE4k4Akk8sjd-ZUdK6HqB_ur7fWcx0hyTHCmENeYtkujLoPhteGNZlPPUeHCRr6sQVQaEuOM_Vv1w8WSAb2jHQs7lnMzjV0EVsodVkLwEvaSGNy0cZdTp1VhjKtekJBaeKb3QqhL3rJbioFE35GCAturkPEe-3xm0mWrhIx2e0yf6b1PAhhQlRIwOzQnH2CqijLlnC0z4L0fx310VFbsH3r-1p4uW5xx4AkBIM62wz5YSaJwSINHTZVgCdQRtD2voXWLXVrv-ZyEBjO9iWj7EW0p_3boap1yJvTNQ", "refresh_token": "eyJzdWIiOiI0ODkxMzMyMiIsImVtYWlsIjoicGFyYXMudGhha3VyMThAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6IlBhcmFzIiwibGFzdF9uYW1lIjoiVGhha3VyIn0", "assignedPropertyIds": [10, 11, 12]}}}	2026-02-20 19:05:28
X1q2imXKB1NwlIV5hEGREiPU6wmUOFrX	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:14:59.369Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768637697, "iat": 1768634097, "iss": "https://test-mock-oidc.replit.app/", "jti": "f720ee6371a54c87d6cd045cf0b416da", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768634096, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768637697, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjM0MDk3LCJleHAiOjE3Njg2Mzc2OTcsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.cSBD_Euzn9MaWUrAFI2qcgLbCnG_28jLiCHoyf8AolfXfg8btGF_l2tp_BgHRZZuXnUKLN_7ZZQZtGAubGCGRJVvSgIttnP8_mCWZuvFIT-XkmCf4d6OwXrWzIQC_qEnHwrVHJow9OsAtM9h1_r0q2WC6dJm0Vy2JghIJ61WCV-rhwFG2cS5pmDfIoz6XBbfTyZq501VwPPxEdm9GmBlpFq7zvn-PsUz_dKIWn9zfhTd9MlVCcq-Qc7X-UfMp3A18U7ztkdYFLmwrK6ppPqwzSlhR0zkjFTi9NIe1lsUzJIQBQfYFa7xerxfMScRSXlCopE1376vRQ7y7gVSYFLWEw", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:15:38
zPfWU2bGnVe80to9YJ-nuCydaKf69Vsn	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:12:27.366Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768637544, "iat": 1768633944, "iss": "https://test-mock-oidc.replit.app/", "jti": "9d81bc9e529b693209b12dcc199da2ad", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768633944, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768637544, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjMzOTQ0LCJleHAiOjE3Njg2Mzc1NDQsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.D159m-sZJmDUIpO21PXYJQTyd5POKK4Dkg5eiZ99PkwM_cF-RywLsnQLtl32AGJvWZ6HhqpKAzWVr94WatiubDMzPPLjUsZbYxYkJ56IsfsQIZt0DaevvTi9kAudVWGjoJ9lPmoGkk-u1dfwCVNfQwvyNLRFo6cj4rx16l3HaXgE7G726FxqJw5ncKniIM1_B_CqZbu2wHNLBlD0BLgRSFYKL7ZF0lKeqp2deezdPiIhEpyOav0O_RXMWvE6BUYaqS-J_ZtIuJBBYQnBH0Sa1tGy8rOcBuLsQLSFsim2RmGjK9xcYBM5tnkDcy8OM1MJbpJAYlRjlTPUhg6317NqdA", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:13:08
VcChfOQOXCHS6Jkqiv6iSCiKCWeys2vq	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:18:01.371Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768637878, "iat": 1768634278, "iss": "https://test-mock-oidc.replit.app/", "jti": "a18ec38f58faf4e31d5884bf2d4bd444", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768634278, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768637878, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjM0Mjc4LCJleHAiOjE3Njg2Mzc4NzgsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.jyB2zTVwdhJdKrJM8q_dZV-6PqufEe8x5QMpT0lFO_gao0cdrtMSZJjkE5CZsCxD3kIj3EhRRHjX7Zvx6J9uajktIC6Afc1fysGvE5YW3oX6vOdCpEaLtvgLuZ7K0bl_seBNoM2h5-inEr_yLpirhqkDTVqGC_SP4jwpN5PyjjJQUan3Lgcm_yAngag_NibtnpPilpZHne_r3ZiRSbtwE-5iGFMo1LGLlzW9-vpgVkmyReKtuNQFe9EVa8Shoqthe6SHqwdR8vZYtvLlTjJ0kHKdRsir5c3SKjRsOGL8kstbmm0PbTtoRT1OC6nCMoV3s4wwijxBdwmt86YNOcDlAw", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:18:29
zl3tuq3N4x0S9j52cm9Lf_owB5Ber1fo	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T02:40:11.779Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "62aZ8q", "role": "staff", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768621209, "iat": 1768617609, "iss": "https://test-mock-oidc.replit.app/", "jti": "dc912ba97c5572db158580e0cbb709d5", "sub": "62aZ8q", "email": "62aZ8q@example.com", "auth_time": 1768617609, "last_name": "Doe", "first_name": "John"}, "expires_at": 1768621209, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjE3NjA5LCJleHAiOjE3Njg2MjEyMDksInN1YiI6IjYyYVo4cSIsImVtYWlsIjoiNjJhWjhxQGV4YW1wbGUuY29tIiwiZmlyc3RfbmFtZSI6IkpvaG4iLCJsYXN0X25hbWUiOiJEb2UifQ.Mty8Wvn7tNiP0dfjfNHp2rsjnzhDryI2wfgR3t4krm3a_Ot3jz6d07FtsiGd16tYSritjRlc-A5LzRt_b_bgGupK0M3ypthm6zIwrBDsyTM-qN_NBbLW4g65Gx-yNEdZwJphQTY1pR9DSMTc6BsQPRpPJFfFvfWgynOM1H2hP7J0RgCgIt-bIMMoBGNZpSBmBt9ZjC4MJoocXJt6JEXZNaSqbOT47ozmYnRjZ-STqqb06_kT8Pdlz0ZgVNxngW1LsZvsEHEeQEoUJeYTlH-U_Ocxcw9DK5vPtXL5OVAVBsWGRoPkJueMPdk_P6iLHB2Ei_jO1tBKCB1_HUMy6GVCJg", "refresh_token": "eyJzdWIiOiI2MmFaOHEiLCJlbWFpbCI6IjYyYVo4cUBleGFtcGxlLmNvbSIsImZpcnN0X25hbWUiOiJKb2huIiwibGFzdF9uYW1lIjoiRG9lIn0", "assignedPropertyIds": null}}}	2026-02-16 02:40:12
6o84BmI-dST15U7-eFz02pQTEHRXohZb	{"cookie": {"path": "/", "secure": false, "expires": "2026-02-16T07:08:39.864Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 2592000000}, "passport": {"user": {"id": "admin-hostezee", "role": "super-admin", "claims": {"aud": "9c3c75ea-c33c-4bb0-bfef-19b9910d009d", "exp": 1768637317, "iat": 1768633717, "iss": "https://test-mock-oidc.replit.app/", "jti": "2bdeef516a40f31eb1513a5682edf13c", "sub": "admin-hostezee", "email": "admin@hostezee.in", "auth_time": 1768633717, "last_name": "Hostezee", "first_name": "Admin"}, "expires_at": 1768637317, "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc4MDgyZTlmZjVhOTA1YjIifQ.eyJpc3MiOiJodHRwczovL3Rlc3QtbW9jay1vaWRjLnJlcGxpdC5hcHAvIiwiaWF0IjoxNzY4NjMzNzE3LCJleHAiOjE3Njg2MzczMTcsInN1YiI6ImFkbWluLWhvc3RlemVlIiwiZW1haWwiOiJhZG1pbkBob3N0ZXplZS5pbiIsImZpcnN0X25hbWUiOiJBZG1pbiIsImxhc3RfbmFtZSI6Ikhvc3RlemVlIn0.omdRrP0WZDhTetUQG9lQnBzmbEEs_E-ieIliKRL8XMBtdus8Cd9KHHodOJR71JwrwDLMt0wCWHXY_Ru_t_Bw5HAWKz4e8nWs9VTbCAxxprVWjSjlYiVEmGfUPxMy_wNraAAf3nqqYS48F3nMOkrVzJWM56RhbjEOc2CpdT4NVHN1ezN7Uf2ko2ruZetMXnLrK8DDgfZtw8zyHVJphQPRmLvOvlm7GKW-S3sbVw2yrvcKSeohDZVWYtuAb_g05ElHiW_GiUaxZc4_slOyrWkNLjaP6-_vLlD8eKTa698i-QghoJpkxo6I8FpqAyB5sQ3-iwjf1-iuirUiORWVx6VJeQ", "refresh_token": "eyJzdWIiOiJhZG1pbi1ob3N0ZXplZSIsImVtYWlsIjoiYWRtaW5AaG9zdGV6ZWUuaW4iLCJmaXJzdF9uYW1lIjoiQWRtaW4iLCJsYXN0X25hbWUiOiJIb3N0ZXplZSJ9", "assignedPropertyIds": [10, 11, 12, 14, 15, 16, 17]}}}	2026-02-16 07:09:17
\.


--
-- Data for Name: staff_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_invitations (id, email, property_id, role, invited_by, invite_token, status, expires_at, accepted_at, created_at) FROM stdin;
5	kanwar.jaswant25@gmail.com	17	staff	user-1767505791148-wtgsgnm1d	91dc0a2e-1e08-4232-a5bd-f54bf530f0eb	accepted	2026-01-18 13:45:56.504	\N	2026-01-11 13:45:56.516488
7	kanwar.jaswant25@gmail.com	17	staff	user-1767505791148-wtgsgnm1d	826c204a-7726-412a-a1b4-195e04ddaa11	accepted	2026-01-19 08:18:58.963	\N	2026-01-12 08:18:58.975735
8	thepahadicompany@gmail.com	11	staff	48913322	a09f53d6-4a29-47a4-90a3-738f4d35457f	accepted	2026-01-20 08:34:03.663	\N	2026-01-13 08:34:03.675117
\.


--
-- Data for Name: staff_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_members (id, name, phone, email, role, property_id, joining_date, is_active, notes, created_at, updated_at, job_title, base_salary, payment_method, bank_details, leaving_date) FROM stdin;
1	Rajesh Kumar	9876543210	rajesh@example.com	\N	12	\N	t	\N	2025-11-23 08:17:18.786362	2025-11-23 08:17:18.786362	Housekeeping Manager	25000.00	\N	\N	\N
2	Priya Singh	9876543211	priya@example.com	\N	12	\N	t	\N	2025-11-23 08:17:18.786362	2025-11-23 08:17:18.786362	Front Desk Executive	20000.00	\N	\N	\N
3	Amit Patel	9876543212	amit@example.com	\N	12	\N	t	\N	2025-11-23 08:17:18.786362	2025-11-23 08:17:18.786362	Chef	35000.00	\N	\N	\N
4	Neha Sharma	9876543213	neha@example.com	\N	12	\N	t	\N	2025-11-23 08:17:18.786362	2025-11-23 08:17:18.786362	Guest Relations Officer	18000.00	\N	\N	\N
5	Vikram Desai	9876543214	vikram@example.com	\N	12	\N	t	\N	2025-11-23 08:17:18.786362	2025-11-23 08:17:18.786362	Maintenance Supervisor	22000.00	\N	\N	\N
6	Paras kanwar	\N	\N	\N	10	\N	t	\N	2025-11-23 18:06:39.743296	2025-11-23 18:31:21.716	Manager	40000.00	\N	\N	\N
7	yogita	\N	\N	\N	10	2025-11-16 00:00:00	t	\N	2025-11-24 03:12:41.982225	2025-12-29 05:54:39.445	Manager	30000.00	\N	\N	\N
9	Paras kanwar	\N	\N	\N	17	2026-01-01 00:00:00	t	\N	2026-01-12 09:24:25.925922	2026-01-12 09:24:25.925922	Manager	10000.00	\N	\N	\N
\.


--
-- Data for Name: staff_salaries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_salaries (id, user_id, property_id, period_start, period_end, gross_salary, deductions, net_salary, status, notes, created_at, updated_at, staff_member_id) FROM stdin;
2	\N	10	2025-02-01 00:00:00	2025-02-28 00:00:00	18000.00	1000.00	17000.00	paid	\N	2025-12-05 11:39:11.491668	2025-12-05 11:39:11.491668	6
3	\N	10	2025-03-01 00:00:00	2025-03-31 00:00:00	18000.00	500.00	17500.00	paid	\N	2025-12-05 11:39:11.491668	2025-12-05 11:39:11.491668	6
4	\N	10	2025-02-01 00:00:00	2025-02-28 00:00:00	15000.00	500.00	14500.00	paid	\N	2025-12-05 11:39:11.491668	2025-12-05 11:39:11.491668	7
5	\N	10	2025-03-01 00:00:00	2025-03-31 00:00:00	15000.00	0.00	15000.00	paid	\N	2025-12-05 11:39:11.491668	2025-12-05 11:39:11.491668	7
\.


--
-- Data for Name: subscription_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_payments (id, subscription_id, user_id, amount, currency, status, razorpay_payment_id, razorpay_order_id, invoice_number, invoice_url, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_plans (id, name, slug, description, monthly_price, yearly_price, max_properties, max_rooms, max_staff, features, is_active, display_order, created_at, updated_at) FROM stdin;
4	Free	free	Perfect for getting started. Limited features for small properties.	0.00	0.00	1	5	2	["Basic booking management", "Guest database", "Simple billing", "Email support"]	t	1	2025-12-30 06:26:47.186093	2025-12-30 06:26:47.186093
1	Starter	starter	Great for small hotels and homestays with essential features.	999.00	9990.00	1	15	5	["All Free features", "WhatsApp notifications", "Room calendar", "Basic analytics", "GST invoicing", "Priority email support"]	t	2	2025-12-30 04:41:09.342215	2025-12-30 06:26:47.186093
2	Professional	professional	Complete solution for growing hospitality businesses.	2499.00	24990.00	3	50	15	["All Starter features", "Multiple properties", "OTA integration (Beds24)", "Restaurant/food ordering", "Advanced analytics", "Razorpay payments", "Staff management", "WhatsApp payment links", "Phone support"]	t	3	2025-12-30 04:41:09.342215	2025-12-30 06:26:47.186093
3	Enterprise	enterprise	Full-featured solution for hotel chains and resorts.	4999.00	49990.00	10	200	50	["All Professional features", "Unlimited properties", "Custom branding", "API access", "Dedicated account manager", "Custom integrations", "SLA guarantee", "On-site training"]	t	4	2025-12-30 04:41:09.342215	2025-12-30 06:26:47.186093
\.


--
-- Data for Name: task_notification_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_notification_logs (id, user_id, task_type, task_count, reminder_count, completion_time, last_reminded_at, all_tasks_completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: task_reminder_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_reminder_logs (id, task_id, recipient_phone, status, sent_at, error_message) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, property_id, title, description, assigned_user_id, assigned_user_name, priority, status, due_date, due_time, reminder_enabled, reminder_type, reminder_time, reminder_recipients, last_reminder_sent, completed_at, created_by, created_at, updated_at) FROM stdin;
2	17	Test Task Y9dAuC	This is a test task description	\N	\N	high	pending	2026-01-07	10:00	t	daily	10:00	{}	\N	\N	admin-hostezee	2026-01-06 07:11:03.469594	2026-01-06 07:11:03.469594
3	17	GMB	Complete gmb	user-1767505791148-wtgsgnm1d	Prakriti  Kanwar	high	pending	2026-01-12	19:00	t	daily	10:00	{9220757003,9001949260}	2026-02-02 10:03:14.712	\N	user-1767505791148-wtgsgnm1d	2026-01-06 10:51:44.98126	2026-01-06 10:51:44.98126
\.


--
-- Data for Name: travel_agents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.travel_agents (id, property_id, name, contact_person, phone, email, commission, address, notes, is_active, created_at, updated_at, bank_details) FROM stdin;
1	10	mohit	999999999			\N	\N	\N	t	2025-11-03 05:30:31.592823	2025-11-03 05:30:31.592823	\N
2	10	Anupam	anupam	999999999		\N	\N	\N	t	2025-11-12 16:11:20.545217	2025-11-12 16:11:20.545217	\N
7	12	TestAgent9BV83x		9876543210		\N	\N	\N	t	2025-11-30 13:36:37.482579	2025-11-30 13:36:37.482579	\N
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_permissions (id, user_id, bookings, calendar, rooms, guests, food_orders, menu_management, payments, reports, settings, tasks, staff, created_at, updated_at) FROM stdin;
2	user-1768206024832-bvrmz88	edit	edit	none	edit	none	none	none	none	none	none	none	2026-01-12 08:21:39.778158	2026-01-12 09:16:14.959
3	user-1768293773564-udd5nhs	edit	view	none	none	edit	none	none	none	none	none	none	2026-01-17 16:43:17.955429	2026-01-17 16:43:17.955429
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, session_token, device_info, browser, os, ip_address, location, is_active, last_activity_at, expires_at, created_at) FROM stdin;
1	48913322	btj43XcN2uFWIWlOqtOlC28Enqtg6Chp	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.4.253	\N	t	2025-12-30 05:12:12.036803	\N	2025-12-30 05:12:12.036803
6	test-user-settings	l2Fup8Mecme4jPpaXWlppNWausAl5Ab5	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.5.166	\N	t	2025-12-30 06:36:52.953428	\N	2025-12-30 06:36:52.953428
7	test-user-set2	3hPAb_5tebNpjiEX5rmspJ--kyumTJXb	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.4.253	\N	t	2025-12-30 06:38:28.274153	\N	2025-12-30 06:38:28.274153
8	admin-hostezee	rlWvK4Lufyk27hSyDLlGTadiWYfibt2c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.6.140	\N	t	2025-12-30 06:41:34.834548	\N	2025-12-30 06:41:34.834548
9	48913322	VDtkVk1eKNkLrzrCTjQATrLB-x6eXypz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.181	\N	t	2025-12-30 06:44:03.535383	\N	2025-12-30 06:44:03.535383
10	48913322	GZ-HZHnWAHleWpcWMIOXQbShPMobyk6s	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.5.166	\N	t	2025-12-31 03:40:30.084984	\N	2025-12-31 03:40:30.084984
11	48913322	MS1lQfc-NhwmVO1yubb8Ts0yFrwa73Ql	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.6.140	\N	t	2025-12-31 14:45:04.197706	\N	2025-12-31 14:45:04.197706
12	admin-hostezee	6qDPd9EDzv4tsbhOONA6NBa5DdXB-mHR	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.5.166	\N	t	2025-12-31 16:01:08.579382	\N	2025-12-31 16:01:08.579382
13	48913322	FAZvxIqscRtaibwXWXy9PCCXHisp_J6g	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.11.120	\N	t	2025-12-31 16:06:49.116582	\N	2025-12-31 16:06:49.116582
14	48913322	iVPshE9TPhPNW2gtzrBu4c2M4t-pkxLH	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.6.140	\N	t	2025-12-31 16:10:22.345342	\N	2025-12-31 16:10:22.345342
15	admin-hostezee	dBaxAc_ZBMQidcJ9OKTk0NhuwSOJd2ly	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.229	\N	t	2025-12-31 16:24:16.329234	\N	2025-12-31 16:24:16.329234
16	admin-hostezee	k024RvWdnywye8nblq2HuzfPrGm-unqd	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.5.166	\N	t	2026-01-03 14:23:24.515968	\N	2026-01-03 14:23:24.515968
17	admin-hostezee	jr44aAm3vCW2Udt9jFW5pY6e26xU7aPZ	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.9.55	\N	t	2026-01-04 05:54:31.524281	\N	2026-01-04 05:54:31.524281
18	user-1767506041702-opma4qx4p	3Y066zecav88qgRsYGxo0Sug6mnmISQp	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.13.40	\N	t	2026-01-04 06:00:52.55566	\N	2026-01-04 06:00:52.55566
19	48913322	cANAvt5J7TGTmWhDTm7Hl-6eIaCoCDtl	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.13.40	\N	t	2026-01-04 15:00:08.09122	\N	2026-01-04 15:00:08.09122
20	48913322	0jsw3ZTf1Gjs_U7AkYSx7S-jEJoSbIcw	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.229	\N	t	2026-01-04 17:33:27.360226	\N	2026-01-04 17:33:27.360226
21	48913322	3BFxEaxU-uXPup-AaKZ8VavDXpuxpthe	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.4.180	\N	t	2026-01-04 18:07:37.614871	\N	2026-01-04 18:07:37.614871
22	admin-hostezee	PLTTu7CO4vaow-ubC-beqj-2VdFNhT_3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.6.140	\N	t	2026-01-04 18:21:58.21789	\N	2026-01-04 18:21:58.21789
23	admin-hostezee	gujm9C9QJ_X2iuG8U7akj5ZWwPpeyL77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.5.166	\N	t	2026-01-04 18:25:39.259384	\N	2026-01-04 18:25:39.259384
24	user-1767505791148-wtgsgnm1d	zoPbyA9jE8P0AjyCVFYheM18B-Fikhjp	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.9.55	\N	t	2026-01-04 18:26:36.048105	\N	2026-01-04 18:26:36.048105
25	admin-hostezee	e-7gRsSXZ0tkzaJrZShDjID6mncmAPYM	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.6.140	\N	t	2026-01-06 07:04:01.552276	\N	2026-01-06 07:04:01.552276
26	admin-hostezee	3OsX2oBcbi7MnCFaUFGF38aW8CizDh2i	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.6.140	\N	t	2026-01-06 07:06:35.64361	\N	2026-01-06 07:06:35.64361
27	admin-hostezee	fvlyLu9uzxcXyb-11PdMmdhtQcg9F7Ky	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.0.229	\N	t	2026-01-06 07:09:43.409826	\N	2026-01-06 07:09:43.409826
28	48913322	l6av4E3mzQ0bLPEUeihDog-y9QNF0M6c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.6.140	\N	t	2026-01-06 09:00:26.171825	\N	2026-01-06 09:00:26.171825
29	admin-hostezee	L86QpU_uMGXEzNDEMBv8-GfpzXAAC59c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.229	\N	t	2026-01-06 09:07:50.468577	\N	2026-01-06 09:07:50.468577
30	admin-hostezee	Uq_sMYgWvO5IXaZutlsOcfu71pw4Eljp	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.11.120	\N	t	2026-01-06 09:11:43.090661	\N	2026-01-06 09:11:43.090661
31	48913322	owQDQM3bALHqdpaNwmV1x4INJIveBL29	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.13.40	\N	t	2026-01-06 09:45:01.369873	\N	2026-01-06 09:45:01.369873
32	user-1767505791148-wtgsgnm1d	p8C01muZ2Ay6q9G4lZWcqYuFg8rwTbVL	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.229	\N	t	2026-01-06 09:47:33.946472	\N	2026-01-06 09:47:33.946472
33	test-admin-menu-reorder-super	rm9GOvjGIZeVG5d5R_g8vcNlmpLBzAWl	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.40	\N	t	2026-01-06 17:04:48.84395	\N	2026-01-06 17:04:48.84395
34	super-admin-test	H5h613sKTCLdnnHhyoeURGSvm1YCzkUt	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.0.229	\N	t	2026-01-06 17:06:27.539111	\N	2026-01-06 17:06:27.539111
35	super-admin-test	YGmR0i4CmabxjDxrWU_bZm0MTfEsXmNW	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.40	\N	t	2026-01-06 17:08:48.016092	\N	2026-01-06 17:08:48.016092
36	super-admin-test	GdB4hMvm3bhNFmvubSvDyAbtm7IVzAei	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.40	\N	t	2026-01-06 17:10:20.034655	\N	2026-01-06 17:10:20.034655
37	super-admin-test	WB56kOnqhwjaYnl_dFaCNobmcDvoK7TP	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.40	\N	t	2026-01-06 17:11:53.940069	\N	2026-01-06 17:11:53.940069
38	super-admin-test	t518AhW0yh7m_D5Z3TuH6Nx6MUq5oD3m	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.7.16	\N	t	2026-01-06 17:13:52.310646	\N	2026-01-06 17:13:52.310646
39	super-admin-test	sNiAe2ayuGapu3FShzjnxBDhh3xCBU_C	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.11.222	\N	t	2026-01-06 17:16:50.474073	\N	2026-01-06 17:16:50.474073
40	super-admin-test	SJhe175lmiEGHf3uEMxqHNJuEkSV0XAf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.5.166	\N	t	2026-01-06 17:19:40.316077	\N	2026-01-06 17:19:40.316077
41	48913322	WkWpgDa4RcuJHNIjl8JDIdXQ8VnXztrP	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.6.216	\N	t	2026-01-07 07:19:38.757162	\N	2026-01-07 07:19:38.757162
42	user-1767505791148-wtgsgnm1d	EPmNqeM8CL1rTWmFYyrmxBv_C3A3-a2X	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.9.171	\N	t	2026-01-07 07:26:34.67336	\N	2026-01-07 07:26:34.67336
43	test-admin-awGd1t	0GMkpBNmNPbAYeyY8nKA2JTUA_l_que9	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.2.36	\N	t	2026-01-11 12:04:18.104665	\N	2026-01-11 12:04:18.104665
45	user-1768206024832-bvrmz88	7NGPj7sJrxkErynploxjfv90BpuMWcH3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.9.171	\N	t	2026-01-12 08:20:35.973397	\N	2026-01-12 08:20:35.973397
46	user-1768206024832-bvrmz88	v5hYHC-dBxR5CUfpaigIXmP6NgN1POsA	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.9.171	\N	t	2026-01-12 08:23:01.019231	\N	2026-01-12 08:23:01.019231
47	48913322	TxXh4pDiO1YD4zXuTqRr6GRsqQFvAJSK	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.113	\N	t	2026-01-12 13:12:17.725647	\N	2026-01-12 13:12:17.725647
48	test-admin-salaries	07vE1GLVQhuQjUmAigSSrRm66n7YK2VA	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.11.86	\N	t	2026-01-12 13:45:36.528059	\N	2026-01-12 13:45:36.528059
49	test-wallet-user-001	b-NOFrAh_ubwXCKIT8zWeC_T-fV818gz	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.5.181	\N	t	2026-01-13 06:18:26.66927	\N	2026-01-13 06:18:26.66927
50	test-wallet-user-002	rUZcL9KHDQytY_8c2J1TlhsuD52x32e1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.6.75	\N	t	2026-01-13 06:19:41.62675	\N	2026-01-13 06:19:41.62675
51	test-wallet-user-003	2bawiJqR47NfKd1BZunW3EbRxCkdUTbW	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.2.36	\N	t	2026-01-13 06:23:13.143583	\N	2026-01-13 06:23:13.143583
53	mUoHv8	04FEOrzpMHCph5AXDGyCOg_6VaqwHkBt	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.2.36	\N	t	2026-01-13 08:04:21.159772	\N	2026-01-13 08:04:21.159772
54	user-1768293773564-udd5nhs	URMix591jjc0EBB1IIJmmlkdeo0Hl4dF	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.4.173	\N	t	2026-01-13 08:43:06.213684	\N	2026-01-13 08:43:06.213684
55	3Z6gQW	DjeCNLBcABdcFkqD_UEp_2-T6KnCW5HJ	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.11.99	\N	t	2026-01-13 15:01:08.859706	\N	2026-01-13 15:01:08.859706
56	test-admin-123	oDiTTxnclmDWzWwg5GGk1sNmnNSnXcsj	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.176	\N	t	2026-01-14 10:14:06.76013	\N	2026-01-14 10:14:06.76013
57	48913322	pKcQUK5T2Jtwninpw4L7pLw8M425-sUz	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.12.232	\N	t	2026-01-14 10:30:16.602326	\N	2026-01-14 10:30:16.602326
58	62aZ8q	zl3tuq3N4x0S9j52cm9Lf_owB5Ber1fo	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.4.195	\N	t	2026-01-17 02:40:09.781993	\N	2026-01-17 02:40:09.781993
59	48913322	M7E9xpO0G9hsZ0xFjiCbL18IwOBi_aH1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.1.210	\N	t	2026-01-17 02:56:21.957546	\N	2026-01-17 02:56:21.957546
60	48913322	9t-oUpMYioj9JmPsgCX7-0YRZQzlQLX7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.5.21	\N	t	2026-01-17 06:16:50.306343	\N	2026-01-17 06:16:50.306343
61	48913322	4bJLBZNIHJ7i2jePPuXoWQYylY0MQN1F	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.13.32	\N	t	2026-01-17 06:55:33.906396	\N	2026-01-17 06:55:33.906396
62	admin-hostezee	WsiVIn8i2OaQLOl3VMYp3AzptxKl3t7_	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.6.178	\N	t	2026-01-17 07:06:52.307603	\N	2026-01-17 07:06:52.307603
63	admin-hostezee	6o84BmI-dST15U7-eFz02pQTEHRXohZb	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.13.32	\N	t	2026-01-17 07:08:37.872559	\N	2026-01-17 07:08:37.872559
64	admin-hostezee	zPfWU2bGnVe80to9YJ-nuCydaKf69Vsn	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.4.213	\N	t	2026-01-17 07:12:24.957589	\N	2026-01-17 07:12:24.957589
65	admin-hostezee	X1q2imXKB1NwlIV5hEGREiPU6wmUOFrX	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.14.87	\N	t	2026-01-17 07:14:57.168672	\N	2026-01-17 07:14:57.168672
66	admin-hostezee	VcChfOQOXCHS6Jkqiv6iSCiKCWeys2vq	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.0.144	\N	t	2026-01-17 07:17:58.344102	\N	2026-01-17 07:17:58.344102
67	admin-hostezee	nXF7wPtvCg5GQaQDFtNLWWZLVq0P04UD	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.14.87	\N	t	2026-01-17 07:20:53.609178	\N	2026-01-17 07:20:53.609178
68	user-1768293773564-udd5nhs	UAYRAQEjfmWSTgIkiDwWbDYAl0fWm5R4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.14.87	\N	t	2026-01-17 08:32:43.510724	\N	2026-01-17 08:32:43.510724
69	48913322	SOxL6MARYnvuD3Ug9_EThSxGRZ7jJ8Di	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.12.142	\N	t	2026-01-17 16:36:56.814444	\N	2026-01-17 16:36:56.814444
70	48913322	2ycgNmLOmpk4GTFQ6VYk4bv5z_ixuOSb	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	Chrome	Linux	10.81.4.223	\N	t	2026-01-21 19:04:24.486748	\N	2026-01-21 19:04:24.486748
71	48913322	0rnUJdf--JZ6GklPRzTQR8uom0pqlAkD	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.12.93	\N	t	2026-01-25 07:50:05.818936	\N	2026-01-25 07:50:05.818936
72	48913322	xMDqC10axnFCfORKV9MHDBtE65enkIvF	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	Chrome	Windows	10.81.11.109	\N	t	2026-01-25 09:16:27.894187	\N	2026-01-25 09:16:27.894187
73	48913322	aoEot7TskBlQfGAArmFfBfI9qhIc1dUL	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	Chrome	Windows	10.81.16.135	\N	t	2026-02-02 08:54:29.896704	\N	2026-02-02 08:54:29.896704
74	48947216	SbQ2X8u62C-NYvRSxWyNyr3Vy6lJRD0T	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	Chrome	Windows	10.81.0.84	\N	t	2026-02-04 05:44:03.823136	\N	2026-02-04 05:44:03.823136
\.


--
-- Data for Name: user_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_subscriptions (id, user_id, plan_id, status, billing_cycle, start_date, end_date, trial_ends_at, cancelled_at, razorpay_subscription_id, razorpay_customer_id, last_payment_at, next_billing_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, assigned_property_ids, created_at, updated_at, phone, status, business_name, password, verification_status, tenant_type, primary_property_id, rejection_reason, approved_by, approved_at, signup_method, has_completed_onboarding, city, state, country, last_login_ip, last_login_at, subscription_plan_id, subscription_status, subscription_start_date, subscription_end_date, razorpay_subscription_id, razorpay_customer_id, trial_ends_at) FROM stdin;
3Z6gQW	3Z6gQW@example.com	John	Doe	\N	staff	\N	2026-01-13 15:01:08.756571	2026-01-13 15:01:08.756571	\N	active	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-admin-123	admin@test.com	Test	Admin	\N	staff	\N	2026-01-14 10:14:06.66834	2026-01-14 10:14:06.66834	\N	active	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
62aZ8q	62aZ8q@example.com	John	Doe	\N	staff	\N	2026-01-17 02:40:09.672348	2026-01-17 02:40:09.672348	\N	active	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1768295135232-tmktwq859	hostezee@gmail.com	paras	thakur	\N	admin	{20}	2026-01-13 09:05:35.24293	2026-01-17 06:54:32.318	9001949260	active	mimi	$2b$10$vovoWlX9hLJT5lIkIUhGSehDDqYxkcWQ2lflgOxf.d9zdAmlEsoS2	verified	property_owner	20	\N	admin-hostezee	2026-01-17 06:54:32.318	email	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
d7417553-bfff-4867-948d-bb5b94da0c8c	d7417553-bfff-4867-948d-bb5b94da0c8c@replit.user	User		\N	admin	\N	2025-12-30 06:23:41.454563	2025-12-30 06:23:41.454563	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-user-set2	test-set2@example.com	Test	User	\N	staff	\N	2025-12-30 06:38:28.20425	2025-12-30 06:38:28.20425	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1768206024832-bvrmz88	kanwar.jaswant25@gmail.com	Anupam	Nagar	\N	staff	{17}	2026-01-12 08:20:24.845601	2026-01-12 08:20:24.845601	\N	suspended	\N	$2b$10$TwBAxewBxMd/InRCXOIkHOpoczIuvCZqHoJWNV4BkFBs7VV2ils6S	approved	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-admin-salaries	salaries-test@example.com	Salary	Admin	\N	staff	\N	2026-01-12 13:45:36.438598	2026-01-12 13:45:36.438598	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-wallet-user-001	wallettest@example.com	Wallet	Tester	\N	staff	\N	2026-01-13 06:18:26.594064	2026-01-13 06:18:26.594064	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1767450663432-vicon0no9	beenakanwar9@gmail.com	Ankita 	Kanwar	\N	admin	{15}	2026-01-03 14:31:03.445531	2026-01-03 14:46:32.447	\N	suspended	Royal 	$2b$10$bWdGBPYW.ezVl7dC2efZoOq01BAzZHhUbAHyW5QXkUUbZNvlwjuVu	verified	property_owner	15	\N	admin-hostezee	2026-01-03 14:46:32.447	email	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1767506041702-opma4qx4p	backpackersheadquarter@gmail.com	Paras	Thakur	\N	admin	{16}	2026-01-04 05:54:01.715262	2026-01-04 06:00:32.859	9001949260	suspended	SOjha 	$2b$10$VVdEl/APgO4ioM1F13KlMelUEWTB3cLYClP08ad7.WgC9qaWP8Ftm	verified	property_owner	16	\N	admin-hostezee	2026-01-04 06:00:32.859	email	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1767505791148-wtgsgnm1d	kanwarbeena9@gmail.com	Prakriti 	Kanwar	\N	admin	{17}	2026-01-04 05:49:51.16247	2026-01-04 18:26:06.879	\N	suspended	Prakriti Homestay	$2b$10$Tjr.P5z3vT2PSRi2C8PWhuSUtRN5v5RUZqETt9P5oiBAVmGFl/7C6	verified	property_owner	17	\N	admin-hostezee	2026-01-04 18:26:06.879	email	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
mUoHv8	mUoHv8@example.com	John	Doe	\N	staff	\N	2026-01-13 08:04:21.063978	2026-01-13 08:04:21.063978	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-admin-menu-reorder-super	super-admin-reorder@test.com	Super	Admin	\N	staff	\N	2026-01-06 17:04:48.716005	2026-01-06 17:04:48.716005	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-admin-awGd1t	admin9w3wBo@test.com	Test	Admin	\N	staff	\N	2026-01-11 12:04:18.021806	2026-01-11 12:04:18.021806	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-wallet-user-003	\N	Wallet	Tester	\N	admin	{19}	2026-01-13 06:22:58.127649	2026-01-13 06:23:13.066	\N	suspended	\N	\N	verified	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
admin-hostezee	admin@hostezee.in	Admin	Hostezee	\N	super-admin	{10,11,12,14,15,16,17}	2025-12-30 06:41:05.81397	2026-01-17 07:20:53.52	\N	active	\N	$2b$10$XKMglWBdSLnpSig5f87F6upUh2X/MSvoTxE0OK3V4KLptGPnpWwRy	verified	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
48947216	thepahadistays@gmail.com	thepahadistays@gmail.com		\N	admin	\N	2026-01-13 06:57:43.371296	2026-02-04 05:45:55.297	\N	active	\N	\N	verified	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-user-settings	test-settings@example.com	Test	User	\N	staff	\N	2025-12-30 06:36:52.863456	2025-12-30 06:36:52.863456	\N	suspended	\N	\N	pending	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
test-wallet-user-002	wallettest2@example.com	Wallet	Tester	\N	admin	\N	2026-01-13 06:19:33.070577	2026-01-13 06:19:41.548	\N	suspended	\N	\N	verified	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
super-admin-test	superadmin@hostezee.com	Super	Admin	\N	super-admin	{17}	2026-01-06 17:06:27.466394	2026-01-06 17:19:40.232	\N	suspended	\N	\N	verified	property_owner	\N	\N	\N	\N	google	f	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1764918654799-kdd60a87r	parasthakur.vm@gmail.com	Paras	kanwar	\N	admin	{14}	2025-12-05 07:10:54.813547	2025-12-31 16:02:09.081	9001949260	suspended	Venuemonk	$2b$10$gXuQTzhmHeaT414WWKZiYeiGqcTLSqFS.D6qDNCcyZeyul0M.PW1C	verified	property_owner	14	\N	d7417553-bfff-4867-948d-bb5b94da0c8c	2025-12-05 07:12:57.845	email	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
user-1768293773564-udd5nhs	thepahadicompany@gmail.com	anupam	singh	\N	manager	{11}	2026-01-13 08:42:53.576771	2026-01-17 16:38:00.669	\N	active	\N	$2b$10$eGdrjdsiOOCXs1lrG3pZ/O8003uYP0VpiWLCydvXJbWYwDZbbx1Nm	approved	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
48913322	paras.thakur18@gmail.com	Paras	Thakur	\N	admin	{10,11,12}	2025-10-29 11:54:53.710594	2026-02-02 08:54:29.813	\N	active	\N	$2b$10$ZCzQnQrbz4j6V/dhHJD4P.ksVhIoKwBj/QyMqKm4PZZaZAScHnJPa	verified	property_owner	\N	\N	\N	\N	google	t	\N	\N	\N	\N	\N	\N	trial	\N	\N	\N	\N	\N
\.


--
-- Data for Name: vendor_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_transactions (id, vendor_id, property_id, transaction_type, amount, transaction_date, description, invoice_number, payment_method, reference_number, expense_category_id, created_by, notes, created_at) FROM stdin;
1	1	10	credit	15000.00	2025-02-15 00:00:00	Monthly grocery purchase	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:33.61614
2	1	10	credit	12000.00	2025-03-10 00:00:00	Rice, Dal, and Spices	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:33.61614
3	1	10	payment	10000.00	2025-03-15 00:00:00	Partial payment made	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:33.61614
4	2	10	credit	8000.00	2025-02-20 00:00:00	Vegetables for February	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:38.132069
5	2	10	credit	9500.00	2025-03-05 00:00:00	Vegetables for March	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:38.132069
6	2	10	payment	5000.00	2025-03-20 00:00:00	Advance payment	\N	\N	\N	\N	\N	\N	2025-12-05 11:38:38.132069
7	3	10	credit	4000.00	2026-01-13 08:13:42.841642	Grocery purchase - January 2026	\N	\N	\N	\N	System	\N	2026-01-13 08:13:42.841642
8	1	10	payment	5000.00	2026-01-21 00:00:00	Payment via expense #12	\N	bank_transfer	\N	\N	admin	\N	2026-01-21 20:41:18.308849
9	5	11	credit	12000.00	2026-02-02 00:00:00			\N		14	48913322	\N	2026-02-02 12:13:34.269418
10	5	11	payment	5000.00	2026-02-02 00:00:00			UPI		\N	48913322	\N	2026-02-02 12:24:37.513573
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, property_id, name, phone, email, address, category, gst_number, bank_details, notes, is_active, created_at, updated_at) FROM stdin;
1	10	Sharma Kirana Store	9876543211	\N	\N	Groceries	\N	\N	\N	t	2025-12-05 11:38:12.480041	2025-12-05 11:38:12.480041
2	10	Fresh Vegetables Supplier	9876543212	\N	\N	Vegetables	\N	\N	\N	t	2025-12-05 11:38:16.648012	2025-12-05 11:38:16.648012
3	10	paras		paras.thakur18@gmail.com	Tower 10 flat 704 vipul lavanya sec 81	Grocery				t	2026-01-12 14:56:48.585715	2026-01-12 14:56:48.585715
4	10	ankit				Grocery				t	2026-01-12 14:57:06.394588	2026-01-12 14:57:06.394588
5	11	paras		paras.thakur18@gmail.com	Tower 10 flat 704 vipul lavanya sec 81	Grocery				t	2026-01-21 20:17:46.817424	2026-01-21 20:17:46.817424
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_transactions (id, wallet_id, property_id, transaction_type, amount, balance_after, source, source_id, description, reference_number, transaction_date, day_closing_id, created_by, created_at) FROM stdin;
1	1	10	credit	3000.00	3000.00	booking_payment	67	Checkout payment - paras (Bill #67)	\N	2026-01-13	\N	48913322	2026-01-13 07:15:35.888706
2	1	10	credit	2000.00	5000.00	manual	\N	Correction: Missing cash from checkout Bill #67	\N	2026-01-13	\N	48913322	2026-01-13 07:29:12.962371
4	1	10	debit	10000.00	-5000.00	salary_advance	8	Salary advance - Paras kanwar (REVERSED - see correction below)	\N	2026-01-13	\N	48913322	2026-01-13 07:30:33.686558
5	1	10	debit	4000.00	1000.00	expense	8	Expense: paras	\N	2026-01-13	\N	48913322	2026-01-13 07:58:54.008481
6	1	10	debit	560.00	440.00	expense	9	Expense: Miscellaneous	\N	2026-01-13	\N	48913322	2026-01-13 08:15:33.516697
7	7	11	credit	1000.00	1000.00	booking_payment	70	Checkout payment - paras (Bill #70) - CASH	\N	2026-01-13	\N	48913322	2026-01-13 08:36:00.039043
8	7	11	credit	50000.00	51000.00	opening_balance	\N	Opening balance set on 13 Jan 2026	\N	2026-01-13	\N	\N	2026-01-13 08:49:15.711609
10	8	11	credit	20000.00	20000.00	opening_balance	\N	Opening balance set on 13 Jan 2026	\N	2026-01-13	\N	\N	2026-01-13 08:49:15.713633
11	7	11	credit	10000.00	61000.00	booking_payment	71	Checkout payment - mimi (Bill #71) - SPLIT	\N	2026-01-13	\N	48913322	2026-01-13 08:52:29.226296
12	7	11	credit	1050.00	62050.00	booking_payment	72	Checkout payment - mama (Bill #72) - SPLIT	\N	2026-01-17	\N	48913322	2026-01-17 02:14:01.24552
13	7	11	credit	2410.00	64460.00	booking_payment	73	Checkout payment - momo (Bill #73) - SPLIT	\N	2026-01-19	\N	48913322	2026-01-19 10:24:32.954913
14	7	11	debit	1000.00	63460.00	expense	10	Expense: Miscellaneous	\N	2026-01-21	\N	48913322	2026-01-21 20:11:11.686819
15	7	11	debit	10000.00	53460.00	expense	11	Expense: paras	\N	2026-01-21	\N	48913322	2026-01-21 20:30:53.546781
19	1	10	debit	50000.00	-49560.00	salary_advance	9	Salary advance - Paras kanwar	\N	2026-01-25	\N	48913322	2026-01-25 08:05:02.736963
22	8	11	debit	5000.00	15000.00	vendor_payment	10	Vendor payment - Vendor: paras	\N	2026-02-02	\N	48913322	2026-02-02 12:24:37.606315
3	2	10	credit	19000.00	19000.00	manual	\N	Correction: Online payment from checkout Bill #67	\N	2026-01-13	\N	48913322	2026-01-13 07:29:17.145744
16	2	10	debit	5000.00	14000.00	expense	12	Expense: Sharma Kirana Store	\N	2026-01-21	\N	48913322	2026-01-21 20:39:15.709245
20	2	10	debit	4000000.00	-3986000.00	lease_payment	5	Lease payment - Lease	\N	2026-02-02	\N	48913322	2026-02-02 11:31:41.780188
9	8	11	credit	100000.00	100000.00	opening_balance	\N	Opening balance set on 13 Jan 2026	\N	2026-01-13	\N	\N	2026-01-13 08:49:15.712395
17	8	11	debit	300000.00	-200000.00	lease_payment	3	Lease payment - Lease	\N	2026-01-25	\N	48913322	2026-01-25 07:58:48.767687
18	8	11	debit	600000.00	-800000.00	lease_payment	4	Lease payment - Lease	\N	2026-01-25	\N	48913322	2026-01-25 07:59:36.268951
21	8	11	debit	2000000.00	-2800000.00	lease_payment	6	Lease payment - Lease	\N	2026-02-02	\N	48913322	2026-02-02 11:32:53.834771
23	5	12	credit	10000.00	10000.00	opening_balance	\N	Opening balance set on 03 Feb 2026	\N	2026-02-03	\N	\N	2026-02-03 05:37:48.254642
24	4	12	credit	10000.00	10000.00	opening_balance	\N	Opening balance set on 03 Feb 2026	\N	2026-02-03	\N	\N	2026-02-03 05:37:48.394627
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallets (id, property_id, name, type, bank_name, account_number, ifsc_code, upi_id, current_balance, opening_balance, is_default, is_active, description, created_at, updated_at) FROM stdin;
7	11	Cash Counter	cash	\N	\N	\N	\N	53460.00	0.00	t	t	\N	2026-01-13 08:30:16.606804	2026-01-21 20:30:53.51
1	10	Cash Counter	cash	\N				-49560.00	0.00	t	t		2026-01-13 07:10:38.91696	2026-01-25 08:05:02.703
2	10	UPI (Bank+Online)	upi	\N	\N	\N	\N	-3986000.00	0.00	t	t	\N	2026-01-13 07:10:38.944609	2026-01-13 07:10:38.944609
8	11	UPI (Bank+Online)	upi	\N	\N	\N	\N	-2785000.00	0.00	t	t	\N	2026-01-13 08:30:16.631883	2026-02-02 12:24:37.571
5	12	UPI (Bank+Online)	upi	\N	\N	\N	\N	10000.00	0.00	t	t	\N	2026-01-13 08:28:58.649889	2026-02-03 05:37:48.214
4	12	Cash Counter	cash	\N	\N	\N	\N	10000.00	0.00	t	t	\N	2026-01-13 08:28:58.62291	2026-02-03 05:37:48.362
\.


--
-- Data for Name: whatsapp_notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_notification_settings (id, property_id, check_in_enabled, check_out_enabled, enquiry_confirmation_enabled, payment_request_enabled, booking_confirmation_enabled, reminder_messages_enabled, created_at, updated_at) FROM stdin;
1	10	t	t	t	t	t	t	2025-12-06 09:18:19.347744	2025-12-06 09:18:19.347744
2	11	t	t	t	t	t	t	2025-12-21 13:08:32.907905	2025-12-21 13:08:32.907905
3	14	t	t	t	t	t	t	2025-12-25 16:36:18.264025	2025-12-25 16:36:18.264025
\.


--
-- Data for Name: whatsapp_template_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_template_settings (id, property_id, template_type, is_enabled, send_timing, delay_hours, created_at, updated_at) FROM stdin;
4	10	addon_service	t	immediate	0	2025-12-28 16:26:14.79199	2025-12-28 16:26:14.79199
5	10	checkout_message	t	immediate	0	2025-12-28 16:26:14.815765	2025-12-28 16:26:14.815765
3	10	checkin_message	f	immediate	0	2025-12-28 16:26:14.767663	2025-12-28 16:52:18.272
1	10	pending_payment	t	immediate	0	2025-12-28 16:26:14.717059	2025-12-28 17:35:11.812
2	10	payment_confirmation	f	immediate	0	2025-12-28 16:26:14.743831	2025-12-28 17:35:14.435
6	11	pending_payment	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
7	11	payment_confirmation	f	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
8	11	checkin_message	f	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
9	11	addon_service	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
10	11	checkout_message	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
11	12	pending_payment	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
12	12	payment_confirmation	f	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
13	12	checkin_message	f	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
14	12	addon_service	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
15	12	checkout_message	t	immediate	0	2025-12-29 04:59:26.764225	2025-12-29 04:59:26.764225
16	17	pending_payment	t	immediate	0	2026-01-04 18:32:17.264735	2026-01-04 18:32:17.264735
17	17	payment_confirmation	t	immediate	0	2026-01-04 18:32:17.287825	2026-01-04 18:32:17.287825
18	17	checkin_message	t	immediate	0	2026-01-04 18:32:17.30931	2026-01-04 18:32:17.30931
19	17	addon_service	t	immediate	0	2026-01-04 18:32:17.329433	2026-01-04 18:32:17.329433
20	17	checkout_message	t	immediate	0	2026-01-04 18:32:17.349495	2026-01-04 18:32:17.349495
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.__drizzle_migrations_id_seq', 1, true);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 117, true);


--
-- Name: agent_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.agent_payments_id_seq', 1, true);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_records_id_seq', 19, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 6, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 18, true);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_transactions_id_seq', 1, true);


--
-- Name: beds24_room_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.beds24_room_mappings_id_seq', 3, true);


--
-- Name: bills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bills_id_seq', 74, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 186, true);


--
-- Name: change_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.change_approvals_id_seq', 1, true);


--
-- Name: communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.communications_id_seq', 1, true);


--
-- Name: contact_enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contact_enquiries_id_seq', 2, true);


--
-- Name: daily_closings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_closings_id_seq', 1, false);


--
-- Name: employee_performance_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_performance_metrics_id_seq', 1, false);


--
-- Name: enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enquiries_id_seq', 29, true);


--
-- Name: error_crashes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.error_crashes_id_seq', 1, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 22, true);


--
-- Name: extra_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.extra_services_id_seq', 13, true);


--
-- Name: feature_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.feature_settings_id_seq', 4, true);


--
-- Name: food_order_whatsapp_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.food_order_whatsapp_settings_id_seq', 1, false);


--
-- Name: guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guests_id_seq', 224, true);


--
-- Name: issue_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.issue_reports_id_seq', 1, true);


--
-- Name: lease_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lease_history_id_seq', 2, true);


--
-- Name: lease_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lease_payments_id_seq', 6, true);


--
-- Name: lease_year_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lease_year_overrides_id_seq', 2, true);


--
-- Name: menu_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_categories_id_seq', 60, true);


--
-- Name: menu_item_add_ons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_item_add_ons_id_seq', 1555, true);


--
-- Name: menu_item_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_item_variants_id_seq', 1683, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 1489, true);


--
-- Name: message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_templates_id_seq', 7, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1095, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 67, true);


--
-- Name: ota_integrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ota_integrations_id_seq', 3, true);


--
-- Name: otp_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.otp_tokens_id_seq', 1, true);


--
-- Name: password_reset_otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_otps_id_seq', 9, true);


--
-- Name: pre_bills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pre_bills_id_seq', 20, true);


--
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.properties_id_seq', 20, true);


--
-- Name: property_expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.property_expenses_id_seq', 12, true);


--
-- Name: property_leases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.property_leases_id_seq', 4, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rooms_id_seq', 103, true);


--
-- Name: salary_advances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.salary_advances_id_seq', 9, true);


--
-- Name: salary_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.salary_payments_id_seq', 1, true);


--
-- Name: staff_invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_invitations_id_seq', 8, true);


--
-- Name: staff_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_members_id_seq', 9, true);


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_salaries_id_seq', 5, true);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_payments_id_seq', 1, false);


--
-- Name: subscription_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscription_plans_id_seq', 7, true);


--
-- Name: task_notification_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_notification_logs_id_seq', 1, false);


--
-- Name: task_reminder_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_reminder_logs_id_seq', 1, false);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 3, true);


--
-- Name: travel_agents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.travel_agents_id_seq', 7, true);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_permissions_id_seq', 3, true);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 74, true);


--
-- Name: user_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_subscriptions_id_seq', 1, false);


--
-- Name: vendor_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_transactions_id_seq', 10, true);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendors_id_seq', 5, true);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallet_transactions_id_seq', 24, true);


--
-- Name: wallets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallets_id_seq', 9, true);


--
-- Name: whatsapp_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_notification_settings_id_seq', 3, true);


--
-- Name: whatsapp_template_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_template_settings_id_seq', 20, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_payments agent_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_payments
    ADD CONSTRAINT agent_payments_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: beds24_room_mappings beds24_room_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds24_room_mappings
    ADD CONSTRAINT beds24_room_mappings_pkey PRIMARY KEY (id);


--
-- Name: beds24_room_mappings beds24_room_mappings_property_id_beds24_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds24_room_mappings
    ADD CONSTRAINT beds24_room_mappings_property_id_beds24_room_id_key UNIQUE (property_id, beds24_room_id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: change_approvals change_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals
    ADD CONSTRAINT change_approvals_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: contact_enquiries contact_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_enquiries
    ADD CONSTRAINT contact_enquiries_pkey PRIMARY KEY (id);


--
-- Name: daily_closings daily_closings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closings
    ADD CONSTRAINT daily_closings_pkey PRIMARY KEY (id);


--
-- Name: employee_performance_metrics employee_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_performance_metrics
    ADD CONSTRAINT employee_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: error_crashes error_crashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_crashes
    ADD CONSTRAINT error_crashes_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: extra_services extra_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_services
    ADD CONSTRAINT extra_services_pkey PRIMARY KEY (id);


--
-- Name: feature_settings feature_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_settings
    ADD CONSTRAINT feature_settings_pkey PRIMARY KEY (id);


--
-- Name: food_order_whatsapp_settings food_order_whatsapp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_order_whatsapp_settings
    ADD CONSTRAINT food_order_whatsapp_settings_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: issue_reports issue_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports
    ADD CONSTRAINT issue_reports_pkey PRIMARY KEY (id);


--
-- Name: lease_history lease_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_history
    ADD CONSTRAINT lease_history_pkey PRIMARY KEY (id);


--
-- Name: lease_payments lease_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_payments
    ADD CONSTRAINT lease_payments_pkey PRIMARY KEY (id);


--
-- Name: lease_year_overrides lease_year_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_year_overrides
    ADD CONSTRAINT lease_year_overrides_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_item_add_ons menu_item_add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_add_ons
    ADD CONSTRAINT menu_item_add_ons_pkey PRIMARY KEY (id);


--
-- Name: menu_item_variants menu_item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: ota_integrations ota_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ota_integrations
    ADD CONSTRAINT ota_integrations_pkey PRIMARY KEY (id);


--
-- Name: otp_tokens otp_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_tokens
    ADD CONSTRAINT otp_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_otps password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: pre_bills pre_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_bills
    ADD CONSTRAINT pre_bills_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_expenses property_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_expenses
    ADD CONSTRAINT property_expenses_pkey PRIMARY KEY (id);


--
-- Name: property_leases property_leases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_leases
    ADD CONSTRAINT property_leases_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: salary_advances salary_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_pkey PRIMARY KEY (id);


--
-- Name: salary_payments salary_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: staff_invitations staff_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_pkey PRIMARY KEY (id);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: staff_salaries staff_salaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_slug_key UNIQUE (slug);


--
-- Name: task_notification_logs task_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notification_logs
    ADD CONSTRAINT task_notification_logs_pkey PRIMARY KEY (id);


--
-- Name: task_reminder_logs task_reminder_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminder_logs
    ADD CONSTRAINT task_reminder_logs_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: travel_agents travel_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_agents
    ADD CONSTRAINT travel_agents_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_transactions vendor_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_notification_settings whatsapp_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_settings
    ADD CONSTRAINT whatsapp_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_template_settings whatsapp_template_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_template_settings
    ADD CONSTRAINT whatsapp_template_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_template_settings whatsapp_template_settings_property_id_template_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_template_settings
    ADD CONSTRAINT whatsapp_template_settings_property_id_template_type_key UNIQUE (property_id, template_type);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_activity_logs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_category ON public.activity_logs USING btree (category);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_property_id ON public.activity_logs USING btree (property_id);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_advance_staff_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advance_staff_member ON public.salary_advances USING btree (staff_member_id);


--
-- Name: idx_advance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advance_status ON public.salary_advances USING btree (repayment_status);


--
-- Name: idx_advance_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advance_user ON public.salary_advances USING btree (user_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance_records USING btree (attendance_date);


--
-- Name: idx_attendance_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_staff ON public.attendance_records USING btree (staff_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_date ON public.salary_payments USING btree (payment_date);


--
-- Name: idx_payment_salary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_salary ON public.salary_payments USING btree (salary_id);


--
-- Name: idx_salary_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_period ON public.staff_salaries USING btree (period_start, period_end);


--
-- Name: idx_salary_staff_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_staff_member ON public.staff_salaries USING btree (staff_member_id);


--
-- Name: idx_salary_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_user ON public.staff_salaries USING btree (user_id);


--
-- Name: idx_staff_member_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_member_active ON public.staff_members USING btree (is_active);


--
-- Name: idx_staff_member_property; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_member_property ON public.staff_members USING btree (property_id);


--
-- Name: idx_user_sessions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_is_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: activity_logs activity_logs_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: agent_payments agent_payments_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_payments
    ADD CONSTRAINT agent_payments_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.travel_agents(id) ON DELETE CASCADE;


--
-- Name: agent_payments agent_payments_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_payments
    ADD CONSTRAINT agent_payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_staff_id_staff_members_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_staff_id_staff_members_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bank_transactions bank_transactions_assigned_category_id_expense_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_assigned_category_id_expense_categories_id_fk FOREIGN KEY (assigned_category_id) REFERENCES public.expense_categories(id);


--
-- Name: bank_transactions bank_transactions_imported_expense_id_property_expenses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_imported_expense_id_property_expenses_id_fk FOREIGN KEY (imported_expense_id) REFERENCES public.property_expenses(id);


--
-- Name: bank_transactions bank_transactions_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_suggested_category_id_expense_categories_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_suggested_category_id_expense_categories_id_f FOREIGN KEY (suggested_category_id) REFERENCES public.expense_categories(id);


--
-- Name: beds24_room_mappings beds24_room_mappings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds24_room_mappings
    ADD CONSTRAINT beds24_room_mappings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: bills bills_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: bills bills_guest_id_guests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_guest_id_guests_id_fk FOREIGN KEY (guest_id) REFERENCES public.guests(id);


--
-- Name: bookings bookings_guest_id_guests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_guest_id_guests_id_fk FOREIGN KEY (guest_id) REFERENCES public.guests(id);


--
-- Name: bookings bookings_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: bookings bookings_room_id_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_room_id_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_travel_agent_id_travel_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_travel_agent_id_travel_agents_id_fk FOREIGN KEY (travel_agent_id) REFERENCES public.travel_agents(id);


--
-- Name: change_approvals change_approvals_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals
    ADD CONSTRAINT change_approvals_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: change_approvals change_approvals_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals
    ADD CONSTRAINT change_approvals_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: change_approvals change_approvals_room_id_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals
    ADD CONSTRAINT change_approvals_room_id_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: change_approvals change_approvals_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_approvals
    ADD CONSTRAINT change_approvals_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: communications communications_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: communications communications_enquiry_id_enquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_enquiry_id_enquiries_id_fk FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE;


--
-- Name: communications communications_template_id_message_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_template_id_message_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.message_templates(id);


--
-- Name: daily_closings daily_closings_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closings
    ADD CONSTRAINT daily_closings_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id);


--
-- Name: daily_closings daily_closings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closings
    ADD CONSTRAINT daily_closings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: employee_performance_metrics employee_performance_metrics_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_performance_metrics
    ADD CONSTRAINT employee_performance_metrics_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: enquiries enquiries_room_id_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_room_id_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: enquiries enquiries_travel_agent_id_travel_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_travel_agent_id_travel_agents_id_fk FOREIGN KEY (travel_agent_id) REFERENCES public.travel_agents(id);


--
-- Name: error_crashes error_crashes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_crashes
    ADD CONSTRAINT error_crashes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expense_categories expense_categories_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: extra_services extra_services_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_services
    ADD CONSTRAINT extra_services_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: feature_settings feature_settings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_settings
    ADD CONSTRAINT feature_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: food_order_whatsapp_settings food_order_whatsapp_settings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_order_whatsapp_settings
    ADD CONSTRAINT food_order_whatsapp_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: issue_reports issue_reports_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports
    ADD CONSTRAINT issue_reports_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;


--
-- Name: issue_reports issue_reports_reported_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports
    ADD CONSTRAINT issue_reports_reported_by_user_id_users_id_fk FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lease_history lease_history_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_history
    ADD CONSTRAINT lease_history_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.property_leases(id) ON DELETE CASCADE;


--
-- Name: lease_payments lease_payments_lease_id_property_leases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_payments
    ADD CONSTRAINT lease_payments_lease_id_property_leases_id_fk FOREIGN KEY (lease_id) REFERENCES public.property_leases(id) ON DELETE CASCADE;


--
-- Name: lease_year_overrides lease_year_overrides_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_year_overrides
    ADD CONSTRAINT lease_year_overrides_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.property_leases(id) ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: menu_item_add_ons menu_item_add_ons_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_add_ons
    ADD CONSTRAINT menu_item_add_ons_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_variants menu_item_variants_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_menu_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_menu_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: orders orders_guest_id_guests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_guest_id_guests_id_fk FOREIGN KEY (guest_id) REFERENCES public.guests(id);


--
-- Name: orders orders_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: orders orders_room_id_rooms_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_room_id_rooms_id_fk FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: ota_integrations ota_integrations_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ota_integrations
    ADD CONSTRAINT ota_integrations_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: pre_bills pre_bills_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_bills
    ADD CONSTRAINT pre_bills_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: pre_bills pre_bills_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_bills
    ADD CONSTRAINT pre_bills_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: properties properties_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: property_expenses property_expenses_category_id_expense_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_expenses
    ADD CONSTRAINT property_expenses_category_id_expense_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: property_expenses property_expenses_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_expenses
    ADD CONSTRAINT property_expenses_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_expenses property_expenses_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_expenses
    ADD CONSTRAINT property_expenses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: property_leases property_leases_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_leases
    ADD CONSTRAINT property_leases_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: salary_advances salary_advances_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: salary_advances salary_advances_deducted_from_salary_id_staff_salaries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_deducted_from_salary_id_staff_salaries_id_fk FOREIGN KEY (deducted_from_salary_id) REFERENCES public.staff_salaries(id) ON DELETE SET NULL;


--
-- Name: salary_advances salary_advances_salary_id_staff_salaries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_salary_id_staff_salaries_id_fk FOREIGN KEY (salary_id) REFERENCES public.staff_salaries(id) ON DELETE SET NULL;


--
-- Name: salary_advances salary_advances_staff_member_id_staff_members_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_staff_member_id_staff_members_id_fk FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: salary_advances salary_advances_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_advances
    ADD CONSTRAINT salary_advances_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: salary_payments salary_payments_paid_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_paid_by_users_id_fk FOREIGN KEY (paid_by) REFERENCES public.users(id);


--
-- Name: salary_payments salary_payments_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: salary_payments salary_payments_salary_id_staff_salaries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_salary_id_staff_salaries_id_fk FOREIGN KEY (salary_id) REFERENCES public.staff_salaries(id) ON DELETE CASCADE;


--
-- Name: salary_payments salary_payments_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_staff_member_id_fkey FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: staff_invitations staff_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff_invitations staff_invitations_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: staff_members staff_members_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: staff_salaries staff_salaries_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: staff_salaries staff_salaries_staff_member_id_staff_members_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_staff_member_id_staff_members_id_fk FOREIGN KEY (staff_member_id) REFERENCES public.staff_members(id) ON DELETE CASCADE;


--
-- Name: staff_salaries staff_salaries_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.user_subscriptions(id);


--
-- Name: subscription_payments subscription_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_notification_logs task_notification_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_notification_logs
    ADD CONSTRAINT task_notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_reminder_logs task_reminder_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminder_logs
    ADD CONSTRAINT task_reminder_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: travel_agents travel_agents_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_agents
    ADD CONSTRAINT travel_agents_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vendor_transactions vendor_transactions_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);


--
-- Name: vendor_transactions vendor_transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: vendor_transactions vendor_transactions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_transactions
    ADD CONSTRAINT vendor_transactions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: wallet_transactions wallet_transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: whatsapp_notification_settings whatsapp_notification_settings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_notification_settings
    ADD CONSTRAINT whatsapp_notification_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: whatsapp_template_settings whatsapp_template_settings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_template_settings
    ADD CONSTRAINT whatsapp_template_settings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 6IaCkslXPN40xaEnH5pY55fUCGxFnMvlWOjeoiy6KGNpcHSqI0mZLvKhbYK4d3N

