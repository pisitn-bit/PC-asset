-- ==========================================
-- IT MasterList PC Asset Manager
-- PostgreSQL Setup — Database: pc_asset
-- ==========================================
-- รันบน PostgreSQL 13+ (ต้องรันด้วย user ที่มีสิทธิ์ CREATEDB)
--
-- วิธีรัน (pgAdmin / Navicat / DBeaver):
--   STEP 1 → เชื่อมต่อ database "postgres" แล้วรันบล็อก STEP 1
--   STEP 2 → เปลี่ยนเชื่อมต่อ database "pc_asset" แล้วรันบล็อก STEP 2
--
-- วิธีรัน (psql CLI เท่านั้น):
--   psql -h 10.200.10.2 -U dev_admin -d postgres -f setup-pg-pc_asset.sql

-- ==========================================
-- STEP 1: สร้าง Database pc_asset (รันบน database "postgres")
-- ==========================================
-- ถ้ามี pc_asset อยู่แล้ว จะ error "already exists" — ข้ามไป STEP 2 ได้
CREATE DATABASE pc_asset OWNER dev_admin ENCODING 'UTF8';

-- ==========================================
-- STEP 2: สร้างตาราง + seed (รันบน database "pc_asset")
-- ==========================================
-- *** เปลี่ยน connection ไปที่ pc_asset ก่อนรันส่วนนี้ ***
DROP TRIGGER IF EXISTS trg_master_list_audit      ON master_list;
DROP TRIGGER IF EXISTS trg_authentication_audit   ON authentication;
DROP FUNCTION IF EXISTS fn_audit_log()            CASCADE;
DROP FUNCTION IF EXISTS fn_audit_login(VARCHAR, VARCHAR, JSONB, VARCHAR) CASCADE;
DROP TABLE IF EXISTS master_list                  CASCADE;
DROP TABLE IF EXISTS authentication               CASCADE;
DROP TABLE IF EXISTS audit_log                    CASCADE;

-- ==========================================
-- 3. Audit Log (เก็บ log ทุกตาราง + login)
-- ==========================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(100) NOT NULL,
    record_id       VARCHAR(100),
    action          VARCHAR(20)  NOT NULL,   -- INSERT, UPDATE, DELETE, LOGIN, LOGIN_FAILED, LOGOUT
    old_data        JSONB,
    new_data        JSONB,
    changed_by      VARCHAR(100),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_audit_log_table_action  ON audit_log (table_name, action);
CREATE INDEX ix_audit_log_changed_by    ON audit_log (changed_by);
CREATE INDEX ix_audit_log_created_at    ON audit_log (created_at DESC);

COMMENT ON TABLE audit_log IS 'Audit trail ทุกการเปลี่ยนแปลงข้อมูล + login';
COMMENT ON COLUMN audit_log.action IS 'INSERT | UPDATE | DELETE | LOGIN | LOGIN_FAILED | LOGOUT';

-- ==========================================
-- 4. Authentication (username + role เท่านั้น — password ใช้จาก tb_user_yanhee)
-- ==========================================
CREATE TABLE authentication (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    role        VARCHAR(50)  NOT NULL DEFAULT 'user',  -- admin | it_staff | user | viewer
    del_flag    SMALLINT     NOT NULL DEFAULT 0        -- 0=Active, 1=Deleted
);

CREATE INDEX ix_authentication_username_del ON authentication (username, del_flag);
CREATE INDEX ix_authentication_role         ON authentication (role, del_flag);

COMMENT ON TABLE authentication IS 'รายชื่อผู้ใช้ที่อนุญาตเข้าระบบ + กำหนด role (ยืนยันรหัสผ่านผ่าน tb_user_yanhee)';
COMMENT ON COLUMN authentication.role IS 'admin=เต็มสิทธิ์ | it_staff=IT | user=ทั่วไป | viewer=อ่านอย่างเดียว';

-- ==========================================
-- 5. IT Master List (PC Assets)
-- ==========================================
CREATE TABLE master_list (
    id              SERIAL PRIMARY KEY,
    dept            VARCHAR(255),
    name            VARCHAR(255) NOT NULL UNIQUE,  -- ComputerName
    asset_id        VARCHAR(255),
    note            TEXT,
    cpu_vendor      VARCHAR(100),
    cpu_family      VARCHAR(100),
    cpu_model       VARCHAR(100),
    cpu_generation  VARCHAR(100),
    cpu_socket      VARCHAR(100),
    cpu             VARCHAR(255),
    ram_gb          DOUBLE PRECISION,
    ram             VARCHAR(100),
    disk            TEXT,
    os              VARCHAR(255),
    model           VARCHAR(255),
    manufacturer    VARCHAR(255),
    storage         VARCHAR(100),
    total_memory    VARCHAR(50),   -- TotalMemory (ค่าดิบจากระบบ อาจเป็น "." )
    unblock_usb     VARCHAR(100),  -- unblock USB
    internet        VARCHAR(100),  -- Internet
    del_flag        SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX ix_master_list_dept_del     ON master_list (dept, del_flag);
CREATE INDEX ix_master_list_storage_del  ON master_list (storage, del_flag);
CREATE INDEX ix_master_list_os_del       ON master_list (os, del_flag);

-- ==========================================
-- 6. Trigger Function — auto audit INSERT/UPDATE/DELETE
-- ==========================================
-- Backend ตั้งค่าก่อน query: SET LOCAL app.current_user = 'username';
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user  VARCHAR(100);
    v_rec_id VARCHAR(100);
BEGIN
    BEGIN
        v_user := NULLIF(current_setting('app.current_user', true), '');
    EXCEPTION WHEN OTHERS THEN
        v_user := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', to_jsonb(NEW), v_user);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_rec_id := NEW.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user);
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_rec_id := OLD.id::TEXT;
        INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, v_rec_id, 'DELETE', to_jsonb(OLD), v_user);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_authentication_audit
    AFTER INSERT OR UPDATE OR DELETE ON authentication
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_master_list_audit
    AFTER INSERT OR UPDATE OR DELETE ON master_list
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ==========================================
-- 7. Function — audit login / logout (เรียกจาก Backend)
-- ==========================================
CREATE OR REPLACE FUNCTION fn_audit_login(
    p_username  VARCHAR,
    p_action    VARCHAR,          -- LOGIN | LOGIN_FAILED | LOGOUT
    p_detail    JSONB  DEFAULT NULL,
    p_ip        VARCHAR DEFAULT NULL,
    p_user_agent TEXT   DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO audit_log (table_name, action, changed_by, new_data, ip_address, user_agent)
    VALUES (
        'authentication',
        p_action,
        p_username,
        COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object('username', p_username),
        p_ip,
        p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. Seed Authentication (username + role)
-- ==========================================
INSERT INTO authentication (username, role, del_flag) VALUES
('admin',    'admin',    0),
('user',     'user',     0),
('it_staff', 'it_staff', 0);

-- ==========================================
-- 9. Seed Sample PCs
-- ==========================================
INSERT INTO master_list (
    dept, name, asset_id, note,
    cpu_vendor, cpu_family, cpu_model, cpu_generation, cpu_socket, cpu,
    ram_gb, ram, disk, os, model, manufacturer, storage, del_flag
) VALUES
('จ่ายยาผู้ป่วยใน', 'PHI-00-03', 'HR.60/00094', '',
 'Intel', 'Core i5', '7500', 'Gen 7', 'LGA1151', 'Intel Core i5 7500',
 8, '8 GB', 'SK hynix SC308 SATA 128GB - 119.24 GB',
 'Microsoft Windows 10 Pro', 'OptiPlex 5050', 'Dell Inc.', 'SSD', 0),

('จ่ายยาผู้ป่วยใน', 'PHI-00-02', 'HR.60/00162', '',
 'Intel', 'Core i5', '7500', 'Gen 7', 'LGA1151', 'Intel Core i5 7500',
 8, '8 GB', 'SanDisk X400 M.2 2280 128GB - 119.24 GB',
 'Microsoft Windows 10 Pro', 'OptiPlex 5050', 'Dell Inc.', 'SSD', 0),

('อายุรกรรม', 'MED-DR-07', 'HR.60/00084', '',
 'Intel', 'Core i5', '7500', 'Gen 7', 'LGA1151', 'Intel Core i5 7500',
 8, '8 GB', 'SanDisk X400 M.2 2280 128GB - 119.24 GB',
 'Microsoft Windows 10 Pro', 'OptiPlex 5050', 'Dell Inc.', 'SSD', 0),

('พัฒนาเว็บไซต์', 'WIN11ART', 'HR-66/00046', '',
 'Intel', 'Core i5', '13400', 'Gen 13', 'LGA1700', 'Intel Core i5 13400',
 32, '32 GB', 'ST1000DM003-1SB102 - 931.51 GB  WD Blue SN570 500GB - 465.76 GB',
 'Microsoft Windows 11 Pro', 'B760M DS3H DDR4', 'Gigabyte Technology Co., Ltd.', 'HDD', 0),

('ผู้อำนวยการฝ่ายการตลาด', 'DMS-08-02', 'HR.62/00129', '',
 'Intel', 'Core i7', '13700', 'Gen 13', 'LGA1700', 'Intel Core i7 13700',
 32, '32 GB', 'WD_BLACK SN770 1TB - 931.51 GB  WDC WD20EZBX-00AYRA0 - 1,863.01 GB',
 'Microsoft Windows 11 Pro', 'B760M GAMING X DDR4', 'Gigabyte Technology Co., Ltd.', 'SSD+HDD', 0);

-- ==========================================
-- ตัวอย่าง Query ที่ Backend ใช้
-- ==========================================

-- Login: ยืนยันรหัสผ่านจาก v_users (tb_user_yanhee) แล้วดึง role
-- SELECT u.id_user AS id, u.username, u.password, a.role
-- FROM v_users u
-- JOIN authentication a ON LOWER(a.username) = LOWER(u.username) AND a.del_flag = 0
-- WHERE LOWER(u.username) = LOWER($1);

-- บันทึก login สำเร็จ
-- SELECT fn_audit_login($1, 'LOGIN', jsonb_build_object('role', $2), $3, $4);

-- บันทึก login ล้มเหลว
-- SELECT fn_audit_login($1, 'LOGIN_FAILED', jsonb_build_object('reason', $2), $3, $4);

-- ตั้ง user ก่อน INSERT/UPDATE master_list (เพื่อ audit)
-- BEGIN;
-- SET LOCAL app.current_user = 'admin';
-- INSERT INTO master_list (...) VALUES (...) RETURNING id;
-- COMMIT;

-- ดึงรายการ PC
-- SELECT * FROM master_list WHERE del_flag = 0 ORDER BY id DESC;

-- Soft delete
-- UPDATE master_list SET del_flag = 1 WHERE id = ANY($1::int[]);

-- ดู audit log ล่าสุด
-- SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;

-- ขั้นตอนถัดไป: รัน setup-pg-data_center.sql
-- psql -h 10.200.10.2 -U dev_admin -d pc_asset -f setup-pg-data_center.sql
