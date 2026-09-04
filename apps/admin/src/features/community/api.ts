import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommunityPostDto, CommunityReportDto, ContentStatus, PaginationMeta } from '@ptg/types';
import { apiRequest, apiRequestPaginated } from '@/lib/api-client';

export function useAdminPosts(status?: ContentStatus, page = 1) {
  return useQuery<{ items: CommunityPostDto[]; pagination: PaginationMeta | undefined }>({
    queryKey: ['admin', 'community', 'posts', status, page],
    queryFn: () => apiRequestPaginated<CommunityPostDto>('/admin/community/posts', { query: { moderationStatus: status, page, pageSize: 20 } }),
  });
}

export function useModeratePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) => apiRequest<CommunityPostDto>(`/admin/community/posts/${id}/moderation`, { method: 'PATCH', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'community'] }),
  });
}

export function useReports(status?: string) {
  return useQuery({
    queryKey: ['admin', 'community', 'reports', status],
    queryFn: () => apiRequest<CommunityReportDto[]>('/admin/community/reports', { query: { status } }),
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED' }) => apiRequest<CommunityReportDto>(`/admin/community/reports/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'community', 'reports'] }),
  });
}
