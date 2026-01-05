import React from 'react';
import { VideoItem } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 transition-opacity" onClick={onClose}>
      <div 
        className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b-2 border-stone-900 p-5 flex justify-between items-center shrink-0">
          <h2 className="font-black text-xl text-stone-900 truncate pr-4 uppercase tracking-wide">{video.vod_name}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-stone-900 bg-red-400 text-white hover:bg-red-500 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[#fffdf5]">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0 mx-auto sm:mx-0">
                <img 
                    src={video.vod_pic} 
                    className="w-36 h-52 object-cover rounded-xl border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                    alt={video.vod_name}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/f5f5f4/57534e?text=无图'; }}
                />
            </div>
            
            <div className="text-sm space-y-3 flex-1 font-medium text-stone-700">
                <div className="flex flex-wrap gap-2 mb-2">
                    {video.vod_score && <span className="bg-yellow-300 border border-stone-900 text-stone-900 px-3 py-1 rounded-md font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">评分 {video.vod_score}</span>}
                    <span className="bg-blue-100 border border-stone-900 text-blue-800 px-3 py-1 rounded-md font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">{video.vod_class || '未知类型'}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                    <p><span className="text-stone-400 font-bold min-w-[3em] inline-block">年份</span> {video.vod_year}</p>
                    <p><span className="text-stone-400 font-bold min-w-[3em] inline-block">地区</span> {video.vod_area}</p>
                    <p><span className="text-stone-400 font-bold min-w-[3em] inline-block">状态</span> {video.vod_remarks}</p>
                    <p><span className="text-stone-400 font-bold min-w-[3em] inline-block">主演</span> <span className="text-stone-900">{video.vod_actor}</span></p>
                    <p><span className="text-stone-400 font-bold min-w-[3em] inline-block">导演</span> <span className="text-stone-900">{video.vod_director}</span></p>
                </div>
            </div>
          </div>

          <div className="bg-white border-2 border-stone-900 rounded-xl p-5 shadow-[4px_4px_0px_0px_#e5e7eb]">
             <h3 className="font-black text-stone-900 mb-3 text-base flex items-center gap-2">
                <span className="w-2 h-2 bg-stone-900 rounded-full"></span> 剧情简介
             </h3>
             <p className="text-sm leading-7 text-stone-600 text-justify whitespace-pre-wrap">
                {stripHtml(video.vod_content || video.vod_blurb)}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetails;