/**
 * FedSocial V2 — Shared Type Definitions & Data Contracts
 * Enforces strict typing across apps/web, apps/api, and clients/local-agent.
 */

// ==========================================
// 1. ARTICLE & CONTENT CONTRACTS
// ==========================================

export type ArticleCategory = 'AI' | 'Sports' | 'History';

export type ArticleSourceType = 'AI_GENERATED' | 'EXTERNAL_BENCHMARK' | 'EDITORIAL_ORIGINAL';

export interface Article {
  article_id: string;
  slug: string;
  title: string;
  body: string;
  excerpt?: string;
  category: ArticleCategory;
  subcategory: string;
  tags: string[];
  word_count: number;
  estimated_read_min: number;
  language: string;
  image_url: string | null;
  image_license: string | null;
  image_attribution: string | null;
  published_at: string; // ISO-8601
  source_type: ArticleSourceType;
  reference_urls: string[];
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

// ==========================================
// 2. LOCAL BEHAVIORAL TRACKING EVENTS
// ==========================================

export type EventType =
  | 'impression'
  | 'view_start'
  | 'view_end'
  | 'active_reading'
  | 'scroll'
  | 'like'
  | 'unlike'
  | 'bookmark'
  | 'unbookmark'
  | 'not_interested'
  | 'skip';

export interface LocalEvent {
  event_id: string;
  local_client_id: string;
  local_user_key: string;
  article_id: string;
  session_id: string;
  event_type: EventType;
  event_timestamp: string; // ISO-8601
  duration_ms: number;     // Continuous millisecond accumulator
  scroll_depth: number;    // 0.0 to 1.0 progression
  tab_visible: boolean;
  window_focused: boolean;
  content_word_count: number;
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
