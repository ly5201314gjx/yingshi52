import React from 'react';
import { VideoItem } from '../types';
import { HeartIcon, InfoIcon } from './Icons';

interface MovieCardProps {
  video: VideoItem;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onShowDetails: (e: React.MouseEvent) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ video, onClick, isFavorite, onToggleFav, onShowDetails }) => {
  return (
    <div 
        className="group relative flex flex-col cursor-pointer bg-white rounded-xl border-2 border-stone-800 shadow-[4px_4px_0px_0px_rgba(28,25,23,0.15)] hover:shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] hover:-translate-y-1 transition-all duration-200 overflow-hidden"
        onClick={onClick}
    >
      <div className="relative w-full aspect-[2/3] bg-stone-100 overflow-hidden border-b-2 border-stone-800">
        <img 
            src={video.vod_pic} 
            alt={video.vod_name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/f5f5f4/57534e?text=No+Cover';
            }}
        />
        
        {/* Rating Badge - Comic Bubble */}
        {video.vod_score && (
            <div className="absolute top-2 right-2 bg-yellow-300 border-2 border-black text-black text-xs font-black px-2 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 rotate-3">
                {video.vod_score}
            </div>
        )}

        {/* Details Button */}
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onShowDetails(e);
            }}
            className="absolute top-2 left-2 bg-white border-2 border-black text-black p-1.5 rounded-full hover:bg-blue-300 transition-colors z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100"
            title="详情"
        >
            <InfoIcon className="text-xs" />
        </button>

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      <div className="p-3 bg-white flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-stone-900 leading-tight truncate">
                {video.vod_name}
            </h3>
            <p className="text-xs text-stone-500 truncate mt-1 font-medium bg-stone-100 inline-block px-1 rounded border border-stone-300">
                {video.vod_remarks || '更新中'}
            </p>
        </div>
        <button 
            onClick={onToggleFav}
            className="mt-1 hover:scale-110 transition-transform active:scale-90"
        >
            <HeartIcon className="" fill={isFavorite} />
        </button>
      </div>
    </div>
  );
};

export default MovieCard;