import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Camera,
  Check,
  Copy,
  FlipHorizontal,
  Info,
  Maximize2,
  Minimize2,
  QrCode,
  Radio,
  RefreshCw,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { ConnectionStatus, Language, SignalingMessage } from '../types';
import { t } from '../utils/translations';
import { playCountdownBeep, playShutterSound, triggerHaptic } from '../utils/audio';
import { WebRTCManager } from '../utils/webrtc';

interface CameraViewProps {
  roomId: string;
  lang: Language;
  onExit: () => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  roomId,
  lang,
  onExit,
  connectionStatus,
  setConnectionStatus,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const rtcManagerRef = useRef<WebRTCManager | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const facingModeRef = useRef<'environment' | 'user'>('environment');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showPairingSheet, setShowPairingSheet] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [lastShotTime, setLastShotTime] = useState<number | null>(null);
  const [capturedCount, setCapturedCount] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [activeResolution, setActiveResolution] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Keep refs in sync with state
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Generate QR Code with controller join URL
  useEffect(() => {
    const origin = window.location.origin;
    const joinUrl = `${origin}/?role=controller&room=${roomId}`;
    QRCode.toDataURL(
      joinUrl,
      {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [roomId]);

  // High-Resolution Snapshot Capture
  const takeHighResSnapshot = useCallback(async () => {
    const curStream = streamRef.current;
    if (!curStream) return;
    const videoTrack = curStream.getVideoTracks()[0];
    if (!videoTrack) return;

    setIsFlashing(true);
    playShutterSound();
    triggerHaptic([40, 20, 60]);
    setTimeout(() => setIsFlashing(false), 200);

    let photoDataUrl: string | null = null;

    // 1. Preferred Hardware ISP Method: ImageCapture API
    try {
      const ImageCaptureClass = (window as any).ImageCapture;
      if (ImageCaptureClass) {
        const imageCapture = new ImageCaptureClass(videoTrack);
        const blob = await imageCapture.takePhoto({
          imageWidth: 4032,
          imageHeight: 3024,
        });
        photoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn('Native ImageCapture.takePhoto failed or unsupported, fallback to Canvas', e);
    }

    // 2. Fallback: High-resolution canvas capture
    if (!photoDataUrl && videoRef.current && hiddenCanvasRef.current) {
      const video = videoRef.current;
      const canvas = hiddenCanvasRef.current;
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingModeRef.current === 'user') {
          // Unmirror if selfie
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      }
    }

    if (photoDataUrl && rtcManagerRef.current) {
      setLastShotTime(Date.now());
      setCapturedCount((prev) => prev + 1);
      rtcManagerRef.current.sendPhotoDataUrl(photoDataUrl);
    }
  }, []);

  // Sync state to controller
  const broadcastState = useCallback(
    (curStream?: MediaStream, mode?: 'environment' | 'user') => {
      if (!rtcManagerRef.current) return;
      const curMode = mode || facingModeRef.current;
      const s = curStream || streamRef.current;
      const track = s?.getVideoTracks()[0];
      const settings = track?.getSettings();

      rtcManagerRef.current.sendCommand({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        fromRole: 'camera',
        toRole: 'controller',
        type: 'STATE_SYNC',
        payload: {
          facingMode: curMode,
          hasTorch,
          torchOn,
          resolution: {
            width: settings?.width || activeResolution.width,
            height: settings?.height || activeResolution.height,
          },
        },
      });
    },
    [hasTorch, torchOn, activeResolution]
  );

  // Switch Camera with track replacement (fixes flip-once bug)
  const switchCamera = useCallback(
    async (targetMode: 'environment' | 'user') => {
      console.log(`[CameraView] Switching camera to: ${targetMode}`);
      facingModeRef.current = targetMode;
      setFacingMode(targetMode);
      setPermissionError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: targetMode },
            width: { ideal: 3840, min: 1280 },
            height: { ideal: 2160, min: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Stop old tracks cleanly
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        streamRef.current = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }

        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.width && settings.height) {
            setActiveResolution({ width: settings.width, height: settings.height });
          }
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
          setHasTorch(Boolean(capabilities.torch));
        }

        // Replace tracks in WebRTC peer connection
        if (rtcManagerRef.current) {
          await rtcManagerRef.current.replaceTracks(newStream);
        }

        broadcastState(newStream, targetMode);
        return newStream;
      } catch (err: any) {
        console.error('Failed to switch camera:', err);
        setPermissionError(err.message || 'Unable to switch camera');
        return null;
      }
    },
    [broadcastState]
  );

  // Initialize WebRTC and Signaling
  useEffect(() => {
    let active = true;

    async function init() {
      const media = await switchCamera(facingModeRef.current);
      if (!active || !media) return;

      const rtc = new WebRTCManager(roomId, 'camera');
      rtcManagerRef.current = rtc;

      rtc.onConnectionStateChange = (state) => {
        console.log('[CameraView] WebRTC state changed:', state);
        if (state === 'connected') {
          setConnectionStatus('connected');
          setShowPairingSheet(false); // Auto minimize QR sheet once paired!
          broadcastState(media, facingModeRef.current);
        } else if (state === 'connecting') {
          setConnectionStatus('connecting');
        } else if (state === 'disconnected') {
          setConnectionStatus('reconnecting');
        } else if (state === 'failed') {
          setConnectionStatus('error');
        }
      };

      // Listen to commands from controller
      rtc.onCommand = async (msg: SignalingMessage) => {
        if (msg.type === 'TRIGGER_SHUTTER') {
          await takeHighResSnapshot();
        } else if (msg.type === 'START_COUNTDOWN') {
          const seconds = msg.payload?.seconds || 3;
          let current = seconds;
          setCountdown(current);
          playCountdownBeep(false);

          const interval = setInterval(() => {
            current -= 1;
            if (current > 0) {
              setCountdown(current);
              playCountdownBeep(false);
            } else {
              clearInterval(interval);
              setCountdown(null);
              playCountdownBeep(true);
              takeHighResSnapshot();
            }
          }, 1000);
        } else if (msg.type === 'FLIP_CAMERA') {
          // Use facingModeRef to avoid stale closure!
          const current = facingModeRef.current;
          const nextMode = current === 'environment' ? 'user' : 'environment';
          console.log(`[CameraView] Received FLIP_CAMERA command! Current: ${current} -> Next: ${nextMode}`);
          await switchCamera(nextMode);
        } else if (msg.type === 'TOGGLE_TORCH') {
          const curStream = streamRef.current;
          if (curStream) {
            const track = curStream.getVideoTracks()[0];
            if (track && (track.applyConstraints as any)) {
              const nextState = !torchOn;
              try {
                await (track.applyConstraints as any)({
                  advanced: [{ torch: nextState }],
                });
                setTorchOn(nextState);
              } catch {}
            }
          }
        } else if (msg.type === 'PING') {
          broadcastState(streamRef.current || undefined, facingModeRef.current);
        }
      };

      rtc.initPeerConnection(media);
      setConnectionStatus('waiting');

      // Create initial offer
      setTimeout(async () => {
        await rtc.createOffer();
      }, 400);
    }

    init();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (rtcManagerRef.current) {
        rtcManagerRef.current.destroy();
      }
    };
  }, [roomId, switchCamera, takeHighResSnapshot, broadcastState, setConnectionStatus, torchOn]);

  // Live Low-Res Frame Broadcaster (Instant Viewfinder Fallback)
  useEffect(() => {
    if (!stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 270;
    const ctx = canvas.getContext('2d');

    const interval = setInterval(() => {
      if (videoRef.current && ctx && rtcManagerRef.current) {
        if (videoRef.current.readyState >= 2) {
          ctx.drawImage(videoRef.current, 0, 0, 360, 270);
          const previewData = canvas.toDataURL('image/jpeg', 0.45);
          rtcManagerRef.current.sendFrameTick(previewData);
        }
      }
    }, 280);

    return () => clearInterval(interval);
  }, [stream]);

  const handleManualFlip = async () => {
    const current = facingModeRef.current;
    const next = current === 'environment' ? 'user' : 'environment';
    await switchCamera(next);
  };

  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}/?role=controller&room=${roomId}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] bg-black overflow-hidden flex flex-col select-none">
      {/* Hidden high-res capture canvas */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Main Fullscreen Video Viewport */}
      <div className="relative flex-1 w-full h-full bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Shutter White Flash Curtain */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${
            isFlashing ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Giant Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div className="text-8xl md:text-9xl font-extrabold font-mono text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.8)] animate-ping">
              {countdown}
            </div>
          </div>
        )}

        {/* Top Info HUD Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-md bg-zinc-950/75 backdrop-blur-md border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="font-medium">
                {connectionStatus === 'connected'
                  ? t(lang, 'statusConnected')
                  : t(lang, 'statusWaiting')}
              </span>
            </div>

            <div className="hidden sm:flex px-2 py-1 rounded-md bg-zinc-950/75 backdrop-blur-md border border-zinc-800 text-[11px] font-mono text-zinc-400">
              {activeResolution.width}×{activeResolution.height}
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Toggle Pairing Sheet Button */}
            <button
              onClick={() => setShowPairingSheet((prev) => !prev)}
              type="button"
              className={`min-h-[40px] px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors backdrop-blur-md ${
                showPairingSheet
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{roomId}</span>
            </button>
          </div>
        </div>

        {/* Camera Overlay Controls (Bottom Floating Strip) */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-10">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
            <Camera className="w-4 h-4 text-rose-500" />
            <span className="font-mono">
              {facingMode === 'environment' ? t(lang, 'rearCamera') : t(lang, 'frontCamera')}
            </span>
            {capturedCount > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="font-mono text-rose-400">{capturedCount} shots</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualFlip}
              type="button"
              className="min-h-[44px] min-w-[44px] rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center justify-center transition-colors active:scale-95"
              title={t(lang, 'flipCamera')}
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Permission Denied Fallback */}
        {permissionError && (
          <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-400 flex items-center justify-center mb-4">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">
              {t(lang, 'cameraPermissionDenied')}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
              {t(lang, 'cameraPermissionHelp')}
            </p>
            <button
              onClick={() => switchCamera(facingModeRef.current)}
              type="button"
              className="min-h-[44px] px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t(lang, 'tryAgain')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Slide-Up Pairing Sheet / Modal */}
      {showPairingSheet && (
        <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-zinc-100">
                  {t(lang, 'pairingTitle')}
                </h3>
              </div>
              <button
                onClick={() => setShowPairingSheet(false)}
                type="button"
                className="min-h-[38px] min-w-[38px] rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Big 4-Digit Room Code Banner */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center mb-5">
              <span className="text-xs text-zinc-400 uppercase tracking-widest block mb-1">
                {t(lang, 'roomCodeLabel')}
              </span>
              <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-widest text-rose-500">
                {roomId}
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                {t(lang, 'orEnterCode')}
              </p>
            </div>

            {/* High-Contrast QR Code Display */}
            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center mb-5">
                <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-zinc-800">
                  <img
                    src={qrDataUrl}
                    alt="Pairing QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 block rounded-lg"
                  />
                </div>
                <span className="text-xs text-zinc-400 mt-2 font-medium">
                  {t(lang, 'scanQrLabel')}
                </span>
              </div>
            )}

            {/* Copy Pairing Link */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopyLink}
                type="button"
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">{t(lang, 'linkCopied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t(lang, 'copyLink')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Outdoor Hotspot Tip Card */}
            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-start gap-3">
              <Wifi className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-semibold text-zinc-200 block mb-0.5">
                  {t(lang, 'outdoorTipTitle')}
                </span>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  {t(lang, 'outdoorTipDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
