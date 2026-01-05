import React, { useEffect, useRef, useState } from 'react';
import { Episode, VideoItem } from '../types';
import { LinkIcon, CopyIcon } from './Icons';
import Hls from 'hls.js';

interface VideoPlayerProps {
  video: VideoItem;
  episodes: Episode[];
  initialEpisodeIndex: number;
  onClose: () => void;
  onUpdateHistory: (vodId: string | number, episodeIndex: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, episodes, initialEpisodeIndex, onClose, onUpdateHistory }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentEpIndex, setCurrentEpIndex] = useState(initialEpisodeIndex);
  const [error, setError] = useState<string | null>(null);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    let currentHls: Hls | null = null;

    const playVideo = (rawUrl: string) => {
      setError(null);
      const videoEl = videoRef.current;
      if (!videoEl) return;

      // Clean up previous HLS instance
      if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
      }

      let url = rawUrl;

      // Optimization 1: Force HTTPS if on HTTPS
      if (window.location.protocol === 'https:' && url.startsWith('http:')) {
           url = url.replace('http:', 'https:');
           console.log("Auto-upgrading video URL to HTTPS:", url);
      }

      // Optimization 2: HLS Configuration
      if (Hls.isSupported() && (url.includes('.m3u8') || !url.includes('.mp4'))) {
        const hls = new Hls({
            maxMaxBufferLength: 30,
            maxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: false,
            xhrSetup: function (xhr: any, url: string) {
                xhr.withCredentials = false; 
            }
        });
        currentHls = hls;
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(videoEl);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoEl.play().catch(e => console.warn("Auto-play blocked", e));
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
                switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("Network error, trying to recover...");
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error("Media error, trying to recover...");
                    hls.recoverMediaError();
                    break;
                default:
                    console.error("Fatal player error:", data);
                    hls.destroy();
                    setError("播放失败 (资源可能已失效或跨域限制)");
                    break;
                }
            }
        });
      } 
      // Native HLS (Safari)
      else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
        videoEl.play().catch(e => console.warn("Auto-play blocked", e));
      } 
      // MP4 / Direct
      else {
        videoEl.src = url;
        videoEl.play().catch(e => {
            console.error("Standard playback failed", e);
            setError("浏览器无法直接播放此格式");
        });
      }
    };

    if (episodes[currentEpIndex]) {
        playVideo(episodes[currentEpIndex].url);
        onUpdateHistory(video.vod_id, currentEpIndex);
    }

    return () => {
        if (currentHls) {
            currentHls.destroy();
        }
    };
  }, [currentEpIndex, episodes, video.vod_id, onUpdateHistory]);

  // Playback Controls
  const handleSpeedChange = (rate: number) => {
      if (videoRef.current) {
          videoRef.current.playbackRate = rate;
          setPlaybackRate(rate);
      }
  };

  const skipTime = (seconds: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime += seconds;
      }
  };

  const openExternal = () => {
      if (episodes[currentEpIndex]) {
          window.open(episodes[currentEpIndex].url, '_blank');
      }
  };
  
  const copyLink = () => {
      if (episodes[currentEpIndex]) {
          navigator.clipboard.writeText(episodes[currentEpIndex].url).then(() => alert("链接已复制"));
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/95 backdrop-blur-sm p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col max-w-6xl mx-auto shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] border-2 border-stone-700 bg-black rounded-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-3 sm:p-4 flex items-center justify-between border-b-2 border-stone-800 shrink-0 z-20">
          <div className="truncate font-bold text-lg flex-1 mr-4">
              {video.vod_name} 
              <span className="text-stone-400 text-sm ml-2 font-normal hidden sm:inline">EP {currentEpIndex + 1} - {episodes[currentEpIndex]?.name}</span>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
                onClick={openExternal}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500 transition-colors border border-blue-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none"
              >
                 <LinkIcon /> 浏览器播放
              </button>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded bg-stone-800 hover:bg-red-600 hover:text-white transition-colors border border-stone-700"
              >
                ✕
              </button>
          </div>
        </div>

        {/* Player Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden group">
            {error ? (
                <div className="text-center p-8 text-white/80 max-w-md bg-stone-900/80 rounded-2xl border-2 border-stone-700 backdrop-blur-md m-4">
                    <p className="text-red-400 mb-4 font-bold text-lg">⚠️ {error}</p>
                    <p className="text-stone-400 mb-6 text-sm leading-relaxed">
                        常见原因：资源地址不支持 HTTPS、跨域限制或链接失效。<br/>
                        建议使用外部浏览器播放。
                    </p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={openExternal}
                            className="w-full px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-blue-50 transition-all border-b-4 border-stone-400 active:border-b-0 active:translate-y-1"
                        >
                            跳转浏览器播放
                        </button>
                        <button 
                            onClick={copyLink}
                            className="w-full px-6 py-2 bg-stone-800 text-stone-300 font-bold rounded-xl hover:text-white hover:bg-stone-700 transition-all border border-stone-600 flex items-center justify-center gap-2"
                        >
                            <CopyIcon /> 复制链接
                        </button>
                    </div>
                </div>
            ) : (
                <video 
                    ref={videoRef} 
                    className="w-full h-full max-h-full" 
                    controls 
                    playsInline 
                    poster={video.vod_pic}
                    crossOrigin="anonymous"
                />
            )}

            {/* Custom Overlay Controls */}
            {!error && (
                <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-6 py-2 rounded-full backdrop-blur-sm pointer-events-auto border border-white/10">
                     <button onClick={() => skipTime(-10)} className="text-white hover:text-yellow-400 font-bold text-xs sm:text-sm flex flex-col items-center active:scale-90 transition-transform">
                        <span>⏪</span>
                        <span className="text-[10px] mt-1">-10s</span>
                     </button>
                     
                     <div className="h-8 w-[1px] bg-white/20"></div>

                     {/* Speed Control */}
                     <div className="flex items-center gap-2">
                         {[0.5, 1.0, 1.25, 1.5, 2.0].map(rate => (
                             <button
                                key={rate}
                                onClick={() => handleSpeedChange(rate)}
                                className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded transition-colors ${playbackRate === rate ? 'bg-white text-black' : 'text-stone-400 hover:text-white bg-white/10'}`}
                             >
                                 {rate}x
                             </button>
                         ))}
                     </div>

                     <div className="h-8 w-[1px] bg-white/20"></div>

                     <button onClick={() => skipTime(10)} className="text-white hover:text-yellow-400 font-bold text-xs sm:text-sm flex flex-col items-center active:scale-90 transition-transform">
                        <span>⏩</span>
                        <span className="text-[10px] mt-1">+10s</span>
                     </button>
                </div>
            )}
        </div>

        {/* Episode Selector Area */}
        <div className="bg-stone-900 shrink-0 pb-safe border-t-2 border-stone-800 z-20">
            <div className="p-3 flex justify-between items-center">
                <h3 className="text-white font-bold text-sm">选集 <span className="text-stone-500 ml-2 font-normal text-xs">{episodes.length} Episodes</span></h3>
                <div className="flex gap-2">
                     <button 
                        onClick={openExternal}
                        className="sm:hidden px-3 py-1 bg-stone-800 border border-stone-600 text-stone-300 hover:text-white text-xs font-bold rounded"
                      >
                         外部播放
                      </button>
                    <button 
                        onClick={() => setShowAllEpisodes(true)}
                        className="text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-300 transition-colors px-3 py-1 rounded shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] border border-black active:translate-y-[1px] active:shadow-none"
                    >
                        全部剧集
                    </button>
                </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
                {episodes.map((ep, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentEpIndex(idx)}
                        className={`
                            flex-shrink-0 px-4 py-2 text-xs sm:text-sm rounded-lg whitespace-nowrap transition-all duration-200 border-2 font-bold
                            ${currentEpIndex === idx 
                                ? 'bg-white border-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-105' 
                                : 'bg-stone-800 border-stone-700 text-stone-500 hover:bg-stone-700 hover:text-white hover:border-stone-500'}
                        `}
                    >
                        {ep.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Expandable Episode Card (Overlay) */}
      {showAllEpisodes && (
        <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowAllEpisodes(false)}>
            <div 
                className="w-full max-w-4xl max-h-[70vh] bg-stone-900 rounded-t-2xl sm:rounded-2xl border-4 border-stone-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom-10 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b-2 border-stone-800 bg-stone-900 rounded-t-lg">
                    <h3 className="text-white font-black text-lg uppercase tracking-wider">全部剧集</h3>
                    <button onClick={() => setShowAllEpisodes(false)} className="text-stone-400 hover:text-white transition-colors text-xl">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 bg-black/50">
                    {episodes.map((ep, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentEpIndex(idx);
                                setShowAllEpisodes(false);
                            }}
                            className={`
                                py-2 px-2 text-xs rounded border transition-all duration-200 font-bold truncate
                                ${currentEpIndex === idx 
                                    ? 'bg-yellow-400 text-black border-yellow-400' 
                                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500 hover:text-white'}
                            `}
                        >
                            {ep.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;