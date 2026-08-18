/*
# Create Developer Team Resource & Budget Management schema

1. New Tables
- `years`: planning years with working-days-per-month setting. One row is marked active.
- `developers`: team members with role, monthly rate (EUR), and target FTE. Global (shared across all planning years).
- `projects`: projects with code (PRJ-01..PRJ-12), name, and status (Active/Planning). Global.
- `allocations`: per-year, per-month allocation percentage linking a developer to a project. Unique on (developer_id, project_id, year_id, month).

2. Security
- Single-tenant app, no sign-in. RLS enabled on every table.
- All tables allow anon + authenticated full CRUD because the data is intentionally shared/public.

3. Seed Data
- 1 active year (2026, 20 working days/month).
- 14 default developers with varied roles, rates, and target FTE.
- 12 default projects (PRJ-01 .. PRJ-12) with names and statuses.
- A handful of sample allocations to make the dashboard non-empty.
*/

CREATE TABLE IF NOT EXISTS years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL UNIQUE,
  working_days_per_month int NOT NULL DEFAULT 20 CHECK (working_days_per_month > 0),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE years ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  monthly_rate numeric(10,2) NOT NULL DEFAULT 13600.00 CHECK (monthly_rate >= 0),
  target_fte numeric(4,2) NOT NULL DEFAULT 1.00 CHECK (target_fte >= 0 AND target_fte <= 2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE developers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Planning')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  allocation_pct numeric(5,4) NOT NULL DEFAULT 0 CHECK (allocation_pct >= 0 AND allocation_pct <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE (developer_id, project_id, year_id, month)
);

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Policies: single-tenant, public/shared data.
DROP POLICY IF EXISTS "anon_select_years" ON years;
CREATE POLICY "anon_select_years" ON years FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_years" ON years;
CREATE POLICY "anon_insert_years" ON years FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_years" ON years;
CREATE POLICY "anon_update_years" ON years FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_years" ON years;
CREATE POLICY "anon_delete_years" ON years FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_developers" ON developers;
CREATE POLICY "anon_select_developers" ON developers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_developers" ON developers;
CREATE POLICY "anon_insert_developers" ON developers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_developers" ON developers;
CREATE POLICY "anon_update_developers" ON developers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_developers" ON developers;
CREATE POLICY "anon_delete_developers" ON developers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_allocations" ON allocations;
CREATE POLICY "anon_select_allocations" ON allocations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_allocations" ON allocations;
CREATE POLICY "anon_insert_allocations" ON allocations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_allocations" ON allocations;
CREATE POLICY "anon_update_allocations" ON allocations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_allocations" ON allocations;
CREATE POLICY "anon_delete_allocations" ON allocations FOR DELETE TO anon, authenticated USING (true);

-- Seed: active year
INSERT INTO years (year, working_days_per_month, is_active)
VALUES (2026, 20, true)
ON CONFLICT (year) DO NOTHING;

-- Seed: 14 developers
INSERT INTO developers (name, role, monthly_rate, target_fte, sort_order) VALUES
('Anna Schmidt', 'Frontend Engineer', 14720.00, 1.00, 1),
('Ben Müller', 'Backend Engineer', 15200.00, 1.00, 2),
('Carla Rossi', 'Fullstack Engineer', 15680.00, 1.00, 3),
('David Klein', 'DevOps Engineer', 16800.00, 1.00, 4),
('Elena Fischer', 'Frontend Engineer', 14080.00, 1.00, 5),
('Felix Weber', 'Backend Engineer', 14400.00, 0.80, 6),
('Gina Bauer', 'UI/UX Designer', 13600.00, 1.00, 7),
('Hans Lehmann', 'QA Engineer', 12800.00, 1.00, 8),
('Iris Wagner', 'Data Engineer', 16000.00, 1.00, 9),
('Jonas Becker', 'Frontend Engineer', 13760.00, 0.50, 10),
('Klara Schmidt', 'Backend Engineer', 15040.00, 1.00, 11),
('Lukas Hoffmann', 'Tech Lead', 19200.00, 1.00, 12),
('Mara Schulz', 'Fullstack Engineer', 15360.00, 1.00, 13),
('Niko Brandt', 'Mobile Engineer', 14560.00, 1.00, 14)
ON CONFLICT DO NOTHING;

-- Seed: 12 projects
INSERT INTO projects (code, name, status, sort_order) VALUES
('PRJ-01', 'Customer Portal Redesign', 'Active', 1),
('PRJ-02', 'Payment Gateway Integration', 'Active', 2),
('PRJ-03', 'Mobile App v2.0', 'Active', 3),
('PRJ-04', 'Data Warehouse Migration', 'Active', 4),
('PRJ-05', 'Analytics Dashboard', 'Active', 5),
('PRJ-06', 'Identity & Access Overhaul', 'Active', 6),
('PRJ-07', 'Marketing Website Refresh', 'Planning', 7),
('PRJ-08', 'Internal Tooling Platform', 'Active', 8),
('PRJ-09', 'API Gateway Modernization', 'Planning', 9),
('PRJ-10', 'Reporting Engine', 'Active', 10),
('PRJ-11', 'Notification Service', 'Active', 11),
('PRJ-12', 'Compliance & Audit Suite', 'Planning', 12)
ON CONFLICT (code) DO NOTHING;

-- Seed: a few sample allocations for the active year (2026) to populate the dashboard.
-- We insert only if no allocations exist yet, using a guarded DO block.
DO $$
DECLARE
  y_id uuid;
  d_ids uuid[];
  p_ids uuid[];
BEGIN
  SELECT id INTO y_id FROM years WHERE year = 2026 LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM allocations WHERE year_id = y_id) THEN
    SELECT array_agg(id ORDER BY sort_order) INTO d_ids FROM developers;
    SELECT array_agg(id ORDER BY sort_order) INTO p_ids FROM projects;
    -- Spread some allocations across months 1-6 for the first several devs/projects.
    INSERT INTO allocations (developer_id, project_id, year_id, month, allocation_pct) VALUES
      (d_ids[1], p_ids[1], y_id, 1, 0.5), (d_ids[1], p_ids[2], y_id, 1, 0.3),
      (d_ids[2], p_ids[2], y_id, 1, 0.6), (d_ids[2], p_ids[3], y_id, 1, 0.2),
      (d_ids[3], p_ids[1], y_id, 1, 0.4), (d_ids[3], p_ids[5], y_id, 1, 0.4),
      (d_ids[4], p_ids[4], y_id, 1, 0.7), (d_ids[4], p_ids[8], y_id, 1, 0.2),
      (d_ids[5], p_ids[1], y_id, 1, 0.3), (d_ids[5], p_ids[3], y_id, 1, 0.3),
      (d_ids[6], p_ids[2], y_id, 1, 0.4),
      (d_ids[7], p_ids[5], y_id, 1, 0.5), (d_ids[7], p_ids[7], y_id, 1, 0.3),
      (d_ids[8], p_ids[10], y_id, 1, 0.6),
      (d_ids[9], p_ids[4], y_id, 1, 0.5), (d_ids[9], p_ids[5], y_id, 1, 0.3),
      (d_ids[10], p_ids[3], y_id, 1, 0.3),
      (d_ids[11], p_ids[2], y_id, 1, 0.4), (d_ids[11], p_ids[9], y_id, 1, 0.3),
      (d_ids[12], p_ids[6], y_id, 1, 0.3), (d_ids[12], p_ids[8], y_id, 1, 0.3),
      (d_ids[13], p_ids[1], y_id, 1, 0.3), (d_ids[13], p_ids[10], y_id, 1, 0.3),
      (d_ids[14], p_ids[3], y_id, 1, 0.4), (d_ids[14], p_ids[11], y_id, 1, 0.3),
      (d_ids[1], p_ids[1], y_id, 2, 0.5), (d_ids[1], p_ids[2], y_id, 2, 0.3),
      (d_ids[2], p_ids[2], y_id, 2, 0.6), (d_ids[2], p_ids[3], y_id, 2, 0.3),
      (d_ids[3], p_ids[1], y_id, 2, 0.4), (d_ids[3], p_ids[5], y_id, 2, 0.5),
      (d_ids[4], p_ids[4], y_id, 2, 0.7),
      (d_ids[5], p_ids[3], y_id, 2, 0.4),
      (d_ids[7], p_ids[7], y_id, 2, 0.4),
      (d_ids[8], p_ids[10], y_id, 2, 0.5),
      (d_ids[9], p_ids[4], y_id, 2, 0.6),
      (d_ids[12], p_ids[6], y_id, 2, 0.4),
      (d_ids[13], p_ids[10], y_id, 2, 0.4),
      (d_ids[14], p_ids[11], y_id, 2, 0.4);
  END IF;
END $$;
