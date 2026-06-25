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

 Date: 21/06/2026 11:53:48
*/


-- ----------------------------
-- Table structure for master_storage
-- ----------------------------
DROP TABLE IF EXISTS "public"."master_storage";
CREATE TABLE "public"."master_storage" (
  "id" int4 NOT NULL DEFAULT nextval('master_storage_id_seq'::regclass),
  "storage_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "display_order" int4 DEFAULT 0,
  "is_active" int2 NOT NULL DEFAULT 1,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "public"."master_storage"."storage_name" IS 'ชื่อชนิดสตอเรจ เช่น SSD, HDD, SSD+HDD';
COMMENT ON COLUMN "public"."master_storage"."display_order" IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN "public"."master_storage"."is_active" IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';
COMMENT ON TABLE "public"."master_storage" IS 'Master ชนิดสตอเรจ (SSD, HDD, SSD+HDD, etc.)';

-- ----------------------------
-- Indexes structure for table master_storage
-- ----------------------------
CREATE INDEX "ix_master_storage_active" ON "public"."master_storage" USING btree (
  "is_active" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "ix_master_storage_order" ON "public"."master_storage" USING btree (
  "display_order" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table master_storage
-- ----------------------------
CREATE TRIGGER "trg_master_storage_audit" AFTER INSERT OR UPDATE OR DELETE ON "public"."master_storage"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_audit_log"();
CREATE TRIGGER "trg_master_storage_updated_at" BEFORE UPDATE ON "public"."master_storage"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_update_updated_at_column"();

-- ----------------------------
-- Uniques structure for table master_storage
-- ----------------------------
ALTER TABLE "public"."master_storage" ADD CONSTRAINT "master_storage_storage_name_key" UNIQUE ("storage_name");

-- ----------------------------
-- Primary Key structure for table master_storage
-- ----------------------------
ALTER TABLE "public"."master_storage" ADD CONSTRAINT "master_storage_pkey" PRIMARY KEY ("id");
