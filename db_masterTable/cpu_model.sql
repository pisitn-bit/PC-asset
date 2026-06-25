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

 Date: 21/06/2026 11:53:01
*/


-- ----------------------------
-- Table structure for cpu_model
-- ----------------------------
DROP TABLE IF EXISTS "public"."cpu_model";
CREATE TABLE "public"."cpu_model" (
  "id" numeric NOT NULL,
  "name" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" numeric(1,0) DEFAULT 0
);

-- ----------------------------
-- Primary Key structure for table cpu_model
-- ----------------------------
ALTER TABLE "public"."cpu_model" ADD CONSTRAINT "cpu_model_pkey" PRIMARY KEY ("id");
