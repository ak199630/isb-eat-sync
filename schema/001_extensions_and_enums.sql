-- ISB Eat-Sync: Extensions and enums
-- Run first. Compatible with Supabase / Postgres 15+.

-- Enable UUID generation (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User role: student = normal; authorized = can see/order Bajaj Dining
CREATE TYPE user_role AS ENUM ('student', 'authorized');

-- Stall operational status
CREATE TYPE stall_status AS ENUM ('open', 'busy', 'closed');

-- Order lifecycle (vendor flow: accepted -> preparing -> ready_for_pickup -> fulfilled)
CREATE TYPE order_status AS ENUM (
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'fulfilled',
  'cancelled'
);

-- Notification types for JIT and handshake
CREATE TYPE notification_type AS ENUM ('leave_now', 'ready_for_pickup');
