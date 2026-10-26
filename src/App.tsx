import React, { useState, useEffect } from 'react';
import { AppRole, ConnectionStatus, Language } from './types';
import { Header } from './components/Header';
import { RoleSelection } from './components/RoleSelection';
import { CameraView } from './components/CameraView';
import { ControllerView } from './components/ControllerView';
import { SimulatedDualScreen } from './components/SimulatedDualScreen';

function generateRoomId(): string {
  // Generate 4-digit code (numbers only for easiest keypad input on mobile)
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function App() {
  const [lang, setLang] = useState<Language>('zh'); // Default to Chinese as requested, with instant EN toggle
  const [role, setRole] = useState<AppRole>('landing');
  const [roomId, setRoomId] = useState<string>(generateRoomId());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

  // Check URL parameters for direct deep-linking (e.g. from QR scan: ?role=controller&room=8392)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramRole = params.get('role');
    const paramRoom = params.get('room');

    if (paramRoom) {
      setRoomId(paramRoom.toUpperCase());
    }

    if (paramRole === 'controller') {
      setRole('controller');
    } else if (paramRole === 'camera') {
      setRole('camera');
    } else if (paramRole === 'simulated') {
      setRole('simulated');
    }
  }, []);

  const handleToggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'zh' : 'en'));
  };

  const handleSelectRole = (newRole: AppRole) => {
    if (newRole === 'camera') {
      // Create new room code if not set
      if (!roomId) setRoomId(generateRoomId());
    }
    setRole(newRole);
  };

  const handleExitRole = () => {
    setRole('landing');
    setConnectionStatus('idle');
    // Clean URL query params without reloading
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Header Bar */}
      <Header
        role={role}
        roomId={roomId}
        lang={lang}
        connectionStatus={connectionStatus}
        onToggleLanguage={handleToggleLanguage}
        onExitRole={handleExitRole}
      />

      {/* Main Role Content */}
      <main className="flex-1 flex flex-col">
        {role === 'landing' && (
          <RoleSelection lang={lang} onSelectRole={handleSelectRole} />
        )}

        {role === 'camera' && (
          <CameraView
            roomId={roomId}
            lang={lang}
            onExit={handleExitRole}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
          />
        )}

        {role === 'controller' && (
          <ControllerView
            roomId={roomId}
            lang={lang}
            onExit={handleExitRole}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            onUpdateRoomId={setRoomId}
          />
        )}

        {role === 'simulated' && (
          <SimulatedDualScreen lang={lang} onExit={handleExitRole} />
        )}
      </main>
    </div>
  );
}
