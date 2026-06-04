export type UserRole = 'admin' | 'hr' | 'canteen_rep' | 'accountant' | 'auditor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  zk_user_id: string;
  created_at: string;
}

export interface User {
  zk_user_id: string;
  name: string;
  department: string;
  position: string;
  amount: number;
}

export interface Ticket {
  id?: string;
  ticket_number: string;
  zk_user_id: string;
  event_name: string;
  event_date: string;
  printed_at: string;
  name: string;
  department: string;
  amount: number;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  zk_user_id: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface DashboardStats {
  total_employees: number;
  total_tickets: number;
  today_meals: number;
  total_amount: number;
}

export interface TicketRuleSet {
  id: number;
  name: string;
  max_per_day: number;
  is_default: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketRuleWindow {
  id: number;
  rule_set_id: number;
  label?: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TicketRuleAssignment {
  id: number;
  rule_set_id: number;
  role?: string | null;
  department?: string | null;
  zk_user_id?: string | null;
  priority: number;
  created_at: string;
}

export interface TicketRuleSetWithRelations extends TicketRuleSet {
  windows: TicketRuleWindow[];
  assignments: TicketRuleAssignment[];
}

export interface ResolvedTicketRule {
  ruleSet: TicketRuleSet;
  windows: TicketRuleWindow[];
  matchedBy: 'user' | 'department' | 'role' | 'default';
  matchedValue: string;
  userContext: {
    zk_user_id: string;
    department: string | null;
    role: string | null;
    name: string;
  };
}

export interface TicketRuleValidationResult {
  allowed: boolean;
  reason: string | null;
  usageCountToday: number;
  maxPerDay: number | null;
  activeWindowLabel: string | null;
  matchedBy: ResolvedTicketRule['matchedBy'] | null;
  isConfigured: boolean;
  ruleSet: TicketRuleSet | null;
}
