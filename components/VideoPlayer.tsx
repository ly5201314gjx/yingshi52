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

  useEffect(() => {
    let currentHls: Hls | null = null;
    setIsLoading(true);

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

      // Basic Protocol fix
      if (window.location.protocol === 'https:' && url.startsWith('http:')) {
           // We try to upgrade, but if it fails, the error handler will catch it
           url = url.replace('http:', 'https:'); 
      }

      const isM3U8 = url.includes('.m3u8');

      // 1. Native HLS (Safari/iOS) - Preferred for Mobile
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
        videoEl.load();
        videoEl.play().catch(e => console.warn("Auto-play blocked", e));
        setIsLoading(false);
      } 
      // 2. HLS.js (Desktop/Android Chrome)
      else if (Hls.isSupported() && isM3U8) {
        const hls = new Hls({
            maxMaxBufferLength: 30,
            enableWorker: true,
            // Critical: Disable credentials to prevent CORS issues on public APIs
            xhrSetup: function (xhr, url) {
                xhr.withCredentials = false; 
            },
            // Enhance recovery logic
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 3,
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
                    setError("无法加载此视频流，请尝试“外部播放”");
                    break;
                }
            }
        });
      } 
      // 3. Direct Play (MP4)
      else {
        videoEl.src = url;
        videoEl.load();
        videoEl.play()
            .then(() => setIsLoading(false))
            .catch(e => {
            console.error("Standard playback failed", e);
            setIsLoading(false);
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

  const openNative = () => {
    // This is the "Magic" button for mobile users
    if (episodes[currentEpIndex]) {
        window.location.href = episodes[currentEpIndex].url;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full h-full flex flex-col md:max-w-6xl md:h-[90vh] md:rounded-2xl md:border md:border-white/10 md:shadow-2xl overflow-hidden bg-[#000000]">
        
        {/* Modern Player Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3">
              <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all">
                  <XIcon />
              </button>
              <div className="text-shadow-md">
                <h2 className="text-white font-bold text-sm md:text-lg line-clamp-1">{video.vod_name}</h2>
                <p className="text-white/70 text-xs md:text-sm font-medium">
                    EP {currentEpIndex + 1} <span className="opacity-50">/</span> {episodes[currentEpIndex]?.name}
                </p>
              </div>
          </div>
          
          <div className="pointer-events-auto flex gap-2">
             <button onClick={openExternal} className="hidden md:flex px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold backdrop-blur gap-1 items-center transition-all">
                 <LinkIcon /> 浏览器打开
             </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 group overflow-hidden">
            {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            )}
            
            {error ? (
                <div className="text-center p-6 max-w-sm mx-auto">
                    <div className="text-5xl mb-4">📺</div>
                    <p className="text-white font-bold text-lg mb-2">无法在网页内播放</p>
                    <p className="text-white/50 text-sm mb-6">源站可能限制了跨域访问或格式不支持。</p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={openNative}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <PlayIcon /> 调用本机播放器
                        </button>
                        <p className="text-xs text-white/30">推荐 iOS/Android 用户点击上方按钮</p>

                        <button 
                            onClick={copyLink}
                            className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                        >
                            <CopyIcon /> 复制链接去浏览器观看
                        </button>
                    </div>
                </div>
            ) : (
                <video 
                    ref={videoRef} 
                    className="w-full h-full object-contain" 
                    controls 
                    playsInline 
                    poster={video.vod_pic}
                    crossOrigin="anonymous"
                    onWaiting={() => setIsLoading(true)}
                    onPlaying={() => setIsLoading(false)}
                />
            )}

            {/* Desktop Overlay Controls (Hidden on Mobile usually handled by native player) */}
            {!error && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 px-8 py-3 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto transform translate-y-4 group-hover:translate-y-0 hidden md:flex">
                     <button onClick={() => skipTime(-15)} className="text-white hover:text-blue-400 flex flex-col items-center gap-1 transition-colors">
                        <span className="text-xl">↺</span>
                        <span className="text-[10px] font-bold">-15s</span>
                     </button>
                     
                     <div className="h-8 w-px bg-white/20"></div>

                     <div className="flex items-center gap-2">
                         {[1.0, 1.5, 2.0].map(rate => (
                             <button
                                key={rate}
                                onClick={() => handleSpeedChange(rate)}
                                className={`text-xs font-bold px-2 py-1 rounded transition-all ${playbackRate === rate ? 'bg-white text-black scale-110' : 'text-white/60 hover:text-white'}`}
                             >
                                 {rate}x
                             </button>
                         ))}
                     </div>

                     <div className="h-8 w-px bg-white/20"></div>

                     <button onClick={() => skipTime(15)} className="text-white hover:text-blue-400 flex flex-col items-center gap-1 transition-colors">
                        <span className="text-xl">↻</span>
                        <span className="text-[10px] font-bold">+15s</span>
                     </button>
                </div>
            )}
        </div>

        {/* Footer / Playlist */}
        <div className="bg-[#0a0a0a] border-t border-white/10 shrink-0 z-20 pb-safe">
            <div className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-white font-bold text-sm">选集</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60 border border-white/5">{episodes.length}</span>
                </div>
                
                <div className="flex gap-2">
                     <button 
                        onClick={openNative}
                        className="md:hidden px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
                      >
                         <PlayIcon className="scale-75" /> 调用App播放
                      </button>
                    <button 
                        onClick={() => setShowAllEpisodes(true)}
                        className="text-xs font-bold text-black bg-white hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg"
                    >
                        全部剧集
                    </button>
                </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
                {episodes.map((ep, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentEpIndex(idx)}
                        className={`
                            flex-shrink-0 px-5 py-2.5 text-xs rounded-lg whitespace-nowrap transition-all duration-200 font-bold border
                            ${currentEpIndex === idx 
                                ? 'bg-gradient-to-br from-blue-600 to-violet-600 border-transparent text-white shadow-lg shadow-blue-900/40' 
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'}
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
        <div className="absolute inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowAllEpisodes(false)}>
            <div 
                className="w-full md:max-w-4xl max-h-[70vh] bg-[#0f172a] md:rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg">全部剧集</h3>
                    <button onClick={() => setShowAllEpisodes(false)} className="p-2 bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"><XIcon /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 content-start">
                    {episodes.map((ep, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentEpIndex(idx);
                                setShowAllEpisodes(false);
                            }}
                            className={`
                                py-3 px-2 text-xs rounded-lg border transition-all duration-200 font-medium truncate
                                ${currentEpIndex === idx 
                                    ? 'bg-blue-600 border-blue-500 text-white' 
                                    : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'}
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