/**
 * FedSocial V2 — Shared Type Definitions & Data Contracts
 * Enforces strict typing across apps/web, apps/api, and clients/local-agent.
 */

// ==========================================
// 1. ARTICLE & CONTENT CONTRACTS
// ==========================================

export type ArticleCategory = 'AI' | 'Sports' | 'History' | string;

export type ArticleSourceType = 'AI_GENERATED' | 'SYNTHETIC_GENERATED' | 'EXTERNAL_BENCHMARK' | 'EDITORIAL_ORIGINAL';

export interface Article {
  article_id: string;
  id?: string;
  slug: string;
  title: string;
  body: string;
  content?: string;
  excerpt?: string;
  summary?: string;
  category: ArticleCategory;
  subcategory: string;
  tags: string[];
  word_count: number;
  wordCount?: number;
  estimated_read_min: number;
  readingTimeMinutes?: number;
  author?: string;
  language: string;
  image_url: string | null;
  image_license?: string | null;
  image_attribution?: string | null;
  published_at: string; // ISO-8601
  publishedAt?: string;
  source_type?: ArticleSourceType;
  reference_urls?: string[];
}

export interface ArticleSummary {
  article_id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ArticleCategory;
  subcategory: string;
  tags: string[];
  word_count: number;
  estimated_read_min: number;
  published_at: string;
  image_url: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface PublicCandidatePoolResponse {
  candidates: Article[];
  total: number;
  modelVersion: string;
}

// ==========================================
// 2. LOCAL BEHAVIORAL TRACKING EVENTS
// ==========================================

export type EventType =
  | 'impression'
  | 'view_start'
  | 'view_end'
  | 'active_reading'
  | 'dwell'
  | 'click'
  | 'scroll'
  | 'like'
  | 'unlike'
  | 'bookmark'
  | 'unbookmark'
  | 'share'
  | 'not_interested'
  | 'skip';

export interface LocalEvent {
  event_id: string;
  id?: string;
  local_client_id: string;
  local_user_key: string;
  userId?: string;
  article_id: string;
  articleId?: string;
  session_id: string;
  event_type: EventType;
  eventType?: EventType;
  event_timestamp: string; // ISO-8601
  timestamp?: number;
  duration_ms: number;     // Continuous millisecond accumulator
  durationMs?: number;
  scroll_depth: number;    // 0.0 to 1.0 progression
  scrollDepthPercent?: number;
  tab_visible: boolean;
  window_focused: boolean;
  content_word_count: number;
  metadata?: Record<string, any>;
}

// ==========================================
// 3. USER & AUTHENTICATION CONTRACTS
// ==========================================

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

export interface AuthResponse {
  user: UserAccount;
  profile: UserProfile;
  token: string;
}

// ==========================================
// 4. RECOMMENDATION & FEDERATED CONTRACTS
// ==========================================

export interface ScoredRecommendation {
  article_id: string;
  score: number;
  rank: number;
  explanation_category?: string;
}

export interface ModelVersionInfo {
  version_tag: string;
  architecture_name: string;
  parameter_count: number;
  is_active: boolean;
  created_at: string;
}

export interface FederationRoundMetadata {
  round_number: number;
  participating_clients: number;
  aggregation_strategy: 'FedAvg' | 'FedProx' | 'MaskedFedAvg';
  global_loss: number | null;
  timestamp: string;
}
