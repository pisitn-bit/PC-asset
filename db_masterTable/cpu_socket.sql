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

 Date: 21/06/2026 11:52:52
*/


-- ----------------------------
-- Table structure for cpu_socket
-- ----------------------------
DROP TABLE IF EXISTS "public"."cpu_socket";
CREATE TABLE "public"."cpu_socket" (
  "id" numeric NOT NULL,
  "name" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" numeric(1,0) DEFAULT 0
)
;

-- ----------------------------
-- Primary Key structure for table cpu_socket
-- ----------------------------
ALTER TABLE "public"."cpu_socket" ADD CONSTRAINT "cpu_socket_pkey" PRIMARY KEY ("id");
