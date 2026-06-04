'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Filter, ChevronLeft, ChevronRight, Calendar, Shield, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

import { getRecords } from '@/services/tickets.service';
import { DEPARTMENTS } from '@/services/employees.service';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/services/auth.service';

export default function RecordsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);

  const perPage = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['records', search, department, date, page],
    queryFn: () =>
      getRecords({
        search: search || undefined,
        department: department === 'all' ? undefined : department,
        date: date || undefined,
        page,
        per_page: perPage,
      }),
  });

  const records = data?.data?.data ?? data?.data ?? [];
  const totalRecords = data?.data?.total ?? data?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / perPage);

  const splitDateTime = (datetimeStr: string) => {
    if (!datetimeStr) return { date: '-', time: '-' };
    
    // Handle both ISO strings (with T) and plain date strings
    const str = String(datetimeStr);
    
    // If it's a plain YYYY-MM-DD string (no time component), return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return { date: str, time: '00:00:00' };
    }
    
    // For ISO strings, parse carefully to avoid timezone shift issues
    // Use the local date/time components directly
    const d = new Date(str);
    if (isNaN(d.getTime())) return { date: '-', time: '-' };
    
    // Use en-CA locale for YYYY-MM-DD format (local time, not UTC)
    const date = d.toLocaleDateString('en-CA');
    const time = d.toLocaleTimeString('en-GB', { hour12: false });
    return { date, time };
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const title = 'CDK CanteenTrack - Meal Records';
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    const tableColumn = ['Ticket #', 'Employee ID', 'Name', 'Dept', 'Event', 'Date', 'Time', 'Amount'];
    const tableRows = records.map((r: any) => {
      // Use pre-computed local date/time fields from backend
      const eventDate = r.event_date_local || splitDateTime(r.event_date).date;
      const printedTime = r.printed_time || splitDateTime(r.printed_at).time;
      return [
        r.ticket_number,
        r.zk_user_id,
        r.name,
        r.department,
        r.event_name,
        eventDate,
        printedTime,
        `₦${Number(r.amount || 0).toLocaleString()}`,
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save('meal-records.pdf');
  };

  const handleExportExcel = () => {
    const data = records.map((r: any) => {
      // Use pre-computed local date/time fields from backend
      const eventDate = r.event_date_local || splitDateTime(r.event_date).date;
      const printedDate = r.printed_date || splitDateTime(r.printed_at).date;
      const printedTime = r.printed_time || splitDateTime(r.printed_at).time;
      return {
        'Ticket Number': r.ticket_number,
        'Employee ID': r.zk_user_id,
        'Name': r.name,
        'Department': r.department,
        'Event Name': r.event_name,
        'Amount (₦)': Number(r.amount || 0),
        'Recorded Date': printedDate,
        'Recorded Time': printedTime,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(fileData, 'meal-records.xlsx');
  };

  if (user && !hasPermission(user.role, 'tickets')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          You do not have permission to view Meal Records. This area is restricted to authorized personnel only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Meal Records"
        description="Historical logs of all meal activities"
        icon={History}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
              <FileText className="h-3.5 w-3.5" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Ticket, Employee ID, Name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              className="pl-9 h-9 w-44"
            />
          </div>
          <Select value={department} onValueChange={(v) => { setDepartment(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-44">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || department || date) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-slate-500"
              onClick={() => { setSearch(''); setDepartment('all'); setDate(''); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Ticket Number', 'Employee ID', 'Name', 'Department', 'Event Name', 'Amount', 'Recorded Date', 'Recorded Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length > 0 ? (
                records.map((record: any) => {
                  // Use pre-computed local date/time fields from backend (Africa/Lagos timezone)
                  // event_date_local is already YYYY-MM-DD, printed_date/time are already formatted
                  const eventDate = record.event_date_local || splitDateTime(record.event_date).date;
                  const printedDate = record.printed_date || splitDateTime(record.printed_at).date;
                  const printedTime = record.printed_time || splitDateTime(record.printed_at).time;
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{record.ticket_number}</td>
                      <td className="px-4 py-3 font-mono text-xs">{record.zk_user_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{record.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal">{record.department}</Badge>
                      </td>
                      <td className="px-4 py-3">{record.event_name}</td>
                      <td className="px-4 py-3 font-medium">₦{Number(record.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs">{printedDate}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{printedTime}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12">
                    <EmptyState icon={History} title="No records found" description="Adjust your filters to find what you're looking for" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalRecords)} of {totalRecords} records
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-600 px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}