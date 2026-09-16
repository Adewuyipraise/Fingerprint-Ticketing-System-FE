import { api } from './api';
import { UsageRecord, PaginatedResponse } from '@/types';

export interface RecordFilters {
  zk_user_id?: string;
  department?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export const getRecords = async (params: RecordFilters) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const str = String(value).trim();
    if (str === '' || str === 'undefined' || str === 'null') return;

    query.set(key, str);
  });

  const qs = query.toString();
  const response = await api.get(qs ? `/tickets?${qs}` : '/tickets');
  return response.data;
};

export const getReportSummary = async (params: any) => {
  const response = await api.get('/reports/summary', { params });
  return response.data;
};

// Helper function to fetch all records (handles pagination)
export const fetchAllRecords = async (params: any) => {
  let allRecords: any[] = [];
  let currentPage = 1;
  const perPage = 1000;

  while (true) {
    const response = await getRecords({
      ...params,
      per_page: perPage,
      page: currentPage,
    });

    const records = response?.data ?? response?.data?.data ?? [];

    if (!records || records.length === 0) break;

    allRecords = [...allRecords, ...records];

    // Check if we've fetched all pages
    const totalPages =
      response?.total_pages ??
      response?.metadata?.total_pages ??
      Math.ceil((response?.total ?? records.length) / perPage);

    if (currentPage >= totalPages) break;
    currentPage++;

    // Safety limit
    if (currentPage > 100) break;
  }

  return allRecords;
};