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

 Date: 21/06/2026 11:53:22
*/


-- ----------------------------
-- Table structure for master_cpu_generation
-- ----------------------------
DROP TABLE IF EXISTS "public"."master_cpu_generation";
CREATE TABLE "public"."master_cpu_generation" (
  "id" int4 NOT NULL DEFAULT nextval('master_cpu_generation_id_seq'::regclass),
  "generation_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "display_order" int4 DEFAULT 0,
  "is_active" int2 NOT NULL DEFAULT 1,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "public"."master_cpu_generation"."generation_name" IS 'ชื่อ Generation เช่น Gen 7, Gen 13';
COMMENT ON COLUMN "public"."master_cpu_generation"."display_order" IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN "public"."master_cpu_generation"."is_active" IS 'สถานะการใช้งาน (1=ใช้งาน, 0=ไม่ใช้งาน)';
COMMENT ON TABLE "public"."master_cpu_generation" IS 'Master CPU Generation (Gen 1-14, etc.)';

-- ----------------------------
-- Indexes structure for table master_cpu_generation
-- ----------------------------
CREATE INDEX "ix_master_cpu_generation_active" ON "public"."master_cpu_generation" USING btree (
  "is_active" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "ix_master_cpu_generation_order" ON "public"."master_cpu_generation" USING btree (
  "display_order" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table master_cpu_generation
-- ----------------------------
CREATE TRIGGER "trg_master_cpu_generation_audit" AFTER INSERT OR UPDATE OR DELETE ON "public"."master_cpu_generation"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_audit_log"();
CREATE TRIGGER "trg_master_cpu_generation_updated_at" BEFORE UPDATE ON "public"."master_cpu_generation"
FOR EACH ROW
EXECUTE PROCEDURE "public"."fn_update_updated_at_column"();

-- ----------------------------
-- Uniques structure for table master_cpu_generation
-- ----------------------------
ALTER TABLE "public"."master_cpu_generation" ADD CONSTRAINT "master_cpu_generation_generation_name_key" UNIQUE ("generation_name");

-- ----------------------------
-- Primary Key structure for table master_cpu_generation
-- ----------------------------
ALTER TABLE "public"."master_cpu_generation" ADD CONSTRAINT "master_cpu_generation_pkey" PRIMARY KEY ("id");
