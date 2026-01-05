import React from 'react';
import { VideoItem } from '../types';
import { HeartIcon, PlayIcon } from './Icons';
import LazyImage from './LazyImage';

interface MovieCardProps {
  video: VideoItem;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
  onShowDetails: (e: React.MouseEvent) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ video, onClick, isFavorite, onToggleFav }) => {
  return (
    <div 
        className="group relative flex flex-col cursor-pointer bg-transparent"
        onClick={onClick}
    >
      {/* Image Container with Organic Radius and Shadow */}
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] bg-stone-100 transition-all duration-500 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)] group-hover:-translate-y-1">
        <LazyImage 
            src={video.vod_pic} 
            alt={video.vod_name}
            className="group-hover:scale-105 transition-transform duration-1000 ease-out"
        />
        
        {/* Elegant Rating Tag */}
        {video.vod_score && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-stone-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm z-10 tracking-wide">
                {video.vod_score}
            </div>
        )}

        {/* Play Button Overlay - Centered and Minimal */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-stone-800 scale-90 group-hover:scale-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <PlayIcon className="ml-1 w-5 h-5 text-stone-800" />
            </div>
        </div>
      </div>

      {/* Info Content - Editorial Style */}
      <div className="mt-3 px-1 flex flex-col gap-1">
        <div className="flex justify-between items-start gap-3">
            <h3 className="text-[15px] font-serif font-bold text-stone-800 leading-snug truncate flex-1 group-hover:text-amber-700 transition-colors">
                {video.vod_name}
            </h3>
            <button 
                onClick={onToggleFav}
                className="text-stone-300 hover:text-rose-500 transition-colors active:scale-95 pt-0.5"
            >
                <HeartIcon className="text-base" fill={isFavorite} />
            </button>
        </div>
        
        <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
            <span className="bg-stone-100 px-2 py-0.5 rounded-md text-stone-600 truncate max-w-[40%]">
                {video.vod_class?.split(' ')[0] || '影视'}
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-300"></span>
            <span className="truncate flex-1 font-light tracking-wide">{video.vod_remarks || '更新中'}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;