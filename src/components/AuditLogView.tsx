import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types';
import { apiFetch } from '../utils/api';
import { ScrollText, RefreshCw, Filter } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-100',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-100',
  LOGIN: 'bg-violet-50 text-violet-700 border-violet-100',
  LOGIN_FAILED: 'bg-amber-50 text-amber-700 border-amber-100',
  LOGOUT: 'bg-slate-100 text-slate-600 border-slate-200'
};

interface AuditLogViewProps {
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export default function AuditLogView({ onToast }: AuditLogViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const limit = 30;

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(limit),
        ...(tableFilter ? { table: tableFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {})
      });
      const res = await apiFetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.records);
        setTotal(data.total);
        setPage(p);
      } else {
        onToast('error', data.message || 'โหลด audit log ไม่สำเร็จ');
      }
    } catch {
      onToast('error', 'เชื่อมต่อ API audit log ไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [tableFilter, actionFilter]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Audit Log</h2>
            <p className="text-[10px] text-slate-500">บันทึกการเปลี่ยนแปลงข้อมูลและการเข้าสู่ระบบทั้งหมด</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          รีเฟรช
        </button>
      </div>

      <div className="flex flex-wrap gap-3 p-3 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
          <Filter size={12} />
          กรอง
        </div>
        <select
          value={tableFilter}
          onChange={e => setTableFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700"
        >
          <option value="">ทุกตาราง</option>
          <option value="master_list">master_list</option>
          <option value="authentication">authentication</option>
        </select>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700"
        >
          <option value="">ทุก action</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>
        <span className="text-[10px] text-slate-400 self-center ml-auto">
          ทั้งหมด {total.toLocaleString()} รายการ
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-bold">เวลา</th>
                <th className="px-3 py-2.5 font-bold">Action</th>
                <th className="px-3 py-2.5 font-bold">ตาราง</th>
                <th className="px-3 py-2.5 font-bold">Record</th>
                <th className="px-3 py-2.5 font-bold">ผู้ทำ</th>
                <th className="px-3 py-2.5 font-bold">IP</th>
                <th className="px-3 py-2.5 font-bold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">กำลังโหลด...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">ไม่พบ audit log</td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_COLORS[log.action] || 'bg-slate-50 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">{log.tableName}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{log.recordId || '-'}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{log.changedBy || '-'}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{log.ipAddress || '-'}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <details className="cursor-pointer">
                      <summary className="text-[10px] text-blue-600 hover:text-blue-500">ดู JSON</summary>
                      <pre className="mt-1 text-[9px] bg-slate-900 text-slate-300 p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify({ old: log.oldData, new: log.newData }, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchLogs(page - 1)}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
            >
              ก่อนหน้า
            </button>
            <span className="text-[10px] text-slate-500 font-mono">หน้า {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => fetchLogs(page + 1)}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
