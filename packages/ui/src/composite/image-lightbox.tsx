import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../lib/cn.js';

export interface LightboxImage {
  id: string;
  url: string;
  alt?: string | null;
}

export interface ImageLightboxProps {
  images: LightboxImage[];
  /** Index to show when opened; `null` keeps the lightbox closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Announced to screen readers - usually the product name. */
  title?: string;
}

/**
 * Full-screen image viewer with keyboard/arrow navigation, a thumbnail rail
 * and a click-to-zoom toggle. Used by the product page for both the gallery
 * carousel and the long "Product Details" panels.
 */
export function ImageLightbox({ images, index, onIndexChange, onClose, title }: ImageLightboxProps) {
  const open = index !== null;
  const [zoomed, setZoomed] = React.useState(false);
  const current = index !== null ? images[index] : undefined;

  const go = React.useCallback(
    (delta: number) => {
      if (index === null || images.length === 0) return;
      setZoomed(false);
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  React.useEffect(() => {
    if (!open) setZoomed(false);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{title ?? 'Image viewer'}</DialogPrimitive.Title>

          <div className="flex items-center justify-between p-3 text-white">
            <span className="num rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums">
              {(index ?? 0) + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomed((z) => !z)}
                className="rounded-md p-2 opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
              >
                {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
              </button>
              <DialogPrimitive.Close
                className="rounded-md p-2 opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className={cn('relative flex min-h-0 flex-1 items-center justify-center px-2', zoomed && 'overflow-auto')}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            {current ? (
              <img
                src={current.url}
                alt={current.alt ?? title ?? ''}
                onClick={() => setZoomed((z) => !z)}
                className={cn(
                  'select-none transition-transform duration-200',
                  zoomed
                    ? 'max-w-none cursor-zoom-out'
                    : 'max-h-full max-w-full cursor-zoom-in object-contain',
                )}
                style={zoomed ? { width: '160%' } : undefined}
              />
            ) : null}

            {images.length > 1 ? (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                  className="absolute left-2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Next image"
                  className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto p-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => {
                    setZoomed(false);
                    onIndexChange(i);
                  }}
                  aria-label={`Image ${i + 1}`}
                  className={cn(
                    'size-12 shrink-0 overflow-hidden rounded-md border-2 transition-opacity',
                    i === index ? 'border-primary opacity-100' : 'border-transparent opacity-50 hover:opacity-90',
                  )}
                >
                  <img src={img.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
