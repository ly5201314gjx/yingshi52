export interface VideoItem {
  vod_id: number | string;
  vod_name: string;
  type_id: number;
  type_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_pic: string;
  vod_score?: string;
  vod_blurb?: string;
  vod_year?: string;
  vod_area?: string;
  vod_class?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_content?: string;
  vod_play_url?: string;
  matchScore?: number; // Internal for search sorting
}

export interface ApiSource {
  name: string;
  url: string;
}

export interface Episode {
  name: string;
  url: string;
}

export interface Category {
  type_id: number;
  type_name: string;
}

export interface SearchHistoryItem {
  keyword: string;
  timestamp: number;
}
