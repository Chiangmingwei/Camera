# TeleLens (远程取景相机) 📱🎮

> Turn one smartphone into a remote camera rig and a second smartphone into a wireless live viewfinder remote controller to frame and snap photos.

![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)
![React 19](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6.svg)
![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20Streaming-orange.svg)

---

## ✨ Features

- **📱 Camera Phone (Host)**: Mount on a tripod or table. Streams live 60fps video over peer-to-peer WebRTC and captures full-resolution photos on remote trigger.
- **🎮 Controller Phone (Remote)**: Live viewfinder in your hand. Displays the real-time video feed with an interactive camera HUD and pro controls.
- **📷 Hardware ISP Full-Sensor Quality**: Employs the W3C `ImageCapture` API (`takePhoto()`) to capture still frames directly from the camera sensor's hardware Image Signal Processor with full optical resolution, autofocus, and auto-exposure.
- **⚡ Zero-Config Pairing**: Pair devices in seconds via:
  - **QR Code Scanning**: Scan the on-screen QR code from the Camera phone.
  - **4-Digit Room Code**: Enter the 4-digit code using the numeric keypad.
  - **Direct Shareable Link**: Deep-link with room parameters (`?role=controller&room=XXXX`).
- **📶 Outdoor Personal Hotspot Ready**: Works completely offline without public Wi-Fi by enabling Personal Hotspot on one phone and connecting the other phone to it.
- **🎯 Pro Camera Controls**:
  - Tactile Shutter Trigger with synthesized mechanical audio clicks (Web Audio API) and flash animation.
  - Multi-step countdown timer (`Off`, `3s`, `10s`) with audio beeps.
  - Front & Rear camera flip.
  - Digital zoom level selector (`1x`, `2x`, `3x`).
  - Rule-of-thirds composition grid.
  - Bluetooth selfie clicker & volume key trigger support (`VolumeUp`, `VolumeDown`, `Space`, `Enter`).
- **🖼️ Built-in Gallery**: Instant thumbnail preview, full-screen carousel, and direct JPEG download (`telelens_YYYYMMDD_HHMMSS.jpg`).
- **🌐 Bilingual UI**: Seamless English & Simplified Chinese (`EN / 中文`) toggle.
- **🖥️ Desktop Dual-Phone Simulator**: Test both devices side-by-side on a single screen with live video loopback.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          TeleLens                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│     📱 Camera Phone     │               │  🎮 Controller Phone    │
│     (Host / Streamer)   │               │   (Remote Viewfinder)   │
├─────────────────────────┤               ├─────────────────────────┤
│ • MediaStream (4K/1080p)│               │ • Live Viewfinder Feed  │
│ • ImageCapture (ISP)    │               │ • Tactile Shutter       │
│ • QR & Room Code Host   │               │ • Pro Controls (Timer,  │
│ • Remote Trigger Action │               │   Zoom, Flip, Torch)    │
│ • Front / Rear Switch   │               │ • Bluetooth Clicker     │
└────────────┬────────────┘               └────────────┬────────────┘
             │                                         │
             │   1. WebRTC Signaling (Offer / Answer)  │
             │◄──────────────────►◄───────────────────►│
             │                                         │
             │   2. Live WebRTC Video Track (60fps)    │
             ├────────────────────────────────────────►│
             │                                         │
             │   3. RTCDataChannel Commands (Trigger)  │
             │◄────────────────────────────────────────┤
             │                                         │
             │   4. Full-Res JPEG Blob Data Stream     │
             ├────────────────────────────────────────►│
             ▼                                         ▼
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher.
- `npm` or `pnpm` or `yarn`.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/camera.git
cd camera

# Install dependencies
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your computer or mobile browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📤 How to Push to Your GitHub Repository

If you have an existing repository named `camera` on GitHub:

```bash
# Initialize git if not already initialized
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit: TeleLens dual-phone remote camera and viewfinder"

# Rename default branch to main
git branch -M main

# Add your GitHub remote repository (replace with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/camera.git

# Push code to GitHub
git push -u origin main
```

*(If your GitHub repository already contains a README or initial commits, you can use `git pull --rebase origin main` before pushing or `git push -u origin main --force` if you wish to overwrite with the full TeleLens application).*

---

## ☁️ Deployment Guide

### Option 1: Render / Railway / Fly.io / Docker
This application includes `server.ts` with an Express backend that handles WebRTC signaling and serves the static production build:
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (or `node server.ts`)
- **Port**: Configured automatically via `process.env.PORT` (defaults to 3000).

### Option 2: Vercel / Netlify
1. Connect your GitHub repository to Vercel.
2. Set Build Command to `npm run build` and Output Directory to `dist`.

---

## 🔒 Privacy & Permissions
- TeleLens operates strictly **peer-to-peer (P2P)**.
- Captured photos are transferred directly between your devices through encrypted WebRTC channels and stored in your device's browser memory / Downloads folder.
- No photos or camera video frames are ever uploaded to any external cloud database.
