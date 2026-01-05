import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DEFAULT_SOURCES, getVideoList, getCategories } from './services/api';
import { VideoItem, ApiSource, Category, Episode } from './types';
import MovieCard from './components/MovieCard';
import VideoPlayer from './components/VideoPlayer';
import VideoDetails from './components/VideoDetails';
import { SearchIcon, SettingsIcon, MenuIcon, CopyIcon, TrashIcon, ExportIcon, XIcon, LinkIcon } from './components/Icons';

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
  
  // Local UI filter (client side)
  const [localFilter, setLocalFilter] = useState(''); 
  
  // Secondary Tag Filters (Multi-select)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
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
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  // Search Overlay State
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Title Interaction State
  const [refreshStep, setRefreshStep] = useState(0); // 0: idle, 1: confirm
  const [apiStats, setApiStats] = useState<{total: number, latency: number} | null>(null);

  // Settings State
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const [jumpPage, setJumpPage] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setIsFilterPanelOpen(false); // Optional: close panel on new data
  }, [videos]);

  const fetchData = async (pageNum: number, search: string = keyword, cat: number | null = selectedCategory) => {
    setLoading(true);
    setLocalFilter('');
    const startTime = performance.now();
    
    try {
      const data = await getVideoList(currentSource.url, pageNum, cat || undefined, search);
      const endTime = performance.now();
      
      // Update Stats
      setApiStats({
          total: data.total || 0,
          latency: Math.round(endTime - startTime)
      });

      setVideos(data.list || []);
      setPage(pageNum);
      setJumpPage(pageNum.toString());
      
      // Update state to match what we just fetched
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
      
      setIsSearchOverlayOpen(false);
      setShowFavorites(false);
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

  const handleHomeNavClick = () => {
      setShowFavorites(false);
  };

  const hardReset = () => {
      setKeyword('');
      setSelectedCategory(null);
      setShowFavorites(false);
      fetchData(1, '', null);
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
    
    // Normalize logic for different separators
    const formatEpisodes = (text: string) => {
         // Some APIs use # as separator, some use $$$
         let rawList = text.split('#');
         if (text.includes('$$$')) {
             // If $$$ exists, it usually separates different playlists. 
             // We pick the one with m3u8 or the first one.
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

  // Two-step deletion logic
  const initiateDeleteSource = (index: number) => {
      if (sources.length <= 1) {
          alert("不能删除最后一个源");
          return;
      }
      setDeleteConfirmIndex(index);
      // Auto cancel after 3s
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

  const handleCopyLink = (url: string) => {
      navigator.clipboard.writeText(url)
        .then(() => alert("链接已复制"))
        .catch(() => window.prompt("复制:", url));
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
      const html