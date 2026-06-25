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

 Date: 21/06/2026 11:54:10
*/


-- ----------------------------
-- Table structure for secure_boot
-- ----------------------------
DROP TABLE IF EXISTS "public"."secure_boot";
CREATE TABLE "public"."secure_boot" (
  "id" numeric NOT NULL,
  "name" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" numeric(1,0) DEFAULT 0
)
;

-- ----------------------------
-- Primary Key structure for table secure_boot
-- ----------------------------
ALTER TABLE "public"."secure_boot" ADD CONSTRAINT "secure_boot_pkey" PRIMARY KEY ("id");
