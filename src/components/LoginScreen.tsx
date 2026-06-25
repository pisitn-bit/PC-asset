import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, Eye, EyeOff, Cpu, CheckCircle, Database } from 'lucide-react';
import { DBStatus, User, UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  dbStatus: DBStatus | null;
}

export default function LoginScreen({ onLoginSuccess, dbStatus }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        handleLoginSuccess({
          id: data.user.id,
          username: data.user.username,
          role: (data.user.role || 'user') as UserRole
        });
      } else {
        setError(data.message || 'รหัสผ่านหรือชื่อผู้ใช้ไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ไม่สามารถเชื่อมต่อส่วนหลังเซิร์ฟเวอร์ได้');
    }
  };

  const handleQuickLogin = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
    setErrorMsg(null);
  };

  const setError = (msg: string) => {
    setErrorMsg(msg);
    setLoading(false);
  };

  const handleLoginSuccess = (user: User) => {
    setLoading(false);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience Deco */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Panel */}
      <div className="w-full max-w-4xl grid md:grid-template md:grid-cols-2 bg-slate-900 border border-slate-600 rounded-2xl overflow-hidden shadow-2xl relative z-10">
        
        {/* Left Side: Hospital Branding / IT Infrastructure Details */}
        <div className="p-8 md:p-12 bg-slate-800 flex flex-col justify-between border-r border-slate-600">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Cpu size={24} />
              </div>
              <span className="font-bold text-lg tracking-wider text-white font-mono">YANHEE IT HUB</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-4">
              ระบบจัดการทรัพย์สินคอมพิวเตอร์ <br />
              <span className="text-blue-500">PC Asset</span>
            </h1>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              ระเบียนรวมและประวัติการทำงานของอุปกรณ์คอมพิวเตอร์ (Computer PC Asset Manager) ทั้งหมดของเครือข่ายโรงพยาบาลยันฮี ค้นหา จัดการข้อมูล Hardware, Software, แผนก, Socket, RAM และ SSD/HDD
            </p>
          </div>

          <div>
            {/* Database Connection badge tracker */}
            <div className="bg-slate-900/50 border border-slate-600 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-semibold block mb-2 uppercase tracking-wide">PostgreSQL Connection</span>
              {dbStatus ? (
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <span className="text-xs font-mono font-medium text-slate-300">
                        pc_asset {dbStatus.connected ? '(CONNECTED)' : '(FALLBACK)'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {dbStatus.host} | {dbStatus.database}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${dbStatus.dataCenterConnected ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                      <span className="text-xs font-mono font-medium text-slate-300">
                        data_center {dbStatus.dataCenterConnected ? '(CONNECTED)' : '(OFFLINE)'}
                        {dbStatus.fdwReady ? ' + FDW' : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {dbStatus.dataCenterDatabase}
                    </span>
                  </div>
                  {dbStatus.fallbackActive && (
                    <span className="text-[10px] text-amber-500 font-semibold block">
                      *Sandbox: ใช้ JSON local แทน PostgreSQL
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Database size={14} className="animate-spin" />
                  <span>กำลังดึงสถานะเชื่อมต่อ...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: ReactNative Styled Simulated Mobile Frame Phone Login */}
        <div className="p-8 bg-slate-900 flex flex-col justify-center items-center">
          
          {/* React Native Mobile Simulator Frame */}
          <div className="w-full max-w-[340px] bg-slate-950 border-[6px] border-slate-700 rounded-[32px] p-6 shadow-xl relative overflow-hidden flex flex-col">
            
            {/* Phone Speaker Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-700 rounded-b-xl flex items-center justify-center">
              <div className="w-8 h-1 bg-slate-950 rounded-full"></div>
            </div>

            {/* Mobile Status Bar */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 mb-6 px-1">
              <span>08:12 AM</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>📶</span>
                <span>🔋 100%</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <span className="text-2xl">🏥</span>
              <h2 className="text-lg font-bold text-white mt-1">โรงพยาบาลยันฮี</h2>
              <p className="text-xs text-slate-400">เข้าสู่ระบบ IT Master List (App)</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">ชื่อผู้ใช้งาน (Username)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon size={14} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น admin"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 tracking-wide block">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-2.5 text-[11px] leading-snug">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-1.5"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            {/* Quick login assistants */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center mb-2">บัญชีสาธิตด่วน</span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'password123')}
                  className="w-full text-left bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 flex justify-between items-center transition"
                >
                  <span>🔑 admin (ระบบเต็ม)</span>
                  <span className="text-[9px] text-blue-500 font-mono">password123</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('it_staff', 'yanhee@inter.454')}
                  className="w-full text-left bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 flex justify-between items-center transition"
                >
                  <span>🔑 it_staff (แอดมินยันฮี)</span>
                  <span className="text-[9px] text-blue-500 font-mono">yanhee@inter.454</span>
                </button>
              </div>
            </div>

            {/* Simulated Native Home bar indicator */}
            <div className="w-20 h-1 bg-slate-700 mx-auto rounded-full mt-6 mb-1"></div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
