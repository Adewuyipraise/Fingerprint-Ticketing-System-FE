import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  isLoading?: boolean;
}

const COLOR_STYLES = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-600 text-white', value: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'bg-green-600 text-white', value: 'text-green-700' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500 text-white', value: 'text-amber-700' },
  red: { bg: 'bg-red-50', icon: 'bg-red-500 text-white', value: 'text-red-700' },
  slate: { bg: 'bg-slate-50', icon: 'bg-slate-600 text-white', value: 'text-slate-700' },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', isLoading }: StatCardProps) {
  const styles = COLOR_STYLES[color];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-200 rounded" />
          </div>
          <div className="h-11 w-11 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow', styles.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn('text-3xl font-bold mt-1', styles.value)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg shadow-sm', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
