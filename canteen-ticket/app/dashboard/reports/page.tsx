// app/dashboard/reports/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileText, Printer, Calendar, Users, Ticket, DollarSign, TrendingUp, Search, X, ChevronLeft, ChevronRight, Shield, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getRecords } from '@/services/tickets.service';
import { getEmployees } from '@/services/employees.service';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#f97316'];

// Helper function to extract date and time from ticket number
const extractDateTimeFromTicket = (ticketNumber: string) => {
  let date = '';
  let time = '';

  if (ticketNumber) {
    const parts = ticketNumber.split('-');
    // Format: EMP0325-2026-05-22-20:12:44:367
    if (parts.length >= 4) {
      date = `${parts[1]}-${parts[2]}-${parts[3]}`;

      if (parts[4]) {
        const timeParts = parts[4].split(':');
        if (timeParts.length >= 3) {
          time = `${timeParts[0]}:${timeParts[1]}:${timeParts[2].substring(0, 2)}`;
        }
      }
    }
  }

  return { date, time };
};

// Helper function to fetch all records (handles pagination internally)
const fetchAllRecords = async (params: any) => {
  let allRecords: any[] = [];
  let currentPage = 1;
  const perPage = 1000;

  while (true) {
    const response = await getRecords({
      ...params,
      per_page: perPage,
      page: currentPage,
    });

    const records = response?.data ?? response?.data?.data ?? [];

    if (!records || records.length === 0) break;

    allRecords = [...allRecords, ...records];

    const totalPages = response?.total_pages ?? response?.metadata?.total_pages ??
                       Math.ceil((response?.total ?? records.length) / perPage);

    if (currentPage >= totalPages) break;
    currentPage++;

    if (currentPage > 100) break;
  }

  return allRecords;
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [page, setPage] = useState(1);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const perPage = 50;

  // Default to current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultStartDate = firstDayOfMonth.toISOString().split('T')[0];
  const defaultEndDate = now.toISOString().split('T')[0];
  const todayDate = now.toISOString().split('T')[0];

  const isAllTime = startDate === 'all' && endDate === 'all';

  let effectiveStartDate: string | undefined = undefined;
  let effectiveEndDate: string | undefined = undefined;

  if (!isAllTime) {
    if (startDate && startDate !== 'all') {
      effectiveStartDate = startDate;
    } else if (!startDate && !endDate) {
      effectiveStartDate = defaultStartDate;
      effectiveEndDate = defaultEndDate;
    }

    if (endDate && endDate !== 'all') {
      effectiveEndDate = endDate;
    } else if (!startDate && !endDate) {
      effectiveEndDate = defaultEndDate;
    }
  }

  const getQueryParams = () => {
    const params: any = {};
    if (effectiveStartDate && effectiveStartDate !== 'undefined') {
      params.start_date = effectiveStartDate;
    }
    if (effectiveEndDate && effectiveEndDate !== 'undefined') {
      params.end_date = effectiveEndDate;
    }
    if (selectedEmployee !== 'all') {
      params.zk_user_id = selectedEmployee;
    }
    return params;
  };

  const { data: allRecordsData, isLoading: allRecordsLoading } = useQuery({
    queryKey: ['tickets-all', effectiveStartDate, effectiveEndDate, selectedEmployee, isAllTime],
    queryFn: () => fetchAllRecords(getQueryParams()),
    staleTime: 0,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets-paginated', effectiveStartDate, effectiveEndDate, selectedEmployee, page],
    queryFn: () => getRecords({
      per_page: perPage,
      page: page,
      ...getQueryParams(),
    }),
    staleTime: 0,
  });

  const { data: todayRecords, isLoading: todayLoading } = useQuery({
    queryKey: ['tickets-today', todayDate],
    queryFn: () => fetchAllRecords({
      start_date: todayDate,
      end_date: todayDate,
    }),
    staleTime: 60000,
  });

  const { data: employeesData } = useQuery({
    queryFn: () => getEmployees({ search: employeeSearch, per_page: 100 }),
    queryKey: ['employees-search', employeeSearch],
  });

  const allRecords = useMemo(() => {
    const records = allRecordsData ?? [];
    return records.map((r: any) => {
      const { date: extractedDate, time: extractedTime } = extractDateTimeFromTicket(r.ticket_number);

      return {
        ...r,
        id: r.id || r.ticket_number,
        ticket_number: r.ticket_number,
        zk_user_id: r.zk_user_id,
        name: r.name,
        department: r.department,
        position: String(r.position || 'Unknown').trim(),
        amount: Number(String(r.amount || 0).replace(/,/g, '')),
        event_date: extractedDate || r.event_date_local || r.event_date?.split('T')[0] || '',
        event_time: extractedTime || r.printed_time || '',
        printed_date: r.printed_date || '',
      };
    });
  }, [allRecordsData]);

  const paginatedRecords = useMemo(() => {
    const rawData = ticketsData?.data ?? ticketsData?.data?.data ?? [];
    return rawData.map((r: any) => {
      const { date: extractedDate, time: extractedTime } = extractDateTimeFromTicket(r.ticket_number);

      return {
        ...r,
        id: r.id || r.ticket_number,
        ticket_number: r.ticket_number,
        zk_user_id: r.zk_user_id,
        name: r.name,
        department: r.department,
        position: String(r.position || 'Unknown').trim(),
        amount: Number(String(r.amount || 0).replace(/,/g, '')),
        event_date: extractedDate || r.event_date_local || r.event_date?.split('T')[0] || '',
        event_time: extractedTime || r.printed_time || '',
        printed_date: r.printed_date || '',
      };
    });
  }, [ticketsData]);

  const todayRecordsList = useMemo(() => {
    const records = todayRecords ?? [];
    return records.map((r: any) => {
      const { date: extractedDate } = extractDateTimeFromTicket(r.ticket_number);
      return {
        ...r,
        amount: Number(String(r.amount || 0).replace(/,/g, '')),
        event_date: extractedDate || r.event_date_local || r.event_date?.split('T')[0] || '',
      };
    });
  }, [todayRecords]);

  const totalMeals = allRecords.length;
  const totalAmount = allRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const todayMeals = todayRecordsList.length;
  const todayAmount = todayRecordsList.reduce((sum, r) => sum + (r.amount || 0), 0);
  const averageMealValue = totalMeals > 0 ? Math.round(totalAmount / totalMeals) : 0;
  const uniqueEmployees = new Set(allRecords.map(r => r.zk_user_id)).size;

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployee === 'all') return 'All Employees';
    const emp = employeesData?.data?.find(e => e.zk_user_id === selectedEmployee);
    return emp?.name || selectedEmployee;
  }, [selectedEmployee, employeesData]);

  const positionData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    allRecords.forEach((r: any) => {
      const pos = r.position;
      if (!map[pos]) {
        map[pos] = { count: 0, amount: 0 };
      }
      map[pos].count++;
      map[pos].amount += r.amount || 0;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, amount: data.amount }))
      .sort((a, b) => b.count - a.count);
  }, [allRecords]);

  const dailyMealData = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r: any) => {
      const date = r.event_date;
      if (date) {
        map[date] = (map[date] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [allRecords]);

  const dailyAmountData = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r: any) => {
      const date = r.event_date;
      if (date) {
        map[date] = (map[date] || 0) + (r.amount || 0);
      }
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [allRecords]);

  const amountByPosition = useMemo(() => {
    const map: Record<string, number> = {};
    allRecords.forEach((r: any) => {
      const pos = r.position;
      map[pos] = (map[pos] || 0) + (r.amount || 0);
    });
    return map;
  }, [allRecords]);

  const employeeReport = useMemo(() => {
    const map: Record<string, { name: string; department: string; position: string; meal_count: number; total_amount: number }> = {};
    allRecords.forEach((r: any) => {
      if (!map[r.zk_user_id]) {
        map[r.zk_user_id] = {
          name: r.name || r.zk_user_id,
          department: r.department || 'N/A',
          position: r.position || 'Unknown',
          meal_count: 0,
          total_amount: 0,
        };
      }
      map[r.zk_user_id].meal_count++;
      map[r.zk_user_id].total_amount += r.amount || 0;
    });
    return Object.entries(map)
      .map(([zk_user_id, data]) => ({ zk_user_id, ...data }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }, [allRecords]);

  const totalRecordsCount = ticketsData?.total ?? ticketsData?.data?.total ?? paginatedRecords.length;
  const totalPages = Math.ceil(totalRecordsCount / perPage);

  // ============================================================
  // SHARED EXPORT SCOPE BUILDER
  // ============================================================
  const buildExportScope = async () => {
    // 1. Fetch employee list
    let allEmployees: any[] = [];
    try {
      const res = await getEmployees({ search: '', per_page: 10000 });
      allEmployees = res?.data ?? [];
    } catch {
      allEmployees = employeesData?.data ?? [];
    }

    // 2. Group records by employee
    const recordsByEmployee = new Map<string, any[]>();
    allRecords.forEach((r: any) => {
      const key = String(r.zk_user_id || '').trim();
      if (!key) return;
      if (!recordsByEmployee.has(key)) recordsByEmployee.set(key, []);
      recordsByEmployee.get(key)!.push(r);
    });

    // 3. Determine which employees to include
    //    - If a single employee is selected: only that employee (block still shown even if 0 records).
    //    - Otherwise: every employee from the full list, plus any IDs that appear in records but not in the list.
    let scopedEmployees: any[] = [];

    if (selectedEmployee !== 'all') {
      // Find employee in list, else fall back to whatever exists in records
      const found = allEmployees.find(
        (e: any) => String(e.zk_user_id) === String(selectedEmployee)
      );
      if (found) {
        scopedEmployees = [found];
      } else {
        const firstRecord = recordsByEmployee.get(String(selectedEmployee))?.[0];
        scopedEmployees = [{
          zk_user_id: selectedEmployee,
          name: firstRecord?.name || selectedEmployee,
          department: firstRecord?.department || '',
          position: firstRecord?.position || '',
        }];
      }
    } else {
      const employeeMap = new Map<string, any>();
      allEmployees.forEach((e: any) => {
        const id = String(e.zk_user_id || '').trim();
        if (id) employeeMap.set(id, e);
      });
      recordsByEmployee.forEach((_v, id) => {
        if (!employeeMap.has(id)) {
          const first = recordsByEmployee.get(id)![0];
          employeeMap.set(id, {
            zk_user_id: id,
            name: first.name,
            department: first.department,
            position: first.position,
          });
        }
      });
      scopedEmployees = Array.from(employeeMap.values());
    }

    // 4. Sort by Employee ID ascending
    scopedEmployees.sort((a, b) =>
      String(a.zk_user_id).localeCompare(String(b.zk_user_id))
    );

    // 5. Grand totals (based on allRecords, which is already scoped by the active filters)
    const grandTotalRecords = allRecords.length;
    const grandTotalAmount = allRecords.reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );

    return { scopedEmployees, recordsByEmployee, grandTotalRecords, grandTotalAmount };
  };

  // ============================================================
  // EXPORT EXCEL (grouped per employee)
  // ============================================================
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const { scopedEmployees, recordsByEmployee, grandTotalRecords, grandTotalAmount } =
        await buildExportScope();

      const periodLabel = isAllTime
        ? 'All Time'
        : `${startDate || 'All Time'} to ${endDate || 'All Time'}`;
      const filterLabel =
        selectedEmployee === 'all'
          ? 'All Employees (grouped by employee)'
          : `Employee: ${selectedEmployeeName} (${selectedEmployee})`;

      const aoa: any[][] = [];

      // Title block
      aoa.push(['CDK CanteenTrack - Meal Consumption Report']);
      aoa.push([`Period: ${periodLabel}`]);
      aoa.push([`Filter: ${filterLabel}`]);
      aoa.push([]);
      aoa.push(['GRAND TOTAL RECORDS:', grandTotalRecords]);
      aoa.push(['GRAND TOTAL AMOUNT (NGN):', grandTotalAmount]);
      aoa.push([]);
      aoa.push([]);

      // Per-employee blocks
      scopedEmployees.forEach((emp: any) => {
        const empId = String(emp.zk_user_id || '').trim();
        const empRecords = (recordsByEmployee.get(empId) || []).slice().sort((a, b) => {
          const da = `${a.event_date || ''} ${a.event_time || ''}`;
          const db = `${b.event_date || ''} ${b.event_time || ''}`;
          return da.localeCompare(db);
        });

        const empSubtotal = empRecords.reduce(
          (sum: number, r: any) => sum + Number(r.amount || 0),
          0
        );

        aoa.push([
          'Employee ID', empId,
          'Name', emp.name || '',
          'Department', emp.department || '',
          'Position', emp.position || '',
        ]);

        aoa.push(['Ticket Number', 'Event Date', 'Event Time', 'Amount (NGN)']);

        if (empRecords.length === 0) {
          aoa.push(['No records in selected range', '', '', '']);
        } else {
          empRecords.forEach((r: any) => {
            aoa.push([
              r.ticket_number || '',
              r.event_date || '',
              r.event_time || '',
              Number(r.amount || 0),
            ]);
          });
        }

        aoa.push([`Total for ${empId}:`, '', '', empSubtotal]);
        aoa.push([]);
      });

      // Bottom grand total
      aoa.push([]);
      aoa.push(['GRAND TOTAL RECORDS:', grandTotalRecords]);
      aoa.push(['GRAND TOTAL AMOUNT (NGN):', grandTotalAmount]);

      const worksheet = XLSX.utils.aoa_to_sheet(aoa);

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      ];

      worksheet['!cols'] = [
        { wch: 22 },
        { wch: 26 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Meal Report');

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const fileData = new Blob([excelBuffer], {
        type: 'application/octet-stream',
      });

      const fileName = `meal_report_grouped_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
      saveAs(fileData, fileName);
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================
  // EXPORT PDF (grouped per employee)
  // ============================================================
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const { scopedEmployees, recordsByEmployee, grandTotalRecords, grandTotalAmount } =
        await buildExportScope();

      const periodLabel = isAllTime
        ? 'All Time'
        : `${startDate || 'All Time'} to ${endDate || 'All Time'}`;
      const filterLabel =
        selectedEmployee === 'all'
          ? 'All Employees (grouped by employee)'
          : `Employee: ${selectedEmployeeName} (${selectedEmployee})`;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let cursorY = 50;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20);
      doc.text('CDK CanteenTrack - Meal Consumption Report', margin, cursorY);
      cursorY += 22;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90);
      doc.text(`Period: ${periodLabel}`, margin, cursorY);
      cursorY += 14;
      doc.text(`Filter: ${filterLabel}`, margin, cursorY);
      cursorY += 20;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      doc.text(`GRAND TOTAL RECORDS: ${grandTotalRecords}`, margin, cursorY);
      cursorY += 15;
      doc.text(`GRAND TOTAL AMOUNT (NGN): ${grandTotalAmount.toLocaleString()}`, margin, cursorY);
      cursorY += 22;

      doc.setDrawColor(200);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 16;

      scopedEmployees.forEach((emp: any) => {
        const empId = String(emp.zk_user_id || '').trim();
        const empRecords = (recordsByEmployee.get(empId) || []).slice().sort((a, b) => {
          const da = `${a.event_date || ''} ${a.event_time || ''}`;
          const db = `${b.event_date || ''} ${b.event_time || ''}`;
          return da.localeCompare(db);
        });
        const empSubtotal = empRecords.reduce(
          (sum: number, r: any) => sum + Number(r.amount || 0),
          0
        );

        // Page break check for the block header
        if (cursorY + 70 > pageHeight - margin) {
          doc.addPage();
          cursorY = 50;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20);
        const headerLine = `Employee ID: ${empId}   |   Name: ${emp.name || '-'}   |   Dept: ${emp.department || '-'}   |   Position: ${emp.position || '-'}`;
        const headerLines = doc.splitTextToSize(headerLine, pageWidth - margin * 2);
        headerLines.forEach((line: string) => {
          doc.text(line, margin, cursorY);
          cursorY += 13;
        });
        cursorY += 2;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(70);
        doc.text('Ticket Number', margin, cursorY);
        doc.text('Event Date', margin + 220, cursorY);
        doc.text('Event Time', margin + 310, cursorY);
        doc.text('Amount (NGN)', margin + 400, cursorY);
        cursorY += 12;

        doc.setDrawColor(220);
        doc.line(margin, cursorY - 2, pageWidth - margin, cursorY - 2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);

        if (empRecords.length === 0) {
          doc.text('No records in selected range', margin, cursorY);
          cursorY += 14;
        } else {
          empRecords.forEach((r: any) => {
            if (cursorY > pageHeight - margin) {
              doc.addPage();
              cursorY = 50;
            }
            doc.text(String(r.ticket_number || ''), margin, cursorY);
            doc.text(String(r.event_date || ''), margin + 220, cursorY);
            doc.text(String(r.event_time || ''), margin + 310, cursorY);
            doc.text(Number(r.amount || 0).toLocaleString(), margin + 400, cursorY);
            cursorY += 14;
          });
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`Total for ${empId}: ${empSubtotal.toLocaleString()} NGN`, margin, cursorY);
        cursorY += 10;

        doc.setDrawColor(200);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 18;
        doc.setFont('helvetica', 'normal');
      });

      if (cursorY > pageHeight - 80) {
        doc.addPage();
        cursorY = 50;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30);
      doc.text(`GRAND TOTAL RECORDS: ${grandTotalRecords}`, margin, cursorY);
      cursorY += 15;
      doc.text(`GRAND TOTAL AMOUNT (NGN): ${grandTotalAmount.toLocaleString()}`, margin, cursorY);

      doc.save(`meal_report_grouped_${startDate || 'all'}_${endDate || 'all'}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => window.print();

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedEmployee('all');
    setPage(1);
  };

  const hasFilters = startDate || endDate || selectedEmployee !== 'all';

  if (!user || !hasPermission(user.role, 'reports')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2 max-w-md">You do not have permission to view Reports.</p>
      </div>
    );
  }

  const isLoading = allRecordsLoading || ticketsLoading;

  return (
    <div className="print:p-4">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive meal consumption insights and financial summaries"
        icon={BarChart3}
        actions={
          user?.role !== 'canteen_rep' && (
            <div className="flex gap-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="gap-2"
                disabled={isExporting || allRecords.length === 0}
              >
                <FileText className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
                disabled={isExporting || allRecords.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-3.5 w-3.5" /> Print Report
              </Button>
            </div>
          )
        }
      />

      {/* Filters Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-5 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Date Range</Label>
            <Select
              value={(() => {
                if (isAllTime) return "alltime";
                if (!startDate && !endDate) return "current";
                return "custom";
              })()}
              onValueChange={(v) => {
                if (v === "current") {
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                } else if (v === "alltime") {
                  setStartDate('all');
                  setEndDate('all');
                  setPage(1);
                } else if (v === "custom") {
                  setStartDate(defaultStartDate);
                  setEndDate(defaultEndDate);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">📅 Current Month</SelectItem>
                <SelectItem value="alltime">📊 All Time</SelectItem>
                <SelectItem value="custom">⚙️ Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isAllTime && (startDate || endDate || (!startDate && !endDate)) && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={startDate === 'all' ? '' : startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="pl-9 h-9 w-40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={endDate === 'all' ? '' : endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="pl-9 h-9 w-40"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="text-xs text-slate-500">Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={(v) => { setSelectedEmployee(v); setPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search employee..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>
                </div>
                <SelectItem value="all">👥 All Employees</SelectItem>
                {employeesData?.data?.map((emp) => (
                  <SelectItem key={emp.zk_user_id} value={emp.zk_user_id}>
                    {emp.name} ({emp.zk_user_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(hasFilters || isAllTime) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-slate-500">
              <X className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="mb-4 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          {isAllTime ? (
            <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700">📊 All Time Data</span>
          ) : (!startDate && !endDate) ? (
            <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700">
              📅 {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          ) : (startDate && endDate && startDate !== 'all' && endDate !== 'all') ? (
            <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700">📅 {startDate} to {endDate}</span>
          ) : null}

          {selectedEmployee !== 'all' && (
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">👤 {selectedEmployeeName}</span>
          )}

          {totalMeals > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600">
              🍽️ {totalMeals.toLocaleString()} meals • ₦{totalAmount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Meal Records"
          value={totalMeals.toLocaleString()}
          subtitle={selectedEmployee !== 'all' ? `For ${selectedEmployeeName}` : (isAllTime ? "All time" : "Selected period")}
          icon={Ticket}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Amount Spent"
          value={`₦${totalAmount.toLocaleString()}`}
          subtitle={selectedEmployee !== 'all' ? `For ${selectedEmployeeName}` : (isAllTime ? "All time" : "Selected period")}
          icon={DollarSign}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          title="Today's Meals"
          value={todayMeals.toLocaleString()}
          subtitle={`₦${todayAmount.toLocaleString()}`}
          icon={TrendingUp}
          color="amber"
          isLoading={todayLoading}
        />
        <StatCard
          title="Average Meal Value"
          value={`₦${averageMealValue.toLocaleString()}`}
          subtitle="Per meal"
          icon={Calendar}
          color="red"
          isLoading={isLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="no-print">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="table">Report Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Meal Distribution by Position</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : positionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={positionData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {positionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} meals`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-slate-400">No data available</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Daily Meal Count</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : dailyMealData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyMealData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" name="Meals" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-slate-400">No data available</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Amount Spent Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : dailyAmountData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyAmountData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" name="Amount" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Meal Distribution by Position (Count)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : positionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={positionData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {positionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} meals`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Meal Distribution by Position (Amount)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : positionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={positionData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {positionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Daily Meal Count</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : dailyMealData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyMealData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Meals" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Amount Spent Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : dailyAmountData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyAmountData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" name="Amount" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(amountByPosition).map(([pos, amount], i) => (
                  <div key={pos} className="p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-slate-600">{pos}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">₦{amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {positionData.find((d) => d.name === pos)?.count || 0} meals
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">Total Amount</span>
                  <span className="text-xl font-bold text-slate-800">₦{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-semibold text-slate-700">Unique Employees</span>
                  <span className="text-xl font-bold text-slate-800">{uniqueEmployees}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Amount by Position (Bar Chart)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : positionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={positionData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₦${v.toLocaleString()}`} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="amount" name="Amount" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-slate-400">No data available</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Individual Spending Report</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : employeeReport.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Employee ID</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Department</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Position</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Meals</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employeeReport.map((emp) => (
                        <tr key={emp.zk_user_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs">{emp.zk_user_id}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{emp.name}</td>
                          <td className="px-4 py-2.5 text-slate-600">{emp.department}</td>
                          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium">{emp.position}</span></td>
                          <td className="px-4 py-2.5 text-right font-medium">{emp.meal_count}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-800">₦{emp.total_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={Users} title="No employee data found" description="No meal records found for the selected period" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Report Table</CardTitle>
              {totalRecordsCount > 0 && (
                <p className="text-xs text-slate-400">
                  Showing page {page} of {totalPages} • {totalRecordsCount} total records
                  {selectedEmployee !== 'all' && ` • Employee: ${selectedEmployeeName}`}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : paginatedRecords.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          {['Ticket Number', 'Employee ID', 'Name', 'Department', 'Position', 'Date', 'Time', 'Amount'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedRecords.map((r: any) => (
                          <tr key={r.ticket_number} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-mono text-xs font-medium text-blue-700">{r.ticket_number}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{r.zk_user_id}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                            <td className="px-4 py-2.5 text-slate-600">{r.department}</td>
                            <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium">{r.position}</span></td>
                            <td className="px-4 py-2.5 text-xs">{r.event_date}</td>
                            <td className="px-4 py-2.5 text-xs">{r.event_time}</td>
                            <td className="px-4 py-2.5 font-medium">₦{r.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-xs text-slate-500">Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalRecordsCount)} of {totalRecordsCount}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon={Ticket} title="No records found" description="Adjust your filters to find data" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { padding: 20px; }
        }
      `}</style>
    </div>
  );
}