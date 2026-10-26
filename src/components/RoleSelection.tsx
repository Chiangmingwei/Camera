import React from 'react';
import {
  Camera,
  ChevronRight,
  Compass,
  Gamepad2,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { AppRole, Language } from '../types';
import { t } from '../utils/translations';

interface RoleSelectionProps {
  lang: Language;
  onSelectRole: (role: AppRole) => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ lang, onSelectRole }) => {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-zinc-950 px-4 py-6 sm:py-10 max-w-2xl mx-auto flex flex-col justify-between select-none">
      {/* Title & Introduction */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-rose-400 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>WebRTC P2P Ultra-Low Latency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 font-sans mb-2">
          {t(lang, 'roleSelectionTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          {t(lang, 'roleSelectionSubtitle')}
        </p>
      </div>

      {/* Two Big Ergonomic Touch Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Camera Phone Card */}
        <button
          onClick={() => onSelectRole('camera')}
          type="button"
          className="group relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-rose-500/50 active:scale-[0.99] transition-all text-left shadow-xl shadow-black/40 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-800/40">
              {t(lang, 'cameraRoleBadge')}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-1 group-hover:text-rose-400 transition-colors">
              {t(lang, 'cameraRoleTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              {t(lang, 'cameraRoleDesc')}
            </p>
          </div>

          <div className="flex items-center text-xs font-semibold text-rose-400 gap-1.5 pt-2 border-t border-zinc-800/80">
            <span>{t(lang, 'cameraRoleButton')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Controller Phone Card */}
        <button
          onClick={() => onSelectRole('controller')}
          type="button"
          className="group relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 active:scale-[0.99] transition-all text-left shadow-xl shadow-black/40 flex flex-col justify-between overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-800/40">
              {t(lang, 'controllerRoleBadge')}
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-1 group-hover:text-amber-400 transition-colors">
              {t(lang, 'controllerRoleTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
              {t(lang, 'controllerRoleDesc')}
            </p>
          </div>

          <div className="flex items-center text-xs font-semibold text-amber-400 gap-1.5 pt-2 border-t border-zinc-800/80">
            <span>{t(lang, 'controllerRoleButton')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Simulator Shortcut for Desktop Testing */}
      <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xs font-semibold text-zinc-200">
              {t(lang, 'simulatorLink')}
            </h3>
            <p className="text-[11px] text-zinc-400">
              Test both camera and viewfinder side-by-side on one screen
            </p>
          </div>
        </div>
        <button
          onClick={() => onSelectRole('simulated')}
          type="button"
          className="min-h-[40px] px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap"
        >
          Launch Simulator
        </button>
      </div>

      {/* Architecture Badges & Hotspot Advice */}
      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-900">
        <div className="p-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <span className="text-[11px] text-zinc-400 block font-medium">Direct P2P Encrypted</span>
        </div>
        <div className="p-2">
          <Wifi className="w-4 h-4 text-rose-400 mx-auto mb-1" />
          <span className="text-[11px] text-zinc-400 block font-medium">Works on Hotspot</span>
        </div>
        <div className="p-2">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <span className="text-[11px] text-zinc-400 block font-medium">Hardware ISP 4K</span>
        </div>
      </div>
    </div>
  );
};
