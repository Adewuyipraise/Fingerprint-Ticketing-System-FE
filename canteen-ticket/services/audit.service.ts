import { api } from './api';
import { AuditLog, PaginatedResponse } from '@/types';

export interface AuditFilters {
  search?: string;
  action?: string;
  entity?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export async function getAuditLogs(filters: AuditFilters = {}): Promise<PaginatedResponse<AuditLog>> {
  const response = await api.get('/audit-logs', { params: filters });
  return response.data;
}
