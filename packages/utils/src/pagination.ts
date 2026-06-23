import type { PaginatedResponse } from '@creditmap/types';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
