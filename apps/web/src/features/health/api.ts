import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ArticleDetailDto,
  ArticleSummaryDto,
  CommunityFeedQuery,
  CommunityPostDto,
  HealthProfileDto,
  PaginationMeta,
  RankingResponse,
  ReactionType,
  SportScoreDto,
  UpdateHealthProfileRequest,
} from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

// --- health profile ---------------------------------------------------------

export function useHealthProfile() {
  return useQuery({ queryKey: ['health', 'profile'], queryFn: () => apiRequest<HealthProfileDto>('/health/profile') });
}

export function useUpdateHealthProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHealthProfileRequest) => apiRequest<HealthProfileDto>('/health/profile', { method: 'PUT', body: payload }),
    onSuccess: (data) => queryClient.setQueryData(['health', 'profile'], data),
  });
}

// --- community ---------------------------------------------------------------

export function useCommunityFeed(query: CommunityFeedQuery & { page?: number }) {
  return useQuery<{ items: CommunityPostDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['community', 'feed', query],
    queryFn: () => apiRequestPaginated<CommunityPostDto>('/community/posts', { query: query as Record<string, string | number> }),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { body: string; title?: string }) => apiRequest<CommunityPostDto>('/community/posts', { method: 'POST', body: payload }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['community', 'feed'] }),
  });
}

export function useReactToPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: ReactionType }) => apiRequest<CommunityPostDto>(`/community/posts/${postId}/reactions`, { method: 'POST', body: { type } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['community', 'feed'] }),
  });
}

// --- sport ranking -------------------------------------------------------------

export function useRanking(period: string, metricCode?: string) {
  return useQuery({
    queryKey: ['sport', 'ranking', period, metricCode],
    queryFn: () => apiRequest<RankingResponse>('/sport/ranking', { query: { period, metricCode } }),
  });
}

export function useMyScores(enabled: boolean) {
  return useQuery<{ items: SportScoreDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['sport', 'scores', 'mine'],
    // A single page covers "today" comfortably; the hub only sums today's rows.
    queryFn: () => apiRequestPaginated<SportScoreDto>('/sport/scores', { query: { page: 1, pageSize: 50 } }),
    enabled,
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { metricCode: string; value: number; recordedFor: string }) => apiRequest('/sport/scores', { method: 'POST', body: payload }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sport'] }),
  });
}

// --- health knowledge ------------------------------------------------------------

export function useArticles(query: { page?: number; categorySlug?: string; search?: string }) {
  return useQuery<{ items: ArticleSummaryDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['health', 'articles', query],
    queryFn: () => apiRequestPaginated<ArticleSummaryDto>('/health/articles', { query: query as Record<string, string | number> }),
  });
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ['health', 'articles', 'detail', slug],
    queryFn: () => apiRequest<ArticleDetailDto>(`/health/articles/${slug}`),
    enabled: Boolean(slug),
  });
}
