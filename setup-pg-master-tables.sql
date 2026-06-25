-- ==========================================
-- IT MasterList PC Asset Manager
-- Master Tables Setup — Database: pc_asset
-- ==========================================
-- รันบน database "pc_asset" หลังจาก setup-pg-pc_asset.sql
-- psql -h 10.200.10.2 -U dev_admin -d pc_asset -f setup-pg-master-tables.sql

-- ==========================================
-- 1. Master CPU Vendors
-- ==========================================
DROP TABLE IF EXISTS master_cpu_vendor CASCADE;

CREATE TABLE master_cpu_vendor (
    id              SERIAL PRIMARY KEY,
    vendor_name     VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_cpu_vendor_active ON master_cpu_vendor (is_active);
CREATE INDEX ix_master_cpu_vendor_order ON master_cpu_vendor (display_order);

COMMENT ON TABLE master_cpu_vendor IS 'Master CPU Vendors (Intel, AMD, etc.)';
COMMENT ON COLUMN master_cpu_vendor.vendor_name IS 'ชื่อผู้ผลิต CPU เช่น Intel, AMD';
COMMENT ON COLUMN master_cpu_vendor.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_cpu_vendor.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: CPU Vendors
INSERT INTO master_cpu_vendor (vendor_name, description, display_order, is_active) VALUES
('Intel', 'Intel Corporation', 1, 1),
('AMD', 'Advanced Micro Devices', 2, 1),
('Unknown', 'Unknown Vendor', 99, 1);

-- ==========================================
-- 2. Master CPU Families
-- ==========================================
DROP TABLE IF EXISTS master_cpu_family CASCADE;

CREATE TABLE master_cpu_family (
    id              SERIAL PRIMARY KEY,
    family_name     VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_cpu_family_active ON master_cpu_family (is_active);
CREATE INDEX ix_master_cpu_family_order ON master_cpu_family (display_order);

COMMENT ON TABLE master_cpu_family IS 'Master CPU Families (Core, Ryzen, etc.)';
COMMENT ON COLUMN master_cpu_family.family_name IS 'ชื่อตระกูล CPU เช่น Core, Ryzen';
COMMENT ON COLUMN master_cpu_family.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_cpu_family.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: CPU Families
INSERT INTO master_cpu_family (family_name, description, display_order, is_active) VALUES
('Core', 'Intel Core Series', 1, 1),
('Pentium', 'Intel Pentium Series', 2, 1),
('Celeron', 'Intel Celeron Series', 3, 1),
('Xeon', 'Intel Xeon Series', 4, 1),
('Ryzen', 'AMD Ryzen Series', 5, 1),
('EPYC', 'AMD EPYC Series', 6, 1),
('Athlon', 'AMD Athlon Series', 7, 1),
('Unknown', 'Unknown Family', 99, 1);

-- ==========================================
-- 3. Master CPU Models
-- ==========================================
DROP TABLE IF EXISTS master_cpu_model CASCADE;

CREATE TABLE master_cpu_model (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_cpu_model_active ON master_cpu_model (is_active);
CREATE INDEX ix_master_cpu_model_order ON master_cpu_model (display_order);

COMMENT ON TABLE master_cpu_model IS 'Master CPU Models (i3, i5, i7, etc.)';
COMMENT ON COLUMN master_cpu_model.model_name IS 'ชื่อรุ่น CPU เช่น i3, i5, i7';
COMMENT ON COLUMN master_cpu_model.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_cpu_model.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: CPU Models
INSERT INTO master_cpu_model (model_name, description, display_order, is_active) VALUES
('i3', 'Intel Core i3', 1, 1),
('i5', 'Intel Core i5', 2, 1),
('i7', 'Intel Core i7', 3, 1),
('i9', 'Intel Core i9', 4, 1),
('Ryzen 3', 'AMD Ryzen 3', 5, 1),
('Ryzen 5', 'AMD Ryzen 5', 6, 1),
('Ryzen 7', 'AMD Ryzen 7', 7, 1),
('Ryzen 9', 'AMD Ryzen 9', 8, 1),
('Unknown', 'Unknown Model', 99, 1);

-- ==========================================
-- 4. Master Unblock USB Options
-- ==========================================
DROP TABLE IF EXISTS master_unblock_usb CASCADE;

CREATE TABLE master_unblock_usb (
    id              SERIAL PRIMARY KEY,
    option_name     VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_unblock_usb_active ON master_unblock_usb (is_active);
CREATE INDEX ix_master_unblock_usb_order ON master_unblock_usb (display_order);

COMMENT ON TABLE master_unblock_usb IS 'Master Unblock USB Options';
COMMENT ON COLUMN master_unblock_usb.option_name IS 'ตัวเลือกสถานะ unblock USB';
COMMENT ON COLUMN master_unblock_usb.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_unblock_usb.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: Unblock USB Options
INSERT INTO master_unblock_usb (option_name, description, display_order, is_active) VALUES
('Yes', 'Unblock USB Enabled', 1, 1),
('No', 'Unblock USB Disabled', 2, 1),
('Unknown', 'Unknown Status', 99, 1);

-- ==========================================
-- 5. Master Internet Options
-- ==========================================
DROP TABLE IF EXISTS master_internet CASCADE;

CREATE TABLE master_internet (
    id              SERIAL PRIMARY KEY,
    option_name     VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_internet_active ON master_internet (is_active);
CREATE INDEX ix_master_internet_order ON master_internet (display_order);

COMMENT ON TABLE master_internet IS 'Master Internet Options';
COMMENT ON COLUMN master_internet.option_name IS 'ตัวเลือกสถานะ Internet';
COMMENT ON COLUMN master_internet.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_internet.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: Internet Options
INSERT INTO master_internet (option_name, description, display_order, is_active) VALUES
('Yes', 'Internet Enabled', 1, 1),
('No', 'Internet Disabled', 2, 1),
('Unknown', 'Unknown Status', 99, 1);

-- ==========================================
-- 6. Master Storage Types
-- ==========================================
DROP TABLE IF EXISTS master_storage CASCADE;

CREATE TABLE master_storage (
    id              SERIAL PRIMARY KEY,
    storage_name    VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_storage_active ON master_storage (is_active);
CREATE INDEX ix_master_storage_order ON master_storage (display_order);

COMMENT ON TABLE master_storage IS 'Master ชนิดสตอเรจ (SSD, HDD, SSD+HDD, etc.)';
COMMENT ON COLUMN master_storage.storage_name IS 'ชื่อชนิดสตอเรจ เช่น SSD, HDD, SSD+HDD';
COMMENT ON COLUMN master_storage.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_storage.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: Storage Types
INSERT INTO master_storage (storage_name, description, display_order, is_active) VALUES
('SSD', 'Solid State Drive', 1, 1),
('HDD', 'Hard Disk Drive', 2, 1),
('SSD+HDD', 'Mixed Storage (SSD + HDD)', 3, 1),
('Unknown', 'Unknown Storage Type', 99, 1),
('NVMe', 'NVMe SSD', 4, 1),
('SATA SSD', 'SATA SSD', 5, 1),
('M.2 SSD', 'M.2 Form Factor SSD', 6, 1);

-- ==========================================
-- 2. Master CPU Generations
-- ==========================================
DROP TABLE IF EXISTS master_cpu_generation CASCADE;

CREATE TABLE master_cpu_generation (
    id              SERIAL PRIMARY KEY,
    generation_name VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_cpu_generation_active ON master_cpu_generation (is_active);
CREATE INDEX ix_master_cpu_generation_order ON master_cpu_generation (display_order);

COMMENT ON TABLE master_cpu_generation IS 'Master CPU Generation (Gen 1-14, etc.)';
COMMENT ON COLUMN master_cpu_generation.generation_name IS 'ชื่อ Generation เช่น Gen 7, Gen 13';
COMMENT ON COLUMN master_cpu_generation.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_cpu_generation.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: CPU Generations
INSERT INTO master_cpu_generation (generation_name, description, display_order, is_active) VALUES
('Gen 1', 'First Generation (Nehalem)', 1, 1),
('Gen 2', 'Second Generation (Sandy Bridge)', 2, 1),
('Gen 3', 'Third Generation (Ivy Bridge)', 3, 1),
('Gen 4', 'Fourth Generation (Haswell)', 4, 1),
('Gen 5', 'Fifth Generation (Broadwell)', 5, 1),
('Gen 6', 'Sixth Generation (Skylake)', 6, 1),
('Gen 7', 'Seventh Generation (Kaby Lake)', 7, 1),
('Gen 8', 'Eighth Generation (Coffee Lake)', 8, 1),
('Gen 9', 'Ninth Generation (Coffee Lake Refresh)', 9, 1),
('Gen 10', 'Tenth Generation (Comet Lake)', 10, 1),
('Gen 11', 'Eleventh Generation (Tiger Lake)', 11, 1),
('Gen 12', 'Twelfth Generation (Alder Lake)', 12, 1),
('Gen 13', 'Thirteenth Generation (Raptor Lake)', 13, 1),
('Gen 14', 'Fourteenth Generation (Meteor Lake)', 14, 1),
('Unknown', 'Unknown Generation', 99, 1);

-- ==========================================
-- 3. Master CPU Sockets
-- ==========================================
DROP TABLE IF EXISTS master_cpu_socket CASCADE;

CREATE TABLE master_cpu_socket (
    id              SERIAL PRIMARY KEY,
    socket_name     VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_cpu_socket_active ON master_cpu_socket (is_active);
CREATE INDEX ix_master_cpu_socket_order ON master_cpu_socket (display_order);

COMMENT ON TABLE master_cpu_socket IS 'Master CPU Socket (LGA1151, AM4, etc.)';
COMMENT ON COLUMN master_cpu_socket.socket_name IS 'ชื่อ Socket เช่น LGA1151, AM4, LGA1700';
COMMENT ON COLUMN master_cpu_socket.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_cpu_socket.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: CPU Sockets
INSERT INTO master_cpu_socket (socket_name, description, display_order, is_active) VALUES
('LGA1151', 'Intel LGA 1151 (6th-9th Gen)', 1, 1),
('LGA1200', 'Intel LGA 1200 (10th-11th Gen)', 2, 1),
('LGA1700', 'Intel LGA 1700 (12th-14th Gen)', 3, 1),
('AM4', 'AMD AM4 (Ryzen 1000-5000)', 4, 1),
('AM5', 'AMD AM5 (Ryzen 7000+)', 5, 1),
('LGA2011', 'Intel LGA 2011 (Xeon)', 6, 1),
('LGA2066', 'Intel LGA 2066 (Xeon)', 7, 1),
('FM2+', 'AMD FM2+ (A-Series)', 8, 1),
('Unknown', 'Unknown Socket', 99, 1);

-- ==========================================
-- 4. Master Operating Systems
-- ==========================================
DROP TABLE IF EXISTS master_os CASCADE;

CREATE TABLE master_os (
    id              SERIAL PRIMARY KEY,
    os_name         VARCHAR(100) NOT NULL UNIQUE,
    os_version      VARCHAR(50),
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       SMALLINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_master_os_active ON master_os (is_active);
CREATE INDEX ix_master_os_order ON master_os (display_order);

COMMENT ON TABLE master_os IS 'Master Operating Systems';
COMMENT ON COLUMN master_os.os_name IS 'ชื่อระบบปฏิบัติการ';
COMMENT ON COLUMN master_os.os_version IS 'เวอร์ชัน เช่น 10, 11';
COMMENT ON COLUMN master_os.display_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN master_os.is_active IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';

-- Seed Data: Operating Systems
INSERT INTO master_os (os_name, os_version, description, display_order, is_active) VALUES
('Microsoft Windows 11 Pro', '11', 'Windows 11 Professional', 1, 1),
('Microsoft Windows 10 Pro', '10', 'Windows 10 Professional', 2, 1),
('Microsoft Windows 11 Home', '11', 'Windows 11 Home', 3, 1),
('Microsoft Windows 10 Home', '10', 'Windows 10 Home', 4, 1),
('Microsoft Windows 7 Professional', '7', 'Windows 7 Professional (EOL)', 5, 1),
('Microsoft Windows 7 Ultimate', '7', 'Windows 7 Ultimate (EOL)', 6, 1),
('Microsoft Windows XP', 'XP', 'Windows XP (EOL)', 7, 1),
('Ubuntu Linux', '', 'Ubuntu Linux', 8, 1),
('CentOS Linux', '', 'CentOS Linux', 9, 1),
('Unknown', '', 'Unknown Operating System', 99, 1);

-- ==========================================
-- 5. Trigger Function for updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION fn_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all master tables
DROP TRIGGER IF EXISTS trg_master_storage_updated_at ON master_storage;
CREATE TRIGGER trg_master_storage_updated_at
    BEFORE UPDATE ON master_storage
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_cpu_generation_updated_at ON master_cpu_generation;
CREATE TRIGGER trg_master_cpu_generation_updated_at
    BEFORE UPDATE ON master_cpu_generation
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_cpu_socket_updated_at ON master_cpu_socket;
CREATE TRIGGER trg_master_cpu_socket_updated_at
    BEFORE UPDATE ON master_cpu_socket
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_os_updated_at ON master_os;
CREATE TRIGGER trg_master_os_updated_at ON master_os
    BEFORE UPDATE ON master_os
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

-- Triggers for new master tables
DROP TRIGGER IF EXISTS trg_master_cpu_vendor_updated_at ON master_cpu_vendor;
CREATE TRIGGER trg_master_cpu_vendor_updated_at ON master_cpu_vendor
    BEFORE UPDATE ON master_cpu_vendor
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_cpu_family_updated_at ON master_cpu_family;
CREATE TRIGGER trg_master_cpu_family_updated_at ON master_cpu_family
    BEFORE UPDATE ON master_cpu_family
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_cpu_model_updated_at ON master_cpu_model;
CREATE TRIGGER trg_master_cpu_model_updated_at ON master_cpu_model
    BEFORE UPDATE ON master_cpu_model
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_unblock_usb_updated_at ON master_unblock_usb;
CREATE TRIGGER trg_master_unblock_usb_updated_at ON master_unblock_usb
    BEFORE UPDATE ON master_unblock_usb
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_master_internet_updated_at ON master_internet;
CREATE TRIGGER trg_master_internet_updated_at ON master_internet
    BEFORE UPDATE ON master_internet
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

-- ==========================================
-- 6. Audit Triggers for Master Tables
-- ==========================================
DROP TRIGGER IF EXISTS trg_master_storage_audit ON master_storage;
CREATE TRIGGER trg_master_storage_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_storage
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_cpu_generation_audit ON master_cpu_generation;
CREATE TRIGGER trg_master_cpu_generation_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_cpu_generation
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_cpu_socket_audit ON master_cpu_socket;
CREATE TRIGGER trg_master_cpu_socket_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_cpu_socket
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_os_audit ON master_os;
CREATE TRIGGER trg_master_os_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_os
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ==========================================
-- 7. Views for Easy Access
-- ==========================================
CREATE OR REPLACE VIEW v_master_storage AS
SELECT id, storage_name, description, display_order, is_active, created_at, updated_at
FROM master_storage
WHERE is_active = 1
ORDER BY display_order, storage_name;

CREATE OR REPLACE VIEW v_master_cpu_generation AS
SELECT id, generation_name, description, display_order, is_active, created_at, updated_at
FROM master_cpu_generation
WHERE is_active = 1
ORDER BY display_order, generation_name;

CREATE OR REPLACE VIEW v_master_cpu_socket AS
SELECT id, socket_name, description, display_order, is_active, created_at, updated_at
FROM master_cpu_socket
WHERE is_active = 1
ORDER BY display_order, socket_name;

CREATE OR REPLACE VIEW v_master_os AS
SELECT id, os_name, os_version, description, display_order, is_active, created_at, updated_at
FROM master_os
WHERE is_active = 1
ORDER BY display_order, os_name;

-- ==========================================
-- 8. Sample Queries for Backend
-- ==========================================

-- Get all active storage types
-- SELECT storage_name FROM v_master_storage ORDER BY display_order;

-- Get all active CPU generations
-- SELECT generation_name FROM v_master_cpu_generation ORDER BY display_order;

-- Get all active CPU sockets
-- SELECT socket_name FROM v_master_cpu_socket ORDER BY display_order;

-- Get all active OS
-- SELECT os_name FROM v_master_os ORDER BY display_order;

-- Add new storage type (admin only)
-- INSERT INTO master_storage (storage_name, description, display_order, is_active)
-- VALUES ('M.2 NVMe', 'M.2 NVMe SSD', 8, 1);

-- Update storage type (admin only)
-- UPDATE master_storage SET description = 'Updated description', updated_at = NOW()
-- WHERE id = 1;

-- Delete (soft delete) storage type (admin only)
-- UPDATE master_storage SET is_active = 0, updated_at = NOW() WHERE id = 1;

-- ==========================================
-- 9. Audit Triggers for New Master Tables
-- ==========================================

DROP TRIGGER IF EXISTS trg_master_cpu_vendor_audit ON master_cpu_vendor;
CREATE TRIGGER trg_master_cpu_vendor_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_cpu_vendor
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_cpu_family_audit ON master_cpu_family;
CREATE TRIGGER trg_master_cpu_family_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_cpu_family
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_cpu_model_audit ON master_cpu_model;
CREATE TRIGGER trg_master_cpu_model_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_cpu_model
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_unblock_usb_audit ON master_unblock_usb;
CREATE TRIGGER trg_master_unblock_usb_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_unblock_usb
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_master_internet_audit ON master_internet;
CREATE TRIGGER trg_master_internet_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_internet
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ==========================================
-- 10. Views for New Master Tables
-- ==========================================

CREATE OR REPLACE VIEW v_master_cpu_vendor AS
SELECT id, vendor_name, description, display_order, is_active, created_at, updated_at
FROM master_cpu_vendor
WHERE is_active = 1
ORDER BY display_order, vendor_name;

CREATE OR REPLACE VIEW v_master_cpu_family AS
SELECT id, family_name, description, display_order, is_active, created_at, updated_at
FROM master_cpu_family
WHERE is_active = 1
ORDER BY display_order, family_name;

CREATE OR REPLACE VIEW v_master_cpu_model AS
SELECT id, model_name, description, display_order, is_active, created_at, updated_at
FROM master_cpu_model
WHERE is_active = 1
ORDER BY display_order, model_name;

CREATE OR REPLACE VIEW v_master_unblock_usb AS
SELECT id, option_name, description, display_order, is_active, created_at, updated_at
FROM master_unblock_usb
WHERE is_active = 1
ORDER BY display_order, option_name;

CREATE OR REPLACE VIEW v_master_internet AS
SELECT id, option_name, description, display_order, is_active, created_at, updated_at
FROM master_internet
WHERE is_active = 1
ORDER BY display_order, option_name;
