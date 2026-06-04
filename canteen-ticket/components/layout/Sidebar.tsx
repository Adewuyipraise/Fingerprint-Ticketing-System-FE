'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { LayoutDashboard, Users, Ticket, ChartBar as BarChart3, ScrollText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/services/auth.service';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { label: 'Employees', href: '/dashboard/employees', icon: Users, permission: 'employees' },
  { label: 'Meal Records', href: '/dashboard/tickets', icon: Ticket, permission: 'tickets' },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3, permission: 'reports' },
  { label: 'Audit Logs', href: '/dashboard/audit-logs', icon: ScrollText, permission: 'audit_logs' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const allowedItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!user) return false;
      return hasPermission(user.role, item.permission);
    });
  }, [user]);

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center border-b border-slate-700/50 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1">
            <img src="/logo.png" alt="CDK Logo" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">CDK CanteenTrack</p>
              <p className="text-xs text-slate-400 truncate">Enterprise Management System</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {allowedItems.map((item) => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/50 p-2">
        {!collapsed && user && (
          <div className="mb-2 rounded-md bg-slate-800 px-3 py-2">
            <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
