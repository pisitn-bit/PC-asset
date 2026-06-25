export interface ITAsset {
  id: number;
  dept: string;
  name: string; // ComputerName
  assetId: string; // รหัสทรัพย์สิน
  note: string; // หมายเหตุ
  cpuVendor: string;
  cpuFamily: string;
  cpuModel: string;
  cpuGeneration: string;
  cpuSocket: string;
  cpu: string;
  ramGb: number | null;
  ram: string;
  disk: string;
  os: string;
  model: string;
  manufacturer: string;
  storage: string;
  totalMemory: string;  // TotalMemory
  unblockUsb: string;   // unblock USB
  internet: string;     // Internet
}

export type UserRole = 'admin' | 'it_staff' | 'user' | 'viewer';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface AuditLogEntry {
  id: number;
  tableName: string;
  recordId: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT';
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedBy: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DBStatus {
  connected: boolean;
  host: string;
  database: string;
  dataCenterConnected: boolean;
  dataCenterDatabase: string;
  fdwReady?: boolean;
  error: string | null;
  dataCenterError?: string | null;
  fallbackActive: boolean;
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface FilterConfig {
  searchQuery: string;
  dept: string;
  storage: string;
  generation: string;
  socket: string;
  ramGroup: string;
  os: string;
  unblockUsb: string;
  internet: string;
  noHardwareOnly: boolean;
}
