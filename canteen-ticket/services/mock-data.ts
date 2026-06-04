import { Employee, UsageRecord, AuditLog, DashboardStats, UsageChartData, StaffVisitorsData } from '@/types';

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', zk_user_id: '101', name: 'Ahmad Fauzi', department: 'Production', position: 'Workmen', amount: 500, created_at: '2024-01-15', updated_at: '2024-01-15' },
  { id: '2', zk_user_id: '102', name: 'Siti Rahayu', department: 'Engineering', position: 'Staff', amount: 1000, created_at: '2024-01-15', updated_at: '2024-01-15' },
  { id: '3', zk_user_id: '103', name: 'Budi Santoso', department: 'Administration', position: 'Manager', amount: 2000, created_at: '2024-02-01', updated_at: '2024-02-01' },
  { id: '4', zk_user_id: '104', name: 'Dewi Kartika', department: 'Maintenance', position: 'Staff', amount: 1000, created_at: '2024-02-10', updated_at: '2024-02-10' },
  { id: '5', zk_user_id: '105', name: 'Riko Pratama', department: 'Logistics', position: 'Workmen', amount: 500, created_at: '2024-02-15', updated_at: '2024-02-15' },
  { id: '6', zk_user_id: '106', name: 'Indah Lestari', department: 'Quality Control', position: 'Staff', amount: 1000, created_at: '2024-03-01', updated_at: '2024-03-01' },
  { id: '7', zk_user_id: '107', name: 'Hendra Gunawan', department: 'IT', position: 'Staff', amount: 1000, created_at: '2024-03-05', updated_at: '2024-03-05' },
];

export const MOCK_USAGE_RECORDS: UsageRecord[] = [
  { id: '1', ticket_number: 'TKT-001', zk_user_id: '101', name: 'Ahmad Fauzi', department: 'Production', position: 'Workmen', event_name: 'Lunch', event_date: '2025-04-16', amount: 500, printed_at: '2025-04-16 12:30:00' },
  { id: '2', ticket_number: 'TKT-002', zk_user_id: '102', name: 'Siti Rahayu', department: 'Engineering', position: 'Staff', event_name: 'Lunch', event_date: '2025-04-16', amount: 500, printed_at: '2025-04-16 12:35:00' },
  { id: '3', ticket_number: 'TKT-003', zk_user_id: '103', name: 'Budi Santoso', department: 'Administration', position: 'Manager', event_name: 'Lunch', event_date: '2025-04-16', amount: 500, printed_at: '2025-04-16 12:40:00' },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: '1', user_name: 'Admin User', zk_user_id: '101', user_role: 'admin', action: 'CREATE', entity: 'Employee', entity_id: 'E008', details: 'Created employee Visitor John', timestamp: '2025-04-16 07:30:00', ip_address: '192.168.1.10' },
  { id: '2', user_name: 'HR Manager', zk_user_id: '102', user_role: 'hr', action: 'UPDATE', entity: 'Employee', entity_id: 'E003', details: 'Updated employee Budi Santoso', timestamp: '2025-04-15 10:30:00', ip_address: '192.168.1.12' },
  { id: '3', user_name: 'Admin User', zk_user_id: '103', user_role: 'admin', action: 'DELETE', entity: 'Employee', entity_id: 'E011', details: 'Deleted employee record E011', timestamp: '2025-04-14 16:00:00', ip_address: '192.168.1.10' },
  { id: '4', user_name: 'Canteen Rep', zk_user_id: '104', user_role: 'canteen_rep', action: 'VIEW', entity: 'UsageRecord', details: 'Viewed usage records for 2025-04-16', timestamp: '2025-04-16 12:05:00', ip_address: '192.168.1.15' },
  { id: '5', user_name: 'HR Manager', zk_user_id: '105', user_role: 'hr', action: 'EXPORT', entity: 'Report', details: 'Exported daily usage report', timestamp: '2025-04-16 11:30:00', ip_address: '192.168.1.12' },
];

export const MOCK_STATS: DashboardStats = {
  total_employees: 150,
  total_tickets: 1240,
  today_meals: 85,
  total_amount: 620000,
};

export const MOCK_USAGE_CHART: UsageChartData[] = [
  { date: 'Apr 10', used: 8, not_used: 2 },
  { date: 'Apr 11', used: 9, not_used: 1 },
  { date: 'Apr 12', used: 7, not_used: 3 },
  { date: 'Apr 13', used: 6, not_used: 4 },
  { date: 'Apr 14', used: 8, not_used: 2 },
  { date: 'Apr 15', used: 9, not_used: 1 },
  { date: 'Apr 16', used: 6, not_used: 4 },
];

export const MOCK_STAFF_VISITORS: StaffVisitorsData[] = [
  { name: 'Staff', value: 7 },
  { name: 'Visitors', value: 3 },
];
