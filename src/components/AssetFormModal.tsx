import React, { useState, useEffect } from 'react';
import { ITAsset } from '../types';
import { X, Check, Plus, AlertCircle } from 'lucide-react';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ITAsset>) => Promise<boolean>;
  editingAsset: ITAsset | null;
  departments: string[];
  onFetchMasterOptions: () => Promise<{
    storage: string[];
    generations: string[];
    sockets: string[];
    os: string[];
    cpuVendor: string[];
    cpuFamily: string[];
    cpuModel: string[];
    unblockUsb: string[];
    internet: string[];
  }>;
  onFetchAssets: () => Promise<void>;
  currentUserRole?: 'admin' | 'it_staff' | 'user' | 'viewer';
}

export default function AssetFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingAsset,
  departments,
  onFetchMasterOptions,
  onFetchAssets,
  currentUserRole
}: AssetFormModalProps) {
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [assetId, setAssetId] = useState('');
  const [note, setNote] = useState('');
  
  const [cpuVendor, setCpuVendor] = useState('');
  const [cpuFamily, setCpuFamily] = useState('');
  const [cpuModel, setCpuModel] = useState('');
  const [cpuGeneration, setCpuGeneration] = useState('');
  const [cpuSocket, setCpuSocket] = useState('');
  const [cpuName, setCpuName] = useState('');
  const [ramGb, setRamGb] = useState<string>('');
  const [totalMemory, setTotalMemory] = useState('');

  const [storage, setStorage] = useState('');
  const [os, setOs] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [disk, setDisk] = useState('');
  const [unblockUsb, setUnblockUsb] = useState('');
  const [internet, setInternet] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Master options state
  const [masterOptions, setMasterOptions] = useState<{
    storage: string[];
    generations: string[];
    sockets: string[];
    os: string[];
    cpuVendor: string[];
    cpuFamily: string[];
    cpuModel: string[];
    unblockUsb: string[];
    internet: string[];
  }>({
    storage: ['SSD', 'HDD', 'SSD+HDD', 'Unknown'],
    generations: [],
    sockets: [],
    os: [],
    cpuVendor: ['Intel', 'AMD', 'Unknown'],
    cpuFamily: [],
    cpuModel: [],
    unblockUsb: ['Yes', 'No', 'Unknown'],
    internet: ['Yes', 'No', 'Unknown']
  });
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Admin master data management state
  const [showMasterManagement, setShowMasterManagement] = useState(false);
  const [masterDataType, setMasterDataType] = useState<'storage' | 'generation' | 'socket' | 'os' | 'cpu-vendor' | 'cpu-family' | 'cpu-model' | 'unblock-usb' | 'internet'>('storage');
  const [newMasterValue, setNewMasterValue] = useState('');
  const [addingMaster, setAddingMaster] = useState(false);

  // Helper function to check if value exists in master options
  const isValueInMasterData = (value: string, options: string[]): boolean => {
    if (!value) return true; // Empty values are considered valid
    return options.includes(value);
  };

  // Quick add to master data
  const handleQuickAddToMaster = async (type: 'cpu-vendor' | 'cpu-family' | 'cpu-model' | 'unblock-usb' | 'internet', value: string) => {
    if (!value.trim()) return;

    setAddingMaster(true);
    try {
      const endpoint = `/api/master/${type}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-user': 'admin'
        },
        body: JSON.stringify({ name: value })
      });

      if (res.ok) {
        // Refresh master options
        const options = await onFetchMasterOptions();
        setMasterOptions(options);
      } else {
        const data = await res.json();
        alert(data.message || 'เพิ่มข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to add master option:', error);
      alert('เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setAddingMaster(false);
    }
  };

  // Fetch master options and assets
  const handleFetchMachineData = async () => {
    setLoadingOptions(true);
    try {
      await onFetchAssets();
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Auto-fetch master options when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchMasterOptionsOnOpen = async () => {
        try {
          const options = await onFetchMasterOptions();
          setMasterOptions(options);
        } catch (error) {
          console.error('Failed to fetch master options:', error);
        }
      };
      fetchMasterOptionsOnOpen();
    }
  }, [isOpen, onFetchMasterOptions]);

  // Admin CRUD functions for master data
  const handleAddMasterOption = async () => {
    if (!newMasterValue.trim()) return;

    setAddingMaster(true);
    try {
      const endpoint = `/api/master/${masterDataType === 'generation' ? 'cpu-generation' : masterDataType === 'socket' ? 'cpu-socket' : masterDataType}`;
      const body: any = {};
      
      if (masterDataType === 'storage') {
        body.storage_name = newMasterValue;
      } else if (masterDataType === 'generation') {
        body.generation_name = newMasterValue;
      } else if (masterDataType === 'socket') {
        body.socket_name = newMasterValue;
      } else if (masterDataType === 'os') {
        body.os_name = newMasterValue;
      } else {
        // For existing tables (cpu-vendor, cpu-family, cpu-model, unblock-usb, internet)
        body.name = newMasterValue;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-user': 'admin'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setNewMasterValue('');
        // Refresh master options
        const options = await onFetchMasterOptions();
        setMasterOptions(options);
      } else {
        const data = await res.json();
        alert(data.message || 'เพิ่มข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Failed to add master option:', error);
      alert('เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setAddingMaster(false);
    }
  };

  const handleDeleteMasterOption = async (value: string) => {
    if (!window.confirm(`ยืนยันที่จะลบ "${value}"?`)) return;

    try {
      const endpoint = `/api/master/${masterDataType === 'generation' ? 'cpu-generation' : masterDataType === 'socket' ? 'cpu-socket' : masterDataType}`;
      
      // First get the ID of the item to delete
      const listEndpoint = endpoint;
      const listRes = await fetch(listEndpoint, {
        headers: { 'x-current-user': 'admin' }
      });
      
      if (listRes.ok) {
        const listData = await listRes.json();
        const item = listData.records.find((r: any) => 
          (masterDataType === 'storage' && r.storage_name === value) ||
          (masterDataType === 'generation' && r.generation_name === value) ||
          (masterDataType === 'socket' && r.socket_name === value) ||
          (masterDataType === 'os' && r.os_name === value) ||
          // For existing tables (cpu-vendor, cpu-family, cpu-model, unblock-usb, internet)
          r.name === value
        );

        if (item) {
          const deleteRes = await fetch(`${endpoint}/${item.id}`, {
            method: 'DELETE',
            headers: { 'x-current-user': 'admin' }
          });

          if (deleteRes.ok) {
            // Refresh master options
            const options = await onFetchMasterOptions();
            setMasterOptions(options);
          } else {
            alert('ลบข้อมูลไม่สำเร็จ');
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete master option:', error);
      alert('ลบข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setDept(editingAsset.dept);
      setAssetId(editingAsset.assetId === '-' ? '' : editingAsset.assetId);
      setNote(editingAsset.note);
      setCpuVendor(editingAsset.cpuVendor);
      setCpuFamily(editingAsset.cpuFamily);
      setCpuModel(editingAsset.cpuModel);
      setCpuGeneration(editingAsset.cpuGeneration);
      setCpuSocket(editingAsset.cpuSocket);
      setCpuName(editingAsset.cpu);
      setRamGb(editingAsset.ramGb !== null ? String(editingAsset.ramGb) : '');
      setTotalMemory(editingAsset.totalMemory || '');
      setStorage(editingAsset.storage);
      setOs(editingAsset.os);
      setModel(editingAsset.model);
      setManufacturer(editingAsset.manufacturer);
      setDisk(editingAsset.disk);
      setUnblockUsb(editingAsset.unblockUsb);
      setInternet(editingAsset.internet);
    } else {
      setName('');
      setDept('');
      setAssetId('');
      setNote('');
      setCpuVendor('');
      setCpuFamily('');
      setCpuModel('');
      setCpuGeneration('');
      setCpuSocket('');
      setCpuName('');
      setRamGb('');
      setTotalMemory('');
      setStorage('');
      setOs('');
      setModel('');
      setManufacturer('');
      setDisk('');
      setUnblockUsb('');
      setInternet('');
    }
    setErrors({});
  }, [editingAsset, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'กรุณากรอก ComputerName';
    }
    if (!dept.trim()) {
      newErrors.dept = 'กรุณากรอกแผนก';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    
    const assembledCpu = cpuName.trim()
      || [cpuVendor, cpuFamily, cpuModel].filter(Boolean).join(' ');

    const payload: Partial<ITAsset> = {
      name: name.trim(),
      dept: dept.trim(),
      assetId: assetId.trim() || '-',
      note: note.trim(),
      cpuVendor: cpuVendor.trim(),
      cpuFamily: cpuFamily.trim(),
      cpuModel: cpuModel.trim(),
      cpuGeneration: cpuGeneration.trim(),
      cpuSocket: cpuSocket.trim(),
      cpu: assembledCpu,
      totalMemory: totalMemory.trim(),
      ramGb: ramGb === '' ? null : parseFloat(ramGb),
      storage: storage,
      os: os.trim(),
      model: model.trim(),
      manufacturer: manufacturer.trim(),
      disk: disk.trim(),
      unblockUsb: unblockUsb.trim(),
      internet: internet.trim()
    };

    const success = await onSubmit(payload);
    setSaving(false);
    if (success) {
      onClose();
    } else {
      alert('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      {/* dialog */}
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 shadow-xl animate-fade-in flex flex-col">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-slate-800 font-sans">
            {editingAsset ? `แก้ไขอุปกรณ์: ${editingAsset.name}` : 'เพิ่มอุปกรณ์คอมพิวเตอร์'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50 transition cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-grow bg-white">
          
          {/* Section: General Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. ข้อมูลทั่วไป</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  ComputerName <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น MED-DR-07"
                  className={`w-full bg-white border ${errors.name ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                {errors.name && <span className="text-[10px] text-rose-500 block">{errors.name}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  แผนก / หน่วยงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="ค้นหาหรือพิมพ์กลุ่ม เช่น เวชสถิติ"
                  list="modal-dept-list"
                  className={`w-full bg-white border ${errors.dept ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-dept-list">
                  {departments.map(d => <option key={d} value={d} />)}
                </datalist>
                {errors.dept && <span className="text-[10px] text-rose-500 block">{errors.dept}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">รหัสทรัพย์สิน (Asset ID)</label>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="เช่น HR.60/00084 (ใส่ยัติภังค์ - หากไม่มี)"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="หมายเหตุพยากรณ์/ระบุอาการเสีย"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Processor & RAM */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. ข้อมูล CPU / RAM</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-semibold text-slate-600">CPUName</label>
                <input
                  type="text"
                  value={cpuName}
                  onChange={(e) => setCpuName(e.target.value)}
                  placeholder="เช่น Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">CPU Vendor</label>
                  {!isValueInMasterData(cpuVendor, masterOptions.cpuVendor) && cpuVendor && (
                    <>
                      <AlertCircle size={12} className="text-rose-500" />
                      {currentUserRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToMaster('cpu-vendor', cpuVendor)}
                          disabled={addingMaster}
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                          title="เพิ่มเข้า Master Data"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={cpuVendor}
                  onChange={(e) => setCpuVendor(e.target.value)}
                  placeholder="เช่น Intel / AMD"
                  list="modal-cpu-vendor-list"
                  className={`w-full bg-white border ${!isValueInMasterData(cpuVendor, masterOptions.cpuVendor) && cpuVendor ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-cpu-vendor-list">
                  {masterOptions.cpuVendor.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">CPU Family</label>
                  {!isValueInMasterData(cpuFamily, masterOptions.cpuFamily) && cpuFamily && (
                    <>
                      <AlertCircle size={12} className="text-rose-500" />
                      {currentUserRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToMaster('cpu-family', cpuFamily)}
                          disabled={addingMaster}
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                          title="เพิ่มเข้า Master Data"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={cpuFamily}
                  onChange={(e) => setCpuFamily(e.target.value)}
                  placeholder="เช่น Core i5 / Ryzen 7"
                  list="modal-cpu-family-list"
                  className={`w-full bg-white border ${!isValueInMasterData(cpuFamily, masterOptions.cpuFamily) && cpuFamily ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-cpu-family-list">
                  {masterOptions.cpuFamily.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">CPU Model</label>
                  {!isValueInMasterData(cpuModel, masterOptions.cpuModel) && cpuModel && (
                    <>
                      <AlertCircle size={12} className="text-rose-500" />
                      {currentUserRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToMaster('cpu-model', cpuModel)}
                          disabled={addingMaster}
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                          title="เพิ่มเข้า Master Data"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={cpuModel}
                  onChange={(e) => setCpuModel(e.target.value)}
                  placeholder="เช่น 7500 / 2700"
                  list="modal-cpu-model-list"
                  className={`w-full bg-white border ${!isValueInMasterData(cpuModel, masterOptions.cpuModel) && cpuModel ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-cpu-model-list">
                  {masterOptions.cpuModel.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">CPU Generation</label>
                <input
                  type="text"
                  value={cpuGeneration}
                  onChange={(e) => setCpuGeneration(e.target.value)}
                  placeholder="เช่น Gen 7"
                  list="modal-gen-list"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
                <datalist id="modal-gen-list">
                  {masterOptions.generations.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">CPU Socket</label>
                <input
                  type="text"
                  value={cpuSocket}
                  onChange={(e) => setCpuSocket(e.target.value)}
                  placeholder="เช่น LGA1151 / AM4"
                  list="modal-socket-list"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
                <datalist id="modal-socket-list">
                  {masterOptions.sockets.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">TotalMemory</label>
                <input
                  type="text"
                  value={totalMemory}
                  onChange={(e) => setTotalMemory(e.target.value)}
                  placeholder="ค่าดิบจากระบบ เช่น 4 หรือ ."
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">RAM_GB</label>
                <input
                  type="number"
                  value={ramGb}
                  onChange={(e) => setRamGb(e.target.value)}
                  placeholder="ป้อนปริมาณ เช่น 8 หรือ 16"
                  min="0"
                  step="0.1"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Storage & Platform */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. สตอเรจ & ระบบประมวลผลเครื่อง</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">ชนิดสตอเรจ (StorageType)</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="เช่น SSD / HDD / SSD+HDD"
                  list="modal-storage-list"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
                <datalist id="modal-storage-list">
                  {masterOptions.storage.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">ระบบปฏิบัติการ Windows</label>
                <input
                  type="text"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  placeholder="เช่น Microsoft Windows 10 Pro"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                  list="modal-os-list"
                />
                <datalist id="modal-os-list">
                  {masterOptions.os.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">รุ่นเครื่อง (Model)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="เช่น OptiPlex 5050"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">ผู้ผลิตเครื่อง (Manufacturer)</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="เช่น Dell Inc."
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-xs"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">รายละเอียดดิสก์ไดรฟ์ (DiskDrives)</label>
                <textarea
                  value={disk}
                  onChange={(e) => setDisk(e.target.value)}
                  placeholder="เช่น SK hynix SC311 SATA 128GB - 119.24 GB"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition h-20 resize-y shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Network & USB */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">4. การเชื่อมต่อ & USB</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">unblock USB</label>
                  {!isValueInMasterData(unblockUsb, masterOptions.unblockUsb) && unblockUsb && (
                    <>
                      <AlertCircle size={12} className="text-rose-500" />
                      {currentUserRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToMaster('unblock-usb', unblockUsb)}
                          disabled={addingMaster}
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                          title="เพิ่มเข้า Master Data"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={unblockUsb}
                  onChange={(e) => setUnblockUsb(e.target.value)}
                  placeholder="สถานะ unblock USB"
                  list="modal-unblock-usb-list"
                  className={`w-full bg-white border ${!isValueInMasterData(unblockUsb, masterOptions.unblockUsb) && unblockUsb ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-unblock-usb-list">
                  {masterOptions.unblockUsb.map(u => <option key={u} value={u} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Internet</label>
                  {!isValueInMasterData(internet, masterOptions.internet) && internet && (
                    <>
                      <AlertCircle size={12} className="text-rose-500" />
                      {currentUserRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToMaster('internet', internet)}
                          disabled={addingMaster}
                          className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                          title="เพิ่มเข้า Master Data"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={internet}
                  onChange={(e) => setInternet(e.target.value)}
                  placeholder="เช่น Internet"
                  list="modal-internet-list"
                  className={`w-full bg-white border ${!isValueInMasterData(internet, masterOptions.internet) && internet ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'} rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-xs`}
                />
                <datalist id="modal-internet-list">
                  {masterOptions.internet.map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* Admin Master Data Management Section */}
          {currentUserRole === 'admin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">5. จัดการข้อมูล Master (Admin Only)</span>
                <button
                  type="button"
                  onClick={() => setShowMasterManagement(!showMasterManagement)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  {showMasterManagement ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>

              {showMasterManagement && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  {/* Data Type Selector */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'storage', label: 'Storage' },
                      { key: 'generation', label: 'CPU Generation' },
                      { key: 'socket', label: 'CPU Socket' },
                      { key: 'os', label: 'OS' },
                      { key: 'cpu-vendor', label: 'CPU Vendor' },
                      { key: 'cpu-family', label: 'CPU Family' },
                      { key: 'cpu-model', label: 'CPU Model' },
                      { key: 'unblock-usb', label: 'Unblock USB' },
                      { key: 'internet', label: 'Internet' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMasterDataType(key as any)}
                        className={`text-xs px-3 py-1.5 rounded transition font-medium ${
                          masterDataType === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Add New Option */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMasterValue}
                      onChange={(e) => setNewMasterValue(e.target.value)}
                      placeholder={`เพิ่ม ${masterDataType === 'storage' ? 'ชนิดสตอเรจ' : masterDataType === 'generation' ? 'CPU Generation' : masterDataType === 'socket' ? 'CPU Socket' : masterDataType === 'os' ? 'ระบบปฏิบัติการ' : masterDataType === 'cpu-vendor' ? 'CPU Vendor' : masterDataType === 'cpu-family' ? 'CPU Family' : masterDataType === 'cpu-model' ? 'CPU Model' : masterDataType === 'unblock-usb' ? 'Unblock USB' : 'Internet'} ใหม่`}
                      className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMasterOption()}
                    />
                    <button
                      type="button"
                      onClick={handleAddMasterOption}
                      disabled={addingMaster || !newMasterValue.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                    >
                      {addingMaster ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                    </button>
                  </div>

                  {/* List of Options */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-600 block">
                      รายการ {masterDataType === 'storage' ? 'ชนิดสตอเรจ' : masterDataType === 'generation' ? 'CPU Generation' : masterDataType === 'socket' ? 'CPU Socket' : masterDataType === 'os' ? 'ระบบปฏิบัติการ' : masterDataType === 'cpu-vendor' ? 'CPU Vendor' : masterDataType === 'cpu-family' ? 'CPU Family' : masterDataType === 'cpu-model' ? 'CPU Model' : masterDataType === 'unblock-usb' ? 'Unblock USB' : 'Internet'}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(masterDataType === 'storage' ? masterOptions.storage :
                        masterDataType === 'generation' ? masterOptions.generations :
                        masterDataType === 'socket' ? masterOptions.sockets :
                        masterDataType === 'os' ? masterOptions.os :
                        masterDataType === 'cpu-vendor' ? masterOptions.cpuVendor :
                        masterDataType === 'cpu-family' ? masterOptions.cpuFamily :
                        masterDataType === 'cpu-model' ? masterOptions.cpuModel :
                        masterDataType === 'unblock-usb' ? masterOptions.unblockUsb :
                        masterOptions.internet).map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMasterOption(item)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="ลบ"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-5 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white pb-1 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-550 hover:text-slate-800 hover:bg-slate-50 rounded text-xs font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                'กำลังบันทึก...'
              ) : (
                <>
                  <Check size={14} />
                  <span>บันทึกข้อมูลสำเร็จ</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
