import { api } from './api';
import { Employee, PaginatedResponse, EmployeePosition } from '@/types';

export interface EmployeeFilters {
  search?: string;
  position?: EmployeePosition;
  department?: string;
  page?: number;
  per_page?: number;
  sortBy?: 'name' | 'department' | 'position' | 'amount' | 'zk_user_id';
  order?: 'asc' | 'desc';
}

export async function getEmployees(filters: EmployeeFilters = {}): Promise<PaginatedResponse<Employee>> {
  const response = await api.get('/employees', { params: filters });
  return response.data;
}

export async function createEmployee(data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
  const response = await api.post('/employees', data);
  return response.data;
}

export async function updateEmployee(zk_user_id: string, data: Partial<Employee>): Promise<Employee> {
  const response = await api.put(`/employees/${zk_user_id}`, data);
  return response.data;
}

/**
 * Save employee (Create or Update)
 * Uses zk_user_id for updates. isEdit determines if we use PUT or POST.
 */
export async function saveEmployee(data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>, isEdit: boolean = false): Promise<Employee> {
  if (isEdit) {
    return updateEmployee(data.zk_user_id, data);
  } else {
    return createEmployee(data);
  }
}

export { DEPARTMENTS, POSITIONS } from '@/lib/constants';

export async function deleteEmployee(zk_user_id: string): Promise<void> {
  await api.delete(`/employees/${zk_user_id}`);
}

export async function bulkDeleteEmployees(ids: string[]): Promise<{ success: boolean; deleted: number }> {
  const response = await api.post('/employees/bulk-delete', { ids });
  return response.data;
}

export async function bulkSaveEmployees(data: any[]): Promise<void> {
  await api.post('/employees/bulk-upload', { employees: data });
}