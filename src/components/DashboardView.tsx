import React from 'react';
import { ITAsset } from '../types';
import { Monitor, Briefcase, AlertTriangle, HelpCircle, MemoryStick, Award, Cpu, ShieldAlert, Database } from 'lucide-react';

interface DashboardViewProps {
  assets: ITAsset[];
  onShowNoHardware: () => void;
  onQuickFilter: (type: 'os' | 'storage' | 'generation', value: string) => void;
}

export default function DashboardView({ assets, onShowNoHardware, onQuickFilter }: DashboardViewProps) {
  const total = assets.length;
  
  // Unique Departments
  const departments = [...new Set(assets.map(a => a.dept).filter(Boolean))];
  
  // EOL OS
  const eolCount = assets.filter(a => {
    const os = a.os.toLowerCase();
    return os.includes('windows 7') || os.includes('xp') || os.includes('windows xp');
  }).length;

  // Missing Hardware Gap Check
  const missingHardware = assets.filter(a => {
    return !a.cpu || !a.os || a.ramGb === null;
  }).length;

  // Average RAM Calculation (Only for machines with clear info)
  const ramValid = assets.map(a => a.ramGb).filter((v): v is number => v !== null && v > 0);
  const avgRam = ramValid.length ? (ramValid.reduce((a, b) => a + b, 0) / ramValid.length).toFixed(1) : '0';

  // Sockets Varieties
  const sockets = [...new Set(assets.map(a => a.cpuSocket).filter(Boolean))];
  
  // SSD Profile Counts
  const ssdCount = assets.filter(a => a.storage.toUpperCase().includes('SSD')).length;

  // Highest CPU Generation Finder
  const parseGenNumber = (genStr: string) => {
    const m = genStr.match(/\d+/);
    return m ? parseInt(m[0]) : 0;
  };
  const generations = [...new Set(assets.map(a => a.cpuGeneration).filter(Boolean))];
  const sortedGens = generations.sort((a, b) => parseGenNumber(b) - parseGenNumber(a));
  const topGen = sortedGens[0] || '—';

  // Helper counting function
  const getFrequencyMap = (arr: string[]) => {
    return arr.reduce((acc: Record<string, number>, curr) => {
      const key = curr || 'ไม่มีข้อมูล';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  };

  const getTopEntries = (frequencyMap: Record<string, number>, limit: number = 10) => {
    return Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th', { numeric: true }))
      .slice(0, limit);
  };

  // 1. Top 10 Departments
  const deptEntries = getTopEntries(getFrequencyMap(assets.map(a => a.dept)), 10);
  
  // 2. OS distribution
  const osEntries = getTopEntries(getFrequencyMap(assets.map(a => a.os.replace('Microsoft ', ''))), 6);

  // 3. Storage Type distribution
  const storageEntries = getTopEntries(getFrequencyMap(assets.map(a => a.storage)), 5);

  // 4. Generation distribution
  const generationEntries = getTopEntries(getFrequencyMap(assets.map(a => a.cpuGeneration)), 10);

  // 5. RAM categorization
  const getRamGroup = (ramGb: number | null) => {
    if (ramGb === null || ramGb === 0) return 'ไม่มีข้อมูล';
    if (ramGb < 4) return 'น้อยกว่า 4 GB';
    if (ramGb < 8) return '4-7 GB';
    if (ramGb < 16) return '8-15 GB';
    if (ramGb < 32) return '16-31 GB';
    return '32 GB ขึ้นไป';
  };
  const ramEntries = getTopEntries(getFrequencyMap(assets.map(a => getRamGroup(a.ramGb))), 6);

  // Responsive Custom SVG/Tailwind Bar Chart Component
  const renderVisualBarChart = (entries: [string, number][], colorClass: string = 'bg-blue-500') => {
    const maxVal = Math.max(1, ...entries.map(e => e[1]));
    return (
      <div className="space-y-3.5">
        {entries.map(([label, count]) => {
          const percentage = (count / maxVal) * 100;
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-32 truncate block font-medium" title={label}>
                {label}
              </span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-lg overflow-hidden">
                <div 
                  className={`h-full rounded-lg transition-all duration-500 ${colorClass}`} 
                  style={{ width: `${Math.max(3, percentage)}%` }}
                ></div>
              </div>
              <span className="font-mono text-xs text-slate-700 min-w-8 text-right font-semibold">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 2x4 Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Machines */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 shadow-sm rounded-lg p-5 flex items-start gap-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-600 p-3 rounded-lg">
            <Monitor size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">เครื่องคอมพิวเตอร์ทั้งหมด</span>
            <span className="text-3xl font-extrabold font-mono text-slate-800 block leading-none">{total}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">เครื่องทั้งหมดในระเบียน</span>
          </div>
        </div>

        {/* Departments */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm rounded-lg p-5 flex items-start gap-4">
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-lg">
            <Briefcase size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">จำนวนแผนกทั้งหมด</span>
            <span className="text-3xl font-extrabold font-mono text-slate-800 block leading-none">{departments.length}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">หน่วยงาน / โซนบริการ</span>
          </div>
        </div>

        {/* EOL Windows */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-rose-500 shadow-sm rounded-lg p-5 flex items-start gap-4">
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">เครื่อง Windows 7 / XP (EOL)</span>
            <span className="text-3xl font-extrabold font-mono text-rose-600 block leading-none">{eolCount}</span>
            <span className="text-[11px] text-rose-500 font-semibold mt-1 block hover:underline cursor-pointer" onClick={() => onQuickFilter('os', 'Windows 7')}>
              เสี่ยงภัยคุกคาม ควรวางแผนอัปเกรด
            </span>
          </div>
        </div>

        {/* Missing Hardware Profile Gaps */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 shadow-sm rounded-lg p-5 flex items-start gap-4 cursor-pointer hover:border-amber-300 transition" onClick={onShowNoHardware}>
          <div className="bg-amber-50 border border-amber-100 text-amber-600 p-3 rounded-lg">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ข้อมูล Hardware ไม่ครบ</span>
            <span className="text-3xl font-extrabold font-mono text-amber-500 block leading-none">{missingHardware}</span>
            <span className="text-[11px] text-amber-600 font-bold block mt-1 hover:underline">
              คลิกเพื่อดึงข้อมูลไปตรวจ ➜
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Average RAM GB */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex items-start gap-3">
          <div className="bg-slate-50 border border-slate-100 p-2 text-slate-600 rounded-lg">
            <MemoryStick size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ปริมาณ RAM เฉลี่ย</span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">{avgRam} GB</span>
            <span className="text-[10px] text-slate-500">เฉลี่ยต่อเครื่องที่มีข้อมูล</span>
          </div>
        </div>

        {/* Highest CPU Gen */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex items-start gap-3">
          <div className="bg-slate-50 border border-slate-100 p-2 text-slate-600 rounded-lg">
            <Award size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CPU Gen สูงสุด</span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">{topGen}</span>
            <span className="text-[10px] text-slate-500">จากคอลัมน์ CPU_Generation</span>
          </div>
        </div>

        {/* Unique Sockets */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex items-start gap-3">
          <div className="bg-slate-50 border border-slate-100 p-2 text-slate-600 rounded-lg">
            <Cpu size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ชนิด CPU Socket</span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">{sockets.length} ชนิด</span>
            <span className="text-[10px] text-slate-500">ไม่รวมค่าว่างของฟิลด์</span>
          </div>
        </div>

        {/* SSD Install base */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex items-start gap-3">
          <div className="bg-slate-50 border border-slate-100 p-2 text-slate-600 rounded-lg">
            <Database size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">บอร์ดที่ติดตั้ง SSD</span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">{ssdCount} เครื่อง</span>
            <span className="text-[10px] text-slate-500">ที่มี SSD หรือ SSD+HDD</span>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 10 Departments with most PCs */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>แผนกที่มีเครื่องมากสุด Top 10</span>
            <span className="text-[11px] text-slate-450 font-normal">หน่วย: เครื่อง</span>
          </h3>
          {renderVisualBarChart(deptEntries, 'bg-blue-600')}
        </div>

        {/* Operating Systems & Storage Profiles */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide border-b border-slate-100 pb-2.5">
              ระบบปฏิบัติการ (Windows Version)
            </h3>
            {renderVisualBarChart(osEntries, 'bg-emerald-600')}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide border-b border-slate-100 pb-2.5">
              ประเภทสตอเรจเครื่อง (Storage Drive Type)
            </h3>
            {renderVisualBarChart(storageEntries, 'bg-amber-500')}
          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CPU Generation Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide border-b border-slate-100 pb-3">
            การกระจายตัวของ CPU Generation
          </h3>
          {renderVisualBarChart(generationEntries, 'bg-purple-600')}
        </div>

        {/* RAM Size Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wide border-b border-slate-100 pb-3">
            RAM Distribution (ขนาดหน่วยความจำหลัก)
          </h3>
          {renderVisualBarChart(ramEntries, 'bg-teal-600')}
        </div>

      </div>

    </div>
  );
}
