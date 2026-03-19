export interface Asset {
  id: number;
  name: string;
  url: string;
  size?: string;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  hostname: string;
  description?: string;
  tags: string[];
  date: string;
  notes?: string;
  is_archived?: boolean;
  is_unread?: boolean;
  web_archive_url?: string;
  reader_mode_url?: string;
  assets?: Asset[];
}
