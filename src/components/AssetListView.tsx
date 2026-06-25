import React from 'react';
import { ITAsset, FilterConfig } from '../types';
import { LayoutGrid, Table, Edit3, Trash2, ShieldAlert, Monitor, HelpCircle, MemoryStick, RotateCcw } from 'lucide-react';

interface AssetListViewProps {
  assets: ITAsset[];
  filteredAssets: ITAsset[];
  filter: FilterConfig;
  onFilterChange: (update: Partial<FilterConfig>) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  displayMode: 'table' | 'cards';
  onDisplayModeChange: (mode: 'table' | 'cards') => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onShowDetail: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (ids: number[]) => void;

  // Option lists
  departments: string[];
  storages: string[];
  generations: string[];
  sockets: string[];
}

const ITEMS_PER_PAGE = 20;

export default function AssetListView({
  assets,
  filteredAssets,
  filter,
  onFilterChange,
  currentPage,
  onPageChange,
  displayMode,
  onDisplayModeChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onShowDetail,
  onEdit,
  onDelete,
  departments,
  storages,
  generations,
  sockets
}: AssetListViewProps) {
  
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = totalItems ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  // Paginated devices
  const paginatedData = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageGo = (target: number) => {
    if (target >= 1 && target <= totalPages) {
      onPageChange(target);
    }
  };

  const getPagesRange = () => {
    const range = [];
    const maxVisibleDirs = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisibleDirs - 1);
    
    if (end - start + 1 < maxVisibleDirs) {
      start = Math.max(1, end - maxVisibleDirs + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  const isAllSelectedOnPage = () => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every(item => selectedIds.has(item.id));
  };

  const handleOSFilterClick = (osVal: string) => {
    onFilterChange({ os: osVal });
    onPageChange(1);
  };

  // Badge rendering matching original design
  const getOSBadge = (os: string) => {
    const text = os.trim();
    if (!text) return <span className="bg-slate-100 text-slate-400 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-sans">ไม่มี OS</span>;
    if (text.includes('Windows 11')) return <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold">Win 11</span>;
    if (text.includes('Windows 10')) return <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold">Win 10</span>;
    if (text.includes('Windows 7') || text.includes('XP') || text.includes('Windows xp')) {
      return <span className="bg-rose-50 border border-rose-150 text-rose-700 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">Win 7/XP (EOL)</span>;
    }
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono">{text.replace('Microsoft ', '')}</span>;
  };

  const getStorageBadge = (storage: string) => {
    const text = storage.trim();
    if (!text) return <span className="bg-slate-50 text-slate-450 border border-slate-150 px-2 py-0.5 rounded text-[11px]">Unknown</span>;
    if (text === 'SSD') return <span className="bg-emerald-50 border border-emerald-150 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-extrabold">SSD</span>;
    if (text === 'HDD') return <span className="bg-amber-50 border border-amber-150 text-amber-700 px-2 py-0.5 rounded text-[11px] font-extrabold">HDD</span>;
    if (text === 'SSD+HDD') return <span className="bg-blue-50 border border-blue-150 text-blue-750 px-2 py-0.5 rounded text-[11px] font-extrabold">SSD+HDD</span>;
    return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px]">{text}</span>;
  };

  return (
    <div className="space-y-4">
      
      {/* Search Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm text-slate-800">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>รายการอุปกรณ์คอมพิวเตอร์</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md font-mono font-medium normal-case">
            พบ {totalItems} เครื่อง
          </span>
        </h3>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Quick OS Select Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-250">
            <button
              onClick={() => handleOSFilterClick('')}
              className={`text-xs px-3 py-1 rounded-lg transition font-semibold ${!filter.os ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-805'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => handleOSFilterClick('Windows 11')}
              className={`text-xs px-3 py-1 rounded-lg transition font-semibold ${filter.os === 'Windows 11' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-805'}`}
            >
              Win 11
            </button>
            <button
              onClick={() => handleOSFilterClick('Windows 10')}
              className={`text-xs px-3 py-1 rounded-lg transition font-semibold ${filter.os === 'Windows 10' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-805'}`}
            >
              Win 10
            </button>
            <button
              onClick={() => handleOSFilterClick('Windows 7')}
              className={`text-xs px-3 py-1 rounded-lg transition font-semibold ${filter.os === 'Windows 7' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-805'}`}
            >
              Win 7
            </button>
          </div>

          {/* List/Grid View Mode Switcher */}
          <div className="flex bg-slate-100 border border-slate-250 rounded-lg overflow-hidden p-0.5">
            <button
              onClick={() => onDisplayModeChange('table')}
              className={`p-1.5 px-2.5 rounded-lg ${displayMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="ตาราง Spreadsheet"
            >
              <Table size={16} />
            </button>
            <button
              onClick={() => onDisplayModeChange('cards')}
              className={`p-1.5 px-2.5 rounded-lg ${displayMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
              title="การ์ด Bento"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Dropdown filter Bar */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-100/60 p-3.5 border border-slate-200 rounded-lg">
          {/* Dept Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">เลือกแผนก</span>
            <input
              type="text"
              value={filter.dept}
              onChange={(e) => { onFilterChange({ dept: e.target.value }); onPageChange(1); }}
              placeholder="ค้นหาหรือเลือกแผนก"
              list="filter-dept-list"
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            />
            <datalist id="filter-dept-list">
              <option value="">ทุกแผนก</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </datalist>
          </div>

          {/* Storage Type */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">เลือกชนิด Storage</span>
            <input
              type="text"
              value={filter.storage}
              onChange={(e) => { onFilterChange({ storage: e.target.value }); onPageChange(1); }}
              placeholder="ค้นหาหรือเลือก Storage"
              list="filter-storage-list"
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            />
            <datalist id="filter-storage-list">
              <option value="">Storage ทั้งหมด</option>
              {storages.map(s => <option key={s} value={s}>{s}</option>)}
            </datalist>
          </div>

          {/* CPU Gen */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">เลือก CPU Generation</span>
            <input
              type="text"
              value={filter.generation}
              onChange={(e) => { onFilterChange({ generation: e.target.value }); onPageChange(1); }}
              placeholder="ค้นหาหรือเลือก CPU Gen"
              list="filter-generation-list"
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            />
            <datalist id="filter-generation-list">
              <option value="">CPU Gen ทั้งหมด</option>
              {generations.map(g => <option key={g} value={g}>{g}</option>)}
            </datalist>
          </div>

          {/* CPU Socket */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">เลือก Socket</span>
            <input
              type="text"
              value={filter.socket}
              onChange={(e) => { onFilterChange({ socket: e.target.value }); onPageChange(1); }}
              placeholder="ค้นหาหรือเลือก Socket"
              list="filter-socket-list"
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            />
            <datalist id="filter-socket-list">
              <option value="">Socket ทั้งหมด</option>
              {sockets.map(s => <option key={s} value={s}>{s}</option>)}
            </datalist>
          </div>

          {/* RAM Size */}
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">เลือกขนาดความจำ RAM</span>
            <select
              value={filter.ramGroup}
              onChange={(e) => { onFilterChange({ ramGroup: e.target.value }); onPageChange(1); }}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">RAM ทั้งหมด</option>
              <option value="lt4">น้อยกว่า 4 GB</option>
              <option value="4-7">4-7 GB</option>
              <option value="8-15">8-15 GB</option>
              <option value="16-31">16-31 GB</option>
              <option value="32plus">32 GB ขึ้นไป</option>
              <option value="no-data">ไม่มีข้อมูล RAM</option>
            </select>
          </div>
        </div>

        {/* Additional Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100/60 p-3.5 border border-slate-200 rounded-lg">
          {/* Unblock USB */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">สถานะ USB</span>
            <select
              value={filter.unblockUsb}
              onChange={(e) => { onFilterChange({ unblockUsb: e.target.value }); onPageChange(1); }}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">USB ทั้งหมด</option>
              <option value="unblock">Unblock</option>
              <option value="block">Block</option>
            </select>
          </div>

          {/* Internet */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">สถานะ Internet</span>
            <select
              value={filter.internet}
              onChange={(e) => { onFilterChange({ internet: e.target.value }); onPageChange(1); }}
              className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Internet ทั้งหมด</option>
              <option value="internet">Internet</option>
              <option value="no-internet">No Internet</option>
            </select>
          </div>
        </div>

        {/* Reset Filter Button - Only show when filters are active */}
        {(filter.dept || filter.storage || filter.generation || filter.socket || filter.ramGroup || filter.os || filter.unblockUsb || filter.internet || filter.noHardwareOnly) && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                onFilterChange({
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
                });
                onPageChange(1);
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-slate-50 transition flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>รีเซ็ตตัวกรอง</span>
            </button>
          </div>
        )}
      </div>

      {filter.noHardwareOnly && (
        <div className="bg-amber-50 border border-amber-250 text-amber-800 rounded-lg p-3 text-xs flex justify-between items-center px-4">
          <span>🔍 กำลังกรอง: "แสดงเฉพาะรายการที่ข้อมูลฮาร์ดแวร์ / OS ไม่ครบถ้วนเท่านั้น"</span>
          <button 
            type="button" 
            onClick={() => onFilterChange({ noHardwareOnly: false })}
            className="text-[11px] bg-white border border-amber-300 text-amber-700 font-extrabold px-2 py-1 rounded shadow-xs hover:bg-amber-100/50 transition"
          >
            ยกเลิกตัวกรองนี้
          </button>
        </div>
      )}

      {/* Bulk Delete Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-rose-50 border border-rose-150 p-3 px-5 rounded-lg flex items-center justify-between animate-fade-in">
          <span className="text-xs text-rose-700 font-semibold">
            เลือกเครื่องคอมพิวเตอร์อยู่ <strong>{selectedIds.size}</strong> เครื่อง
          </span>
          <button
            type="button"
            onClick={() => onDelete([...selectedIds])}
            className="bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 size={13} />
            <span>ลบรายการที่เลือกทั้งหมด ({selectedIds.size})</span>
          </button>
        </div>
      )}

      {/* Main Lists Rendering */}
      {displayMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3.5 px-4 text-left w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelectedOnPage()}
                      onChange={onToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 bg-white focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">ComputerName</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">แผนก</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">รหัสทรัพย์สิน</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">CPU</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider w-20">Gen</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">Socket</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-left uppercase tracking-wider">RAM</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider w-20">Storage</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider">Windows</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider w-16">Net</th>
                  <th className="p-3.5 text-xs font-bold text-slate-600 text-center uppercase tracking-wider w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-400">
                      ไม่พบเครื่องคอมพิวเตอร์ที่ค้นหาตามเงื่อนไขดังกล่าว
                    </td>
                  </tr>
                ) : (
                  paginatedData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition group">
                      <td className="p-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => onToggleSelect(item.id)}
                          className="rounded border-slate-300 text-blue-600 bg-white focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td 
                        className="p-3 text-xs font-semibold text-blue-600 font-mono cursor-pointer hover:underline"
                        onClick={() => onShowDetail(item.id)}
                      >
                        {item.name || '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-700 max-w-[150px] truncate" title={item.dept}>
                        {item.dept || '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {item.assetId && item.assetId !== '-' ? item.assetId : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-xs text-slate-650 max-w-[180px] truncate" title={item.cpu}>
                        {item.cpu || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-xs text-center font-mono">
                        {item.cpuGeneration ? (
                          <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-bold text-[10px]">
                            {item.cpuGeneration}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-mono">{item.cpuSocket || '—'}</td>
                      <td className="p-3 text-xs font-semibold font-mono text-slate-700">
                        {item.ramGb !== null ? `${item.ramGb} GB` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-xs text-center">{getStorageBadge(item.storage)}</td>
                      <td className="p-3 text-xs text-center">{getOSBadge(item.os)}</td>
                      <td className="p-3 text-xs text-center">
                        {item.internet ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">ON</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(item.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-blue-600 p-1.5 rounded-lg border border-slate-200 transition"
                            title="แก้ไขเครื่อง"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => onDelete([item.id])}
                            className="bg-slate-100 hover:bg-rose-50 text-rose-650 p-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition"
                            title="ลบเครื่อง"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Page Navigation Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              กำลังแสดง <strong>{startIndex} - {endIndex}</strong> จากทั้งหมด <strong>{totalItems}</strong> รายการเครื่องคอมพิวเตอร์
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageGo(1)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 disabled:opacity-30 disabled:pointer-events-none text-xs rounded-lg transition font-semibold"
                >
                  หน้าแรก
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageGo(currentPage - 1)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 disabled:opacity-30 disabled:pointer-events-none text-xs rounded-lg transition font-semibold"
                >
                  ก่อนหน้า
                </button>
                
                {getPagesRange().map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageGo(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${p === currentPage ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-805'}`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageGo(currentPage + 1)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 disabled:opacity-30 disabled:pointer-events-none text-xs rounded-lg transition font-semibold"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Cards Mode Rendering */
        <div className="space-y-6">
          {paginatedData.length === 0 ? (
            <div className="bg-white border border-slate-200 p-10 rounded-lg text-center text-slate-400">
              ไม่พบเครื่องคอมพิวเตอร์ที่ค้นหาตามเงื่อนไขดังกล่าว
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedData.map(item => (
                <div 
                  key={item.id}
                  onClick={() => onShowDetail(item.id)}
                  className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-5 cursor-pointer transition relative group flex flex-col justify-between h-[185px] shadow-sm"
                >
                  {/* Floating Actions */}
                  <div className="absolute top-3 right-3 flex gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(item.id)}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold shadow-xs transition"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => onDelete([item.id])}
                      className="bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold shadow-xs transition hover:border-rose-200"
                    >
                      ลบ
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="font-bold text-sm tracking-wide text-slate-800 font-mono group-hover:text-blue-650 transition-colors">{item.name || '—'}</span>
                      {selectedIds.has(item.id) && <span className="text-[9px] bg-blue-600 text-white rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">Selected</span>}
                    </div>
                    <span className="text-xs text-slate-600 font-semibold block truncate max-w-[200px]" title={item.dept}>
                      🏢 {item.dept || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      # {item.assetId && item.assetId !== '-' ? item.assetId : 'No Asset ID'}
                    </span>
                  </div>

                  {/* Foot Spec Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 mt-1.5">
                    {getOSBadge(item.os)}
                    {getStorageBadge(item.storage)}
                    <span className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono text-slate-500 uppercase">
                      {item.ramGb !== null ? `${item.ramGb}G` : '?RAM'}
                    </span>
                    {item.cpuGeneration && (
                      <span className="bg-purple-50 text-purple-700 border border-purple-150 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                        {item.cpuGeneration}
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Card View Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
            <span className="text-xs text-slate-505">
              แสดง {startIndex} - {endIndex} เครื่อง จากทั้งหมด {totalItems} เครื่อง
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageGo(currentPage - 1)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 text-xs text-slate-705 rounded-lg transition font-semibold"
                >
                  ก่อนหน้า
                </button>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageGo(currentPage + 1)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 text-xs text-slate-750 rounded-lg transition font-semibold"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
