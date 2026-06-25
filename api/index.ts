import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.set('trust proxy', true);

// ==========================================
// Local JSON fallback
// ==========================================
const LOCAL_ASSETS_FILE = path.join(process.cwd(), 'master_list_db.json');
const LOCAL_AUTH_FILE = path.join(process.cwd(), 'authentication_db.json');
const LOCAL_AUDIT_FILE = path.join(process.cwd(), 'audit_log_db.json');
const SEED_DATA_FILE = path.join(process.cwd(), 'src', 'seed-data.json');

const SANDBOX_YANHEE_PASSWORDS: Record<string, string> = {
  admin:    'password123',
  user:     'yanhee@123',
  it_staff: 'yanhee@inter.454'
};

function initLocalFiles() {
  if (!fs.existsSync(LOCAL_ASSETS_FILE)) {
    try {
      const seed = fs.existsSync(SEED_DATA_FILE)
        ? fs.readFileSync(SEED_DATA_FILE, 'utf-8')
        : '[]';
      fs.writeFileSync(LOCAL_ASSETS_FILE, seed, 'utf-8');
    } catch {
      fs.writeFileSync(LOCAL_ASSETS_FILE, '[]', 'utf-8');
    }
  }

  if (!fs.existsSync(LOCAL_AUTH_FILE)) {
    fs.writeFileSync(LOCAL_AUTH_FILE, JSON.stringify([
      { id: 1, username: 'admin',    role: 'admin',    del_flag: 0 },
      { id: 2, username: 'user',     role: 'user',     del_flag: 0 },
      { id: 3, username: 'it_staff', role: 'it_staff', del_flag: 0 }
    ], null, 2), 'utf-8');
  }

  if (!fs.existsSync(LOCAL_AUDIT_FILE)) {
    fs.writeFileSync(LOCAL_AUDIT_FILE, '[]', 'utf-8');
  }
}

initLocalFiles();

// Force mockup mode
let isPgConnected = false;
let pgConnectionError: string | null = 'Mockup mode - PostgreSQL disabled';

// ==========================================
// Helpers
// ==========================================
function getClientIp(req: express.Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || req.socket.remoteAddress
    || null;
}

function normalizeRecord(d: any) {
  const ramGb = d.ramGb !== undefined && d.ramGb !== null && d.ramGb !== ''
    ? parseFloat(String(d.ramGb)) : null;
  return {
    id: d.id,
    dept: d.dept || '',
    name: d.name || '',
    assetId: d.assetId || '-',
    note: d.note || '',
    cpuVendor: d.cpuVendor || '',
    cpuFamily: d.cpuFamily || '',
    cpuModel: d.cpuModel || '',
    cpuGeneration: d.cpuGeneration || '',
    cpuSocket: d.cpuSocket || '',
    cpu: d.cpu || [d.cpuVendor, d.cpuFamily, d.cpuModel].filter(Boolean).join(' ') || '',
    ramGb: ramGb,
    ram: ramGb !== null ? `${ramGb} GB` : (d.ram || ''),
    disk: d.disk || '',
    os: d.os || '',
    model: d.model || '',
    manufacturer: d.manufacturer || '',
    storage: d.storage || '',
    totalMemory: d.totalMemory || '',
    unblockUsb: d.unblockUsb || '',
    internet: d.internet || ''
  };
}

async function validateYanheeUser(username: string, password: string): Promise<{ id: number; username: string } | null> {
  const unameLower = username.toLowerCase();

  const sandboxPass = SANDBOX_YANHEE_PASSWORDS[unameLower];
  if (sandboxPass && sandboxPass === password) {
    const authList = JSON.parse(fs.readFileSync(LOCAL_AUTH_FILE, 'utf-8'));
    const appUser = authList.find((u: any) => u.username.toLowerCase() === unameLower && u.del_flag === 0);
    if (appUser) return { id: appUser.id, username: appUser.username };
  }

  return null;
}

async function getAppRole(username: string): Promise<string | null> {
  const authList = JSON.parse(fs.readFileSync(LOCAL_AUTH_FILE, 'utf-8'));
  const appUser = authList.find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.del_flag === 0
  );
  return appUser ? appUser.role : null;
}

// ==========================================
// API Routes
// ==========================================
app.get('/api/db-status', async (_req, res) => {
  res.json({
    connected: isPgConnected,
    host: 'mockup',
    database: 'mockup',
    dataCenterConnected: false,
    dataCenterDatabase: 'mockup',
    fdwReady: false,
    error: pgConnectionError,
    dataCenterError: null,
    fallbackActive: true
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  const yanheeUser = await validateYanheeUser(username, password);

  if (!yanheeUser) {
    return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
  }

  const role = await getAppRole(yanheeUser.username);
  if (!role) {
    return res.status(401).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าใช้ระบบนี้ (ไม่พบ username ใน authentication)'
    });
  }

  return res.json({
    success: true,
    message: 'เข้าสู่ระบบสำเร็จ (Sandbox)',
    user: { id: yanheeUser.id, username: yanheeUser.username, role }
  });
});

app.post('/api/auth/logout', async (_req, res) => {
  res.json({ success: true });
});

app.get('/api/departments', async (_req, res) => {
  try {
    const raw = fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8');
    const depts = [...new Set(JSON.parse(raw).map((a: any) => a.dept).filter(Boolean))].sort();
    return res.json({
      success: true,
      departments: depts.map((name, idx) => ({ id: idx + 1, code: name, name })),
      source: 'Local Sandbox'
    });
  } catch {
    return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลแผนกได้' });
  }
});

app.get('/api/assets', async (_req, res) => {
  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8')).map(normalizeRecord);
    return res.json({ success: true, records, source: 'Local Sandbox' });
  } catch {
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลอุปกรณ์ได้' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vercel serverless handler
export default function handler(req: any, res: any) {
  app(req, res);
}
