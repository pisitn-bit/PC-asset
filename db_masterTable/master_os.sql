/*
 Navicat Premium Dump SQL

 Source Server         : App_In-house_DB__PROD
 Source Server Type    : PostgreSQL
 Source Server Version : 170009 (170009)
 Source Host           : 10.200.10.2:5432
 Source Catalog        : pc_asset
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170009 (170009)
 File Encoding         : 65001

 Date: 21/06/2026 11:53:42
*/


-- ----------------------------
-- Table structure for master_os
-- ----------------------------
DROP TABLE IF EXISTS "public"."master_os";
CREATE TABLE "public"."master_os" (
  "id" int4 NOT NULL DEFAULT nextval('master_os_id_seq'::regclass),
  "os_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "os_version" varchar(50) COLLATE "pg_catalog"."default",
  "description" text COLLATE "pg_catalog"."default",
  "display_order" int4 DEFAULT 0,
  "is_active" int2 NOT NULL DEFAULT 1,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "public"."master_os"."os_name" IS 'ชื่อระบบปฏิบัติการ';
COMMENT ON COLUMN "public"."master_os"."os_version" IS 'เวอร์ชัน เช่น 10, 11';
COMMENT ON COLUMN "public"."master_os"."display_order" IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN "public"."master_os"."is_active" IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';
COMMENT ON TABLE "public"."master_os" IS 'Master Operating Systems';

-- ----------------------------
-- Indexes structure for table master_os
-- ----------------------------
CREATE INDEX "ix_master_os_active" ON "public"."master_os" USING btree (
  "is_active" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "ix_master_os_order" ON "public"."master_os" USING btree (
  "display_order" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table master_os
-- ----------------------------
CREATE TRIGGER "trg_master_os_audit" AFTER INSERT OR UPDATE OR DELETE ON "public"."master_os"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_audit_log"();
CREATE TRIGGER "trg_master_os_updated_at" BEFORE UPDATE ON "public"."master_os"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_update_updated_at_column"();

-- ----------------------------
-- Uniques structure for table master_os
-- ----------------------------
ALTER TABLE "public"."master_os" ADD CONSTRAINT "master_os_os_name_key" UNIQUE ("os_name");

-- ----------------------------
-- Primary Key structure for table master_os
-- ----------------------------
ALTER TABLE "public"."master_os" ADD CONSTRAINT "master_os_pkey" PRIMARY KEY ("id");
