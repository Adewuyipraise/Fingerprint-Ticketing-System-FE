'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Shield, Server, Save, Users,
  CircleCheck as CheckCircle, Circle as XCircle, RefreshCw, Ticket,
  Plus, Trash2, Clock, Users as UsersIcon, Building, User, Star,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { ROLE_LABELS, hasPermission } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { POSITIONS } from '@/services/employees.service';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ROLES: { key: UserRole; permissions: string[] }[] = [
  { key: 'admin', permissions: ['All Modules', 'User Management', 'Settings', 'Audit Logs'] },
  { key: 'hr', permissions: ['Employees', 'Tickets', 'Bulk Upload', 'Settings', 'Reports'] },
  { key: 'accountant', permissions: ['Reports', 'Tickets (View)'] },
  { key: 'auditor', permissions: ['Reports', 'Audit Logs'] },
  { key: 'canteen_rep', permissions: ['Canteen Tickets'] },
];

interface TicketRuleWindow {
  id: number;
  rule_set_id: number;
  label?: string | null;
  start_time: string;
  end_time: string;
}

interface TicketRuleAssignment {
  id: number;
  rule_set_id: number;
  role?: string | null;
  position?: string | null;
  zk_user_id?: string | null;
  priority: number;
}

interface TicketRuleSet {
  id: number;
  name: string;
  max_per_day: number;
  is_default: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  windows: TicketRuleWindow[];
  assignments: TicketRuleAssignment[];
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { status, refresh } = useSystemStatus();
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [ruleSets, setRuleSets] = useState<TicketRuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState<number | null>(null);

  const [showNewSet, setShowNewSet] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxPerDay, setNewMaxPerDay] = useState(2);

  const [newWindowLabel, setNewWindowLabel] = useState('');
  const [newWindowStart, setNewWindowStart] = useState('07:00');
  const [newWindowEnd, setNewWindowEnd] = useState('12:00');

  const [newAssignType, setNewAssignType] = useState<'role' | 'position' | 'user'>('role');
  const [newAssignValue, setNewAssignValue] = useState('');
  const [newAssignPriority, setNewAssignPriority] = useState(0);

  const [positions, setPosition] = useState<string[]>([]);


  const [newPosition, setNewPosition] = useState('all');

  const fetchRuleSets = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setRuleSets(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch rule sets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosition(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  }, []);

  useEffect(() => {
    fetchRuleSets();
    fetchPositions();
  }, [fetchRuleSets, fetchPositions]);

  const handleCreateRuleSet = async () => {
    const token = localStorage.getItem('auth_token');
    
    // ADD THIS CHECK:
    if (!token) {
        toast.error('You are not logged in. Please log in again.');
        return; 
    }

    if (!newName.trim()) return toast.error('Name is required');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newName,
          position: newPosition, // <--- ADD THIS LINE
          max_per_day: newMaxPerDay,
          is_default: ruleSets.length === 0,
          is_active: true,
        }),
      });
      if (res.ok) {
        toast.success('Rule set created');
        setNewName('');
        setNewMaxPerDay(2);
        setShowNewSet(false);
        fetchRuleSets();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to create rule set');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleUpdateRuleSet = async (id: number, updates: Partial<TicketRuleSet>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success('Rule set updated');
        fetchRuleSets();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteRuleSet = async (id: number) => {
    if (!confirm('Delete this rule set? This will also remove all its windows and assignments.')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Rule set deleted');
        if (expandedSet === id) setExpandedSet(null);
        fetchRuleSets();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleAddWindow = async (ruleSetId: number) => {
    if (!newWindowStart || !newWindowEnd) return toast.error('Start and end times are required');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules/${ruleSetId}/windows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: newWindowLabel, start_time: newWindowStart, end_time: newWindowEnd }),
      });
      if (res.ok) {
        toast.success('Time window added');
        setNewWindowLabel('');
        setNewWindowStart('07:00');
        setNewWindowEnd('12:00');
        fetchRuleSets();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteWindow = async (windowId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules/windows/${windowId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Window deleted');
        fetchRuleSets();
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleAddAssignment = async (ruleSetId: number) => {
    if (!newAssignValue.trim()) return toast.error('Value is required');
    try {
      const token = localStorage.getItem('auth_token');
      const body: Record<string, unknown> = { priority: newAssignPriority };
      if (newAssignType === 'role') body.role = newAssignValue;
      else if (newAssignType === 'position') body.position = newAssignValue;
      else body.zk_user_id = newAssignValue;

      const res = await fetch(`${API_BASE}/ticket-rules/${ruleSetId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Assignment added');
        setNewAssignValue('');
        fetchRuleSets();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add assignment');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/ticket-rules/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Assignment deleted');
        fetchRuleSets();
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (!user || !hasPermission(user.role, 'settings')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          You do not have permission to view Settings. This area is restricted to authorized personnel only.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <div>
      <PageHeader title="Settings" description="Configure system preferences and ticket policy engine" icon={Settings} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">

          {/* ===== TICKET POLICY ENGINE ===== */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Ticket Policy Engine</h2>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowNewSet(!showNewSet)}>
                <Plus className="h-3.5 w-3.5" /> New Rule Set
              </Button>
            </div>

            {showNewSet && (
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <div className="flex flex-wrap items-end gap-3">
                  {/* 1. Rule Set Name */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Rule Set Name</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Police Shift Rule" className="h-8 text-sm" />
                  </div>

                  {/* 2. ADD THIS: Position Selection */}
                  <div className="w-48">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Position</label>
                    <Select value={newPosition} onValueChange={setNewPosition}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Max Per Day */}
                  <div className="w-24">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Max Per Day</label>
                    <Input type="number" min={1} max={10} value={newMaxPerDay} onChange={(e) => setNewMaxPerDay(Number(e.target.value))} className="h-8 text-sm" />
                  </div>

                  {/* 4. Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs" onClick={handleCreateRuleSet}>Create</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowNewSet(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
              ) : ruleSets.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={Ticket} title="No rule sets" description="Create your first ticket policy rule set to get started" />
                </div>
              ) : (
                ruleSets.map((rs) => (
                  <div key={rs.id} className="bg-white">
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedSet(expandedSet === rs.id ? null : rs.id)}
                    >
                      {expandedSet === rs.id ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{rs.name}</span>
                          {rs.is_default && <Badge variant="default" className="text-xs px-1.5 py-0">Default</Badge>}
                          {!rs.is_active && <Badge variant="secondary" className="text-xs px-1.5 py-0">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500">{rs.max_per_day} per day</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{rs.windows?.length || 0} windows</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{rs.assignments?.length || 0} assignments</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Switch checked={rs.is_active} onCheckedChange={(v) => handleUpdateRuleSet(rs.id, { is_active: v })} title="Active" />
                        <Switch checked={rs.is_default} onCheckedChange={(v) => { if (v) handleUpdateRuleSet(rs.id, { is_default: v }); }} title="Default" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteRuleSet(rs.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expandedSet === rs.id && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        {/* Time Windows */}
                        <div className="p-4 border-b border-slate-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Time Windows</h3>
                          </div>
                          {rs.windows && rs.windows.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {rs.windows.map((w) => (
                                <div key={w.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                  <span className="text-xs font-medium text-slate-700">{w.label || 'Window'}</span>
                                  <span className="text-xs text-slate-500">{w.start_time} – {w.end_time}</span>
                                  <button onClick={() => handleDeleteWindow(w.id)} className="ml-1 text-slate-400 hover:text-red-500">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mb-3">No time windows — tickets can be printed anytime.</p>
                          )}
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="w-28">
                              <Input value={newWindowLabel} onChange={(e) => setNewWindowLabel(e.target.value)} placeholder="Label" className="h-7 text-xs" />
                            </div>
                            <Input type="time" value={newWindowStart} onChange={(e) => setNewWindowStart(e.target.value)} className="h-7 w-28 text-xs" />
                            <span className="text-xs text-slate-400 self-center">to</span>
                            <Input type="time" value={newWindowEnd} onChange={(e) => setNewWindowEnd(e.target.value)} className="h-7 w-28 text-xs" />
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAddWindow(rs.id)}>
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        </div>

                        {/* Assignments */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <UsersIcon className="h-3.5 w-3.5 text-slate-500" />
                            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Assignments</h3>
                            <span className="text-xs text-slate-400">(Priority: User → Dept → Role → Default)</span>
                          </div>
                          {rs.assignments && rs.assignments.length > 0 ? (
                            <div className="space-y-1.5 mb-3">
                              {rs.assignments.map((a) => (
                                <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                                  {a.zk_user_id && <><User className="h-3 w-3 text-blue-500" /><span className="text-xs font-mono text-slate-700">{a.zk_user_id}</span></>}
                                  {a.position && <><Building className="h-3 w-3 text-green-500" /><span className="text-xs text-slate-700">{a.position}</span></>}
                                  {a.role && <><Star className="h-3 w-3 text-amber-500" /><span className="text-xs text-slate-700">{a.role}</span></>}
                                  <span className="text-xs text-slate-400 ml-auto">priority: {a.priority}</span>
                                  <button onClick={() => handleDeleteAssignment(a.id)} className="text-slate-400 hover:text-red-500">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mb-3">No assignments — this rule set is not assigned to anyone yet.</p>
                          )}
                          <div className="flex flex-wrap items-end gap-2">
                            <Select value={newAssignType} onValueChange={(v: 'role' | 'position' | 'user') => setNewAssignType(v)}>
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="role">Role</SelectItem>
                                <SelectItem value="position">Position</SelectItem>
                                <SelectItem value="user">User ID</SelectItem>
                              </SelectContent>
                            </Select>
                            {newAssignType === 'role' && (
                              <Select value={newAssignValue} onValueChange={setNewAssignValue}>
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(['admin', 'hr', 'canteen_rep', 'accountant', 'auditor'] as UserRole[]).map((r) => (
                                    <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {newAssignType === 'position' && (
                              <Select value={newAssignValue} onValueChange={setNewAssignValue}>
                                <SelectTrigger className="h-7 w-36 text-xs">
                                  <SelectValue placeholder="Select dept" />
                                </SelectTrigger>
                                <SelectContent>
                                  {positions.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {newAssignType === 'user' && (
                              <Input value={newAssignValue} onChange={(e) => setNewAssignValue(e.target.value)} placeholder="zk_user_id" className="h-7 w-36 text-xs font-mono" />
                            )}
                            <div className="w-20">
                              <Input type="number" value={newAssignPriority} onChange={(e) => setNewAssignPriority(Number(e.target.value))} placeholder="Priority" className="h-7 text-xs" />
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAddAssignment(rs.id)}>
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Preferences */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">System Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">Auto-generate daily tickets</p>
                  <p className="text-xs text-slate-400 mt-0.5">Automatically generate canteen tickets each morning at 07:00</p>
                </div>
                <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">Email notifications</p>
                  <p className="text-xs text-slate-400 mt-0.5">Send daily ticket summary to administrators</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">API Base URL</p>
                  <p className="text-xs text-slate-400 mt-0.5">Backend server endpoint for API calls</p>
                </div>
                <Input defaultValue="http://localhost:3001" className="w-52 h-8 text-xs font-mono" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Settings</span>
              )}
            </Button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">System Status</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Backend Server</span>
                <div className="flex items-center gap-1.5">
                  {status === 'connected' && <><CheckCircle className="h-3.5 w-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">Online</span></>}
                  {status === 'disconnected' && <><XCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-xs text-red-600 font-medium">Offline</span></>}
                  {status === 'checking' && <><RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin" /><span className="text-xs text-slate-500">Checking</span></>}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Database</span>
                <span className="text-xs text-slate-400">PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Mode</span>
                <Badge variant={status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                  {status === 'connected' ? 'Live' : 'Demo'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Endpoint</span>
                <span className="text-xs font-mono text-slate-500">:3001</span>
              </div>
              <Separator />
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Role Permissions</h2>
            </div>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <div key={r.key} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">{ROLE_LABELS[r.key]}</p>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map((p) => (
                      <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">About</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Application</span>
                <span className="text-slate-700 font-medium">CanteenTrack</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Version</span>
                <span className="text-slate-700">v2.0.0</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Environment</span>
                <span className="text-slate-700">Local Server (LAN)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Stack</span>
                <span className="text-slate-700">Next.js + Express/PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}