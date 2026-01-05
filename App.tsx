import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DEFAULT_SOURCES, getVideoList, getCategories } from './services/api';
import { VideoItem, ApiSource, Category, Episode } from './types';
import MovieCard from './components/MovieCard';
import VideoPlayer from './components/VideoPlayer';
import VideoDetails from './components/VideoDetails';
import { SearchIcon, SettingsIcon, MenuIcon, CopyIcon, TrashIcon, ExportIcon, XIcon, LinkIcon, FilterIcon } from './components/Icons';

// Mock Hot Searches
const HOT_SEARCHES = ["周星驰", "林正英", "海贼王", "柯南", "漫威", "复仇者", "奥特曼", "甄嬛传"];

function App() {
  const [sources, setSources] = useState<ApiSource[]>(DEFAULT_SOURCES);
  const [currentSource, setCurrentSource] = useState<ApiSource>(DEFAULT_SOURCES[0]);
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  // State for content filtering
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Secondary Tag Filters (Multi-select)
  const [selectedTags, setSelectedTags] = useState<{
      years: string[];
      areas: string[];
      classes: string[];
  }>({ years: [], areas: [], classes: [] });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [favorites, setFavorites] = useState<VideoItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, number>>({});
  
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [detailsVideo, setDetailsVideo] = useState<VideoItem | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  // Search State
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Title Interaction State
  const [refreshStep, setRefreshStep] = useState(0); // 0: idle, 1: confirm
  const [apiStats, setApiStats] = useState<{total: number, latency: number} | null>(null);

  // Settings State
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const [jumpPage, setJumpPage] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedSources = localStorage.getItem('v_sources');
    if (savedSources) setSources(JSON.parse(savedSources));

    const savedFavs = localStorage.getItem('v_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const savedHistory = localStorage.getItem('v_watch_history');
    if (savedHistory) setWatchHistory(JSON.parse(savedHistory));

    const savedSearchHistory = localStorage.getItem('v_search_history');
    if (savedSearchHistory) setSearchHistory(JSON.parse(savedSearchHistory));

    fetchData(1);
    fetchCategoriesData();
  }, []);

  useEffect(() => {
    fetchCategoriesData();
    // When source changes, we reset everything
    hardReset(); 
  }, [currentSource]);

  // Reset tag filters when video list changes (new search or page)
  useEffect(() => {
      setSelectedTags({ years: [], areas: [], classes: [] });
  }, [videos]);

  // Extract available tags from current videos
  const availableTags = useMemo(() => {
      const years = new Set<string>();
      const areas = new Set<string>();
      const classes = new Set<string>();

      videos.forEach(v => {
          if (v.vod_year && v.vod_year !== '0' && v.vod_year !== '未知') years.add(v.vod_year);
          if (v.vod_area && v.vod_area !== '未知') areas.add(v.vod_area);
          if (v.vod_class) {
             v.vod_class.split(/[,\/ ]+/).forEach(c => c.trim() && classes.add(c.trim()));
          }
      });

      return {
          years: Array.from(years).sort().reverse(),
          areas: Array.from(areas).sort(),
          classes: Array.from(classes).sort()
      };
  }, [videos]);

  // Filter videos client-side based on selected tags
  const filteredVideos = useMemo(() => {
      if (selectedTags.years.length === 0 && selectedTags.areas.length === 0 && selectedTags.classes.length === 0) {
          return videos;
      }
      return videos.filter(v => {
          const matchYear = selectedTags.years.length === 0 || (v.vod_year && selectedTags.years.includes(v.vod_year));
          const matchArea = selectedTags.areas.length === 0 || (v.vod_area && selectedTags.areas.includes(v.vod_area));
          const matchClass = selectedTags.classes.length === 0 || (v.vod_class && selectedTags.classes.some(c => v.vod_class?.includes(c)));
          return matchYear && matchArea && matchClass;
      });
  }, [videos, selectedTags]);

  const toggleTag = (type: 'years' | 'areas' | 'classes', value: string) => {
      setSelectedTags(prev => {
          const current = prev[type];
          const isSelected = current.includes(value);
          return {
              ...prev,
              [type]: isSelected ? current.filter(t => t !== value) : [...current, value]
          };
      });
  };

  const fetchData = async (pageNum: number, search: string = keyword, cat: number | null = selectedCategory) => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const data = await getVideoList(currentSource.url, pageNum, cat || undefined, search);
      const endTime = performance.now();
      
      setApiStats({
          total: data.total || 0,
          latency: Math.round(endTime - startTime)
      });

      setVideos(data.list || []);
      setPage(pageNum);
      setJumpPage(pageNum.toString());
      setKeyword(search);
      setSelectedCategory(cat);
    } catch (err) {
      console.error(err);
      if (pageNum === 1) setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesData = async () => {
    const cats = await getCategories(currentSource.url);
    setCategories(cats);
  };

  const handleSearchSubmit = (val: string) => {
      if (!val.trim()) return;
      
      const newHistory = [val, ...searchHistory.filter(h => h !== val)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('v_search_history', JSON.stringify(newHistory));

      setSelectedCategory(null);
      fetchData(1, val, null);
      
      setIsSearchFocused(false);
      setShowFavorites(false);
      
      // Sync inputs
      if (searchInputRef.current) searchInputRef.current.value = val;
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.value = val;
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.blur();
  };

  const handleCategorySelect = (catId: number) => {
      setKeyword('');
      fetchData(1, '', catId);
      setIsCategoryModalOpen(false);
      setShowFavorites(false);
  };

  const handleSearchForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInputRef.current) {
      handleSearchSubmit(searchInputRef.current.value);
    }
  };

  const clearSearchHistory = () => {
      setSearchHistory([]);
      localStorage.removeItem('v_search_history');
  }

  const handleTitleClick = () => {
      if (refreshStep === 0) {
          setRefreshStep(1);
          setTimeout(() => setRefreshStep(prev => prev === 1 ? 0 : prev), 3000);
      } else {
          setRefreshStep(0);
          hardReset();
      }
  };

  const hardReset = () => {
      setKeyword('');
      setSelectedCategory(null);
      setShowFavorites(false);
      fetchData(1, '', null);
      if (searchInputRef.current) searchInputRef.current.value = '';
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.value = '';
  };

  const handleJumpPage = (e: React.FormEvent) => {
      e.preventDefault();
      const p = parseInt(jumpPage);
      if (!isNaN(p) && p > 0) {
          fetchData(p, keyword, selectedCategory);
      }
  };

  const openVideo = (video: VideoItem) => {
    let rawUrl = video.vod_play_url || '';
    const formatEpisodes = (text: string) => {
         let rawList = text.split('#');
         if (text.includes('$$$')) {
             const playlists = text.split('$$$');
             const m3u8List = playlists.find(p => p.includes('.m3u8') || p.includes('http'));
             rawList = (m3u8List || playlists[0]).split('#');
         }
         return rawList.filter(s => s.trim()).map(s => {
            const parts = s.split('$');
            if (parts.length >= 2) {
                return { name: parts[0], url: parts[1].trim() };
            } else {
                return { name: '正片', url: parts[0].trim() };
            }
         });
    };
    const epList: Episode[] = formatEpisodes(rawUrl);
    setEpisodes(epList);
    setActiveVideo(video);
  };

  const toggleFavorite = (e: React.MouseEvent, video: VideoItem) => {
    e.stopPropagation();
    const exists = favorites.find(f => f.vod_id === video.vod_id);
    let newFavs;
    if (exists) {
        newFavs = favorites.filter(f => f.vod_id !== video.vod_id);
    } else {
        newFavs = [...favorites, video];
    }
    setFavorites(newFavs);
    localStorage.setItem('v_favorites', JSON.stringify(newFavs));
  };

  const updateHistory = (vodId: string | number, epIdx: number) => {
    const newHist = { ...watchHistory, [vodId]: epIdx };
    setWatchHistory(newHist);
    localStorage.setItem('v_watch_history', JSON.stringify(newHist));
  };

  const initiateDeleteSource = (index: number) => {
      if (sources.length <= 1) {
          alert("不能删除最后一个源");
          return;
      }
      setDeleteConfirmIndex(index);
      setTimeout(() => setDeleteConfirmIndex(prev => prev === index ? null : prev), 3000);
  };

  const confirmDeleteSource = (index: number) => {
      const newSources = sources.filter((_, i) => i !== index);
      setSources(newSources);
      localStorage.setItem('v_sources', JSON.stringify(newSources));
      if (currentSource.url === sources[index].url) {
          setCurrentSource(newSources[0]);
      }
      setDeleteConfirmIndex(null);
  };

  const handleAddSource = () => {
      if (!newSourceName.trim() || !newSourceUrl.trim()) return;
      const newSource = { name: newSourceName.trim(), url: newSourceUrl.trim() };
      const updatedSources = [...sources, newSource];
      setSources(updatedSources);
      localStorage.setItem('v_sources', JSON.stringify(updatedSources));
      setNewSourceName('');
      setNewSourceUrl('');
  };

  const handleExportSources = () => {
      const tableRows = sources.map(s => `<tr><td style="border:1px solid #ddd;padding:8px;">${s.name}</td><td style="border:1px solid #ddd;padding:8px;">${s.url}</td></tr>`).join('');
      const html = `<html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sources.doc';
      a.click();
      URL.revokeObjectURL(url);
  };

  const currentVideos = showFavorites ? favorites : filteredVideos;

  // Render Logic for Filter Chips
  const renderFilterSection = (title: string, items: string[], type: 'years' | 'areas' | 'classes') => {
      if (items.length === 0) return null;
      return (
          <div className="mb-3 animate-in slide-in-from-top-2 duration-300">
              <h4 className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-1">{title}</h4>
              <div className="flex flex-wrap gap-2">
                  {items.slice(0, 15).map(item => (
                      <button
                          key={item}
                          onMouseDown={(e) => { e.preventDefault(); toggleTag(type, item); }}
                          className={`px-2 py-1 text-xs font-bold rounded-md border transition-all ${
                              selectedTags[type].includes(item) 
                                ? 'bg-stone-800 text-white border-stone-800 shadow-md' 
                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                          }`}
                      >
                          {item}
                      </button>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-stone-900 font-sans selection:bg-yellow-200">
      
      {/* Desktop Header (Hidden on Mobile) */}
      <header className="hidden md:block sticky top-0 z-40 bg-[#fcfbf9]/90 backdrop-blur-md border-b-2 border-stone-900 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={handleTitleClick}>
            <div className={`w-10 h-10 bg-yellow-400 border-2 border-stone-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl transition-all duration-300 ${refreshStep === 1 ? 'animate-bounce bg-red-400' : 'group-hover:-translate-y-1'}`}>
              {refreshStep === 1 ? '↻' : '📺'}
            </div>
            <h1 className="font-black text-xl tracking-tighter">
               {refreshStep === 1 ? '点击重置' : '暴躁影视'}
            </h1>
          </div>

          <div className="flex-1 max-w-lg mx-4">
             <form onSubmit={handleSearchForm} className="relative w-full group">
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="输入关键词搜索..." 
                    className="w-full h-10 pl-4 pr-12 bg-white border-2 border-stone-900 rounded-lg focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-0.5 transition-all placeholder:text-stone-400 font-bold"
                    defaultValue={keyword}
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded-md transition-colors">
                    <SearchIcon className="text-stone-900" />
                </button>
             </form>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowFavorites(!showFavorites)} className={`w-10 h-10 flex items-center justify-center border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${showFavorites ? 'bg-red-400 text-white' : 'bg-white hover:bg-red-50'}`}>
                <span className={showFavorites ? 'text-white' : 'text-red-500'}>♥</span>
             </button>
             <button onClick={() => setIsCategoryModalOpen(true)} className="w-10 h-10 flex items-center justify-center bg-white border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all hover:bg-blue-50">
                <MenuIcon />
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 flex items-center justify-center bg-stone-900 text-white border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none transition-all hover:bg-stone-700">
                <SettingsIcon />
             </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Top Bar (Combines Search + Actions) */}
      <div className="md:hidden fixed top-2 left-2 right-2 z-50 flex flex-col gap-2">
           <div className={`bg-white/95 backdrop-blur-md border-2 border-stone-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all duration-300 overflow-hidden ${isSearchFocused ? 'ring-2 ring-yellow-400' : ''}`}>
               <div className="flex items-center p-1.5 gap-2">
                   {/* Logo / Home Button */}
                   <button 
                      onClick={handleTitleClick}
                      className="w-9 h-9 bg-yellow-400 border-2 border-stone-900 rounded-xl flex items-center justify-center text-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none shrink-0"
                   >
                      📺
                   </button>

                   {/* Search Input */}
                   <form 
                      className="flex-1 flex items-center"
                      onSubmit={(e) => {
                          e.preventDefault();
                          if (mobileSearchInputRef.current) handleSearchSubmit(mobileSearchInputRef.current.value);
                      }}
                   >
                       <input 
                           ref={mobileSearchInputRef}
                           type="search"
                           placeholder="搜片 / 筛选..." 
                           className="w-full h-9 bg-transparent outline-none font-bold text-stone-800 placeholder:text-stone-400 text-sm"
                           onFocus={() => setIsSearchFocused(true)}
                           defaultValue={keyword}
                       />
                   </form>

                   {/* Right Actions */}
                   {!isSearchFocused && (
                       <div className="flex gap-2 shrink-0 animate-in fade-in">
                           <button onClick={() => setShowFavorites(!showFavorites)} className={`w-9 h-9 flex items-center justify-center border-2 border-stone-900 rounded-xl transition-all ${showFavorites ? 'bg-red-400 text-white' : 'bg-stone-50 hover:bg-red-50 text-red-500'}`}>
                               ♥
                           </button>
                           <button onClick={() => setIsCategoryModalOpen(true)} className="w-9 h-9 flex items-center justify-center bg-stone-50 border-2 border-stone-900 rounded-xl hover:bg-blue-50">
                               <MenuIcon />
                           </button>
                       </div>
                   )}
                   {isSearchFocused && (
                       <button 
                          onMouseDown={(e) => { e.preventDefault(); setIsSearchFocused(false); }}
                          className="w-9 h-9 flex items-center justify-center bg-stone-100 border-2 border-stone-900 rounded-xl text-stone-500 font-bold text-xs"
                       >
                           收起
                       </button>
                   )}
               </div>

               {/* Expanded Content: Filters & Suggestions */}
               {isSearchFocused && (
                   <div className="px-3 pb-4 pt-2 border-t border-stone-100 max-h-[60vh] overflow-y-auto">
                        
                        {/* 1. Secondary Filters (If results exist) */}
                        {!loading && videos.length > 0 && !showFavorites && (
                            <div className="mb-4 pb-4 border-b border-dashed border-stone-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-black text-sm flex items-center gap-1 text-stone-700">
                                        <FilterIcon /> 二次筛选 <span className="text-stone-400 font-normal text-xs">({filteredVideos.length}/{videos.length})</span>
                                    </h3>
                                    {(selectedTags.years.length > 0 || selectedTags.areas.length > 0 || selectedTags.classes.length > 0) && (
                                        <button 
                                            onMouseDown={(e) => { e.preventDefault(); setSelectedTags({years:[], areas:[], classes:[]}); }}
                                            className="text-xs text-blue-600 font-bold"
                                        >
                                            清除筛选
                                        </button>
                                    )}
                                </div>
                                {renderFilterSection('年份', availableTags.years, 'years')}
                                {renderFilterSection('地区', availableTags.areas, 'areas')}
                                {renderFilterSection('类型', availableTags.classes, 'classes')}
                                {videos.length > 0 && filteredVideos.length === 0 && (
                                    <p className="text-xs text-red-500 font-bold text-center py-2">没有符合当前筛选条件的影片</p>
                                )}
                            </div>
                        )}

                        {/* 2. Suggestions / History */}
                        {(searchHistory.length > 0 || HOT_SEARCHES) && (
                            <div>
                                {searchHistory.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-stone-400 text-xs">历史搜索</h3>
                                            <button onMouseDown={clearSearchHistory} className="text-stone-300 hover:text-red-400"><TrashIcon /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {searchHistory.map((h, i) => (
                                                <button 
                                                key={i} 
                                                onMouseDown={() => handleSearchSubmit(h)}
                                                className="px-2 py-1 bg-stone-100 rounded text-xs font-bold text-stone-600 hover:bg-stone-200 border border-stone-200"
                                                >
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <h3 className="font-bold text-stone-400 text-xs mb-2">热门推荐</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {HOT_SEARCHES.map((h, i) => (
                                            <button 
                                            key={i} 
                                            onMouseDown={() => handleSearchSubmit(h)}
                                            className="px-2 py-1 bg-yellow-100 text-yellow-900 rounded text-xs font-bold border border-yellow-200 hover:bg-yellow-200"
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                   </div>
               )}
           </div>
      </div>

      {/* Main Content (Added padding-top for mobile) */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:pt-6 pt-20">
        
        {/* Breadcrumb / Status Bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-2 text-sm font-bold text-stone-600 bg-white px-4 py-2 rounded-full border-2 border-stone-200 inline-flex self-start">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 <span>源: {currentSource.name}</span>
                 {apiStats && (
                     <>
                        <span className="mx-1 text-stone-300">|</span>
                        <span>{apiStats.total} 资源</span>
                        <span className="mx-1 text-stone-300">|</span>
                        <span className={apiStats.latency > 1000 ? 'text-red-500' : 'text-green-600'}>{apiStats.latency}ms</span>
                     </>
                 )}
             </div>

             {/* Pagination (Top) */}
             {!showFavorites && videos.length > 0 && (
                 <div className="flex items-center gap-2 self-end sm:self-auto">
                     <button 
                        disabled={page === 1 || loading}
                        onClick={() => fetchData(page - 1)}
                        className="px-3 py-1 bg-white border-2 border-stone-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-sm hover:bg-stone-50"
                     >
                        上一页
                     </button>
                     <span className="font-black text-lg mx-2">{page}</span>
                     <button 
                        disabled={loading || videos.length < 20} 
                        onClick={() => fetchData(page + 1)}
                        className="px-3 py-1 bg-stone-900 text-white border-2 border-stone-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-0.5 active:shadow-none disabled:opacity-50 font-bold text-sm hover:bg-stone-700"
                     >
                        下一页
                     </button>
                 </div>
             )}
        </div>

        {/* Video Grid */}
        {loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 animate-pulse">
                 {[...Array(10)].map((_, i) => (
                     <div key={i} className="aspect-[2/3] bg-stone-200 rounded-xl"></div>
                 ))}
             </div>
        ) : currentVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 pb-20">
                {currentVideos.map((video) => (
                    <MovieCard 
                        key={video.vod_id} 
                        video={video} 
                        onClick={() => openVideo(video)}
                        isFavorite={favorites.some(f => f.vod_id === video.vod_id)}
                        onToggleFav={(e) => toggleFavorite(e, video)}
                        onShowDetails={(e) => {
                             e.stopPropagation();
                             setDetailsVideo(video);
                        }}
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 text-stone-400">
                <div className="text-6xl mb-4">🦖</div>
                <p className="font-bold text-lg">这里空空如也...</p>
                {showFavorites && <p className="text-sm mt-2">快去收藏一些喜欢的影片吧！</p>}
                {!showFavorites && <button onClick={() => hardReset()} className="mt-6 px-6 py-2 bg-stone-900 text-white rounded-lg font-bold hover:bg-stone-700">重置所有条件</button>}
            </div>
        )}

        {/* Pagination (Bottom) */}
        {!showFavorites && videos.length > 0 && !loading && (
             <div className="flex justify-center items-center gap-4 mt-8 pb-10">
                 <button 
                    disabled={page === 1}
                    onClick={() => fetchData(page - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-stone-900 rounded-full hover:bg-stone-100 disabled:opacity-50 font-bold"
                 >
                    ←
                 </button>
                 <form onSubmit={handleJumpPage} className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={jumpPage} 
                        onChange={(e) => setJumpPage(e.target.value)}
                        className="w-16 h-10 text-center border-2 border-stone-900 rounded-lg font-bold focus:outline-none focus:bg-yellow-50"
                    />
                    <button type="submit" className="px-4 h-10 bg-stone-900 text-white font-bold rounded-lg border-2 border-stone-900 hover:bg-stone-700">
                        跳页
                    </button>
                 </form>
                 <button 
                    disabled={videos.length < 20}
                    onClick={() => fetchData(page + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-stone-900 rounded-full hover:bg-stone-100 disabled:opacity-50 font-bold"
                 >
                    →
                 </button>
             </div>
        )}
      </main>

      {/* Settings Modal (Mobile & Desktop) */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}>
              <div 
                className="w-full max-w-lg bg-white rounded-2xl border-2 border-stone-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] m-4 overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
              >
                  <div className="bg-stone-900 text-white p-4 flex justify-between items-center">
                      <h2 className="font-bold text-lg flex items-center gap-2">
                          <SettingsIcon /> 源设置
                      </h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-white">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <h3 className="font-bold text-stone-700">可用源列表</h3>
                              <button onClick={handleExportSources} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"><ExportIcon /> 导出</button>
                          </div>
                          <div className="space-y-2">
                              {sources.map((src, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${currentSource.url === src.url ? 'border-green-500 bg-green-50 shadow-md' : 'border-stone-100 hover:border-stone-300'}`}
                                    onClick={() => setCurrentSource(src)}
                                  >
                                      <div className="flex flex-col min-w-0 flex-1 mr-2">
                                          <span className="font-bold text-sm truncate">{src.name}</span>
                                          <span className="text-xs text-stone-400 truncate">{src.url}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                          {currentSource.url === src.url && <span className="text-green-600 text-xs font-black px-2 py-0.5 bg-green-200 rounded-full">当前</span>}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); initiateDeleteSource(idx); }}
                                            className={`w-8 h-8 flex items-center justify-center rounded bg-stone-100 hover:bg-red-100 text-stone-400 hover:text-red-500 transition-colors ${deleteConfirmIndex === idx ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
                                          >
                                              {deleteConfirmIndex === idx ? '?' : <TrashIcon />}
                                          </button>
                                          {deleteConfirmIndex === idx && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); confirmDeleteSource(idx); }}
                                                className="px-2 py-1 bg-red-600 text-white text-xs rounded font-bold animate-pulse"
                                              >
                                                  确认
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                          <h3 className="font-bold text-stone-700 mb-3 text-sm">添加新源 (采集接口)</h3>
                          <div className="space-y-3">
                              <input 
                                value={newSourceName}
                                onChange={(e) => setNewSourceName(e.target.value)}
                                placeholder="源名称 (例如: 极速资源)"
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                              />
                              <input 
                                value={newSourceUrl}
                                onChange={(e) => setNewSourceUrl(e.target.value)}
                                placeholder="API 地址 (例如: https://api.example.com/vod/)"
                                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-900"
                              />
                              <button 
                                onClick={handleAddSource}
                                disabled={!newSourceName || !newSourceUrl}
                                className="w-full py-2 bg-stone-900 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-stone-700 transition-colors"
                              >
                                  添加自定义源
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Category Modal (Mobile & Desktop) */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}>
              <div 
                className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl border-t-2 sm:border-2 border-stone-900 p-6 shadow-2xl animate-in slide-in-from-bottom-20 duration-300"
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="font-black text-xl flex items-center gap-2">
                          <span className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-stone-900"></span>
                          分类索引
                      </h2>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto p-2">
                      <button 
                        onClick={() => handleCategorySelect(0)}
                        className={`py-2 px-1 rounded-lg border-2 font-bold text-sm transition-all ${!selectedCategory ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                      >
                          全部
                      </button>
                      {categories.map(cat => (
                          <button 
                            key={cat.type_id}
                            onClick={() => handleCategorySelect(cat.type_id)}
                            className={`py-2 px-1 rounded-lg border-2 font-bold text-sm transition-all truncate ${selectedCategory === cat.type_id ? 'bg-yellow-400 text-stone-900 border-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900'}`}
                          >
                              {cat.type_name}
                          </button>
                      ))}
                  </div>
                  
                  {/* Mobile-specific extra shortcuts */}
                  <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2 md:hidden">
                       <button onClick={() => { setIsSettingsOpen(true); setIsCategoryModalOpen(false); }} className="flex-1 py-2 bg-stone-100 rounded-lg text-sm font-bold text-stone-600 flex items-center justify-center gap-2">
                           <SettingsIcon /> 设置 / 换源
                       </button>
                  </div>
              </div>
          </div>
      )}

      {detailsVideo && (
          <VideoDetails 
            video={detailsVideo} 
            onClose={() => setDetailsVideo(null)} 
          />
      )}

      {activeVideo && episodes.length > 0 && (
          <VideoPlayer 
            video={activeVideo} 
            episodes={episodes}
            initialEpisodeIndex={watchHistory[activeVideo.vod_id] || 0}
            onClose={() => setActiveVideo(null)}
            onUpdateHistory={updateHistory}
          />
      )}

    </div>
  );
}

export default App;