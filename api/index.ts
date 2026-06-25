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

// ==========================================
// PostgreSQL
// ==========================================
const PG_HOST = process.env.PG_HOST || '10.200.10.2';
const PG_PORT = Number(process.env.PG_PORT) || 5432;
const PG_USER = process.env.PG_USER || 'dev_admin';
const PG_PASSWORD = process.env.PG_PASSWORD || 'it240';
const PG_DB_PC_ASSET = process.env.PG_DATABASE_PC_ASSET || 'pc_asset';
const PG_DB_DATA_CENTER = process.env.PG_DATABASE_DATA_CENTER || 'data_center';

const pgBaseConfig: pg.PoolConfig = {
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASSWORD,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

let pcAssetPool: pg.Pool | null = null;
let dataCenterPool: pg.Pool | null = null;
let isPgConnected = false;
let isDataCenterConnected = false;
let pgConnectionError: string | null = null;
let dataCenterConnectionError: string | null = null;

async function connectPostgreSQL() {
  try {
    console.log(`Connecting PostgreSQL pc_asset @ ${PG_HOST}:${PG_PORT}...`);
    pcAssetPool = new pg.Pool({ ...pgBaseConfig, database: PG_DB_PC_ASSET });
    await pcAssetPool.query('SELECT 1');
    isPgConnected = true;
    pgConnectionError = null;
    console.log(` SUCCESS: pc_asset connected (${PG_DB_PC_ASSET})`);
  } catch (err: any) {
    pcAssetPool = null;
    isPgConnected = false;
    pgConnectionError = err.message;
    console.warn(` WARNING: pc_asset failed — ${err.message}`);
    console.warn(' Falling back to local JSON persistence.');
  }

  try {
    console.log(`Connecting PostgreSQL data_center @ ${PG_HOST}:${PG_PORT}...`);
    dataCenterPool = new pg.Pool({ ...pgBaseConfig, database: PG_DB_DATA_CENTER });
    await dataCenterPool.query('SELECT 1');
    isDataCenterConnected = true;
    dataCenterConnectionError = null;
    console.log(` SUCCESS: data_center connected (${PG_DB_DATA_CENTER})`);
  } catch (err: any) {
    dataCenterPool = null;
    isDataCenterConnected = false;
    dataCenterConnectionError = err.message;
    console.warn(` WARNING: data_center failed — ${err.message}`);
    console.warn(' Master data (แผนก/ผู้ใช้) จะใช้ FDW ใน pc_asset หรือ sandbox');
  }
}

connectPostgreSQL();

// ==========================================
// Helpers
// ==========================================
function getClientIp(req: express.Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.ip
    || req.socket.remoteAddress
    || null;
}

function getActorUsername(req: express.Request): string {
  const header = req.headers['x-current-user'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return 'system';
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

  if (isPgConnected && pcAssetPool) {
    try {
      const fdwResult = await pcAssetPool.query(
        `SELECT id_user, username, password FROM v_users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
        [username]
      );
      if (fdwResult.rows.length > 0) {
        const u = fdwResult.rows[0];
        if (String(u.password) === password) {
          return { id: u.id_user, username: u.username };
        }
        return null;
      }
    } catch {
      // v_users อาจยังไม่มี — ลอง data_center ตรง
    }
  }

  if (isDataCenterConnected && dataCenterPool) {
    try {
      const dcResult = await dataCenterPool.query(
        `SELECT id_user, username, password FROM tb_user_yanhee
         WHERE LOWER(username) = LOWER($1) AND COALESCE(status_user, '1') = '1' LIMIT 1`,
        [username]
      );
      if (dcResult.rows.length > 0) {
        const u = dcResult.rows[0];
        if (String(u.password) === password) {
          return { id: u.id_user, username: u.username };
        }
        return null;
      }
    } catch (e: any) {
      console.error('data_center yanhee lookup error:', e.message);
    }
  }

  const sandboxPass = SANDBOX_YANHEE_PASSWORDS[unameLower];
  if (sandboxPass && sandboxPass === password) {
    const authList = JSON.parse(fs.readFileSync(LOCAL_AUTH_FILE, 'utf-8'));
    const appUser = authList.find((u: any) => u.username.toLowerCase() === unameLower && u.del_flag === 0);
    if (appUser) return { id: appUser.id, username: appUser.username };
  }

  return null;
}

async function getAppRole(username: string): Promise<string | null> {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT role FROM authentication WHERE LOWER(username) = LOWER($1) AND del_flag = 0`,
        [username]
      );
      if (result.rows.length > 0) return result.rows[0].role;
    } catch { /* fallback */ }
  }

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
  let fdwReady = false;
  if (isPgConnected && pcAssetPool) {
    try {
      await pcAssetPool.query('SELECT 1 FROM v_departments LIMIT 1');
      fdwReady = true;
    } catch { /* ignore */ }
  }

  res.json({
    connected: isPgConnected,
    host: PG_HOST,
    database: PG_DB_PC_ASSET,
    dataCenterConnected: isDataCenterConnected || fdwReady,
    dataCenterDatabase: PG_DB_DATA_CENTER,
    fdwReady,
    error: pgConnectionError,
    dataCenterError: dataCenterConnectionError,
    fallbackActive: !isPgConnected
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIp = getClientIp(req);
  const userAgent = req.get('user-agent') || null;

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
    message: isPgConnected ? 'เข้าสู่ระบบสำเร็จ (PostgreSQL)' : 'เข้าสู่ระบบสำเร็จ (Sandbox)',
    user: { id: yanheeUser.id, username: yanheeUser.username, role }
  });
});

app.post('/api/auth/logout', async (_req, res) => {
  res.json({ success: true });
});

app.get('/api/departments', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, dept_code, dept_name FROM v_departments ORDER BY dept_name`
      );
      return res.json({
        success: true,
        departments: result.rows.map((r: any) => ({
          id: r.id,
          code: r.dept_code,
          name: r.dept_name
        })),
        source: 'PostgreSQL'
      });
    } catch (e: any) {
      console.error('Departments query failed:', e.message);
    }
  }

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
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT * FROM master_list WHERE del_flag = 0 ORDER BY id DESC`
      );
      return res.json({
        success: true,
        records: result.rows.map(normalizeRecord),
        source: 'PostgreSQL'
      });
    } catch (e: any) {
      console.error('Assets query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8')).map(normalizeRecord);
    return res.json({ success: true, records, source: 'Local Sandbox' });
  } catch {
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลอุปกรณ์ได้' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for Vercel
export default app;
