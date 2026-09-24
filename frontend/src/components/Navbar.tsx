import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Satellite, Cpu, CheckCircle2, Layers, BarChart3, Info, GitCompare } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [device, setDevice] = useState<string>('CPU');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    api.checkHealth()
      .then((res) => {
        setDevice(res.device ? res.device.toUpperCase() : 'CPU');
        setIsOnline(true);
      })
      .catch(() => setIsOnline(false));
  }, []);

  const navLinks = [
    { to: '/', label: 'Overview', icon: Satellite },
    { to: '/workspace', label: 'Analysis Workspace', icon: Layers },
    { to: '/compare', label: 'Dual Compare', icon: GitCompare },
    { to: '/benchmarks', label: 'Benchmarks', icon: BarChart3 },
    { to: '/about', label: 'Architecture & ISRO', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-cyan-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Mission Tag */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Satellite className="w-5 h-5 text-white animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">SATQUERY<span className="text-cyan-400"> AI</span></span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                ISRO 26167
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">Multimodal Remote Sensing Vision-Language Assistant</p>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* System Telemetry Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-300 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">DEVICE:</span>
            <span className="text-indigo-300 font-semibold">{device}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-ping' : 'bg-red-400'}`} />
            <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
              {isOnline ? 'TELEMETRY ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
