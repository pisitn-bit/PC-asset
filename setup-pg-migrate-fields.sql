-- Migration: เพิ่มฟิลด์ตาม Excel Master List
-- รันบน database pc_asset (ถ้าสร้างตารางไปแล้วก่อนหน้านี้)
ALTER TABLE master_list ADD COLUMN IF NOT EXISTS total_memory VARCHAR(50);
ALTER TABLE master_list ADD COLUMN IF NOT EXISTS unblock_usb  VARCHAR(100);
ALTER TABLE master_list ADD COLUMN IF NOT EXISTS internet     VARCHAR(100);

COMMENT ON COLUMN master_list.cpu              IS 'CPUName';
COMMENT ON COLUMN master_list.total_memory     IS 'TotalMemory';
COMMENT ON COLUMN master_list.ram_gb           IS 'RAM_GB';
COMMENT ON COLUMN master_list.disk             IS 'DiskDrives';
COMMENT ON COLUMN master_list.os               IS 'Windows';
COMMENT ON COLUMN master_list.storage          IS 'StorageType';
COMMENT ON COLUMN master_list.unblock_usb      IS 'unblock USB';
COMMENT ON COLUMN master_list.internet         IS 'Internet';
