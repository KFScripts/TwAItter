import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Allegato',
  className = 'w-full h-auto object-cover max-h-96',
  containerClassName = 'mt-3 rounded-2xl overflow-hidden border border-twitter-border bg-[#0d0f12]',
  onClick
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`${containerClassName} p-6 flex flex-col items-center justify-center text-center select-none min-h-[140px] bg-gradient-to-b from-[#16181c] to-[#0c0d0f]`}
        onClick={onClick}
      >
        <div className="w-11 h-11 rounded-full bg-[#202327] border border-twitter-border flex items-center justify-center mb-2.5 shadow">
          <ImageOff className="w-5 h-5 text-twitter-muted" />
        </div>
        <span className="text-xs font-semibold text-[#8b98a5]">Immagine non disponibile</span>
        <span className="text-[11px] text-twitter-muted/70 mt-0.5">La risorsa multimediale non è al momento accessibile</span>
      </div>
    );
  }

  return (
    <div className={`${containerClassName} relative group`} onClick={onClick}>
      {isLoading && (
        <div className="w-full h-48 bg-[#16181c] animate-pulse flex items-center justify-center text-xs text-twitter-muted">
          Caricamento immagine...
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`${className} ${isLoading ? 'hidden' : 'block'} hover:scale-[1.005] transition duration-200 ${
          onClick ? 'cursor-pointer' : ''
        }`}
        loading="lazy"
      />
    </div>
  );
};
