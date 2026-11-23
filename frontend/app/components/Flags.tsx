'use client';
import { useId } from 'react';

// Flags as inline SVG: Windows can't draw flag emojis (they show as "GB"/"SE")
type FlagProps = { className?: string };

// Union Jack, 2:1
export const UkFlag = ({ className }: FlagProps) => {
  // Clip-path ids must be unique on the page (the switch can be rendered twice: desktop and mobile)
  const id = useId();
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <clipPath id={`${id}-s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}-t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
};

// Sweden, 16:10
export const SwedishFlag = ({ className }: FlagProps) => (
  <svg viewBox="0 0 16 10" className={className} aria-hidden>
    <rect width="16" height="10" fill="#006aa7" />
    <rect x="5" width="2" height="10" fill="#fecc02" />
    <rect y="4" width="16" height="2" fill="#fecc02" />
  </svg>
);
