import React, { useEffect, useRef, useState } from 'react';
import { Episode, VideoItem } from '../types';
import { LinkIcon, CopyIcon, PlayIcon, XIcon, InfoIcon } from './Icons';
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
  const [isLoading, setIsLoading] = useState(true);
  const hlsRef = useRef<Hls | null>(null);

  // Determine if we are on a mobile device roughly
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    let currentHls: Hls | null = null;
    setIsLoading(true);
    setError(null);

    const playVideo = (rawUrl: string) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      // Reset Hls instance
      if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
      }
      // Do not clear src immediately to prevent flashing black screen on some devices if quick switching, 
      // but strictly necessary for HLS switch.
      videoEl.removeAttribute('src'); 
      videoEl.load();

      let url = rawUrl;

      // Optimistic Protocol Upgrade: Try to use HTTPS if we are on HTTPS
      if (window.location.protocol === 'https:' && url.startsWith('http:')) {
           url = url.replace('http:', 'https:'); 
      }

      const isM3U8 = url.includes('.m3u8');

      // Priority 1: Native HLS (Safari / iOS / Android Chrome)
      // We prioritize Native HLS because it handles cross-origin streams much better than JS 
      // when headers are missing (common in pirate sites).
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
        videoEl.load();
        
        const handleNativePlay = () => {
             setIsLoading(false);
             videoEl.play().catch(e => console.warn("Auto-play blocked", e));
        };

        // Listen for loadedmetadata or canplay to stop loading spinner
        videoEl.addEventListener('loadedmetadata', handleNativePlay, { once: true });
        
      } 
      // Priority 2: Hls.js
      else if (Hls.isSupported() && isM3U8) {
        const hls = new Hls({
            maxMaxBufferLength: 30,
            enableWorker: true,
            // Critical: Disable credentials to prevent strict CORS issues on public APIs
            xhrSetup: function (xhr, url) {
                xhr.withCredentials = false; 
            },
            // Relaxed error handling for unstable streams
            manifestLoadingTimeOut: 15000,
            fragLoadingTimeOut: 20000,
            levelLoadingTimeOut: 15000,
        });
        currentHls = hls;
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(videoEl);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          videoEl.play().catch(e => console.warn("Auto-play blocked", e));
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            // Filter out non-fatal errors to prevent UI flickering
            if (data.fatal) {
                switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.warn("HLS Network error, recovering...");
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.warn("HLS Media error, recovering...");
                    hls.recoverMediaError();
                    break;
                default:
                    console.error("Fatal HLS error:", data);
                    hls.destroy();
                    setIsLoading(false);
                    setError("内置播放器加载失败"); 
                    break;
                }
            }
        });
      } 
      // Priority 3: Standard Native Playback (MP4 etc)
      else {
        videoEl.src = url;
        videoEl.load();
        videoEl.play()
            .then(() => setIsLoading(false))
            .catch(e => {
            console.error("Standard playback failed", e);
            setIsLoading(false);
            setError("浏览器不支持此格式");
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
        // Cleanup event listeners if added manually
    };
  }, [currentEpIndex, episodes, video.vod_id, onUpdateHistory]);

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

  // Open in new tab (External Browser)
  const openExternal = () => {
      if (episodes[currentEpIndex]) {
          window.open(episodes[currentEpIndex].url, '_blank');
      }
  };

  // Force location change (Internal Browser / PWA Webview navigation)
  const openInternal = () => {
     if (episodes[currentEpIndex]) {
         window.location.href = episodes[currentEpIndex].url;
     }
  };
  
  const copyLink = () => {
      if (episodes[currentEpIndex]) {
          navigator.clipboard.writeText(episodes[currentEpIndex].url).then(() => alert("链接已复制"));
      }
  };

  // Error Recovery UI Component
  const ErrorState = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-stone-900/90 z-20 text-center animate-in fade-in">
        <div className="bg-stone-800 p-8 rounded-3xl border border-stone-700 shadow-2xl max-w-sm w-full">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-white font-serif font-bold text-xl mb-2">无法在当前页面播放</h3>
            <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                视频源可能存在跨域限制。请选择以下方式继续观看：
            </p>
            
            <div className="space-y-3">
                <button 
                    onClick={openInternal}
                    className="w-full py-4 px-6 rounded-2xl bg-white text-stone-900 font-bold text-sm hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                >
                    <PlayIcon className="text-stone-900 w-4 h-4" /> 浏览器内直接播放
                </button>
                
                <button 
                    onClick={openExternal}
                    className="w-full py-4 px-6 rounded-2xl bg-stone-700 text-white font-bold text-sm hover:bg-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <LinkIcon className="text-white w-4 h-4" /> 跳出到外部浏览器
                </button>

                <button 
                    onClick={copyLink}
                    className="w-full py-4 px-6 rounded-2xl border border-stone-600 text-stone-300 font-bold text-sm hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                >
                    <CopyIcon className="text-stone-400 w-4 h-4" /> 复制视频链接
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full h-full flex flex-col md:max-w-6xl md:h-[90vh] md:rounded-3xl md:overflow-hidden bg-black shadow-2xl relative md:border md:border-stone-800">
        
        {/* Floating Header */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all">
                  <XIcon />
              </button>
              <div className="text-shadow-sm">
                <h2 className="text-white font-serif font-bold text-base md:text-xl line-clamp-1">{video.vod_name}</h2>
                <p className="text-stone-300 text-xs md:text-sm font-medium tracking-wide">
                    EP {currentEpIndex + 1} <span className="opacity-50 mx-1">/</span> {episodes[currentEpIndex]?.name}
                </p>
              </div>
          </div>
          
          <div className="pointer-events-auto flex gap-3">
             <button onClick={openInternal} className="hidden md:flex px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur gap-2 items-center transition-all border border-white/5">
                 <LinkIcon className="text-white" /> 浏览器播放
             </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 group overflow-hidden">
            {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}
            
            {error && <ErrorState />}

            {/* 
                CRITICAL FIXES for PWA/Mobile Playback:
                1. Removed `crossOrigin="anonymous"`: This allows opaque responses (playing without CORS headers).
                2. Added `playsInline webkit-playsinline`: Prevents iOS from forcing fullscreen immediately.
                3. Added `x5-video-*`: Optimizes for Tencent X5 kernel (WeChat/QQ Browser).
            */}
            <video 
                ref={videoRef} 
                className="w-full h-full object-contain focus:outline-none" 
                controls 
                playsInline 
                webkit-playsinline="true"
                x5-video-player-type="h5"
                x5-video-player-fullscreen="true"
                poster={video.vod_pic}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setError("播放错误");
                }}
            />

            {/* Desktop Overlay Controls */}
            {!error && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-stone-900/60 px-6 py-2.5 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto transform translate-y-4 group-hover:translate-y-0 hidden md:flex">
                     <button onClick={() => skipTime(-15)} className="text-stone-300 hover:text-white flex flex-col items-center gap-0.5 transition-colors p-2">
                        <span className="text-lg">↺</span>
                     </button>
                     
                     <div className="h-6 w-px bg-white/10 mx-2"></div>

                     <div className="flex items-center gap-1">
                         {[1.0, 1.25, 1.5, 2.0].map(rate => (
                             <button
                                key={rate}
                                onClick={() => handleSpeedChange(rate)}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${playbackRate === rate ? 'bg-white text-black' : 'text-stone-400 hover:text-white'}`}
                             >
                                 {rate}x
                             </button>
                         ))}
                     </div>

                     <div className="h-6 w-px bg-white/10 mx-2"></div>

                     <button onClick={() => skipTime(15)} className="text-stone-300 hover:text-white flex flex-col items-center gap-0.5 transition-colors p-2">
                        <span className="text-lg">↻</span>
                     </button>
                </div>
            )}
        </div>

        {/* Footer / Playlist */}
        <div className="bg-[#0f0f0f] border-t border-white/5 shrink-0 z-20 pb-safe">
            <div className="px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-stone-200 font-bold text-sm tracking-wide">选集</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">{episodes.length}</span>
                </div>
                
                <div className="flex gap-3">
                     <button 
                        onClick={openInternal}
                        className="md:hidden px-4 py-2 bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold rounded-full flex items-center gap-2 active:scale-95 transition-transform"
                      >
                         <PlayIcon className="w-3 h-3 text-stone-200" /> 浏览器播放
                      </button>
                    <button 
                        onClick={() => setShowAllEpisodes(true)}
                        className="text-xs font-bold text-stone-900 bg-white hover:bg-stone-200 transition-colors px-4 py-2 rounded-full shadow-lg"
                    >
                        全部剧集
                    </button>
                </div>
            </div>
            
            <div className="flex gap-3 overflow-x-auto px-5 pb-6 pt-1 scrollbar-hide">
                {episodes.map((ep, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentEpIndex(idx)}
                        className={`
                            flex-shrink-0 px-5 py-2.5 text-xs rounded-full whitespace-nowrap transition-all duration-300 font-bold border
                            ${currentEpIndex === idx 
                                ? 'bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105' 
                                : 'bg-stone-900 border-stone-800 text-stone-500 hover:bg-stone-800 hover:text-stone-200'}
                        `}
                    >
                        {ep.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Full Playlist Modal */}
      {showAllEpisodes && (
        <div className="absolute inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => setShowAllEpisodes(false)}>
            <div 
                className="w-full md:max-w-4xl max-h-[70vh] bg-[#111] md:rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h3 className="text-white font-serif font-bold text-xl">全部剧集</h3>
                    <button onClick={() => setShowAllEpisodes(false)} className="p-2 bg-white/5 rounded-full text-stone-400 hover:text-white transition-colors"><XIcon /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 content-start">
                    {episodes.map((ep, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentEpIndex(idx);
                                setShowAllEpisodes(false);
                            }}
                            className={`
                                py-3 px-2 text-xs rounded-xl border transition-all duration-200 font-medium truncate
                                ${currentEpIndex === idx 
                                    ? 'bg-white border-white text-black shadow-lg' 
                                    : 'bg-stone-900 text-stone-500 border-transparent hover:bg-stone-800 hover:text-stone-300'}
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