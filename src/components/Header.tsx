import React from 'react';
import { Camera, Gamepad2, Globe, LogOut, Radio } from 'lucide-react';
import { AppRole, ConnectionStatus, Language } from '../types';
import { t } from '../utils/translations';

interface HeaderProps {
  role: AppRole;
  roomId?: string;
  lang: Language;
  connectionStatus: ConnectionStatus;
  onToggleLanguage: () => void;
  onExitRole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  roomId,
  lang,
  connectionStatus,
  onToggleLanguage,
  onExitRole,
}) => {
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'waiting';

  return (
    <header className="sticky top-0 z-30 h-14 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 flex items-center justify-between select-none">
      {/* Brand Zone */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shadow-inner">
          <Camera className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-zinc-100 font-sans">
              TeleLens
            </span>
            {role !== 'landing' && (
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                {role === 'camera' ? '• Host' : role === 'controller' ? '• Remote' : '• Sim'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status & Actions Zone */}
      <div className="flex items-center gap-2">
        {/* Room badge if active */}
        {roomId && role !== 'landing' && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-300">
            <Radio
              className={`w-3 h-3 ${
                isConnected
                  ? 'text-emerald-400 animate-pulse'
                  : isConnecting
                  ? 'text-amber-400 animate-spin'
                  : 'text-zinc-500'
              }`}
            />
            <span className="font-semibold tracking-wider">{roomId}</span>
          </div>
        )}

        {/* Language switch button */}
        <button
          onClick={onToggleLanguage}
          type="button"
          className="min-h-[38px] px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-750 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1.5"
          aria-label="Toggle language"
        >
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tracking-wide">{lang === 'en' ? '中文' : 'EN'}</span>
        </button>

        {/* Exit role button */}
        {role !== 'landing' && (
          <button
            onClick={onExitRole}
            type="button"
            className="min-h-[38px] min-w-[38px] rounded-lg bg-zinc-900 hover:bg-rose-950/40 hover:border-rose-800/60 active:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors flex items-center justify-center"
            title={t(lang, 'backToRoles')}
            aria-label="Exit current mode"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
