import React from 'react';
import { ITAsset } from '../types';
import { X, Cpu, HardDrive, Monitor, Layers, Compass, Tag, FileText, Blocks, Building, Edit3 } from 'lucide-react';

interface AssetDetailDrawerProps {
  asset: ITAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

export default function AssetDetailDrawer({ asset, isOpen, onClose, onEdit }: AssetDetailDrawerProps) {
  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl z-10 animate-slide-in text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <span className="text-[9px] bg-blue-50 border border-blue-150 text-blue-600 font-bold px-2 py-0.5 rounded uppercase tracking-wider block w-max mb-1">
              Device Inspector
            </span>
            <h2 className="text-lg font-bold text-slate-800 font-mono">{asset.name || 'ไม่มีชื่อเครื่อง'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(asset.id)}
                className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded transition cursor-pointer"
                title="แก้ไขข้อมูล"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-750 bg-slate-50 hover:bg-slate-100 p-2 rounded transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow p-6 overflow-y-auto space-y-6">
          
          {/* Hardware completeness labels */}
          <div className="flex gap-2 flex-wrap">
            {asset.os && (
              <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-1 rounded">
                🟢 มีข้อมูล OS
              </span>
            )}
            {asset.cpu && (
              <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-1 rounded">
                ⚡ มีข้อมูล CPU
              </span>
            )}
            {asset.ramGb !== null && (
              <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 font-bold px-2 py-1 rounded">
                💾 มีหน่วยความจำ
              </span>
            )}
            {(!asset.os || !asset.cpu || asset.ramGb === null) && (
              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-1 rounded">
                ⚠️ ประวัติฮาร์ดแวร์ไม่ครบ
              </span>
            )}
          </div>

          {/* Section: General Info */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Building size={14} /> ข้อมูลแผนกและอุปกรณ์
            </h3>
            
            <div className="space-y-2.5">
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">ComputerName</span>
                <span className="text-sm font-semibold font-mono text-blue-600">{asset.name || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">แผนก / ฝ่าย</span>
                <span className="text-sm font-semibold text-slate-800">{asset.dept || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">รหัสทรัพย์สิน (Asset ID)</span>
                <span className="text-sm text-slate-700 font-mono font-medium">{asset.assetId && asset.assetId !== '-' ? asset.assetId : 'ไม่มีรหัสทรัพย์สิน'}</span>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-xs text-slate-500 font-medium">บันทึกเพิ่มเติม</span>
                <span className="text-sm text-slate-650 text-right max-w-xs break-words">{asset.note || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section: Hardware Spec */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <Cpu size={14} /> หน่วยจัดประมวลผล & RAM
            </h3>
            
            <div className="space-y-2.5">
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPUName</span>
                <span className="text-sm text-slate-800 font-medium text-right max-w-xs break-words">{asset.cpu || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPU Vendor</span>
                <span className="text-sm text-slate-600">{asset.cpuVendor || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPU Family</span>
                <span className="text-sm text-slate-600">{asset.cpuFamily || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPU Model</span>
                <span className="text-sm text-slate-700 font-mono">{asset.cpuModel || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPU Generation</span>
                <span className="text-[10px] bg-purple-50 border border-purple-150 text-purple-700 px-2 py-0.5 rounded font-bold uppercase font-mono">
                  {asset.cpuGeneration || '—'}
                </span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">CPU Socket</span>
                <span className="text-sm text-slate-700 font-mono">{asset.cpuSocket || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">TotalMemory</span>
                <span className="text-sm text-slate-700 font-mono">{asset.totalMemory || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">RAM_GB</span>
                <span className="text-sm text-blue-600 font-bold font-mono">
                  {asset.ramGb !== null ? `${asset.ramGb} GB` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Network */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
              การเชื่อมต่อ & USB
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">unblock USB</span>
                <span className="text-sm text-slate-700">{asset.unblockUsb || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-xs text-slate-500 font-medium">Internet</span>
                <span className={`text-sm font-semibold ${asset.internet ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {asset.internet || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Storage & Model */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <HardDrive size={14} /> เครื่องและสื่อบันทึกข้อมูล
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">StorageType</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  asset.storage === 'SSD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  asset.storage === 'HDD' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  asset.storage === 'SSD+HDD' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  {asset.storage || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Windows</span>
                <span className="text-sm text-slate-705 text-right max-w-xs">{asset.os || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Model</span>
                <span className="text-sm text-slate-650">{asset.model || '—'}</span>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-xs text-slate-500 font-medium">Manufacturer</span>
                <span className="text-sm text-slate-655">{asset.manufacturer || '—'}</span>
              </div>
            </div>
          </div>

          {/* Disk Drives */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DiskDrives Details (รายละเอียดพาร์ติชันดิสก์)</h4>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded font-mono text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
              {asset.disk ? asset.disk : 'ไม่มีคลังรายชื่อดิสก์ประดับการบันทึก'}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-slate-500 text-[10px] font-mono">
          <span>ID รายการ: #{asset.id}</span>
          <span className="italic">ระบบ IT MasterList V3</span>
        </div>

      </div>
    </div>
  );
}
