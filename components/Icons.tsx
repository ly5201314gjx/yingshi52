import React from 'react';

// Removed brackets [] for a cleaner, fresher look

export const SearchIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>🔍</span>
);

export const HeartIcon = ({ className, fill }: { className?: string; fill?: boolean }) => (
  <span className={`font-medium text-lg ${className} ${fill ? 'text-rose-500' : 'text-slate-400'}`}>
    {fill ? '♥' : '♡'}
  </span>
);

export const SettingsIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>⚙️</span>
);

export const PlayIcon = ({ className, fill }: { className?: string; fill?: boolean }) => (
    <span className={`font-medium ${className}`}>▶</span>
);

export const XIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>✕</span>
);

export const MenuIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className}`}>☰</span>
);

export const InfoIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className}`}>ℹ️</span>
);

export const LinkIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>🔗</span>
);

export const CopyIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>📋</span>
);

export const TrashIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>🗑️</span>
);

export const ExportIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>📤</span>
);

export const FilterIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className}`}>⚡</span>
);