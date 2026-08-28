import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  className = 'w-10 h-10',
  size,
  onClick
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  const getInitials = (text: string) => {
    const clean = text.replace(/[@#]/g, '').trim();
    if (!clean) return 'U';
    const words = clean.split(/\s+/);
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getGradient = (text: string) => {
    const palettes = [
      'from-blue-600 to-indigo-800',
      'from-purple-600 to-pink-800',
      'from-emerald-600 to-teal-800',
      'from-amber-600 to-orange-800',
      'from-cyan-600 to-blue-800',
      'from-rose-600 to-red-800',
      'from-violet-600 to-purple-800',
      'from-fuchsia-600 to-pink-800'
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
  };

  if (!src || hasError) {
    const initials = getInitials(alt);
    const gradient = getGradient(alt);

    return (
      <div
        style={style}
        onClick={onClick}
        className={`${className} rounded-full bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs select-none shadow-inner ${
          onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
        }`}
        title={alt}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onClick={onClick}
      onError={() => setHasError(true)}
      className={`${className} rounded-full object-cover border border-twitter-border/40 flex-shrink-0 ${
        onClick ? 'cursor-pointer hover:opacity-90 transition' : ''
      }`}
      loading="lazy"
    />
  );
};
