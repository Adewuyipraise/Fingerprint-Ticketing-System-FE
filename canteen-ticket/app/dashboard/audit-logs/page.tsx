'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { getAuditLogs } from '@/services/audit.service';
import { ROLE_LABELS, hasPermission } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-50 text-green-700 border-green-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  GENERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  USE: 'bg-slate-100 text-slate-700 border-slate-200',
  BULK_UPLOAD: 'bg-teal-50 text-teal-700 border-teal-200',
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'GENERATE', 'USE', 'BULK_UPLOAD'];
const ENTITIES = ['Employee', 'CanteenTicket', 'ClockIn', 'Settings'];

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', search, action, entity, page],
    queryFn: () => getAuditLogs({
      search: search || undefined,
      action: action || undefined,
      entity: entity || undefined,
      page,
      per_page: 15,
    }),
  });

  const logs = data?.data ?? [];

  if (!user || !hasPermission(user.role, 'audit_logs')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          You do not have permission to view Audit Logs. This area is restricted to authorized personnel only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track all system actions and user activity"
        icon={ScrollText}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search actions, users, details..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9"
            />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={(v) => { setEntity(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || action || entity) && (
            <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={() => { setSearch(''); setAction(''); setEntity(''); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Action', 'Entity', 'Details', 'User', 'Timestamp', 'IP Address'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={cn('inline-block rounded border px-2 py-0.5 text-xs font-semibold', ACTION_STYLES[log.action] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-normal">{log.entity}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.details}>{log.details}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{log.zk_user_id || 'System'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && logs.length === 0 && (
            <EmptyState icon={ScrollText} title="No audit logs found" description="Adjust your search or filter criteria" />
          )}
        </div>

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">Showing {logs.length} of {data.total} entries</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-600 px-2">Page {page} of {data.total_pages}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
