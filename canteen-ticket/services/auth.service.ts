import { api, getApiErrorMessage } from './api';
import { User, UserRole } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  try {
    const response = await api.post('/auth/login', credentials);
    const user: User = response.data;
    if (user.token) {
      localStorage.setItem('auth_token', user.token);
    }
    localStorage.setItem('auth_user', JSON.stringify(user));
    return user;
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message);
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore offline errors
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('auth_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  hr: 'HR Manager',
  canteen_rep: 'Canteen Representative',
  accountant: 'Accountant',
  auditor: 'Auditor',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'employees', 'tickets', 'reports', 'bulk_upload', 'audit_logs', 'settings'],
  hr: ['dashboard', 'employees', 'tickets', 'reports', 'bulk_upload'],
  canteen_rep: ['dashboard', 'tickets', 'reports'],
  accountant: ['dashboard', 'reports'],
  auditor: ['dashboard', 'reports', 'audit_logs'],
};

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  zk_user_id?: string;
}

export async function registerUser(data: RegisterCredentials): Promise<User> {
  const response = await api.post('/auth/register', data);
  return response.data;
}

export function hasPermission(role: UserRole, feature: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(feature) ?? false;
}
