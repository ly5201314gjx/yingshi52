import React from 'react';

// Icons using Stone/Neutral colors by default for the new Natural theme

export const SearchIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className || 'text-stone-400'}`}>🔍</span>
);

export const HeartIcon = ({ className, fill }: { className?: string; fill?: boolean }) => (
  <span className={`font-medium text-lg ${className} ${fill ? 'text-red-500' : 'text-stone-400'}`}>
    {fill ? '♥' : '♡'}
  </span>
);

export const SettingsIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className || 'text-stone-400'}`}>⚙️</span>
);

export const PlayIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className || 'text-stone-400'}`}>▶</span>
);

export const XIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className || 'text-stone-400'}`}>✕</span>
);

export const MenuIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className || 'text-stone-400'}`}>☰</span>
);

export const InfoIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className || 'text-stone-400'}`}>ℹ️</span>
);

export const LinkIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className || 'text-stone-400'}`}>🔗</span>
);

export const CopyIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className || 'text-stone-400'}`}>📋</span>
);

export const TrashIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className || 'text-stone-400'}`}>🗑️</span>
);

export const ExportIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className || 'text-stone-400'}`}>📤</span>
);

export const FilterIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className || 'text-stone-400'}`}>⚡</span>
);