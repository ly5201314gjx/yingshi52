import { ApiSource, VideoItem, Category } from '../types';

export const DEFAULT_SOURCES: ApiSource[] = [
  { name: '量子资源', url: 'https://cj.lziapi.com/api.php/provide/vod/' },
  { name: '非凡资源', url: 'https://cj.ffzyapi.com/api.php/provide/vod/' },
  { name: '暴风资源', url: 'https://bfzyapi.com/api.php/provide/vod/' },
  { name: '快车资源', url: 'https://caiji.kczyapi.com/api.php/provide/vod/' },
  { name: '索尼资源', url: 'https://suoniapi.com/api.php/provide/vod/' },
  { name: '红牛资源', url: 'https://www.hongniuzy2.com/api.php/provide/vod/' },
];

const CORS_PROXIES = [
  '', // Direct
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

let workingProxy = localStorage.getItem('v_working_proxy') || '';

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const fetchWithProxy = async (targetUrl: string): Promise<any> => {
  // Try cached working proxy first
  if (workingProxy) {
    try {
      const proxyUrl = workingProxy + encodeURIComponent(targetUrl);
      const finalUrl = workingProxy ? proxyUrl : targetUrl;
      const res = await fetchWithTimeout(finalUrl);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Cached proxy failed, retrying all...');
      workingProxy = '';
      localStorage.removeItem('v_working_proxy');
    }
  }

  // Iterate proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy ? proxy + encodeURIComponent(targetUrl) : targetUrl;
      const res = await fetchWithTimeout(proxyUrl);
      if (res.ok) {
        if (proxy) {
            workingProxy = proxy;
            localStorage.setItem('v_working_proxy', proxy);
        }
        return await res.json();
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error('All connection methods failed.');
};

export const getVideoList = async (apiUrl: string, page: number = 1, typeId?: number, keyword?: string): Promise<{ list: VideoItem[], total: number, pagecount: number }> => {
  let url = `${apiUrl}?ac=detail&pg=${page}`;
  if (typeId) url += `&t=${typeId}`;
  if (keyword) url += `&wd=${encodeURIComponent(keyword)}`;
  
  return await fetchWithProxy(url);
};

export const getCategories = async (apiUrl: string): Promise<Category[]> => {
    try {
        const url = `${apiUrl}?ac=list`;
        const data = await fetchWithProxy(url);
        return data.class || [];
    } catch (e) {
        console.error("Failed to fetch categories", e);
        return [];
    }
}