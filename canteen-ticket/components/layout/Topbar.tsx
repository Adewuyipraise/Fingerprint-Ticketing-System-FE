'use client';

import { Bell, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { ROLE_LABELS } from '@/services/auth.service';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const { status, refresh } = useSystemStatus();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold text-slate-800">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border',
            status === 'connected' && 'border-green-200 bg-green-50 text-green-700',
            status === 'disconnected' && 'border-red-200 bg-red-50 text-red-700',
            status === 'checking' && 'border-slate-200 bg-slate-50 text-slate-500'
          )}
        >
          {status === 'connected' && <Wifi className="h-3 w-3" />}
          {status === 'disconnected' && <WifiOff className="h-3 w-3" />}
          {status === 'checking' && <RefreshCw className="h-3 w-3 animate-spin" />}
          <span>
            {status === 'connected' && 'Server Connected'}
            {status === 'disconnected' && 'Server Offline'}
            {status === 'checking' && 'Checking...'}
          </span>
          <button onClick={refresh} className="ml-1 hover:opacity-70 transition-opacity">
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-800 leading-none">{user?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user?.role ? ROLE_LABELS[user.role] : ''}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
              Role: <span className="font-medium text-foreground">{user?.role ? ROLE_LABELS[user.role] : ''}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
