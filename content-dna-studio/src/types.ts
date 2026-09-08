export interface Brand {
  niche?: string;
  audience?: string;
  offer?: string;
  tone?: string;
  cta?: string;
  website?: string;
  location?: string;
  platforms?: string[];
}

export interface SourceMetrics {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  avg_view_duration_s?: number | null;
  ctr_pct?: number | null;
  subscribers_gained?: number | null;
}

export interface SourceForPrompt {
  id: string;
  title: string;
  channel_label: string;
  url?: string | null;
  transcript: string;
  metrics?: SourceMetrics | null;
  published_at?: string | null;
  duration_s?: number | null;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
