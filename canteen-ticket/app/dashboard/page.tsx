'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Building2, LayoutDashboard, Ticket, TrendingUp, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Area, AreaChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { AuditLog } from '@/types';
import { getDashboardStats, getDepartmentDistribution, getRecentAuditLogs, getTicketChart } from '@/services/dashboard.service';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  GENERATE: 'text-amber-600 bg-amber-50',
  USE: 'text-slate-600 bg-slate-50',
  BULK_UPLOAD: 'text-teal-600 bg-teal-50',
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: departmentDistribution, isLoading: departmentsLoading } = useQuery({
    queryKey: ['department-distribution'],
    queryFn: getDepartmentDistribution,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: ticketChart, isLoading: ticketChartLoading } = useQuery({
    queryKey: ['ticket-chart'],
    queryFn: () => getTicketChart(30),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: getRecentAuditLogs,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const ticketData = useMemo(
    () =>
      (ticketChart ?? []).map((item: any) => ({
        date: format(new Date(item.date), 'dd MMM'),
        used: Number(item.used),
      })),
    [ticketChart]
  );

  const departmentData = useMemo(
    () =>
      (departmentDistribution ?? []).map((item: any) => ({
        department: item.department,
        total: Number(item.total),
      })),
    [departmentDistribution]
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview of the canteen ticket system"
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Employees"
          value={stats?.total_employees ?? 0}
          subtitle="Registered in system"
          icon={Users}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Tickets (This Month)"
          value={stats?.total_tickets ?? 0}
          subtitle="Meal tickets this month"
          icon={Ticket}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Today's Meals"
          value={stats?.today_meals ?? 0}
          subtitle="Tickets used today"
          icon={TrendingUp}
          color="amber"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Amount (This Month)"
          value={`₦${Number(stats?.total_amount ?? 0).toLocaleString()}`}
          subtitle="This month's meal value"
          icon={Building2}
          color="slate"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* 1. Meal Ticket Trend (Area Chart) */}
        <Card className="ring-1 ring-slate-200 shadow-sm p-6 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Meal Ticket Trend</h3>
            <p className="text-xs text-slate-400 mt-0.5">Last 7 days</p>
          </div>
          {ticketChartLoading ? (
            <div className="h-72 mt-4 animate-pulse bg-slate-100 rounded-lg" />
          ) : ticketData.length > 0 ? (
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ticketData}>
                  <defs>
                    <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={true}
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    fontSize={11}
                    tickLine={false}
                    axisLine={true}
                    stroke="#94a3b8"
                    width={40}
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} Meals`, 'Used']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="used" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorUsed)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm italic">No ticket trend data found</div>
          )}
        </Card>

        {/* 2. Department Distribution (Bar Chart) */}
        <Card className="ring-1 ring-slate-200 shadow-sm p-6 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Department Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Employees grouped by department</p>
          </div>
          {departmentsLoading ? (
            <div className="h-72 mt-4 animate-pulse bg-slate-100 rounded-lg" />
          ) : departmentData.length > 0 ? (
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="department" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={true}
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    fontSize={11}
                    tickLine={false}
                    axisLine={true}
                    stroke="#94a3b8"
                    width={40}
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} Employees`, 'Total']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400 text-sm italic">No department data found</div>
          )}
        </Card>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
          <p className="text-xs text-slate-400 mt-0.5">Latest system actions</p>
        </div>
        <div className="divide-y divide-slate-50">
          {recentLogs?.map((log: AuditLog) => (
            <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold mt-0.5 ${ACTION_COLORS[log.action] ?? 'text-slate-600 bg-slate-50'}`}>
                {log.action[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium truncate">{log.details}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  by <span className="font-medium text-slate-500">{log.user_name}</span> · {log.timestamp}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ACTION_COLORS[log.action] ?? 'text-slate-600 bg-slate-50'}`}>
                {log.action}
              </span>
            </div>
          ))}
          {!recentLogs?.length && (
            <div className="px-6 py-8 text-center text-sm text-slate-400">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}