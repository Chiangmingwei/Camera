import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  FlipHorizontal,
  Grid,
  Image as ImageIcon,
  KeyRound,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Sparkles,
  Volume2,
  Zap,
  ZapOff,
} from 'lucide-react';
import {
  CapturedPhoto,
  ConnectionStatus,
  Language,
  SignalingMessage,
  TimerDuration,
  ZoomLevel,
} from '../types';
import { t } from '../utils/translations';
import { playCountdownBeep, playShutterSound, triggerHaptic } from '../utils/audio';
import { WebRTCManager } from '../utils/webrtc';
import { GalleryModal } from './GalleryModal';
import { PairingModal } from './PairingModal';

interface ControllerViewProps {
  roomId: string;
  lang: Language;
  onExit: () => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  onUpdateRoomId: (newRoomId: string) => void;
}

export const ControllerView: React.FC<ControllerViewProps> = ({
  roomId,
  lang,
  onExit,
  connectionStatus,
  setConnectionStatus,
  onUpdateRoomId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcManagerRef = useRef<WebRTCManager | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [fallbackFrameUrl, setFallbackFrameUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(!roomId);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pro Controls
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(0);
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [remoteFacingMode, setRemoteFacingMode] = useState<'user' | 'environment'>('environment');
  const [remoteTorchOn, setRemoteTorchOn] = useState<boolean>(false);
  const [hasRemoteTorch, setHasRemoteTorch] = useState<boolean>(false);
  const [remoteResolution, setRemoteResolution] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Ensure video element always binds to incoming remote stream immediately upon update
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      console.log('[ControllerView] Attaching remoteStream to video element');
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play interrupted or required user tap:', err);
      });
    }
  }, [remoteStream]);

  // Connect to Camera Phone via WebRTC
  const connectToRoom = useCallback(
    (codeToJoin: string) => {
      if (!codeToJoin) return;
      onUpdateRoomId(codeToJoin);
      setIsPairingModalOpen(false);
      setConnectionStatus('connecting');

      if (rtcManagerRef.current) {
        rtcManagerRef.current.destroy();
      }

      const rtc = new WebRTCManager(codeToJoin, 'controller');
      rtcManagerRef.current = rtc;

      rtc.onConnectionStateChange = (state) => {
        console.log('[ControllerView] RTC connection state:', state);
        if (state === 'connected') {
          setConnectionStatus('connected');
          // Request camera state
          rtc.sendCommand({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            fromRole: 'controller',
            toRole: 'camera',
            type: 'PING',
          });
        } else if (state === 'connecting') {
          setConnectionStatus('connecting');
        } else if (state === 'disconnected') {
          setConnectionStatus('reconnecting');
        } else if (state === 'failed') {
          setConnectionStatus('error');
        }
      };

      rtc.onRemoteStream = (stream) => {
        console.log('[ControllerView] Received remote MediaStream with tracks:', stream.getTracks().length);
        setRemoteStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      };

      // Real-time canvas frame fallback over DataChannel
      rtc.onFrameTick = (frameDataUrl) => {
        setFallbackFrameUrl(frameDataUrl);
      };

      // Listen for commands and status updates from Camera Phone
      rtc.onCommand = (msg: SignalingMessage) => {
        if (msg.type === 'STATE_SYNC') {
          console.log('[ControllerView] Received STATE_SYNC:', msg.payload);
          if (msg.payload?.facingMode) {
            setRemoteFacingMode(msg.payload.facingMode);
          }
          if (msg.payload?.torchOn !== undefined) {
            setRemoteTorchOn(msg.payload.torchOn);
          }
          if (msg.payload?.hasTorch !== undefined) {
            setHasRemoteTorch(msg.payload.hasTorch);
          }
          if (msg.payload?.resolution) {
            setRemoteResolution(msg.payload.resolution);
          }
        }
      };

      // Receive full-res photo from Camera Phone
      rtc.onPhotoReceived = (dataUrl: string) => {
        setIsFlashing(true);
        playShutterSound();
        triggerHaptic([50, 30, 80]);
        setTimeout(() => setIsFlashing(false), 200);

        const newPhoto: CapturedPhoto = {
          id: Math.random().toString(36).substring(2, 9),
          dataUrl,
          timestamp: Date.now(),
          width: remoteResolution.width || 1920,
          height: remoteResolution.height || 1080,
          facingMode: remoteFacingMode,
        };

        setPhotos((prev) => [newPhoto, ...prev]);
        setToastMessage(t(lang, 'photoSavedToast'));
        setTimeout(() => setToastMessage(null), 3000);
      };

      rtc.initPeerConnection();
    },
    [onUpdateRoomId, setConnectionStatus, lang, remoteResolution, remoteFacingMode]
  );

  useEffect(() => {
    if (roomId) {
      connectToRoom(roomId);
    }
    return () => {
      if (rtcManagerRef.current) {
        rtcManagerRef.current.destroy();
      }
    };
  }, [roomId, connectToRoom]);

  // Remote Shutter Trigger Execution
  const handleShutterTrigger = useCallback(() => {
    if (activeCountdown !== null) return;

    if (timerDuration > 0) {
      // Countdown workflow
      let current = timerDuration;
      setActiveCountdown(current);
      playCountdownBeep(false);

      if (rtcManagerRef.current) {
        rtcManagerRef.current.sendCommand({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fromRole: 'controller',
          toRole: 'camera',
          type: 'START_COUNTDOWN',
          payload: { seconds: timerDuration },
        });
      }

      const timer = setInterval(() => {
        current -= 1;
        if (current > 0) {
          setActiveCountdown(current);
          playCountdownBeep(false);
        } else {
          clearInterval(timer);
          setActiveCountdown(null);
          playCountdownBeep(true);
          // Camera phone snaps on its countdown end, and we also signal
          if (rtcManagerRef.current) {
            rtcManagerRef.current.sendCommand({
              id: Math.random().toString(36).substring(2, 9),
              timestamp: Date.now(),
              fromRole: 'controller',
              toRole: 'camera',
              type: 'TRIGGER_SHUTTER',
            });
          }
        }
      }, 1000);
    } else {
      // Instant Trigger
      playShutterSound();
      triggerHaptic([40]);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      if (rtcManagerRef.current) {
        rtcManagerRef.current.sendCommand({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fromRole: 'controller',
          toRole: 'camera',
          type: 'TRIGGER_SHUTTER',
        });
      }
    }
  }, [activeCountdown, timerDuration]);

  // Flip Remote Camera Command
  const handleFlipRemoteCamera = () => {
    triggerHaptic(20);
    const nextMode = remoteFacingMode === 'environment' ? 'user' : 'environment';
    setRemoteFacingMode(nextMode);

    if (rtcManagerRef.current) {
      rtcManagerRef.current.sendCommand({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        fromRole: 'controller',
        toRole: 'camera',
        type: 'FLIP_CAMERA',
      });
    }
  };

  // Toggle Remote Torch
  const handleToggleTorch = () => {
    triggerHaptic(20);
    setRemoteTorchOn((prev) => !prev);
    if (rtcManagerRef.current) {
      rtcManagerRef.current.sendCommand({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        fromRole: 'controller',
        toRole: 'camera',
        type: 'TOGGLE_TORCH',
      });
    }
  };

  // Physical Bluetooth Selfie Clicker & Volume Key Trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'VolumeUp' ||
        e.code === 'VolumeDown' ||
        e.key === 'AudioVolumeUp' ||
        e.key === 'AudioVolumeDown' ||
        e.key === 'Enter'
      ) {
        e.preventDefault();
        handleShutterTrigger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShutterTrigger]);

  const latestPhoto = photos[0];
  const hasActiveVisualFeed = Boolean(remoteStream || fallbackFrameUrl);

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] bg-black overflow-hidden flex flex-col select-none">
      {/* Viewfinder Main Viewport */}
      <div className="relative flex-1 w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
        {/* Permanent video element with smooth scale & mirror */}
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              remoteStream ? 'opacity-100' : 'opacity-0'
            } ${remoteFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Live canvas frame fallback if video track is negotiating */}
          {!remoteStream && fallbackFrameUrl && (
            <img
              src={fallbackFrameUrl}
              alt="Live Remote Feed"
              className={`absolute inset-0 w-full h-full object-cover ${
                remoteFacingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
          )}
        </div>

        {/* Waiting / Connecting Overlay when no feed is received yet */}
        {!hasActiveVisualFeed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4 animate-pulse">
              <Radio className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-zinc-300 mb-2">
              {connectionStatus === 'connecting'
                ? t(lang, 'statusConnecting')
                : t(lang, 'statusWaiting')}
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mb-5">
              {roomId ? `${t(lang, 'roomCodeLabel')}: ${roomId}` : t(lang, 'enterCodeInstruction')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPairingModalOpen(true)}
                type="button"
                className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-medium transition-colors flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{t(lang, 'joinTitle')}</span>
              </button>
              {roomId && (
                <button
                  onClick={() => connectToRoom(roomId)}
                  type="button"
                  className="min-h-[44px] px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                  title="Retry Handshake"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Shutter White Flash Curtain */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-20 ${
            isFlashing ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Rule-of-Thirds Composition Grid */}
        {showGrid && hasActiveVisualFeed && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25 z-10">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div />
          </div>
        )}

        {/* Giant Countdown Overlay */}
        {activeCountdown !== null && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-30">
            <div className="text-8xl md:text-9xl font-extrabold font-mono text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.8)] animate-ping">
              {activeCountdown}
            </div>
          </div>
        )}

        {/* Top HUD Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPairingModalOpen(true)}
              type="button"
              className="pointer-events-auto px-2.5 py-1 rounded-md bg-zinc-950/75 backdrop-blur-md border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' || hasActiveVisualFeed
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold">
                {connectionStatus === 'connected' || hasActiveVisualFeed
                  ? t(lang, 'statusConnected')
                  : roomId || 'Pair'}
              </span>
            </button>

            {hasActiveVisualFeed && (
              <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-zinc-950/75 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase">
                {remoteFacingMode === 'environment' ? 'Rear Sensor' : 'Front Sensor'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid((prev) => !prev)}
              type="button"
              className={`min-h-[38px] min-w-[38px] rounded-lg border flex items-center justify-center backdrop-blur-md transition-colors ${
                showGrid
                  ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                  : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={showGrid ? t(lang, 'gridOff') : t(lang, 'gridOn')}
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Torch Toggle (if supported on camera) */}
            {hasRemoteTorch && (
              <button
                onClick={handleToggleTorch}
                type="button"
                className={`min-h-[38px] min-w-[38px] rounded-lg border flex items-center justify-center backdrop-blur-md transition-colors ${
                  remoteTorchOn
                    ? 'bg-amber-500 border-amber-400 text-zinc-950'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title={remoteTorchOn ? t(lang, 'torchOff') : t(lang, 'torchOn')}
              >
                {remoteTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-zinc-900/95 border border-rose-500/50 shadow-xl text-rose-300 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Pro Shooting Controls Dock (Bottom 35% thumb zone) */}
      <div className="bg-zinc-950 border-t border-zinc-900 p-4 pb-safe select-none z-20">
        {/* Secondary Pro Bar: Zoom & Timer Selectors */}
        <div className="flex items-center justify-between gap-3 mb-4 max-w-sm mx-auto">
          {/* Zoom Segmented Control */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800/80 p-0.5 rounded-xl">
            {([1, 2, 3] as ZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setZoomLevel(lvl);
                  triggerHaptic(15);
                }}
                type="button"
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold font-mono transition-colors ${
                  zoomLevel === lvl
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>

          {/* Timer Selector */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800/80 p-0.5 rounded-xl">
            {([0, 3, 10] as TimerDuration[]).map((dur) => (
              <button
                key={dur}
                onClick={() => {
                  setTimerDuration(dur);
                  triggerHaptic(15);
                }}
                type="button"
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  timerDuration === dur
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span className="font-mono">{dur === 0 ? 'Off' : `${dur}s`}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Row: Gallery - Shutter - Flip */}
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {/* Gallery Thumbnail Preview */}
          <button
            onClick={() => setIsGalleryOpen(true)}
            type="button"
            className="relative min-h-[52px] min-w-[52px] w-13 h-13 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Open Gallery"
          >
            {latestPhoto ? (
              <img
                src={latestPhoto.dataUrl}
                alt="Latest Capture"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-zinc-600" />
            )}
            {photos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-zinc-950">
                {photos.length}
              </span>
            )}
          </button>

          {/* Primary Tactile Shutter Button */}
          <button
            onClick={handleShutterTrigger}
            type="button"
            className="group relative w-20 h-20 rounded-full border-4 border-zinc-100 flex items-center justify-center p-1 active:scale-95 transition-transform focus:outline-none"
            aria-label={t(lang, 'shutterButton')}
          >
            <div className="w-full h-full rounded-full bg-rose-600 group-hover:bg-rose-500 group-active:scale-90 transition-all shadow-lg shadow-rose-950/60 flex items-center justify-center">
              <Camera className="w-7 h-7 text-white stroke-[2.2]" />
            </div>
          </button>

          {/* Remote Flip Camera Button */}
          <button
            onClick={handleFlipRemoteCamera}
            type="button"
            className="min-h-[52px] min-w-[52px] w-13 h-13 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 flex items-center justify-center active:scale-95 transition-transform"
            title={t(lang, 'flipCamera')}
            aria-label="Flip Remote Camera"
          >
            <FlipHorizontal className="w-6 h-6" />
          </button>
        </div>

        {/* Micro Hint */}
        <p className="text-[11px] text-zinc-500 text-center mt-3 font-sans">
          {t(lang, 'bluetoothHint')}
        </p>
      </div>

      {/* Gallery Modal */}
      {isGalleryOpen && (
        <GalleryModal
          photos={photos}
          lang={lang}
          onClose={() => setIsGalleryOpen(false)}
          onDeletePhoto={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
        />
      )}

      {/* Pairing Pin Modal */}
      <PairingModal
        isOpen={isPairingModalOpen}
        lang={lang}
        onClose={() => setIsPairingModalOpen(false)}
        onConnect={(code) => connectToRoom(code)}
      />
    </div>
  );
};
