import React from 'react';

interface VerifiedBadgeProps {
  type?: 'blue' | 'gold' | 'none';
  size?: number;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  type = 'blue',
  size = 18,
  className = ''
}) => {
  if (type === 'none' || !type) return null;

  if (type === 'gold') {
    return (
      <svg
        viewBox="0 0 22 22"
        width={size}
        height={size}
        aria-label="Account aziendale o software ufficiale verificato"
        className={`inline-block flex-shrink-0 align-text-bottom ${className}`}
      >
        <rect width="22" height="22" rx="4" fill="#eab308" />
        <path
          d="M9.25 15.5L5.5 11.75L6.91 10.34L9.25 12.67L15.09 6.84L16.5 8.25L9.25 15.5Z"
          fill="#000000"
        />
      </svg>
    );
  }

  // Official X / Twitter Blue Verified Badge (Scalloped 8-point circle)
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Profilo verificato"
      className={`inline-block flex-shrink-0 align-text-bottom ${className}`}
    >
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
        fill="#1d9bf0"
      />
    </svg>
  );
};
