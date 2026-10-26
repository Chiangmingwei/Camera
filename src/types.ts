export type Language = 'en' | 'zh';

export type AppRole = 'landing' | 'camera' | 'controller' | 'simulated';

export type ConnectionStatus =
  | 'idle'
  | 'generating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
}

export type TimerDuration = 0 | 3 | 10;
export type ZoomLevel = 1 | 2 | 3;
export type FlashMode = 'off' | 'on' | 'auto';

export interface CameraRemoteState {
  facingMode: 'user' | 'environment';
  hasTorch: boolean;
  torchOn: boolean;
  zoom: ZoomLevel;
  maxZoom: number;
  isCapturing: boolean;
  resolution: { width: number; height: number };
}

export interface SignalingMessage {
  id: string;
  timestamp: number;
  fromRole: 'camera' | 'controller';
  toRole: 'camera' | 'controller' | 'all';
  type:
    | 'offer'
    | 'answer'
    | 'candidate'
    | 'TRIGGER_SHUTTER'
    | 'START_COUNTDOWN'
    | 'CANCEL_COUNTDOWN'
    | 'FLIP_CAMERA'
    | 'SET_ZOOM'
    | 'TOGGLE_TORCH'
    | 'PHOTO_CAPTURED'
    | 'STATE_SYNC'
    | 'CONTROLLER_JOINED'
    | 'FRAME_TICK'
    | 'PING'
    | 'PONG'
    | 'DISCONNECT';
  payload?: any;
}
