'use client';

import { useState, useEffect, useCallback } from 'react';
import { SystemStatus } from '@/types';
import { checkServerHealth } from '@/services/dashboard.service';

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus>('checking');

  const check = useCallback(async () => {
    setStatus('checking');
    const healthy = await checkServerHealth();
    setStatus(healthy ? 'connected' : 'disconnected');
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { status, refresh: check };
}
