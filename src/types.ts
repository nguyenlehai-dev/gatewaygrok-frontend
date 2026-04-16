export type Category = "grok" | "flow" | "dreamina";
export type JobTarget = "image" | "video";
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type AntidetectConfig = {
  user_agent?: string | null;
  locale?: string | null;
  timezone_id?: string | null;
  color_scheme?: string | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  platform?: string | null;
  hardware_concurrency?: number | null;
};

export type Profile = {
  id: string;
  name: string;
  category: Category;
  description?: string | null;
  is_active: boolean;
  proxy_id?: string | null;
  cookie_file?: string | null;
  cache_dir: string;
  user_data_dir: string;
  tags: string[];
  antidetect?: AntidetectConfig | null;
  concurrency_limit: number;
  created_at: string;
  updated_at: string;
};

export type ProxyRecord = {
  id: string;
  name: string;
  server: string;
  port: number;
  username?: string | null;
  password?: string | null;
  kind: string;
  country?: string | null;
  sticky_session: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_per_minute: number;
  is_active: boolean;
  allowed_categories: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiKeyCreated = ApiKeyRecord & {
  plain_key: string;
};

export type ProfileAssetRecord = {
  profile_id: string;
  original_filename: string;
  stored_path: string;
  content_type?: string | null;
  size: number;
};

export type SettingsRecord = {
  automation: {
    headless: boolean;
    concurrency: number;
    timeout_ms: number;
  };
};

export type JobRecord = {
  id: string;
  profile_id: string;
  target: JobTarget;
  prompt: string;
  negative_prompt?: string | null;
  count: number;
  status: JobStatus;
  provider_payload?: Record<string, unknown> | null;
  result_payload?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderMeta = {
  category: Category;
  provider_name: string;
  targets: JobTarget[];
  supports_cookie_import: boolean;
  supports_proxy: boolean;
  supports_antidetect: boolean;
  start_url?: string | null;
  notes?: string | null;
};

export type MetaRecord = {
  categories: Category[];
  job_targets: JobTarget[];
  job_statuses: JobStatus[];
  providers: ProviderMeta[];
};

export type OverviewRecord = {
  profiles: { total: number; active: number };
  proxies: { total: number; active: number };
  api_keys: { total: number; active: number };
  queue: {
    pending: number;
    running: number;
    succeeded: number;
    failed: number;
  };
  categories: Array<{
    category: Category;
    total: number;
  }>;
};

export type Toast = {
  type: "success" | "error" | "info";
  message: string;
};

export type SessionCheckRecord = {
  provider: string;
  state: string;
  start_url: string;
  page_url: string;
  title: string;
  screenshot_path: string;
  cookie_present: boolean;
  live_browser_connected: boolean;
  requires_live_browser: boolean;
  indicators: string[];
  summary: string;
  body_preview: string;
  screenshot_data_url?: string | null;
};

export type AuthBootstrap = {
  username: string;
};

export type AuthLoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
};
