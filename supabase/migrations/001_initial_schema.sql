-- ============================================================
-- MAINZA MAINTENANCE TRACKING SYSTEM
-- Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('owner', 'client', 'technician');

CREATE TYPE work_order_status AS ENUM (
  'pending',      -- Client submitted, awaiting owner review
  'accepted',     -- Owner accepted, not yet assigned
  'assigned',     -- Technician assigned, not yet started
  'in_progress',  -- Technician logged start time
  'completed',    -- Technician logged end time
  'cancelled'     -- Cancelled by owner
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- ============================================================
-- COMPANIES (client companies, e.g. mines)
-- ============================================================

CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (one per auth user)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'client',
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORK ORDERS
-- ============================================================

CREATE TABLE work_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  status              work_order_status NOT NULL DEFAULT 'pending',
  priority            priority_level NOT NULL DEFAULT 'medium',

  -- Relationships
  client_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  technician_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Owner notes on accept/decline
  owner_notes         TEXT,

  -- Preferred schedule from client
  preferred_date      DATE,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  assigned_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

-- ============================================================
-- WORK ORDER STATUS HISTORY (full audit trail)
-- ============================================================

CREATE TABLE work_order_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  old_status      work_order_status,
  new_status      work_order_status NOT NULL,
  changed_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIME LOGS (technician start/end tracking)
-- ============================================================

CREATE TABLE time_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  duration_mins   INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORK ORDER ATTACHMENTS (photos/files)
-- ============================================================

CREATE TABLE work_order_attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE companies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_attachments     ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ──────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Owners can read all profiles
CREATE POLICY "profiles: owner read all"
  ON profiles FOR SELECT
  USING (get_my_role() = 'owner');

-- Users can update their own profile
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ── COMPANIES ─────────────────────────────────────────────
-- All authenticated users can view companies
CREATE POLICY "companies: authenticated read"
  ON companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only owners can manage companies
CREATE POLICY "companies: owner manage"
  ON companies FOR ALL
  USING (get_my_role() = 'owner');

-- ── WORK ORDERS ──────────────────────────────────────────
-- Clients see their own work orders
CREATE POLICY "work_orders: client sees own"
  ON work_orders FOR SELECT
  USING (client_id = auth.uid());

-- Technicians see work orders assigned to them
CREATE POLICY "work_orders: technician sees assigned"
  ON work_orders FOR SELECT
  USING (technician_id = auth.uid());

-- Owners see all work orders
CREATE POLICY "work_orders: owner sees all"
  ON work_orders FOR SELECT
  USING (get_my_role() = 'owner');

-- Clients can create work orders
CREATE POLICY "work_orders: client create"
  ON work_orders FOR INSERT
  WITH CHECK (client_id = auth.uid() AND get_my_role() = 'client');

-- Owners can update any work order
CREATE POLICY "work_orders: owner update"
  ON work_orders FOR UPDATE
  USING (get_my_role() = 'owner');

-- Technicians can update their assigned work order (status, notes)
CREATE POLICY "work_orders: technician update assigned"
  ON work_orders FOR UPDATE
  USING (technician_id = auth.uid() AND get_my_role() = 'technician');

-- ── STATUS HISTORY ────────────────────────────────────────
-- Anyone involved with the work order can see history
CREATE POLICY "status_history: view"
  ON work_order_status_history FOR SELECT
  USING (
    get_my_role() = 'owner'
    OR changed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id
        AND (wo.client_id = auth.uid() OR wo.technician_id = auth.uid())
    )
  );

-- Authenticated users can insert status history
CREATE POLICY "status_history: insert"
  ON work_order_status_history FOR INSERT
  WITH CHECK (changed_by = auth.uid());

-- ── TIME LOGS ────────────────────────────────────────────
-- Technicians manage their own time logs
CREATE POLICY "time_logs: technician manage"
  ON time_logs FOR ALL
  USING (technician_id = auth.uid());

-- Owners can view all time logs
CREATE POLICY "time_logs: owner view"
  ON time_logs FOR SELECT
  USING (get_my_role() = 'owner');

-- Clients can view time logs for their work orders
CREATE POLICY "time_logs: client view own"
  ON time_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id AND wo.client_id = auth.uid()
    )
  );

-- ── ATTACHMENTS ──────────────────────────────────────────
CREATE POLICY "attachments: uploader manage"
  ON work_order_attachments FOR ALL
  USING (uploaded_by = auth.uid());

CREATE POLICY "attachments: owner view"
  ON work_order_attachments FOR SELECT
  USING (get_my_role() = 'owner');

CREATE POLICY "attachments: client view own"
  ON work_order_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id AND wo.client_id = auth.uid()
    )
  );

CREATE POLICY "attachments: technician view assigned"
  ON work_order_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_id AND wo.technician_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_work_orders_client_id      ON work_orders(client_id);
CREATE INDEX idx_work_orders_technician_id  ON work_orders(technician_id);
CREATE INDEX idx_work_orders_status         ON work_orders(status);
CREATE INDEX idx_work_orders_created_at     ON work_orders(created_at DESC);
CREATE INDEX idx_time_logs_work_order_id    ON time_logs(work_order_id);
CREATE INDEX idx_status_history_wo_id       ON work_order_status_history(work_order_id);
