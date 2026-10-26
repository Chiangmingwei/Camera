import React, { useState } from 'react';
import { Camera, Delete, KeyRound, QrCode, Sparkles, X } from 'lucide-react';
import { Language } from '../types';
import { t } from '../utils/translations';

interface PairingModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onConnect: (code: string) => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  lang,
  onClose,
  onConnect,
}) => {
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (code.length < 4) {
      const next = (code + digit).toUpperCase();
      setCode(next);
      setErrorMsg('');
      if (next.length === 4) {
        // Auto connect when 4 digits reached
        setTimeout(() => {
          onConnect(next);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setCode((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 4) {
      onConnect(code);
    } else {
      setErrorMsg(t(lang, 'invalidCode'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-base">
            <KeyRound className="w-5 h-5 text-rose-500" />
            <span>{t(lang, 'joinTitle')}</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="min-h-[40px] min-w-[40px] rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          {t(lang, 'enterCodeInstruction')}
        </p>

        {/* 4-Box PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const char = code[idx] || '';
            const isFilled = Boolean(char);
            const isCurrent = code.length === idx;
            return (
              <div
                key={idx}
                className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                  isFilled
                    ? 'bg-zinc-800 border-2 border-rose-500 text-white shadow-lg shadow-rose-950/20'
                    : isCurrent
                    ? 'bg-zinc-950 border-2 border-zinc-600 text-zinc-300 ring-2 ring-rose-500/30'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-600'
                }`}
              >
                {char}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 text-center mb-3 font-medium">
            {errorMsg}
          </p>
        )}

        {/* Numeric On-Screen Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="min-h-[52px] rounded-xl bg-zinc-800/80 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-100 text-xl font-mono font-semibold transition-colors flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="col-start-2 min-h-[52px] rounded-xl bg-zinc-800/80 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-100 text-xl font-mono font-semibold transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="min-h-[52px] rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Quick Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCode('8888');
              setTimeout(() => onConnect('8888'), 150);
            }}
            className="flex-1 min-h-[42px] px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t(lang, 'quickDemoCode')} (8888)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
