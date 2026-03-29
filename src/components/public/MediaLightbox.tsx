import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Image, Video, Globe } from "lucide-react";
import PanoramaViewer from "./PanoramaViewer";

export type MediaItem =
  | { type: "image"; url: string; alt?: string }
  | { type: "video"; url: string; title?: string }
  | { type: "panorama"; url: string };

interface Props {
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const MediaLightbox = ({ items, currentIndex, onClose, onNavigate }: Props) => {
  const item = items[currentIndex];

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  const typeIcon = item.type === "video" ? Video : item.type === "panorama" ? Globe : Image;
  const TypeIcon = typeIcon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95"
        onClick={onClose}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white/80" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-sm">
            <TypeIcon className="h-4 w-4" />
            <span>{currentIndex + 1} / {items.length}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center relative min-h-0 px-16" onClick={(e) => e.stopPropagation()}>
          {/* Prev */}
          {items.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-2 md:left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              {item.type === "image" && (
                <img
                  src={item.url}
                  alt={item.alt ?? ""}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
              {item.type === "video" && (
                <video
                  src={item.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
              {item.type === "panorama" && (
                <div className="w-full h-full max-w-[1200px] max-h-[700px] rounded-lg overflow-hidden">
                  <PanoramaViewer imageUrl={item.url} className="h-full" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Next */}
          {items.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-2 md:right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div
            className="flex gap-2 px-4 py-3 overflow-x-auto justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((m, i) => (
              <button
                key={i}
                onClick={() => onNavigate(i)}
                className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? "border-white ring-2 ring-white/30"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {m.type === "image" || m.type === "panorama" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                )}
                {m.type === "panorama" && (
                  <div className="absolute bottom-0.5 right-0.5 bg-black/60 rounded p-0.5">
                    <Globe className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaLightbox;
