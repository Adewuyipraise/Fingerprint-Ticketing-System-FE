import axios from 'axios';
import { api } from './api';
import { DashboardStats } from '@/types';

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get('/dashboard/stats');
  const data = response.data.data ?? response.data;
  return {
    total_employees: data.total_employees ?? 0,
    total_tickets: data.month_meals ?? 0,
    today_meals: data.today_meals ?? 0,
    total_amount: data.month_amount ?? 0,
  };
}

export const getTicketChart = async (days = 7) => {
  const res = await api.get(`/dashboard/tickets`, { params: { days } });
  return res?.data?.data ?? [];
};

export const getDepartmentDistribution = async () => {
  const response = await api.get('/dashboard/departments');
  return response?.data?.data ?? [];
};

export const getRecentAuditLogs = async () => {
  const res = await api.get('/audit-logs?page=1&per_page=5');
  return res?.data?.data ?? [];
};

export async function checkServerHealth(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 3000 });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
      return true;
    }
    return false;
  }
}
