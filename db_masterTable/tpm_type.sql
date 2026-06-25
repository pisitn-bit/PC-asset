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

 Date: 21/06/2026 11:54:28
*/


-- ----------------------------
-- Table structure for tpm_type
-- ----------------------------
DROP TABLE IF EXISTS "public"."tpm_type";
CREATE TABLE "public"."tpm_type" (
  "id" numeric NOT NULL,
  "name" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" numeric(1,0) DEFAULT 0
)
;

-- ----------------------------
-- Primary Key structure for table tpm_type
-- ----------------------------
ALTER TABLE "public"."tpm_type" ADD CONSTRAINT "tpm_type_pkey" PRIMARY KEY ("id");
