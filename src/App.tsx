import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ITAsset, FilterConfig, DBStatus, User, UserRole, Department } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import AssetListView from './components/AssetListView';
import AssetDetailDrawer from './components/AssetDetailDrawer';
import AssetFormModal from './components/AssetFormModal';
import AuditLogView from './components/AuditLogView';
import { apiFetch } from './utils/api';
import { 
  Building, LayoutDashboard, List, FileSpreadsheet, Plus, LogOut, 
  Search, RefreshCw, Download, Database, HardDrive, Wifi, ShieldAlert, Cpu, ScrollText
} from 'lucide-react';

const INITIAL_FILTER: FilterConfig = {
  searchQuery: '',
  dept: '',
  storage: '',
  generation: '',
  socket: '',
  ramGroup: '',
  os: '',
  unblockUsb: '',
  internet: '',
  noHardwareOnly: false
};

export default function App() {
  // Authentication Claims
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // States
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<ITAsset[]>([]);
  const [filter, setFilter] = useState<FilterConfig>(INITIAL_FILTER);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'audit'>('dashboard');
  const [masterDepartments, setMasterDepartments] = useState<Department[]>([]);
  
  // UI states
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error' | 'info'; msg: string }>>([]);
  const [searchVal, setSearchVal] = useState('');

  // Modals / Drawers triggers
  const [isOpenFormModal, setIsOpenFormModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<ITAsset | null>(null);
  const [isOpenDetailDrawer, setIsOpenDetailDrawer] = useState(false);

  // File Upload Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check login session on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('yanhee_user');
    const savedRole = sessionStorage.getItem('yanhee_role') as User['role'] | null;
    if (savedUser) {
      setCurrentUser({
        id: Number(sessionStorage.getItem('yanhee_user_id') || '1'),
        username: savedUser,
        role: savedRole || 'user'
      });
    }
    fetchDbStatus();
  }, []);

  // Fetch Database connectivity status from server Express API
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      const status = await res.json();
      setDbStatus(status);
    } catch (e) {
      setDbStatus({
        connected: false,
        host: '10.200.10.2',
        database: 'pc_asset',
        dataCenterConnected: false,
        dataCenterDatabase: 'data_center',
        error: 'Failed to request server status',
        fallbackActive: true
      });
    }
  };

  // Fetch Entire IT Assets from database / fallback
  useEffect(() => {
    if (currentUser) {
      fetchAssets();
      fetchDepartments();
    }
  }, [currentUser]);

  const fetchDepartments = async () => {
    try {
      const res = await apiFetch('/api/departments');
      const data = await res.json();
      if (res.ok && data.success) {
        setMasterDepartments(data.records);
      }
    } catch { /* ใช้จาก assets แทน */ }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      if (res.ok && data.success) {
        setAssets(data.records);
        setFilteredAssets(data.records);
        // Sync lists
        if (data.source && currentUser) {
          showToast('info', `ดึงข้อมูลสำเร็จจาก: ${data.source}`);
        }
      } else {
        showToast('error', data.message || 'ไม่สามารถโหลดข้อมูลอุปกรณ์คอมพิวเตอร์ได้');
      }
    } catch (e) {
      showToast('error', 'ไม่สามารถเชื่อมต่อ Express API Server ได้');
    }
  };

  // Auto trigger live state filtering on criteria updates
  useEffect(() => {
    let result = [...assets];

    // Global Search index match (name, dept, assetId, cpu, motherboard)
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter(a => {
        return (
          a.name.toLowerCase().includes(q) ||
          a.dept.toLowerCase().includes(q) ||
          a.assetId.toLowerCase().includes(q) ||
          a.cpu.toLowerCase().includes(q) ||
          a.cpuSocket.toLowerCase().includes(q) ||
          a.cpuGeneration.toLowerCase().includes(q) ||
          a.os.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q)
        );
      });
    }

    // Filter selectors
    if (filter.dept) {
      result = result.filter(a => a.dept === filter.dept);
    }
    if (filter.storage) {
      result = result.filter(a => a.storage === filter.storage);
    }
    if (filter.generation) {
      result = result.filter(a => a.cpuGeneration === filter.generation);
    }
    if (filter.socket) {
      result = result.filter(a => a.cpuSocket === filter.socket);
    }
    if (filter.os) {
      result = result.filter(a => a.os.toLowerCase().includes(filter.os.toLowerCase()));
    }
    if (filter.unblockUsb) {
      result = result.filter(a => a.unblockUsb && a.unblockUsb.toLowerCase().includes(filter.unblockUsb.toLowerCase()));
    }
    if (filter.internet) {
      result = result.filter(a => a.internet && a.internet.toLowerCase().includes(filter.internet.toLowerCase()));
    }

    // Hardware Complete GAP trigger
    if (filter.noHardwareOnly) {
      result = result.filter(a => !a.cpu || !a.os || a.ramGb === null);
    }

    // RAM Groups selection
    if (filter.ramGroup) {
      result = result.filter(a => {
        const gb = a.ramGb;
        if (filter.ramGroup === 'no-data') return gb === null || gb === 0;
        if (gb === null) return false;
        if (filter.ramGroup === 'lt4') return gb < 4;
        if (filter.ramGroup === '4-7') return gb >= 4 && gb < 8;
        if (filter.ramGroup === '8-15') return gb >= 8 && gb < 16;
        if (filter.ramGroup === '16-31') return gb >= 16 && gb < 32;
        if (filter.ramGroup === '32plus') return gb >= 32;
        return true;
      });
    }

    setFilteredAssets(result);
  }, [assets, filter]);

  const roleLabel: Record<UserRole, string> = {
    admin: 'ผู้ดูแลระบบ',
    it_staff: 'เจ้าหน้าที่ IT',
    user: 'ผู้ใช้ทั่วไป',
    viewer: 'ดูอย่างเดียว'
  };

  // Auth logins
  const handleLoginSuccess = (user: User) => {
    sessionStorage.setItem('yanhee_user', user.username);
    sessionStorage.setItem('yanhee_user_id', String(user.id));
    sessionStorage.setItem('yanhee_role', user.role);
    setCurrentUser(user);
    showToast('success', `ยินดีต้อนรับคุณ ${user.username} (${roleLabel[user.role]})`);
  };

  const handleLogOut = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    sessionStorage.removeItem('yanhee_user');
    sessionStorage.removeItem('yanhee_user_id');
    sessionStorage.removeItem('yanhee_role');
    setCurrentUser(null);
    setAssets([]);
    setFilteredAssets([]);
  };

  // Toast manager
  const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Reset to original inventory profiles
  const handleResetData = async () => {
    if (!window.confirm('รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าตั้งต้นจาก Excel? รายการอุปกรณ์ปัจจุบันจะถูกเขียนทับ')) return;

    try {
      const res = await fetch('/api/assets/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', data.message);
        fetchAssets();
      } else {
        showToast('error', data.message || 'รีเซ็ตข้อมูลเครื่องล้มเหลว');
      }
    } catch (e) {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Add / Edit submission handles
  const handleFormSubmit = async (payload: Partial<ITAsset>): Promise<boolean> => {
    try {
      const method = editingAsset ? 'PUT' : 'POST';
      const endpoint = editingAsset ? `/api/assets/${editingAsset.id}` : '/api/assets';
      
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('success', editingAsset ? 'บันทึกแก้ไขอุปกรณ์สำเร็จ' : 'เพิ่มอุปกรณ์คอมพิวเตอร์เข้าสู่ระบบสำเร็จ');
        fetchAssets();
        return true;
      } else {
        showToast('error', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        return false;
      }
    } catch (err) {
      showToast('error', 'ไม่สามารถเชื่อมต่อบันทึกข้อมูลอุปกรณ์ได้');
      return false;
    }
  };

  // Device Deletion
  const handleDelete = async (ids: number[]) => {
    const confirmMsg = ids.length === 1 
      ? 'คุณยืนยันที่จะลบอุปกรณ์เครื่องคอมพิวเตอร์รายการนี้หรือไม่?' 
      : `คุณยืนยันที่จะลบอุปกรณ์จำกัดความจุจำนวน ${ids.length} เครื่องหรือไม่?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiFetch('/api/assets/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('success', data.message || 'ลบข้อมูลสำเร็จ');
        setSelectedIds(new Set());
        fetchAssets();
      } else {
        showToast('error', data.message || 'ลบข้อมูลไม่สำเร็จ');
      }
    } catch (e) {
      showToast('error', 'ไม่สามารถเชื่อมต่อคำสั่งลบข้อมูลได้');
    }
  };

  // Excel (.xlsx) file bulk importing
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bbytes = evt.target?.result;
        const workbook = XLSX.read(bbytes, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        if (!rows || rows.length === 0) {
          showToast('error', 'ไม่พบข้อมูลแถวในเอกสาร Excel ที่นำเข้า');
          return;
        }

        if (!window.confirm(`นำเข้าข้อมูลคอมพิวเตอร์จำนวน ${rows.length} เครื่องและผสานตัวแทนในระบบตาราง? (เครื่องที่ซ้ำชื่อเดียวกันในคลังจะถูกละเว้น)`)) return;

        // Map column profiles
        const normalizeCell = (row: any, keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
              return String(row[key]).trim();
            }
          }
          return '';
        };

        const batchItems = rows.map((r) => {
          const ramGbStr = normalizeCell(r, ['RAM_GB', 'RAM (GB)', 'RAM', 'ram', 'Ram', 'ramGb']);
          const totalMemStr = normalizeCell(r, ['TotalMemory', 'Total Memory', 'totalMemory']);
          const ramGbNum = ramGbStr
            ? parseFloat(ramGbStr.replace(/[^\d.]/g, ''))
            : (totalMemStr && totalMemStr !== '.' ? parseFloat(totalMemStr.replace(/[^\d.]/g, '')) : null);

          const cpuName = normalizeCell(r, ['CPUName', 'CPU Name', 'cpu', 'CPU']);
          const cpuVendor = normalizeCell(r, ['CPU_Vendor', 'CPU Vendor', 'cpuVendor']);
          const cpuFamily = normalizeCell(r, ['CPU_Family', 'CPU Family', 'cpuFamily']);
          const cpuModel = normalizeCell(r, ['CPU_Model', 'CPU Model', 'cpuModel']);

          return {
            dept: normalizeCell(r, ['แผนก', 'Dept', 'Department', 'dept']),
            name: normalizeCell(r, ['ComputerName', 'Name', 'computername', 'ชื่อเครื่อง', 'name']),
            assetId: normalizeCell(r, ['รหัสทรัพย์สิน', 'AssetId', 'Asset ID', 'assetid', 'assetId']) || '-',
            note: normalizeCell(r, ['หมายเหตุ', 'Note', 'note']),
            cpu: cpuName || [cpuVendor, cpuFamily, cpuModel].filter(Boolean).join(' '),
            cpuVendor,
            cpuFamily,
            cpuModel,
            cpuGeneration: normalizeCell(r, ['CPU_Generation', 'CPU Generation', 'cpuGeneration']),
            cpuSocket: normalizeCell(r, ['CPU_Socket', 'CPU Socket', 'cpuSocket']),
            totalMemory: totalMemStr,
            ramGb: ramGbNum !== null && !isNaN(ramGbNum) ? ramGbNum : null,
            ram: ramGbNum !== null && !isNaN(ramGbNum) ? `${ramGbNum} GB` : '',
            storage: normalizeCell(r, ['StorageType', 'Storage Type', 'storage', 'ชนิดฮาร์ดไดรฟ์']),
            os: normalizeCell(r, ['Windows', 'OS', 'os', 'ระบบปฏิบัติการ']),
            model: normalizeCell(r, ['Model', 'model', 'รุ่นเครื่อง']),
            manufacturer: normalizeCell(r, ['Manufacturer', 'manufacturer', 'ผู้ผลิต']),
            disk: normalizeCell(r, ['DiskDrives', 'Disk Drives', 'disk']),
            unblockUsb: normalizeCell(r, ['unblock USB', 'unbock USB', 'Unblock USB', 'unblockUsb']),
            internet: normalizeCell(r, ['Internet', 'internet'])
          };
        }).filter(item => item.name && item.dept);

        const res = await apiFetch('/api/assets/import-batch', {
          method: 'POST',
          body: JSON.stringify({ items: batchItems })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          showToast('success', data.message);
          fetchAssets();
        } else {
          showToast('error', data.message || 'เกิดข้อผิดพลาดในการโหลดกระดานนำเข้า');
        }

      } catch (err: any) {
        showToast('error', 'ไม่สามารถบันทึกและจำแนกข้อมูลไฟล์ Excel ได้: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    // Refresh ref value clear
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // CSV exporting
  const handleCSVExport = () => {
    const csvContent = [];
    // Headers
    csvContent.push([
      'แผนก', 'ComputerName', 'รหัสทรัพย์สิน', 'หมายเหตุ', 'CPUName', 'TotalMemory',
      'DiskDrives', 'Windows', 'Model', 'Manufacturer', 'StorageType', 'RAM_GB',
      'CPU_Vendor', 'CPU_Family', 'CPU_Model', 'CPU_Generation', 'CPU_Socket',
      'unblock USB', 'Internet'
    ].map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    filteredAssets.forEach(d => {
      csvContent.push([
        d.dept, d.name, d.assetId, d.note, d.cpu, d.totalMemory,
        d.disk, d.os, d.model, d.manufacturer, d.storage,
        d.ramGb !== null ? String(d.ramGb) : '',
        d.cpuVendor, d.cpuFamily, d.cpuModel, d.cpuGeneration, d.cpuSocket,
        d.unblockUsb, d.internet
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    });

    const blob = new Blob(['\ufeff' + csvContent.join('\n')], { type: 'text/csv;charset=utf-8' });
    const uurl = URL.createObjectURL(blob);
    const linker = document.createElement('a');
    linker.href = uurl;
    linker.download = `it_masterlist_${Date.now()}.csv`;
    linker.click();
    URL.revokeObjectURL(uurl);
    showToast('success', 'ส่งออกข้อมูล CSV สำเร็จเรียบร้อย');
  };

  // Option lists derived dynamically
  const departmentsList = [
    ...new Set([
      ...masterDepartments.map(d => d.name),
      ...assets.map(a => a.dept).filter(Boolean)
    ])
  ].sort() as string[];
  const storageList = [...new Set(assets.map(a => a.storage).filter(Boolean))].sort() as string[];
  const generationList = [...new Set(assets.map(a => a.cpuGeneration).filter(Boolean))].sort() as string[];
  const socketList = [...new Set(assets.map(a => a.cpuSocket).filter(Boolean))].sort() as string[];
  const osList = [...new Set(assets.map(a => a.os).filter(Boolean))].sort() as string[];

  // Fetch master options from database
  const fetchMasterOptions = async () => {
    try {
      const [storageRes, genRes, socketRes, osRes, vendorRes, familyRes, modelRes, usbRes, internetRes] = await Promise.all([
        fetch('/api/master-options/storage'),
        fetch('/api/master-options/generations'),
        fetch('/api/master-options/sockets'),
        fetch('/api/master-options/os'),
        fetch('/api/master-options/cpu-vendor'),
        fetch('/api/master-options/cpu-family'),
        fetch('/api/master-options/cpu-model'),
        fetch('/api/master-options/unblock-usb'),
        fetch('/api/master-options/internet')
      ]);

      const storageData = await storageRes.json();
      const genData = await genRes.json();
      const socketData = await socketRes.json();
      const osData = await osRes.json();
      const vendorData = await vendorRes.json();
      const familyData = await familyRes.json();
      const modelData = await modelRes.json();
      const usbData = await usbRes.json();
      const internetData = await internetRes.json();

      return {
        storage: storageData.success ? storageData.options : ['SSD', 'HDD', 'SSD+HDD', 'Unknown'],
        generations: genData.success ? genData.options : [],
        sockets: socketData.success ? socketData.options : [],
        os: osData.success ? osData.options : [],
        cpuVendor: vendorData.success ? vendorData.options : ['Intel', 'AMD', 'Unknown'],
        cpuFamily: familyData.success ? familyData.options : [],
        cpuModel: modelData.success ? modelData.options : [],
        unblockUsb: usbData.success ? usbData.options : ['Yes', 'No', 'Unknown'],
        internet: internetData.success ? internetData.options : ['Yes', 'No', 'Unknown']
      };
    } catch (e) {
      console.error('Failed to fetch master options:', e);
      return {
        storage: ['SSD', 'HDD', 'SSD+HDD', 'Unknown'],
        generations: [],
        sockets: [],
        os: [],
        cpuVendor: ['Intel', 'AMD', 'Unknown'],
        cpuFamily: [],
        cpuModel: [],
        unblockUsb: ['Yes', 'No', 'Unknown'],
        internet: ['Yes', 'No', 'Unknown']
      };
    }
  };

  const handleFilterChange = (update: Partial<FilterConfig>) => {
    setFilter(prev => ({ ...prev, ...update }));
  };

  // Sidebar controls
  const handleQuickFilter = (type: 'os' | 'storage' | 'generation' | 'unblockUsb' | 'internet', value: string) => {
    setActiveTab('assets');
    setFilter(prev => {
      return {
        ...prev,
        os: type === 'os' ? value : '',
        storage: type === 'storage' ? value : '',
        generation: type === 'generation' ? value : '',
        unblockUsb: type === 'unblockUsb' ? value : '',
        internet: type === 'internet' ? value : ''
      };
    });
    setCurrentPage(1);
  };

  const handleShowNoHardware = () => {
    setActiveTab('assets');
    setFilter(prev => ({ ...prev, noHardwareOnly: true }));
    setCurrentPage(1);
  };

  // Toggle checks
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const paginatedOnPage = filteredAssets.slice(
      (currentPage - 1) * 20,
      currentPage * 20
    );
    const paginatedIds = paginatedOnPage.map(item => item.id);
    const allSelectedOnPage = paginatedIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        paginatedIds.forEach(id => next.delete(id));
      } else {
        paginatedIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter(prev => ({ ...prev, searchQuery: searchVal }));
    setCurrentPage(1);
  };

  const handleLiveSearchInput = (val: string) => {
    setSearchVal(val);
    setFilter(prev => ({ ...prev, searchQuery: val }));
    setCurrentPage(1);
  };

  // Actions opening dialog triggers
  const handleOpenEdit = (id: number) => {
    const target = assets.find(x => x.id === id);
    if (target) {
      setEditingAsset(target);
      setIsOpenFormModal(true);
    }
  };

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setIsOpenFormModal(true);
  };

  const handleOpenDetail = (id: number) => {
    const target = assets.find(x => x.id === id);
    if (target) {
      setSelectedDetailAsset(target);
      setIsOpenDetailDrawer(true);
    }
  };

  const canViewAudit = currentUser?.role === 'admin' || currentUser?.role === 'it_staff';
  const canEdit = currentUser?.role !== 'viewer';
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} dbStatus={dbStatus} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:grid md:grid-cols-[250px_1fr] md:grid-rows-[64px_1fr] font-sans text-slate-800">
      
      {/* Top Header Navbar */}
      <header className="col-span-2 bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-40 shadow-xs text-slate-800">
        
        {/* Brand System Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded text-white">
            <Building size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight font-sans flex items-center gap-2">
              <span>IT MasterList PC Asset</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${dbStatus?.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                {dbStatus?.connected ? 'CONNECTED' : 'SANDBOX FALLBACK'}
              </span>
            </h1>
            <p className="text-[10px] text-slate-550 font-mono">Yanhee IT Management System</p>
          </div>
        </div>

        {/* Search Field */}
        <form onSubmit={handleGlobalSearch} className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded px-3 py-1.5 w-full max-w-md focus-within:border-blue-500 transition shadow-xs">
          <Search size={14} className="text-slate-400 mr-2" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => handleLiveSearchInput(e.target.value)}
            placeholder="ค้นหาชื่อเครื่อง, แผนก, รหัสทรัพย์สิน, CPU, รุ่น, Socket..."
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
          />
        </form>

        {/* Account panel */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">ผู้ใช้งานปัจจุบัน</span>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold text-slate-800 font-mono">{currentUser.username}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                currentUser.role === 'admin' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                currentUser.role === 'it_staff' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                currentUser.role === 'viewer' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {roleLabel[currentUser.role]}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogOut}
            className="flex items-center justify-center p-2 rounded text-slate-650 hover:text-slate-900 bg-slate-100 hover:bg-slate-150 border border-slate-200 transition"
            title="ออกจากระบบ"
          >
            <LogOut size={16} />
          </button>
        </div>

      </header>

      {/* Persistent Left Sidebar Navigation */}
      <aside className="bg-slate-900 border-r border-slate-800 p-5 space-y-6 flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] hidden md:block overflow-y-auto text-slate-350">
        
        {/* Core Navigation Views */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-2.5">ระบบ</span>
          
          <button
            onClick={() => { setActiveTab('dashboard'); setCurrentPage(1); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-semibold transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={14} />
            <span>ภาพรวมแดชบอร์ด</span>
          </button>

          <button
            onClick={() => { setActiveTab('assets'); setCurrentPage(1); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-semibold transition ${activeTab === 'assets' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <div className="flex items-center gap-2.5">
              <List size={14} />
              <span>รายการเครื่อง PC</span>
            </div>
            <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold ${activeTab === 'assets' ? 'bg-blue-700 text-blue-105' : 'bg-slate-800 text-slate-400'}`}>
              {assets.length}
            </span>
          </button>

          {canViewAudit && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-semibold transition ${activeTab === 'audit' ? 'bg-violet-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <ScrollText size={14} />
              <span>Audit Log</span>
            </button>
          )}
        </div>

        {/* Sub-Quick categories */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-2.5">Windows</span>
          <button
            onClick={() => handleQuickFilter('os', 'Windows 11')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>Windows 11</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.os.includes('Windows 11')).length}
            </span>
          </button>
          <button
            onClick={() => handleQuickFilter('os', 'Windows 10')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>Windows 10</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.os.includes('Windows 10')).length}
            </span>
          </button>
          <button
            onClick={() => handleQuickFilter('os', 'Windows 7')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition text-rose-400 hover:text-rose-350 font-medium"
          >
            <span className="flex items-center gap-1">Windows 7 (EOL)</span>
            <span className="text-[10px] font-mono font-bold text-rose-500">
              {assets.filter(a => a.os.includes('Windows 7')).length}
            </span>
          </button>
        </div>

        {/* Storages summary */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-2.5">Storage ชนิดไดรฟ์</span>
          <button
            onClick={() => handleQuickFilter('storage', 'SSD')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>SSD Only</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.storage === 'SSD').length}
            </span>
          </button>
          <button
            onClick={() => handleQuickFilter('storage', 'HDD')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>HDD Only</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.storage === 'HDD').length}
            </span>
          </button>
          <button
            onClick={() => handleQuickFilter('storage', 'SSD+HDD')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition text-blue-400"
          >
            <span>SSD + HDD Combo</span>
            <span className="text-[10px] font-mono font-bold text-blue-500">
              {assets.filter(a => a.storage === 'SSD+HDD').length}
            </span>
          </button>
        </div>

        {/* CPU Gen categories */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-2.5">CPU Generation</span>
          {generationList.slice(0, 5).map(g => (
            <button
              key={g}
              onClick={() => handleQuickFilter('generation', g)}
              className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
            >
              <span>{g}</span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {assets.filter(a => a.cpuGeneration === g).length}
              </span>
            </button>
          ))}
        </div>

        {/* USB & Internet Status */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2 px-2.5">สถานะเครือข่าย</span>
          <button
            onClick={() => handleQuickFilter('unblockUsb', 'unblock')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>USB Unblock</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.unblockUsb && a.unblockUsb.toLowerCase().includes('unblock')).length}
            </span>
          </button>
          <button
            onClick={() => handleQuickFilter('internet', 'internet')}
            className="w-full flex justify-between items-center text-xs text-slate-400 hover:text-white px-3 py-1.5 hover:bg-slate-800/50 rounded transition"
          >
            <span>Internet</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {assets.filter(a => a.internet && a.internet.toLowerCase().includes('internet')).length}
            </span>
          </button>
        </div>

      </aside>

      {/* Main Container workspace */}
      <main className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto bg-slate-50 min-h-[calc(100vh-64px)] text-slate-800">
        
        {/* Dynamic header row actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-850 flex items-center gap-2">
              <span>
                {activeTab === 'dashboard' ? 'ภาพรวม IT Assets Dashboard' :
                 activeTab === 'audit' ? 'Audit Log — บันทึกการใช้งาน' :
                 'ระเบียนเครื่องคอมพิวเตอร์'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">คลังระเบียนข้อมูล Hardware, OS, RAM และ Storage กลางฝ่ายเทคโนโลยีสารสนเทศ</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
            <>

            {/* Excel Import button trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelImport}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 font-semibold px-3.5 py-2.5 rounded transition flex items-center gap-1.5 shadow-xs hover:text-slate-900 cursor-pointer active:scale-97"
              title="นำเข้าไฟล์ Excel ในหมวดคอมพิวเตอร์"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>นำเข้าคลัง Excel</span>
            </button>

            {/* CSV export */}
            <button
              onClick={handleCSVExport}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 font-semibold px-3.5 py-2.5 rounded transition flex items-center gap-1.5 shadow-xs hover:text-slate-900 cursor-pointer active:scale-97"
            >
              <Download size={13} className="text-blue-600" />
              <span>ส่งออก CSV</span>
            </button>

            {/* Add Record trigger button */}
            <button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold px-4 py-2.5 rounded transition flex items-center gap-1.5 shadow-xs active:scale-97 cursor-pointer"
            >
              <Plus size={14} />
              <span>เพิ่มเครื่อง PC</span>
            </button>
            </>
            )}
          </div>
        </div>

        {/* Work Table or Dashboard */}
        {activeTab === 'dashboard' ? (
          <DashboardView
            assets={assets}
            onShowNoHardware={handleShowNoHardware}
            onQuickFilter={handleQuickFilter}
          />
        ) : activeTab === 'audit' ? (
          <AuditLogView onToast={showToast} />
        ) : (
          <AssetListView
            assets={assets}
            filteredAssets={filteredAssets}
            filter={filter}
            onFilterChange={handleFilterChange}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onShowDetail={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            departments={departmentsList}
            storages={storageList}
            generations={generationList}
            sockets={socketList}
          />
        )}

      </main>

      {/* Floating alert notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded border-l-[4px] text-xs font-semibold shadow-lg text-slate-800 animate-fade-in ${
              t.type === 'success' ? 'bg-white border-emerald-500 text-emerald-700' :
              t.type === 'error' ? 'bg-white border-rose-500 text-rose-700' :
              'bg-white border-blue-500 text-blue-700'
            }`}
          >
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Modal and Drawer Controllers */}
      <AssetDetailDrawer
        asset={selectedDetailAsset}
        isOpen={isOpenDetailDrawer}
        onClose={() => setIsOpenDetailDrawer(false)}
        onEdit={(id) => {
          const asset = assets.find(a => a.id === id);
          if (asset) {
            setEditingAsset(asset);
            setIsOpenFormModal(true);
            setIsOpenDetailDrawer(false);
          }
        }}
      />

      <AssetFormModal
        isOpen={isOpenFormModal}
        onClose={() => setIsOpenFormModal(false)}
        onSubmit={handleFormSubmit}
        editingAsset={editingAsset}
        departments={departmentsList}
        onFetchMasterOptions={fetchMasterOptions}
        onFetchAssets={fetchAssets}
        currentUserRole={currentUser?.role}
      />

    </div>
  );
}
