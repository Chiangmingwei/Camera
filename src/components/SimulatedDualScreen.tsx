import React, { useState } from 'react';
import { CameraView } from './CameraView';
import { ControllerView } from './ControllerView';
import { ConnectionStatus, Language } from '../types';
import { Smartphone, RotateCcw } from 'lucide-react';

interface SimulatedDualScreenProps {
  lang: Language;
  onExit: () => void;
}

export const SimulatedDualScreen: React.FC<SimulatedDualScreenProps> = ({ lang, onExit }) => {
  const [roomId, setRoomId] = useState('8888');
  const [cameraConn, setCameraConn] = useState<ConnectionStatus>('waiting');
  const [controllerConn, setControllerConn] = useState<ConnectionStatus>('connected');

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-zinc-950 p-3 sm:p-6 flex flex-col items-center">
      {/* Banner */}
      <div className="w-full max-w-5xl mb-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">
              Interactive Dual-Phone Sandbox (Room: {roomId})
            </h2>
            <p className="text-xs text-zinc-400">
              Left simulates the Camera Phone mounted on a tripod; Right simulates the Controller in your hand.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
            setRoomId(nextCode);
          }}
          type="button"
          className="min-h-[38px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Room Code</span>
        </button>
      </div>

      {/* Side-by-Side Dual Mock Phone Frames */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start justify-center">
        {/* Device A: Camera Phone */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">
            <span>📱 Camera Phone (Host)</span>
          </div>
          <div className="w-full max-w-[390px] h-[640px] rounded-[36px] bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col">
            <CameraView
              roomId={roomId}
              lang={lang}
              onExit={onExit}
              connectionStatus={cameraConn}
              setConnectionStatus={setCameraConn}
            />
          </div>
        </div>

        {/* Device B: Controller Phone */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
            <span>🎮 Controller Phone (Remote)</span>
          </div>
          <div className="w-full max-w-[390px] h-[640px] rounded-[36px] bg-black border-4 border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col">
            <ControllerView
              roomId={roomId}
              lang={lang}
              onExit={onExit}
              connectionStatus={controllerConn}
              setConnectionStatus={setControllerConn}
              onUpdateRoomId={setRoomId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
