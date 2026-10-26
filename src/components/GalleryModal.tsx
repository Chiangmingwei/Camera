import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { CapturedPhoto, Language } from '../types';
import { t } from '../utils/translations';

interface GalleryModalProps {
  photos: CapturedPhoto[];
  initialIndex?: number;
  lang: Language;
  onClose: () => void;
  onDeletePhoto: (id: string) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  photos,
  initialIndex = 0,
  lang,
  onClose,
  onDeletePhoto,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, photos.length - 1))
  );

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">
          {t(lang, 'galleryTitle')}
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs mb-6">
          {t(lang, 'noPhotos')}
        </p>
        <button
          onClick={onClose}
          type="button"
          className="min-h-[44px] px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
        >
          {t(lang, 'close')}
        </button>
      </div>
    );
  }

  const current = photos[currentIndex] || photos[0];

  const handleDownload = () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = current.dataUrl;
    const dateStr = new Date(current.timestamp)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    a.download = `telelens_${dateStr}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!current || !navigator.share) return;
    try {
      // Convert dataUrl to blob
      const res = await fetch(current.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'telelens_capture.jpg', { type: 'image/jpeg' });
      await navigator.share({
        files: [file],
        title: 'TeleLens Capture',
      });
    } catch {
      // Handled or user cancelled
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleDelete = () => {
    if (!current) return;
    onDeletePhoto(current.id);
    if (currentIndex >= photos.length - 1) {
      setCurrentIndex(Math.max(0, photos.length - 2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* Top Bar */}
      <div className="h-14 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            type="button"
            className="min-h-[44px] min-w-[44px] -ml-2 rounded-lg text-zinc-300 hover:text-white flex items-center justify-center"
            aria-label="Close gallery"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span>
              {currentIndex + 1} / {photos.length}
            </span>
            <span>·</span>
            <span>{current.width}×{current.height}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleShare}
              type="button"
              className="min-h-[44px] min-w-[44px] rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center"
              title={t(lang, 'sharePhoto')}
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleDelete}
            type="button"
            className="min-h-[44px] min-w-[44px] rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors flex items-center justify-center"
            title={t(lang, 'deletePhoto')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <img
          src={current.dataUrl}
          alt="Captured Still"
          className="max-h-full max-w-full object-contain pointer-events-auto"
        />

        {/* Carousel arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-zinc-900/70 border border-zinc-700/50 text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-zinc-900/70 border border-zinc-700/50 text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 flex items-center justify-between pb-safe">
        <span className="text-xs text-zinc-500 font-mono">
          {new Date(current.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>

        <button
          onClick={handleDownload}
          type="button"
          className="min-h-[46px] px-5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{t(lang, 'downloadPhoto')}</span>
        </button>
      </div>
    </div>
  );
};
