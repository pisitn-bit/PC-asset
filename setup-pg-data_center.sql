-- ==========================================
-- IT MasterList PC Asset Manager
-- Foreign Server Setup — เชื่อม pc_asset → data_center
-- ==========================================
-- รันหลังจาก setup-pg-pc_asset.sql แล้ว
-- *** ต้องเชื่อมต่อ database "pc_asset" ก่อนรันสคริปต์นี้ ***
-- psql -h 10.200.10.2 -U dev_admin -d pc_asset -f setup-pg-data_center.sql

-- ==========================================
-- 1. ติดตั้ง Extension postgres_fdw
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- ==========================================
-- 2. สร้าง Foreign Server → data_center
-- ==========================================
DROP SERVER IF EXISTS data_center_link CASCADE;

CREATE SERVER data_center_link
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
        host    '10.200.10.2',
        port    '5432',
        dbname  'data_center'
    );

ALTER SERVER data_center_link OWNER TO dev_admin;

-- ==========================================
-- 3. User Mapping (ปรับ password ตามจริง)
-- ==========================================
DROP USER MAPPING IF EXISTS FOR dev_admin SERVER data_center_link;

CREATE USER MAPPING FOR dev_admin
    SERVER data_center_link
    OPTIONS (
        user     'dev_admin',
        password 'it240'
    );

-- ==========================================
-- 4. Foreign Table: mt_building (ตาราง local ใน data_center)
-- ==========================================
DROP FOREIGN TABLE IF EXISTS mt_building CASCADE;

CREATE FOREIGN TABLE mt_building (
    id              INT4,
    building_name   VARCHAR(255),
    del_flag        VARCHAR(1)
)
SERVER data_center_link
OPTIONS (schema_name 'public', table_name 'mt_building');

COMMENT ON FOREIGN TABLE mt_building IS 'Master ตึก — จาก data_center.mt_building';
COMMENT ON COLUMN mt_building.id IS 'id ตึก';
COMMENT ON COLUMN mt_building.building_name IS 'name ตึก';
COMMENT ON COLUMN mt_building.del_flag IS 'สถานะการใช้งาน';

-- ==========================================
-- 5. Foreign Table: mt_floor (ตาราง local ใน data_center)
-- ==========================================
DROP FOREIGN TABLE IF EXISTS mt_floor CASCADE;

CREATE FOREIGN TABLE mt_floor (
    id          INT4,
    floor       VARCHAR(255),
    del_flag    VARCHAR(1)
)
SERVER data_center_link
OPTIONS (schema_name 'public', table_name 'mt_floor');

COMMENT ON FOREIGN TABLE mt_floor IS 'Master ชั้น — จาก data_center.mt_floor';
COMMENT ON COLUMN mt_floor.id IS 'id ชั้น';
COMMENT ON COLUMN mt_floor.floor IS 'name ชั้น';
COMMENT ON COLUMN mt_floor.del_flag IS 'สถานะ';

-- ==========================================
-- 6. Foreign Table: tb_department
--    (ใน data_center เป็น FDW ไปยัง dbo.tb_department บน SQL Server)
-- ==========================================
DROP FOREIGN TABLE IF EXISTS tb_department CASCADE;

CREATE FOREIGN TABLE tb_department (
    id_department           INT4,
    name_department         VARCHAR(255),
    id_division             INT4,
    code_department         VARCHAR(255),
    code_ssb                VARCHAR(255),
    code_ssb64              VARCHAR(255),
    code_ssb64_bk           VARCHAR(255),
    del_flag                VARCHAR(255),
    status_department       VARCHAR(255),
    doc_in                  INT4,
    type_department         VARCHAR(255),
    del_survey              VARCHAR(255),
    crm_view                VARCHAR(255),
    search_price            INT4,
    id_clinic_crm           VARCHAR(255),
    status_manage_division  VARCHAR(255),
    phone_department        VARCHAR(255),
    id_building             INT4,
    id_level_building       INT4,
    note_department         VARCHAR(255)
)
SERVER data_center_link
OPTIONS (schema_name 'public', table_name 'tb_department');

COMMENT ON FOREIGN TABLE tb_department IS 'Master แผนก — จาก data_center (FDW → dbo.tb_department)';

-- ==========================================
-- 7. Foreign Table: tb_user_yanhee
--    (ใน data_center เป็น FDW ไปยัง dbo.tb_user_yanhee บน SQL Server)
-- ==========================================
DROP FOREIGN TABLE IF EXISTS tb_user_yanhee CASCADE;

CREATE FOREIGN TABLE tb_user_yanhee (
    id_user                 INT4,
    username                VARCHAR(50),
    password                VARCHAR(50),
    code_employee           VARCHAR(50),
    permision               VARCHAR(10),
    name_employee           VARCHAR(255),
    dep_code                VARCHAR(50),
    id_job_description      INT4,
    id_position             INT4,
    id_department           INT4,
    id_division             INT4,
    id_section              INT4,
    name_position           VARCHAR(255),
    permision_hoir          VARCHAR(50),
    permision_competency    VARCHAR(50),
    permision_lib           VARCHAR(50),
    id_division_competency  INT4,
    id_section_competency   INT4,
    id_team_kpi             VARCHAR(100),
    permision_kpi           VARCHAR(50),
    auto_insert             VARCHAR(1),
    permision_q_a           VARCHAR(50),
    permision_code_jd       VARCHAR(6),
    id_code_jd              VARCHAR(50),
    permision_code_team     VARCHAR(10),
    permision_advt          VARCHAR(10),
    permision_media         VARCHAR(10),
    permision_df            VARCHAR(50),
    status_user             VARCHAR(10),
    outdate                 TIMESTAMP(6),
    status_rent             VARCHAR(50),
    permision_ad            VARCHAR(10),
    crm_position            VARCHAR(50),
    crm_code_sale           VARCHAR(50),
    nickname                VARCHAR(50),
    status_manage           VARCHAR(10),
    outdate_crm             VARCHAR(10),
    crm2                    INT4,
    language                VARCHAR(50)
)
SERVER data_center_link
OPTIONS (schema_name 'public', table_name 'tb_user_yanhee');

COMMENT ON FOREIGN TABLE tb_user_yanhee IS 'Master ผู้ใช้งาน — จาก data_center (FDW → dbo.tb_user_yanhee)';

-- ==========================================
-- 8. View สำหรับ Backend (อ่านง่าย)
-- ==========================================
CREATE OR REPLACE VIEW v_departments AS
SELECT
    d.id_department     AS id,
    d.code_department   AS dept_code,
    d.name_department   AS dept_name,
    d.id_building,
    b.building_name,
    d.id_level_building AS id_floor,
    f.floor             AS floor_name,
    d.del_flag
FROM tb_department d
LEFT JOIN mt_building b ON b.id = d.id_building AND COALESCE(b.del_flag, '0') = '0'
LEFT JOIN mt_floor    f ON f.id = d.id_level_building AND COALESCE(f.del_flag, '0') = '0'
WHERE COALESCE(d.del_flag, '0') = '0'
  AND COALESCE(d.status_department, '1') = '1';

CREATE OR REPLACE VIEW v_users AS
SELECT
    u.id_user,
    u.username,
    u.password,
    u.name_employee,
    u.code_employee,
    u.id_department,
    d.name_department   AS dept_name,
    d.code_department   AS dept_code,
    u.status_user
FROM tb_user_yanhee u
LEFT JOIN tb_department d ON d.id_department = u.id_department
WHERE COALESCE(u.status_user, '1') = '1';

-- ==========================================
-- ตัวอย่าง Query ที่ Backend ใช้
-- ==========================================

-- ดึงรายชื่อแผนก (dropdown ในฟอร์มเพิ่มเครื่อง)
-- SELECT id, dept_code, dept_name
-- FROM v_departments
-- ORDER BY dept_name;

-- Login จาก data_center
-- SELECT id_user AS id, username, password, name_employee, dept_name
-- FROM v_users
-- WHERE LOWER(username) = LOWER($1);

-- ดึงรายชื่อตึก
-- SELECT id, building_name FROM mt_building
-- WHERE COALESCE(del_flag, '0') = '0' ORDER BY building_name;

-- ดึงรายชื่อชั้น
-- SELECT id, floor FROM mt_floor
-- WHERE COALESCE(del_flag, '0') = '0' ORDER BY floor;

-- แผนกตามตึก/ชั้น
-- SELECT id, dept_code, dept_name, building_name, floor_name
-- FROM v_departments
-- WHERE id_building = $1 AND id_floor = $2
-- ORDER BY dept_name;
