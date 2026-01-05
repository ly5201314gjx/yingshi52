import React from 'react';
import { VideoItem } from '../types';
import { XIcon } from './Icons';
import LazyImage from './LazyImage';

interface VideoDetailsProps {
  video: VideoItem;
  onClose: () => void;
}

const VideoDetails: React.FC<VideoDetailsProps> = ({ video, onClose }) => {
  const stripHtml = (html?: string) => {
    if (!html) return '暂无简介';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-100/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-white ring-1 ring-stone-900/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean Header */}
        <div className="bg-white px-8 py-6 flex justify-between items-start shrink-0 z-10">
          <div className="pr-8">
              <h2 className="font-serif font-bold text-2xl text-stone-900 leading-tight mb-1">{video.vod_name}</h2>
              <p className="text-stone-400 text-sm font-medium tracking-wide">{video.vod_en || 'Movie Details'}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2 scrollbar-hide">
          <div className="flex flex-col md:flex-row gap-10">
            {/* Poster - Floating look */}
            <div className="shrink-0 mx-auto md:mx-0 w-40 md:w-56 aspect-[2/3] rounded-xl shadow-2xl shadow-stone-900/10 overflow-hidden relative bg-stone-100 -rotate-1 md:rotate-0 hover:rotate-0 transition-transform duration-500">
                <LazyImage 
                    src={video.vod_pic} 
                    alt={video.vod_name}
                    className="w-full h-full object-cover"
                />
            </div>
            
            {/* Metadata */}
            <div className="flex-1 space-y-6">
                <div className="flex flex-wrap gap-3">
                    {video.vod_score && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">{video.vod_score}</span>}
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-stone-200">{video.vod_class?.split(' ')[0] || 'Unknown'}</span>
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-stone-200">{video.vod_year}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-sm border-t border-stone-100 pt-6">
                    <div className="grid grid-cols-[60px_1fr] gap-4">
                        <span className="text-stone-400 font-medium text-xs uppercase tracking-widest pt-1">Region</span>
                        <span className="text-stone-800 font-medium">{video.vod_area}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-4">
                        <span className="text-stone-400 font-medium text-xs uppercase tracking-widest pt-1">Status</span>
                        <span className="text-emerald-600 font-bold">{video.vod_remarks}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-4">
                        <span className="text-stone-400 font-medium text-xs uppercase tracking-widest pt-1">Cast</span>
                        <span className="text-stone-700 leading-relaxed">{video.vod_actor}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-4">
                        <span className="text-stone-400 font-medium text-xs uppercase tracking-widest pt-1">Director</span>
                        <span className="text-stone-700">{video.vod_director}</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-stone-100">
             <h3 className="font-serif font-bold text-stone-900 mb-4 text-lg">
                Synopsis
             </h3>
             <p className="text-[15px] leading-8 text-stone-600 text-justify font-light tracking-wide">
                {stripHtml(video.vod_content || video.vod_blurb)}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetails;