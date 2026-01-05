import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DEFAULT_SOURCES, getVideoList, getCategories } from './services/api';
import { VideoItem, ApiSource, Category, Episode } from './types';
import MovieCard from './components/MovieCard';
import VideoPlayer from './components/VideoPlayer';
import VideoDetails from './components/VideoDetails';
import { SearchIcon, SettingsIcon, MenuIcon, TrashIcon, ExportIcon, XIcon, FilterIcon } from './components/Icons';

// Mock Hot Searches
const HOT_SEARCHES = ["周星驰", "林正英", "海贼王", "柯南", "漫威", "复仇者", "奥特曼", "甄嬛传"];

function App() {
  const [sources, setSources] = useState<ApiSource[]>(DEFAULT_SOURCES);
  const [currentSource, setCurrentSource] = useState<ApiSource>(DEFAULT_SOURCES[0]);
  
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
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

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [apiStats, setApiStats] = useState<{total: number, latency: number} | null>(null);
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
    hardReset(); 
  }, [currentSource]);

  useEffect(() => {
      setSelectedTags({ years: [], areas: [], classes: [] });
  }, [videos]);

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
      setApiStats({ total: data.total || 0, latency: Math.round(endTime - startTime) });
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
      if (!isNaN(p) && p > 0) fetchData(p, keyword, selectedCategory);
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
            if (parts.length >= 2) return { name: parts[0], url: parts[1].trim() };
            return { name: '正片', url: parts[0].trim() };
         });
    };
    const epList: Episode[] = formatEpisodes(rawUrl);
    setEpisodes(epList);
    setActiveVideo(video);
  };

  const toggleFavorite = (e: React.MouseEvent, video: VideoItem) => {
    e.stopPropagation();
    const exists = favorites.find(f => f.vod_id === video.vod_id);
    const newFavs = exists ? favorites.filter(f => f.vod_id !== video.vod_id) : [...favorites, video];
    setFavorites(newFavs);
    localStorage.setItem('v_favorites', JSON.stringify(newFavs));
  };

  const updateHistory = (vodId: string | number, epIdx: number) => {
    const newHist = { ...watchHistory, [vodId]: epIdx };
    setWatchHistory(newHist);
    localStorage.setItem('v_watch_history', JSON.stringify(newHist));
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
      const tableRows = sources.map(s => `<tr><td>${s.name}</td><td>${s.url}</td></tr>`).join('');
      const html = `<html><body><table>${tableRows}</table></body></html>`;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sources.doc';
      a.click();
      URL.revokeObjectURL(url);
  };

  const confirmDeleteSource = (index: number) => {
      const newSources = sources.filter((_, i) => i !== index);
      setSources(newSources);
      localStorage.setItem('v_sources', JSON.stringify(newSources));
      if (currentSource.url === sources[index].url) setCurrentSource(newSources[0]);
      setDeleteConfirmIndex(null);
  };

  const currentVideos = showFavorites ? favorites : filteredVideos;

  const renderFilterSection = (title: string, items: string[], type: 'years' | 'areas' | 'classes') => {
      if (items.length === 0) return null;
      return (
          <div className="mb-8 animate-in slide-in-from-top-2 duration-300">
              <h4 className="text-[11px] font-bold text-stone-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span> {title}
              </h4>
              <div className="flex flex-wrap gap-2.5">
                  {items.slice(0, 15).map(item => (
                      <button
                          key={item}
                          onMouseDown={(e) => { e.preventDefault(); toggleTag(type, item); }}
                          className={`px-4 py-2 text-xs rounded-full border transition-all duration-300 font-medium ${
                              selectedTags[type].includes(item) 
                                ? 'bg-stone-800 text-white border-stone-800 shadow-md' 
                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
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
    <div className="min-h-screen font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Desktop Header - Clean & Minimal */}
      <header className="hidden md:block sticky top-0 z-40 panel-organic transition-all duration-300">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between gap-10">
          <div className="flex items-center gap-3 cursor-pointer group select-none" onClick={hardReset}>
            <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center text-lg shadow-lg group-hover:scale-105 transition-transform">
              <span className="transform -translate-y-0.5">🌱</span>
            </div>
            <h1 className="font-serif font-bold text-2xl tracking-tight text-stone-900 group-hover:text-amber-700 transition-colors">
               暴躁影视
            </h1>
          </div>

          <div className="flex-1 max-w-xl">
             <form onSubmit={(e) => { e.preventDefault(); searchInputRef.current && handleSearchSubmit(searchInputRef.current.value); }} className="relative w-full group">
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Search for movies..." 
                    className="w-full h-12 pl-6 pr-12 rounded-full bg-stone-50/50 border border-stone-200 focus:bg-white focus:border-stone-400 focus:ring-4 focus:ring-stone-100 transition-all placeholder:text-stone-400 text-sm font-medium text-stone-800 shadow-inner"
                    defaultValue={keyword}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-stone-200 rounded-full transition-colors">
                    <SearchIcon className="text-stone-400 w-4 h-4" />
                </button>
             </form>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${showFavorites ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner' : 'bg-transparent border-transparent hover:bg-stone-100 text-stone-500'}`}>
                <span className={`text-lg ${showFavorites ? 'text-rose-500' : 'text-stone-400'}`}>♥</span>
                <span className="text-sm font-semibold tracking-wide">收藏</span>
             </button>
             <button onClick={() => setIsCategoryModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-all">
                <MenuIcon />
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-all">
                <SettingsIcon />
             </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bar */}
      <div className="md:hidden fixed top-4 left-4 right-4 z-50 flex flex-col gap-2">
           <div className={`panel-organic rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/50 transition-all duration-300 overflow-hidden ${isSearchFocused ? 'ring-2 ring-stone-900 ring-offset-2' : ''}`}>
               <div className="flex items-center p-2.5 gap-3">
                   <button 
                      onClick={hardReset}
                      className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center text-lg shadow-md shrink-0 text-white"
                   >
                      <span className="transform -translate-y-0.5">🌱</span>
                   </button>

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
                           className="w-full h-10 bg-transparent outline-none font-medium text-stone-800 placeholder:text-stone-400 text-sm"
                           onFocus={() => setIsSearchFocused(true)}
                           defaultValue={keyword}
                       />
                   </form>

                   {!isSearchFocused && (
                       <div className="flex gap-1 shrink-0 animate-in fade-in">
                           <button onClick={() => setShowFavorites(!showFavorites)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showFavorites ? 'bg-rose-50 text-rose-500' : 'hover:bg-stone-100 text-stone-400'}`}>
                               ♥
                           </button>
                           <button onClick={() => setIsCategoryModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500">
                               <MenuIcon />
                           </button>
                       </div>
                   )}
                   {isSearchFocused && (
                       <button 
                          onMouseDown={(e) => { e.preventDefault(); setIsSearchFocused(false); }}
                          className="px-4 py-1.5 rounded-full bg-stone-100 text-xs font-bold text-stone-600 active:scale-95"
                       >
                           取消
                       </button>
                   )}
               </div>

               {isSearchFocused && (
                   <div className="px-5 pb-5 pt-2 border-t border-stone-100 max-h-[70vh] overflow-y-auto bg-stone-50/50">
                        {!loading && videos.length > 0 && !showFavorites && (
                            <div className="mb-8 pb-6 border-b border-dashed border-stone-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-serif font-bold text-sm flex items-center gap-2 text-stone-800">
                                        <FilterIcon className="text-amber-600" /> 筛选条件
                                    </h3>
                                    {(selectedTags.years.length > 0 || selectedTags.areas.length > 0 || selectedTags.classes.length > 0) && (
                                        <button 
                                            onMouseDown={(e) => { e.preventDefault(); setSelectedTags({years:[], areas:[], classes:[]}); }}
                                            className="text-xs text-stone-500 font-bold hover:text-stone-900 border-b border-stone-300"
                                        >
                                            清空筛选
                                        </button>
                                    )}
                                </div>
                                {renderFilterSection('年份 / Year', availableTags.years, 'years')}
                                {renderFilterSection('地区 / Area', availableTags.areas, 'areas')}
                                {renderFilterSection('类型 / Genre', availableTags.classes, 'classes')}
                            </div>
                        )}

                        {(searchHistory.length > 0 || HOT_SEARCHES) && (
                            <div className="space-y-8">
                                {searchHistory.length > 0 && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Recent</h3>
                                            <button onMouseDown={() => {setSearchHistory([]); localStorage.removeItem('v_search_history');}} className="text-stone-400 hover:text-rose-500"><TrashIcon /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {searchHistory.map((h, i) => (
                                                <button key={i} onMouseDown={() => handleSearchSubmit(h)} className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:border-stone-400 hover:shadow-sm transition-all">{h}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-stone-400 text-xs mb-4 uppercase tracking-widest">Trending</h3>
                                    <div className="flex flex-wrap gap-2.5">
                                        {HOT_SEARCHES.map((h, i) => (
                                            <button key={i} onMouseDown={() => handleSearchSubmit(h)} className="px-4 py-2 bg-gradient-to-br from-white to-stone-50 border border-stone-200 text-stone-700 rounded-lg text-xs font-bold hover:shadow-md hover:border-amber-200 hover:text-amber-800 transition-all">{h}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                   </div>
               )}
           </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 md:pt-10 pt-24">
        
        {/* Status Bar */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
             <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-white border border-stone-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                 <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-stone-800"></span>
                    </span>
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-widest">{currentSource.name}</span>
                 </div>
                 {apiStats && (
                     <>
                        <div className="w-px h-4 bg-stone-200"></div>
                        <span className="text-xs font-medium text-stone-400">{apiStats.total} titles</span>
                        <div className="w-px h-4 bg-stone-200"></div>
                        <span className={`text-xs font-mono font-medium ${apiStats.latency > 1000 ? 'text-amber-600' : 'text-stone-400'}`}>{apiStats.latency}ms</span>
                     </>
                 )}
             </div>

             {!showFavorites && videos.length > 0 && (
                 <div className="flex items-center gap-3 self-end sm:self-auto bg-white p-1.5 rounded-xl border border-stone-100 shadow-sm">
                     <button disabled={page === 1 || loading} onClick={() => fetchData(page - 1)} className="p-2.5 hover:bg-stone-50 rounded-lg disabled:opacity-30 text-stone-500 transition-colors"><span className="text-xs font-bold">PREV</span></button>
                     <span className="font-serif font-bold text-lg text-stone-900 px-4 min-w-[3rem] text-center">{page}</span>
                     <button disabled={loading || videos.length < 20} onClick={() => fetchData(page + 1)} className="p-2.5 hover:bg-stone-50 rounded-lg disabled:opacity-30 text-stone-500 transition-colors"><span className="text-xs font-bold">NEXT</span></button>
                 </div>
             )}
        </div>

        {/* Video Grid */}
        {loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 animate-pulse">
                 {[...Array(10)].map((_, i) => (
                     <div key={i} className="flex flex-col gap-3">
                        <div className="aspect-[2/3] bg-stone-200/60 rounded-2xl"></div>
                        <div className="h-4 bg-stone-200/60 rounded w-3/4"></div>
                        <div className="h-3 bg-stone-100 rounded w-1/2"></div>
                     </div>
                 ))}
             </div>
        ) : currentVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12 pb-24">
                {currentVideos.map((video) => (
                    <MovieCard 
                        key={video.vod_id} 
                        video={video} 
                        onClick={() => openVideo(video)}
                        isFavorite={favorites.some(f => f.vod_id === video.vod_id)}
                        onToggleFav={(e) => toggleFavorite(e, video)}
                        onShowDetails={(e) => { e.stopPropagation(); setDetailsVideo(video); }}
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-40 text-stone-400">
                <div className="text-7xl mb-6 opacity-20 grayscale">🌿</div>
                <p className="font-serif text-xl text-stone-500 italic">No discoveries yet.</p>
                {!showFavorites && <button onClick={hardReset} className="mt-8 px-8 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-bold tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">Explore All</button>}
            </div>
        )}

        {/* Pagination Bottom */}
        {!showFavorites && videos.length > 0 && !loading && (
             <div className="flex justify-center items-center gap-8 mt-20 pb-16">
                 <button disabled={page === 1} onClick={() => fetchData(page - 1)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 disabled:opacity-30 disabled:hover:translate-y-0 text-stone-700 transition-all text-xl font-light">←</button>
                 <form onSubmit={handleJumpPage} className="flex items-center">
                    <input type="number" value={jumpPage} onChange={(e) => setJumpPage(e.target.value)} className="w-20 h-14 text-center bg-transparent text-stone-900 font-serif font-bold text-2xl focus:bg-stone-50 rounded-xl transition-colors border-none outline-none" placeholder={page.toString()} />
                 </form>
                 <button disabled={videos.length < 20} onClick={() => fetchData(page + 1)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-1 disabled:opacity-30 disabled:hover:translate-y-0 text-stone-700 transition-all text-xl font-light">→</button>
             </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-100/60 backdrop-blur-md p-4 transition-opacity" onClick={() => setIsSettingsOpen(false)}>
              <div className="w-full max-w-lg bg-white rounded-3xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh] overflow-hidden border border-white" onClick={e => e.stopPropagation()}>
                  <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-white">
                      <h2 className="font-serif font-bold text-2xl text-stone-900 flex items-center gap-3"><SettingsIcon /> Settings</h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-stone-50 text-stone-400 hover:text-stone-900 transition-colors"><XIcon /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-10">
                      <div>
                          <div className="flex justify-between items-center mb-5">
                              <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Data Sources</h3>
                              <button onClick={handleExportSources} className="px-3 py-1.5 rounded-full bg-stone-50 text-xs text-stone-700 font-bold hover:bg-stone-100 flex items-center gap-1"><ExportIcon /> Export</button>
                          </div>
                          <div className="space-y-3">
                              {sources.map((src, idx) => (
                                  <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 ${currentSource.url === src.url ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/10 border-transparent' : 'bg-white border-stone-100 hover:border-stone-300 text-stone-600'}`} onClick={() => setCurrentSource(src)}>
                                      <div className="flex flex-col flex-1 mr-4 min-w-0">
                                          <span className={`font-bold text-sm truncate ${currentSource.url === src.url ? 'text-white' : 'text-stone-800'}`}>{src.name}</span>
                                          <span className={`text-xs truncate ${currentSource.url === src.url ? 'text-stone-400' : 'text-stone-400'}`}>{src.url}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <button onClick={(e) => { e.stopPropagation(); if(sources.length > 1) { setDeleteConfirmIndex(idx); setTimeout(()=>setDeleteConfirmIndex(null), 3000); } }} className={`p-2 rounded-full transition-colors ${deleteConfirmIndex === idx ? 'bg-rose-500 text-white' : 'hover:bg-white/10 text-current opacity-60 hover:opacity-100'}`}>
                                              {deleteConfirmIndex === idx ? '?' : <TrashIcon />}
                                          </button>
                                          {deleteConfirmIndex === idx && <button onClick={(e) => {e.stopPropagation(); confirmDeleteSource(idx);}} className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-full font-bold shadow-sm">Confirm</button>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                          <h3 className="font-bold text-stone-800 mb-4 text-sm">Add Custom Source</h3>
                          <div className="space-y-4">
                              <input value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Source Name" className="w-full px-5 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:border-stone-400 focus:ring-0 transition-colors placeholder:text-stone-400" />
                              <input value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder="API URL (e.g. https://api...)" className="w-full px-5 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:border-stone-400 focus:ring-0 transition-colors placeholder:text-stone-400" />
                              <button onClick={handleAddSource} disabled={!newSourceName || !newSourceUrl} className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-stone-200 hover:shadow-xl hover:-translate-y-0.5">Add Source</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Category Modal - Minimalist List */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-200/50 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}>
              <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 animate-in slide-in-from-bottom-20 duration-300" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="font-serif font-bold text-2xl text-stone-900">Categories</h2>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-stone-100 rounded-full text-stone-500 hover:text-stone-900"><XIcon /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto p-1">
                      <button onClick={() => handleCategorySelect(0)} className={`py-4 px-3 rounded-xl border font-bold text-sm transition-all ${!selectedCategory ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-300 hover:text-stone-900 hover:shadow-md'}`}>All</button>
                      {categories.map(cat => (
                          <button key={cat.type_id} onClick={() => handleCategorySelect(cat.type_id)} className={`py-4 px-3 rounded-xl border font-bold text-sm transition-all truncate ${selectedCategory === cat.type_id ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-300 hover:text-stone-900 hover:shadow-md'}`}>{cat.type_name}</button>
                      ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-stone-100 flex gap-3 md:hidden">
                       <button onClick={() => { setIsSettingsOpen(true); setIsCategoryModalOpen(false); }} className="flex-1 py-4 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 flex items-center justify-center gap-2 hover:bg-stone-100">
                           <SettingsIcon /> Settings
                       </button>
                  </div>
              </div>
          </div>
      )}

      {detailsVideo && <VideoDetails video={detailsVideo} onClose={() => setDetailsVideo(null)} />}
      {activeVideo && episodes.length > 0 && <VideoPlayer video={activeVideo} episodes={episodes} initialEpisodeIndex={watchHistory[activeVideo.vod_id] || 0} onClose={() => setActiveVideo(null)} onUpdateHistory={updateHistory} />}
    </div>
  );
}

export default App;