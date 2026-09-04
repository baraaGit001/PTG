import type { ListQuery } from '../envelope.js';
import type {
  ActivityLevel,
  ContentStatus,
  Gender,
  HealthGoal,
  ModerationStatus,
  RankingPeriod,
  ReactionType,
  ReportStatus,
  SportMetricUnit,
} from '../enums.js';

// --- health profile ---------------------------------------------------------

export interface HealthProfileDto {
  id: string;
  gender: Gender;
  birthDate: string | null;
  /** Centimetres, integer. */
  heightCm: number | null;
  /** Grams, integer - avoids floating point on a value shown to one decimal. */
  weightGrams: number | null;
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  targetWeightGrams: number | null;
  notes: string | null;
  updatedAt: string;
}

export interface UpdateHealthProfileRequest {
  gender?: Gender;
  birthDate?: string | null;
  heightCm?: number | null;
  weightGrams?: number | null;
  activityLevel?: ActivityLevel;
  goal?: HealthGoal;
  targetWeightGrams?: number | null;
  notes?: string | null;
}

// --- community --------------------------------------------------------------

export interface CommunityAuthorDto {
  id: string;
  memberId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommunityCommentDto {
  id: string;
  postId: string;
  author: CommunityAuthorDto;
  body: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  canDelete: boolean;
}

export interface CommunityPostDto {
  id: string;
  author: CommunityAuthorDto;
  title: string | null;
  body: string;
  imageUrls: string[];
  tags: string[];
  moderationStatus: ContentStatus;
  reactionCounts: Record<ReactionType, number>;
  /** The requesting user's own reaction, if any. */
  myReaction: ReactionType | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CreateCommunityPostRequest {
  title?: string | null;
  body: string;
  imageUrls?: string[];
  tags?: string[];
}

export interface CreateCommentRequest {
  body: string;
}

export interface ReactRequest {
  type: ReactionType;
}

export interface ReportContentRequest {
  reason: string;
  details?: string;
}

export interface CommunityReportDto {
  id: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  excerpt: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reporter: CommunityAuthorDto;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CommunityFeedQuery extends ListQuery {
  tag?: string;
  authorId?: string;
  moderationStatus?: ContentStatus;
}

// --- sport ranking ----------------------------------------------------------

export interface SportMetricDto {
  id: string;
  code: string;
  name: string;
  unit: SportMetricUnit;
  /** Points per unit, expressed in thousandths so scoring stays integer-only. */
  scoreWeightMilli: number;
  active: boolean;
}

export interface SportScoreDto {
  id: string;
  metricCode: string;
  metricName: string;
  value: number;
  score: number;
  recordedFor: string;
  createdAt: string;
}

export interface SubmitSportScoreRequest {
  metricCode: string;
  value: number;
  /** ISO date (yyyy-mm-dd) the activity belongs to. */
  recordedFor: string;
}

export interface RankingEntryDto {
  rank: number;
  member: CommunityAuthorDto;
  score: number;
  /** Per-metric breakdown of the total score. */
  breakdown: Array<{ metricCode: string; metricName: string; value: number; score: number }>;
  isCurrentUser: boolean;
}

export interface RankingResponse {
  period: RankingPeriod;
  periodStart: string;
  periodEnd: string;
  entries: RankingEntryDto[];
  currentUserEntry: RankingEntryDto | null;
  totalParticipants: number;
}

export interface RankingQuery extends ListQuery {
  period?: RankingPeriod;
  metricCode?: string;
}

// --- health knowledge -------------------------------------------------------

export interface ArticleCategoryDto {
  id: string;
  slug: string;
  name: string;
  articleCount: number;
}

export interface ArticleSummaryDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  category: { id: string; slug: string; name: string } | null;
  authorName: string | null;
  readingMinutes: number;
  isFeatured: boolean;
  publishedAt: string | null;
  status: ContentStatus;
}

export interface ArticleDetailDto extends ArticleSummaryDto {
  /** Sanitised HTML produced by the admin editor. */
  bodyHtml: string;
  tags: string[];
  relatedArticles: ArticleSummaryDto[];
  updatedAt: string;
}

export interface ArticleListQuery extends ListQuery {
  categorySlug?: string;
  tag?: string;
  featuredOnly?: boolean;
  status?: ContentStatus;
}

export interface ArticleInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  bodyHtml: string;
  coverImageUrl?: string | null;
  categoryId?: string | null;
  authorName?: string | null;
  tags?: string[];
  isFeatured?: boolean;
  status: ContentStatus;
}
