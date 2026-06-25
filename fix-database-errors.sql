-- ==========================================
-- Fix Database Errors
-- ==========================================
-- This script fixes the following errors:
-- 1. cpu_model table does not exist
-- 2. audit_log table missing operation column
-- ==========================================

-- Connect to pc_asset database first:
-- \c pc_asset

-- ==========================================
-- Fix 1: Create cpu_model table
-- ==========================================
DROP TABLE IF EXISTS "public"."cpu_model";
CREATE TABLE "public"."cpu_model" (
  "id" numeric NOT NULL,
  "name" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" numeric(1,0) DEFAULT 0
);

ALTER TABLE "public"."cpu_model" ADD CONSTRAINT "cpu_model_pkey" PRIMARY KEY ("id");

-- Insert some default CPU models
INSERT INTO cpu_model (id, name, del_flag) VALUES
(1, '7500', 0),
(2, '2700', 0),
(3, '3600', 0),
(4, '5600X', 0),
(5, '5800X', 0),
(6, '5900X', 0),
(7, '7700K', 0),
(8, '8700K', 0),
(9, '9900K', 0),
(10, '10900K', 0)
ON CONFLICT DO NOTHING;

-- ==========================================
-- Fix 2: Add operation column to audit_log
-- ==========================================
-- Check if operation column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='audit_log' 
        AND column_name='operation'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN operation VARCHAR(20);
    END IF;
END $$;

-- Update existing records to set operation from action
UPDATE audit_log SET operation = action WHERE operation IS NULL;

-- ==========================================
-- Fix 3: Update audit trigger function to use operation column
-- ==========================================
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user  VARCHAR(100);
    v_rec_id VARCHAR(100);
BEGIN
    v_user := current_setting('app.current_user', true);

    IF TG_OP = 'INSERT' THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', TG_OP, to_jsonb(NEW), v_user);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, operation, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'UPDATE', TG_OP, to_jsonb(OLD), to_jsonb(NEW), v_user);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_rec_id := OLD.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'DELETE', TG_OP, to_jsonb(OLD), v_user);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Fix 4: Add updated_at trigger to cpu_model
-- ==========================================
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE cpu_model ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER set_timestamp_cpu_model
BEFORE UPDATE ON cpu_model
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at_timestamp();

-- ==========================================
-- Fix 5: Add audit trigger to cpu_model
-- ==========================================
DROP TRIGGER IF EXISTS audit_cpu_model ON cpu_model;

CREATE TRIGGER audit_cpu_model
AFTER INSERT OR UPDATE OR DELETE ON cpu_model
FOR EACH ROW
EXECUTE FUNCTION fn_audit_log();

CREATE VIEW audit_cpu_model_view AS
SELECT * FROM audit_log WHERE table_name = 'cpu_model';

-- ==========================================
-- Verification
-- ==========================================
-- Check cpu_model table
SELECT 'cpu_model table exists' as status FROM information_schema.tables WHERE table_name = 'cpu_model';

-- Check operation column in audit_log
SELECT 'operation column exists' as status FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'operation';

-- Show cpu_model data
SELECT * FROM cpu_model ORDER BY name;
