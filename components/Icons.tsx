import React from 'react';

// Removed brackets [] for a cleaner, fresher look

export const SearchIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>搜片</span>
);

export const HeartIcon = ({ className, fill }: { className?: string; fill?: boolean }) => (
  <span className={`font-medium text-lg ${className} ${fill ? 'text-rose-500' : 'text-slate-400'}`}>
    {fill ? '♥' : '♡'}
  </span>
);

export const SettingsIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>换源</span>
);

export const PlayIcon = ({ className, fill }: { className?: string; fill?: boolean }) => (
    <span className={`font-medium ${className}`}>▶</span>
);

export const XIcon = ({ className }: { className?: string }) => (
  <span className={`font-medium ${className}`}>✕</span>
);

export const MenuIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className}`}>菜单</span>
);

export const InfoIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium ${className}`}>详情</span>
);

export const LinkIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>链接</span>
);

export const CopyIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>复制</span>
);

export const TrashIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>删除</span>
);

export const ExportIcon = ({ className }: { className?: string }) => (
    <span className={`font-medium text-xs ${className}`}>导出Word</span>
);