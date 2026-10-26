import { SignalingMessage } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
};

const CHUNK_SIZE = 16 * 1024; // 16KB for safe WebRTC DataChannel chunks

export class WebRTCManager {
  public pc: RTCPeerConnection | null = null;
  public dataChannel: RTCDataChannel | null = null;
  public roomId: string;
  public role: 'camera' | 'controller';
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: any = null;
  private lastPollTimestamp = 0;
  private isDestroyed = false;

  // ICE Candidates queue (essential for mobile P2P when candidates arrive before remoteDescription)
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  // Callbacks
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onCommand?: (command: SignalingMessage) => void;
  public onPhotoReceived?: (photoDataUrl: string) => void;
  public onFrameTick?: (frameDataUrl: string) => void;

  // Incoming chunk assembly
  private incomingPhotoChunks: string[] = [];
  private expectedChunks = 0;

  constructor(roomId: string, role: 'camera' | 'controller') {
    this.roomId = roomId.toUpperCase();
    this.role = role;

    // Set up local BroadcastChannel for same-origin tabs / simulated preview
    try {
      this.broadcastChannel = new BroadcastChannel(`telelens-${this.roomId}`);
      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data as SignalingMessage;
        if (msg && msg.fromRole !== this.role) {
          this.handleSignalingMessage(msg);
        }
      };
    } catch {
      // BroadcastChannel not available in all contexts
    }
  }

  public initPeerConnection(localStream?: MediaStream) {
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
    }

    this.pendingIceCandidates = [];
    this.pc = new RTCPeerConnection(RTC_CONFIG);

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateChange) {
        console.log(`[WebRTC ${this.role}] Connection state:`, this.pc.connectionState);
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC ${this.role}] ICE connection state:`, this.pc?.iceConnectionState);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fromRole: this.role,
          toRole: this.role === 'camera' ? 'controller' : 'camera',
          type: 'candidate',
          payload: event.candidate.toJSON(),
        });
      }
    };

    if (this.role === 'controller') {
      this.pc.ontrack = (event) => {
        console.log('[WebRTC Controller] ontrack received:', event.track.kind);
        let stream = event.streams && event.streams[0] ? event.streams[0] : null;
        if (!stream && event.track) {
          stream = new MediaStream([event.track]);
        }
        if (stream && this.onRemoteStream) {
          this.onRemoteStream(stream);
        }
        event.track.onunmute = () => {
          console.log('[WebRTC Controller] Track unmuted');
          if (stream && this.onRemoteStream) {
            this.onRemoteStream(stream);
          }
        };
      };

      // Listen for data channel created by Camera
      this.pc.ondatachannel = (event) => {
        console.log('[WebRTC Controller] DataChannel received from camera');
        this.setupDataChannel(event.channel);
      };
    }

    if (this.role === 'camera') {
      // Camera adds video track to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          console.log('[WebRTC Camera] Adding track:', track.kind, track.label);
          this.pc?.addTrack(track, localStream);
        });
      }

      // Camera initiates DataChannel for low latency commands
      try {
        const dc = this.pc.createDataChannel('telelens-ctrl', {
          ordered: true,
        });
        this.setupDataChannel(dc);
      } catch (e) {
        console.warn('Failed to create data channel on camera', e);
      }
    }

    // Start signaling polling
    this.startPolling();

    // If Controller, announce readiness so Camera can send a fresh offer
    if (this.role === 'controller') {
      setTimeout(() => {
        this.sendSignalingMessage({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fromRole: 'controller',
          toRole: 'camera',
          type: 'CONTROLLER_JOINED',
        });
      }, 200);
    }
  }

  public async replaceTracks(newStream: MediaStream) {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (newVideoTrack) {
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        try {
          await videoSender.replaceTrack(newVideoTrack);
          console.log('[WebRTC Camera] Track replaced successfully');
          return;
        } catch (e) {
          console.warn('[WebRTC Camera] replaceTrack failed, renegotiating', e);
        }
      } else {
        this.pc.addTrack(newVideoTrack, newStream);
      }
      // Re-create offer if replaceTrack wasn't sufficient
      await this.createOffer();
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log(`[WebRTC ${this.role}] DataChannel open!`);
      this.sendCommand({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        fromRole: this.role,
        toRole: this.role === 'camera' ? 'controller' : 'camera',
        type: 'PING',
      });
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const raw = event.data;
        if (typeof raw === 'string') {
          // Check for chunked photo header
          if (raw.startsWith('__PHOTO_START__:')) {
            const parts = raw.split(':');
            this.expectedChunks = parseInt(parts[1], 10) || 0;
            this.incomingPhotoChunks = [];
            return;
          }
          if (raw === '__PHOTO_END__') {
            const fullDataUrl = this.incomingPhotoChunks.join('');
            this.incomingPhotoChunks = [];
            if (this.onPhotoReceived) {
              this.onPhotoReceived(fullDataUrl);
            }
            return;
          }
          if (raw.startsWith('__PCHUNK__:')) {
            this.incomingPhotoChunks.push(raw.substring('__PCHUNK__:'.length));
            return;
          }

          // Live frame tick fallback over DataChannel
          if (raw.startsWith('__FRAME__:')) {
            const frameData = raw.substring('__FRAME__:'.length);
            if (this.onFrameTick) {
              this.onFrameTick(frameData);
            }
            return;
          }

          // Regular command
          const parsed = JSON.parse(raw) as SignalingMessage;
          if (parsed && this.onCommand) {
            this.onCommand(parsed);
          }
        }
      } catch (err) {
        console.error('Error handling data channel message', err);
      }
    };
  }

  public sendCommand(msg: SignalingMessage) {
    // 1. Send over RTCDataChannel if open
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(msg));
        return;
      } catch (err) {
        console.warn('DataChannel send failed, falling back to signaling', err);
      }
    }

    // 2. Fallback to HTTP signaling / BroadcastChannel
    this.sendSignalingMessage(msg);
  }

  public sendFrameTick(frameDataUrl: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(`__FRAME__:${frameDataUrl}`);
        return;
      } catch {}
    }
  }

  public sendPhotoDataUrl(dataUrl: string) {
    // If DataChannel is open, chunk and send
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        const chunks: string[] = [];
        for (let i = 0; i < dataUrl.length; i += CHUNK_SIZE) {
          chunks.push(dataUrl.substring(i, i + CHUNK_SIZE));
        }

        this.dataChannel.send(`__PHOTO_START__:${chunks.length}`);
        for (const chunk of chunks) {
          this.dataChannel.send(`__PCHUNK__:${chunk}`);
        }
        this.dataChannel.send('__PHOTO_END__');
        return;
      } catch (e) {
        console.warn('DataChannel photo send failed, using signaling fallback', e);
      }
    }

    // Fallback: Send through signaling bus
    this.sendSignalingMessage({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      fromRole: this.role,
      toRole: 'controller',
      type: 'PHOTO_CAPTURED',
      payload: { dataUrl },
    });
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;
    try {
      console.log('[WebRTC Camera] Creating new SDP offer...');
      const offer = await this.pc.createOffer({
        offerToReceiveVideo: this.role === 'controller',
        offerToReceiveAudio: false,
      });
      await this.pc.setLocalDescription(offer);

      await this.sendSignalingMessage({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        fromRole: this.role,
        toRole: 'controller',
        type: 'offer',
        payload: offer,
      });

      return offer;
    } catch (e) {
      console.error('Failed to create offer', e);
      return null;
    }
  }

  private async drainPendingCandidates() {
    if (!this.pc || !this.pc.remoteDescription) return;
    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    for (const cand of candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Failed to add queued candidate:', e);
      }
    }
  }

  private async handleSignalingMessage(msg: SignalingMessage) {
    if (!this.pc || this.isDestroyed) return;

    try {
      if (msg.type === 'CONTROLLER_JOINED' && this.role === 'camera') {
        console.log('[WebRTC Camera] Controller joined room! Generating fresh offer...');
        await this.createOffer();
      } else if (msg.type === 'offer' && this.role === 'controller') {
        console.log('[WebRTC Controller] Received offer, setting remoteDescription...');
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        // Drain any candidates that arrived while setting remote description
        await this.drainPendingCandidates();

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        await this.sendSignalingMessage({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          fromRole: this.role,
          toRole: 'camera',
          type: 'answer',
          payload: answer,
        });
      } else if (msg.type === 'answer' && this.role === 'camera') {
        console.log('[WebRTC Camera] Received answer, setting remoteDescription...');
        if (this.pc.signalingState !== 'stable') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          await this.drainPendingCandidates();
        }
      } else if (msg.type === 'candidate') {
        if (!msg.payload) return;
        if (!this.pc.remoteDescription) {
          // Buffer candidate until remote description is ready!
          this.pendingIceCandidates.push(msg.payload);
        } else {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
          } catch (candErr) {
            console.warn('ICE candidate addition delayed or ignored', candErr);
          }
        }
      } else if (msg.type === 'PHOTO_CAPTURED' && this.role === 'controller') {
        if (msg.payload && msg.payload.dataUrl && this.onPhotoReceived) {
          this.onPhotoReceived(msg.payload.dataUrl);
        }
      } else {
        // Other command messages (e.g. FLIP_CAMERA, TRIGGER_SHUTTER, etc.)
        if (this.onCommand) {
          this.onCommand(msg);
        }
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  }

  public async sendSignalingMessage(msg: SignalingMessage) {
    if (this.isDestroyed) return;

    // 1. Broadcast locally
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(msg);
      }
    } catch {}

    // 2. Post to backend signaling endpoint
    try {
      await fetch(`/api/signal/rooms/${this.roomId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch {
      // Local or offline
    }
  }

  private startPolling() {
    if (this.pollInterval) return;

    // Register presence
    fetch(`/api/signal/rooms/${this.roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: this.role }),
    }).catch(() => {});

    // Fast polling (350ms) for snappy handshake
    this.pollInterval = setInterval(async () => {
      if (this.isDestroyed) return;
      try {
        const res = await fetch(
          `/api/signal/rooms/${this.roomId}/messages?role=${this.role}&since=${this.lastPollTimestamp}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.now) {
          this.lastPollTimestamp = data.now;
        }

        if (Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            this.handleSignalingMessage(msg);
          }
        }
      } catch {
        // Offline / network hitch
      }
    }, 350);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
  }
}
