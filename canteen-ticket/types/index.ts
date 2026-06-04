export type UserRole = 'admin' | 'hr' | 'canteen_rep' | 'accountant' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

export type EmployeePosition = 'Manager' | 'Staff' | 'Workmen' | 'Visitor' | 'Police' | 'Intern';

export interface Employee {
  id: string;
  zk_user_id: string; // Employee ID
  name: string;
  department: string;
  position: EmployeePosition;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface TicketRecord {
  id: string;
  ticket_number: string;
  zk_user_id: string;
  event_name: string;
  event_date: string;
  printed_at: string; // Recorded Time
  name: string;
  department: string;
  amount: number;
}

export interface UsageRecord {
  id: string;
  ticket_number: string;
  zk_user_id: string;
  name: string;
  department: string;
  position: string;
  event_name: string;
  event_date: string;
  amount: number;
  printed_at: string;
}

export interface AuditLog {
  id: string;
  zk_user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
  timestamp: string;
  ip_address?: string;
}

export interface DashboardStats {
  total_employees: number;
  total_tickets: number;
  today_meals: number;
  total_amount: number;
}

export interface UsageChartData {
  date: string;
  used: number;
  not_used: number;
}

export interface TicketChartData {
  date: string;
  amount: number;
  count: number;
}

export interface StaffVisitorsData {
  name: string;
  value: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type SystemStatus = 'connected' | 'disconnected' | 'checking';

export interface ReportFilters {
  start_date: string;
  end_date: string;
  position?: EmployeePosition;
  department?: string;
  zk_user_id?: string;
  period: 'daily' | 'weekly' | 'monthly';
}
