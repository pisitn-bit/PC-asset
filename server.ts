import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

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
// PostgreSQL — dual database pools
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

function mapAssetRow(row: any) {
  return normalizeRecord({
    id: row.id,
    dept: row.dept,
    name: row.name,
    assetId: row.asset_id,
    note: row.note,
    cpuVendor: row.cpu_vendor,
    cpuFamily: row.cpu_family,
    cpuModel: row.cpu_model,
    cpuGeneration: row.cpu_generation,
    cpuSocket: row.cpu_socket,
    cpu: row.cpu,
    ramGb: row.ram_gb,
    ram: row.ram,
    disk: row.disk,
    os: row.os,
    model: row.model,
    manufacturer: row.manufacturer,
    storage: row.storage,
    totalMemory: row.total_memory || '',
    unblockUsb: row.unblock_usb || '',
    internet: row.internet || ''
  });
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

function mapAuditRow(row: any) {
  return {
    id: Number(row.id),
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    oldData: row.old_data,
    newData: row.new_data,
    changedBy: row.changed_by,
    ipAddress: row.ip_address,
    createdAt: row.created_at
  };
}

async function auditLogin(
  username: string,
  action: 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT',
  detail: Record<string, unknown>,
  ip: string | null,
  userAgent: string | null
) {
  if (isPgConnected && pcAssetPool) {
    try {
      await pcAssetPool.query(
        `SELECT fn_audit_login($1, $2, $3::jsonb, $4, $5)`,
        [username, action, JSON.stringify(detail), ip, userAgent]
      );
      return;
    } catch (e: any) {
      console.error('fn_audit_login error:', e.message);
    }
  }

  try {
    const logs = JSON.parse(fs.readFileSync(LOCAL_AUDIT_FILE, 'utf-8'));
    logs.unshift({
      id: logs.length ? Math.max(...logs.map((l: any) => l.id)) + 1 : 1,
      table_name: 'authentication',
      record_id: null,
      action,
      old_data: null,
      new_data: detail,
      changed_by: username,
      ip_address: ip,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(LOCAL_AUDIT_FILE, JSON.stringify(logs.slice(0, 500), null, 2), 'utf-8');
  } catch { /* ignore */ }
}

async function withUserTransaction<T>(
  username: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (!pcAssetPool) throw new Error('Database not connected');
  const client = await pcAssetPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user', $1, true)`, [username]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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
  return appUser?.role || null;
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/api/db-status', async (_req, res) => {
  let fdwReady = false;
  if (isPgConnected && pcAssetPool) {
    try {
      await pcAssetPool.query('SELECT 1 FROM v_departments LIMIT 1');
      fdwReady = true;
    } catch { /* FDW not set up yet */ }
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
    await auditLogin(username, 'LOGIN_FAILED', { reason: 'invalid_credentials' }, clientIp, userAgent);
    return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
  }

  const role = await getAppRole(yanheeUser.username);
  if (!role) {
    await auditLogin(username, 'LOGIN_FAILED', { reason: 'not_in_authentication' }, clientIp, userAgent);
    return res.status(401).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าใช้ระบบนี้ (ไม่พบ username ใน authentication)'
    });
  }

  await auditLogin(yanheeUser.username, 'LOGIN', { role }, clientIp, userAgent);

  return res.json({
    success: true,
    message: isPgConnected ? 'เข้าสู่ระบบสำเร็จ (PostgreSQL)' : 'เข้าสู่ระบบสำเร็จ (Sandbox)',
    user: { id: yanheeUser.id, username: yanheeUser.username, role }
  });
});

app.post('/api/auth/logout', async (req, res) => {
  const username = getActorUsername(req);
  const clientIp = getClientIp(req);
  const userAgent = req.get('user-agent') || null;
  if (username !== 'system') {
    await auditLogin(username, 'LOGOUT', {}, clientIp, userAgent);
  }
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
        records: result.rows.map(r => ({
          id: r.id,
          code: r.dept_code,
          name: r.dept_name
        })),
        source: 'pc_asset (FDW v_departments)'
      });
    } catch (e: any) {
      console.error('v_departments query failed:', e.message);
    }
  }

  if (isDataCenterConnected && dataCenterPool) {
    try {
      const result = await dataCenterPool.query(
        `SELECT id_department AS id, code_department AS dept_code, name_department AS dept_name
         FROM tb_department
         WHERE COALESCE(del_flag, '0') = '0' AND COALESCE(status_department, '1') = '1'
         ORDER BY name_department`
      );
      return res.json({
        success: true,
        records: result.rows.map(r => ({ id: r.id, code: r.dept_code, name: r.dept_name })),
        source: 'data_center (direct)'
      });
    } catch (e: any) {
      console.error('data_center departments failed:', e.message);
    }
  }

  try {
    const raw = fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8');
    const depts = [...new Set(JSON.parse(raw).map((a: any) => a.dept).filter(Boolean))].sort();
    return res.json({
      success: true,
      records: depts.map((name: string, i: number) => ({ id: i + 1, code: '', name })),
      source: 'Sandbox (from assets)'
    });
  } catch {
    return res.status(500).json({ success: false, message: 'โหลดรายชื่อแผนกไม่สำเร็จ' });
  }
});

app.get('/api/audit-logs', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page)) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit)) || 30));
  const offset = (page - 1) * limit;
  const tableFilter = req.query.table ? String(req.query.table) : null;
  const actionFilter = req.query.action ? String(req.query.action) : null;

  if (isPgConnected && pcAssetPool) {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (tableFilter) {
        conditions.push(`table_name = $${idx++}`);
        params.push(tableFilter);
      }
      if (actionFilter) {
        conditions.push(`action = $${idx++}`);
        params.push(actionFilter);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pcAssetPool.query(
        `SELECT COUNT(*)::int AS total FROM audit_log ${where}`,
        params
      );

      params.push(limit, offset);
      const result = await pcAssetPool.query(
        `SELECT id, table_name, record_id, action, old_data, new_data,
                changed_by, ip_address, created_at
         FROM audit_log ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        params
      );

      return res.json({
        success: true,
        records: result.rows.map(mapAuditRow),
        total: countResult.rows[0].total,
        page,
        limit
      });
    } catch (e: any) {
      console.error('audit_log query failed:', e.message);
    }
  }

  try {
    let logs = JSON.parse(fs.readFileSync(LOCAL_AUDIT_FILE, 'utf-8'));
    if (tableFilter) logs = logs.filter((l: any) => l.table_name === tableFilter);
    if (actionFilter) logs = logs.filter((l: any) => l.action === actionFilter);
    const total = logs.length;
    const sliced = logs.slice(offset, offset + limit);
    return res.json({
      success: true,
      records: sliced.map(mapAuditRow),
      total,
      page,
      limit
    });
  } catch {
    return res.status(500).json({ success: false, message: 'โหลด audit log ไม่สำเร็จ' });
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
        records: result.rows.map(mapAssetRow),
        source: `PostgreSQL (${PG_DB_PC_ASSET})`
      });
    } catch (e: any) {
      console.error('master_list query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8')).map(normalizeRecord);
    return res.json({ success: true, records, source: 'Local Sandbox' });
  } catch {
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลอุปกรณ์ได้' });
  }
});

app.post('/api/assets', async (req, res) => {
  const data = req.body;
  const actor = getActorUsername(req);

  if (!data.name || !data.dept) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูล ComputerName และ แผนก ให้ครบถ้วน' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const created = await withUserTransaction(actor, async (client) => {
        const dup = await client.query(
          `SELECT id FROM master_list WHERE LOWER(name) = LOWER($1) AND del_flag = 0`,
          [data.name]
        );
        if (dup.rows.length > 0) {
          throw Object.assign(new Error(`เครื่องชื่อ "${data.name}" มีอยู่ในระบบแล้ว`), { status: 400 });
        }

        const ramGb = data.ramGb !== null && data.ramGb !== undefined ? parseFloat(data.ramGb) : null;
        const result = await client.query(
          `INSERT INTO master_list
           (dept, name, asset_id, note, cpu_vendor, cpu_family, cpu_model, cpu_generation,
            cpu_socket, cpu, ram_gb, ram, disk, os, model, manufacturer, storage,
            total_memory, unblock_usb, internet, del_flag)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,0)
           RETURNING *`,
          [
            data.dept, data.name, data.assetId || '-', data.note || '',
            data.cpuVendor || '', data.cpuFamily || '', data.cpuModel || '',
            data.cpuGeneration || '', data.cpuSocket || '', data.cpu || '',
            ramGb, data.ram || (ramGb !== null ? `${ramGb} GB` : ''),
            data.disk || '', data.os || '', data.model || '',
            data.manufacturer || '', data.storage || '',
            data.totalMemory || '', data.unblockUsb || '', data.internet || ''
          ]
        );
        return mapAssetRow(result.rows[0]);
      });

      return res.json({ success: true, record: created });
    } catch (e: any) {
      if (e.status === 400) return res.status(400).json({ success: false, message: e.message });
      console.error('INSERT master_list failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    if (records.some((r: any) => r.name.toLowerCase() === data.name.toLowerCase())) {
      return res.status(400).json({ success: false, message: `เครื่องชื่อ "${data.name}" มีอยู่ในระบบแล้ว` });
    }
    const nextId = records.length ? Math.max(...records.map((r: any) => r.id)) + 1 : 1;
    const record = normalizeRecord({ ...data, id: nextId });
    records.unshift(record);
    fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    return res.json({ success: true, record });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ: ' + err.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  const idValue = parseInt(req.params.id);
  const data = req.body;
  const actor = getActorUsername(req);

  if (isNaN(idValue)) {
    return res.status(400).json({ success: false, message: 'ID อุปกรณ์ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const ramGb = data.ramGb !== null && data.ramGb !== undefined ? parseFloat(data.ramGb) : null;
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_list SET
            dept=$1, name=$2, asset_id=$3, note=$4, cpu_vendor=$5, cpu_family=$6,
            cpu_model=$7, cpu_generation=$8, cpu_socket=$9, cpu=$10, ram_gb=$11,
            ram=$12, disk=$13, os=$14, model=$15, manufacturer=$16, storage=$17,
            total_memory=$18, unblock_usb=$19, internet=$20
           WHERE id=$21`,
          [
            data.dept || '', data.name || '', data.assetId || '-', data.note || '',
            data.cpuVendor || '', data.cpuFamily || '', data.cpuModel || '',
            data.cpuGeneration || '', data.cpuSocket || '', data.cpu || '',
            ramGb, data.ram || '', data.disk || '', data.os || '',
            data.model || '', data.manufacturer || '', data.storage || '',
            data.totalMemory || '', data.unblockUsb || '', data.internet || '',
            idValue
          ]
        );
      });
      return res.json({ success: true, record: normalizeRecord({ ...data, id: idValue }) });
    } catch (e: any) {
      console.error('UPDATE master_list failed:', e.message);
      return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ: ' + e.message });
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const idx = records.findIndex((r: any) => r.id === idValue);
    if (idx === -1) return res.status(404).json({ success: false, message: 'ไม่พบอุปกรณ์ที่ต้องการแก้ไข' });
    records[idx] = normalizeRecord({ ...data, id: idValue });
    fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    return res.json({ success: true, record: records[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ: ' + err.message });
  }
});

app.post('/api/assets/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  const actor = getActorUsername(req);

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่ระบุรายการที่ต้องการลบ' });
  }

  const numericIds = ids.map((id: unknown) => parseInt(String(id))).filter((id: number) => !isNaN(id));

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_list SET del_flag = 1 WHERE id = ANY($1::int[])`,
          [numericIds]
        );
      });
      return res.json({ success: true, message: `ลบอุปกรณ์จำนวน ${numericIds.length} เครื่องเสร็จสิ้น` });
    } catch (e: any) {
      console.error('bulk-delete failed:', e.message);
    }
  }

  try {
    let records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    records = records.filter((r: any) => !numericIds.includes(r.id));
    fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    return res.json({ success: true, message: `ลบอุปกรณ์จำนวน ${numericIds.length} เครื่องเสร็จสิ้น (Sandbox)` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ: ' + err.message });
  }
});

app.post('/api/assets/import-batch', async (req, res) => {
  const { items } = req.body;
  const actor = getActorUsername(req);

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลอุปกรณ์' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      let added = 0;
      await withUserTransaction(actor, async (client) => {
        for (const item of items) {
          if (!item.name) continue;
          const dup = await client.query(
            `SELECT id FROM master_list WHERE LOWER(name) = LOWER($1) AND del_flag = 0`,
            [item.name]
          );
          if (dup.rows.length > 0) continue;

          const ramGb = item.ramGb !== null && item.ramGb !== undefined ? parseFloat(item.ramGb) : null;
          await client.query(
            `INSERT INTO master_list
             (dept, name, asset_id, note, cpu_vendor, cpu_family, cpu_model, cpu_generation,
              cpu_socket, cpu, ram_gb, ram, disk, os, model, manufacturer, storage,
              total_memory, unblock_usb, internet, del_flag)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,0)`,
            [
              item.dept || 'ทั่วไป', item.name, item.assetId || '-', item.note || '',
              item.cpuVendor || '', item.cpuFamily || '', item.cpuModel || '',
              item.cpuGeneration || '', item.cpuSocket || '', item.cpu || '',
              ramGb, item.ram || '', item.disk || '', item.os || '',
              item.model || '', item.manufacturer || '', item.storage || '',
              item.totalMemory || '', item.unblockUsb || '', item.internet || ''
            ]
          );
          added++;
        }
      });
      return res.json({
        success: true,
        message: `นำเข้าข้อมูล ${added}/${items.length} เครื่องเข้าสู่ PostgreSQL (กรองตัวซ้ำแล้ว)`
      });
    } catch (err: any) {
      console.error('import-batch failed:', err.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    let nextId = records.length ? Math.max(...records.map((r: any) => r.id)) + 1 : 1;
    let addedCount = 0;
    for (const item of items) {
      if (!item.name || records.some((r: any) => r.name.toLowerCase() === item.name.toLowerCase())) continue;
      records.unshift(normalizeRecord({ ...item, id: nextId++ }));
      addedCount++;
    }
    fs.writeFileSync(LOCAL_ASSETS_FILE, JSON.stringify(records, null, 2), 'utf-8');
    return res.json({ success: true, message: `นำเข้า ${addedCount}/${items.length} เครื่อง (Sandbox)` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'นำเข้าไม่สำเร็จ: ' + err.message });
  }
});

app.post('/api/assets/reset', (_req, res) => {
  try {
    if (fs.existsSync(SEED_DATA_FILE)) {
      fs.writeFileSync(LOCAL_ASSETS_FILE, fs.readFileSync(SEED_DATA_FILE, 'utf-8'), 'utf-8');
      return res.json({ success: true, message: 'รีเซ็ตข้อมูล sandbox เรียบร้อยแล้ว' });
    }
    return res.status(404).json({ success: false, message: 'ไม่พบไฟล์ seed data' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'รีเซ็ตล้มเหลว: ' + err.message });
  }
});

// ==========================================
// Master Data Options API Endpoints
// ==========================================

app.get('/api/master-options/storage', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT storage_name 
         FROM master_storage 
         WHERE is_active = 1 
         ORDER BY display_order, storage_name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.storage_name)
      });
    } catch (e: any) {
      console.error('storage options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.storage).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: ['SSD', 'HDD', 'SSD+HDD', 'Unknown'] });
  }
});

app.get('/api/master-options/generations', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT generation_name 
         FROM master_cpu_generation 
         WHERE is_active = 1 
         ORDER BY display_order, generation_name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.generation_name)
      });
    } catch (e: any) {
      console.error('generations options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.cpuGeneration).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: [] });
  }
});

app.get('/api/master-options/sockets', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT socket_name 
         FROM master_cpu_socket 
         WHERE is_active = 1 
         ORDER BY display_order, socket_name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.socket_name)
      });
    } catch (e: any) {
      console.error('sockets options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.cpuSocket).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: [] });
  }
});

app.get('/api/master-options/os', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT os_name 
         FROM master_os 
         WHERE is_active = 1 
         ORDER BY display_order, os_name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.os_name)
      });
    } catch (e: any) {
      console.error('os options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.os).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: [] });
  }
});

app.get('/api/master-options/cpu-vendor', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT name 
         FROM cpu_vendor 
         WHERE del_flag = 0 
         ORDER BY name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.name)
      });
    } catch (e: any) {
      console.error('cpu-vendor options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.cpuVendor).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: ['Intel', 'AMD', 'Unknown'] });
  }
});

app.get('/api/master-options/cpu-family', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT name 
         FROM cpu_family 
         WHERE del_flag = 0 
         ORDER BY name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.name)
      });
    } catch (e: any) {
      console.error('cpu-family options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.cpuFamily).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: [] });
  }
});

app.get('/api/master-options/cpu-model', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT name 
         FROM cpu_model 
         WHERE del_flag = 0 
         ORDER BY name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.name)
      });
    } catch (e: any) {
      console.error('cpu-model options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.cpuModel).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: [] });
  }
});

app.get('/api/master-options/unblock-usb', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT name 
         FROM usb_policy 
         WHERE del_flag = 0 
         ORDER BY name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.name)
      });
    } catch (e: any) {
      console.error('unblock-usb options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.unblockUsb).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: ['Yes', 'No', 'Unknown'] });
  }
});

app.get('/api/master-options/internet', async (_req, res) => {
  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT name 
         FROM internet_policy 
         WHERE del_flag = 0 
         ORDER BY name`
      );
      return res.json({
        success: true,
        options: result.rows.map(r => r.name)
      });
    } catch (e: any) {
      console.error('internet options query failed:', e.message);
    }
  }

  try {
    const records = JSON.parse(fs.readFileSync(LOCAL_ASSETS_FILE, 'utf-8'));
    const options = [...new Set(records.map((a: any) => a.internet).filter(Boolean))].sort();
    return res.json({ success: true, options });
  } catch {
    return res.json({ success: true, options: ['Yes', 'No', 'Unknown'] });
  }
});

// ==========================================
// Master Data CRUD API Endpoints (Admin Only)
// ==========================================

// Helper function to check if user is admin
function isAdmin(req: express.Request): boolean {
  const header = req.headers['x-current-user'];
  if (typeof header !== 'string') return false;
  // In a real app, you would check the role from the database
  // For now, we'll check if the username is 'admin'
  return header.toLowerCase() === 'admin';
}

// Storage CRUD
app.get('/api/master/storage', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, storage_name, description, display_order, is_active, created_at, updated_at
         FROM master_storage
         ORDER BY display_order, storage_name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('master_storage query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/storage', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { storage_name, description, display_order } = req.body;
  const actor = getActorUsername(req);

  if (!storage_name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อชนิดสตอเรจ' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO master_storage (storage_name, description, display_order, is_active)
           VALUES ($1, $2, $3, 1)
           RETURNING *`,
          [storage_name, description || '', display_order || 99]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT master_storage failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อชนิดสตอเรจนี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ' });
});

app.put('/api/master/storage/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const { storage_name, description, display_order, is_active } = req.body;
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_storage 
           SET storage_name = $1, description = $2, display_order = $3, is_active = $4
           WHERE id = $5`,
          [storage_name, description || '', display_order || 99, is_active !== undefined ? is_active : 1, id]
        );
      });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('UPDATE master_storage failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อชนิดสตอเรจนี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/storage/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_storage SET is_active = 0 WHERE id = $1`,
          [id]
        );
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE master_storage failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// CPU Generation CRUD
app.get('/api/master/cpu-generation', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, generation_name, description, display_order, is_active, created_at, updated_at
         FROM master_cpu_generation
         ORDER BY display_order, generation_name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('master_cpu_generation query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/cpu-generation', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { generation_name, description, display_order } = req.body;
  const actor = getActorUsername(req);

  if (!generation_name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ CPU Generation' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO master_cpu_generation (generation_name, description, display_order, is_active)
           VALUES ($1, $2, $3, 1)
           RETURNING *`,
          [generation_name, description || '', display_order || 99]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT master_cpu_generation failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Generation นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ' });
});

app.put('/api/master/cpu-generation/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const { generation_name, description, display_order, is_active } = req.body;
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_cpu_generation 
           SET generation_name = $1, description = $2, display_order = $3, is_active = $4
           WHERE id = $5`,
          [generation_name, description || '', display_order || 99, is_active !== undefined ? is_active : 1, id]
        );
      });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('UPDATE master_cpu_generation failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Generation นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/cpu-generation/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_cpu_generation SET is_active = 0 WHERE id = $1`,
          [id]
        );
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE master_cpu_generation failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// CPU Socket CRUD
app.get('/api/master/cpu-socket', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, socket_name, description, display_order, is_active, created_at, updated_at
         FROM master_cpu_socket
         ORDER BY display_order, socket_name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('master_cpu_socket query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/cpu-socket', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { socket_name, description, display_order } = req.body;
  const actor = getActorUsername(req);

  if (!socket_name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ CPU Socket' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO master_cpu_socket (socket_name, description, display_order, is_active)
           VALUES ($1, $2, $3, 1)
           RETURNING *`,
          [socket_name, description || '', display_order || 99]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT master_cpu_socket failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Socket นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ' });
});

app.put('/api/master/cpu-socket/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const { socket_name, description, display_order, is_active } = req.body;
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_cpu_socket 
           SET socket_name = $1, description = $2, display_order = $3, is_active = $4
           WHERE id = $5`,
          [socket_name, description || '', display_order || 99, is_active !== undefined ? is_active : 1, id]
        );
      });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('UPDATE master_cpu_socket failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Socket นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/cpu-socket/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_cpu_socket SET is_active = 0 WHERE id = $1`,
          [id]
        );
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE master_cpu_socket failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// OS CRUD
app.get('/api/master/os', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, os_name, os_version, description, display_order, is_active, created_at, updated_at
         FROM master_os
         ORDER BY display_order, os_name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('master_os query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/os', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { os_name, os_version, description, display_order } = req.body;
  const actor = getActorUsername(req);

  if (!os_name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อระบบปฏิบัติการ' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO master_os (os_name, os_version, description, display_order, is_active)
           VALUES ($1, $2, $3, $4, 1)
           RETURNING *`,
          [os_name, os_version || '', description || '', display_order || 99]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT master_os failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อระบบปฏิบัติการนี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ' });
});

app.put('/api/master/os/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const { os_name, os_version, description, display_order, is_active } = req.body;
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_os 
           SET os_name = $1, os_version = $2, description = $3, display_order = $4, is_active = $5
           WHERE id = $6`,
          [os_name, os_version || '', description || '', display_order || 99, is_active !== undefined ? is_active : 1, id]
        );
      });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('UPDATE master_os failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อระบบปฏิบัติการนี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/os/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(
          `UPDATE master_os SET is_active = 0 WHERE id = $1`,
          [id]
        );
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE master_os failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// CPU Vendor CRUD (using existing cpu_vendor table)
app.get('/api/master/cpu-vendor', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, name, del_flag FROM cpu_vendor ORDER BY name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('cpu_vendor query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/cpu-vendor', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { name } = req.body;
  const actor = getActorUsername(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ CPU Vendor' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM cpu_vendor`);
        const newId = (parseInt(maxIdResult.rows[0].max_id) + 1);
        
        const insertResult = await client.query(
          `INSERT INTO cpu_vendor (id, name, del_flag) VALUES ($1, $2, 0) RETURNING *`,
          [newId, name]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT cpu_vendor failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Vendor นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'เพิ่มข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/cpu-vendor/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(`UPDATE cpu_vendor SET del_flag = 1 WHERE id = $1`, [id]);
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE cpu_vendor failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// CPU Family CRUD (using existing cpu_family table)
app.get('/api/master/cpu-family', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, name, del_flag FROM cpu_family ORDER BY name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('cpu_family query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/cpu-family', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { name } = req.body;
  const actor = getActorUsername(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ CPU Family' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM cpu_family`);
        const newId = (parseInt(maxIdResult.rows[0].max_id) + 1);
        
        const insertResult = await client.query(
          `INSERT INTO cpu_family (id, name, del_flag) VALUES ($1, $2, 0) RETURNING *`,
          [newId, name]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT cpu_family failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Family นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'เพิ่มข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/cpu-family/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(`UPDATE cpu_family SET del_flag = 1 WHERE id = $1`, [id]);
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE cpu_family failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// CPU Model CRUD (using existing cpu_model table)
app.get('/api/master/cpu-model', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, name, del_flag FROM cpu_model ORDER BY name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('cpu_model query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/cpu-model', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { name } = req.body;
  const actor = getActorUsername(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ CPU Model' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM cpu_model`);
        const newId = (parseInt(maxIdResult.rows[0].max_id) + 1);
        
        const insertResult = await client.query(
          `INSERT INTO cpu_model (id, name, del_flag) VALUES ($1, $2, 0) RETURNING *`,
          [newId, name]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT cpu_model failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ CPU Model นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'เพิ่มข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/cpu-model/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(`UPDATE cpu_model SET del_flag = 1 WHERE id = $1`, [id]);
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE cpu_model failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// USB Policy CRUD (using existing usb_policy table)
app.get('/api/master/unblock-usb', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, name, del_flag FROM usb_policy ORDER BY name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('usb_policy query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/unblock-usb', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { name } = req.body;
  const actor = getActorUsername(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ Unblock USB' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM usb_policy`);
        const newId = (parseInt(maxIdResult.rows[0].max_id) + 1);
        
        const insertResult = await client.query(
          `INSERT INTO usb_policy (id, name, del_flag) VALUES ($1, $2, 0) RETURNING *`,
          [newId, name]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT usb_policy failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ Unblock USB นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'เพิ่มข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/unblock-usb/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(`UPDATE usb_policy SET del_flag = 1 WHERE id = $1`, [id]);
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE usb_policy failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// Internet Policy CRUD (using existing internet_policy table)
app.get('/api/master/internet', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await pcAssetPool.query(
        `SELECT id, name, del_flag FROM internet_policy ORDER BY name`
      );
      return res.json({
        success: true,
        records: result.rows
      });
    } catch (e: any) {
      console.error('internet_policy query failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลได้' });
});

app.post('/api/master/internet', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const { name } = req.body;
  const actor = getActorUsername(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ Internet' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      const result = await withUserTransaction(actor, async (client) => {
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM internet_policy`);
        const newId = (parseInt(maxIdResult.rows[0].max_id) + 1);
        
        const insertResult = await client.query(
          `INSERT INTO internet_policy (id, name, del_flag) VALUES ($1, $2, 0) RETURNING *`,
          [newId, name]
        );
        return insertResult.rows[0];
      });
      return res.json({ success: true, record: result });
    } catch (e: any) {
      console.error('INSERT internet_policy failed:', e.message);
      if (e.message.includes('unique')) {
        return res.status(400).json({ success: false, message: 'ชื่อ Internet นี้มีอยู่แล้ว' });
      }
    }
  }

  return res.status(500).json({ success: false, message: 'เพิ่มข้อมูลไม่สำเร็จ' });
});

app.delete('/api/master/internet/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง (Admin only)' });
  }

  const id = parseInt(req.params.id);
  const actor = getActorUsername(req);

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
  }

  if (isPgConnected && pcAssetPool) {
    try {
      await withUserTransaction(actor, async (client) => {
        await client.query(`UPDATE internet_policy SET del_flag = 1 WHERE id = $1`, [id]);
      });
      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (e: any) {
      console.error('DELETE internet_policy failed:', e.message);
    }
  }

  return res.status(500).json({ success: false, message: 'ลบข้อมูลไม่สำเร็จ' });
});

// ==========================================
// VITE / STATIC
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not running on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('==================================================');
      console.log(' IT MasterList Backend — PostgreSQL');
      console.log(` Serving: http://0.0.0.0:${PORT}`);
      console.log(` pc_asset:     ${isPgConnected ? 'OK' : 'FALLBACK'}`);
      console.log(` data_center:  ${isDataCenterConnected ? 'OK' : 'N/A'}`);
      console.log('==================================================');
    });
  }
}

// Export for Vercel
export default app;

// Start server locally
startServer();
