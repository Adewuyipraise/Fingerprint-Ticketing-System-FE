'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useReactTable, getCoreRowModel, flexRender,
  ColumnDef, getPaginationRowModel,
} from '@tanstack/react-table';
import { Users, Plus, Search, CreditCard as Edit2, Trash2, ChevronLeft, ChevronRight, Filter, X, Upload, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, bulkDeleteEmployees } from '@/services/employees.service';
import { DEPARTMENTS, POSITIONS } from '@/lib/constants';
import { getApiErrorMessage } from '@/services/api';
import { Employee } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/services/auth.service';

const positionEnum = z.enum(POSITIONS);
const employeeSchema = z.object({
  zk_user_id: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  department: z.string().min(1, 'Department is required'),
  position: positionEnum,
  amount: z.coerce.number().min(0, 'Amount must be at least 0'),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'position' | 'amount' | 'zk_user_id'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteZkUserId, setDeleteZkUserId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, department, page, sortBy, order],
    queryFn: () => getEmployees({ search, department: department || undefined, page, per_page: 10, sortBy, order }),
  });

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee created'); closeModal(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ zk_user_id, data }: { zk_user_id: string; data: Partial<Employee> }) => updateEmployee(zk_user_id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee updated'); closeModal(); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); setDeleteZkUserId(null); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!user || !hasPermission(user.role, 'employees')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          You do not have permission to view Employees. This area is restricted to authorized personnel only.
        </p>
      </div>
    );
  }

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteEmployees,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success(`Deleted ${res.deleted} employees`); setSelected([]); setBulkDeleteOpen(false); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setOrder('asc');
    }
    setPage(1);
  };

  const toggleOne = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === data?.data.length) {
      setSelected([]);
    } else {
      setSelected(data?.data.map(emp => emp.zk_user_id) ?? []);
    }
  };

  const openCreate = () => { setEditEmployee(null); reset(); setModalOpen(true); };
  const openEdit = (emp: Employee) => {
    setEditEmployee(emp);
    reset({
      zk_user_id: emp.zk_user_id,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      amount: emp.amount,
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditEmployee(null); reset(); };

  const onSubmit = (form: EmployeeForm) => {
    if (editEmployee) {
      updateMutation.mutate({ zk_user_id: editEmployee.zk_user_id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'zk_user_id', header: () => <div className="cursor-pointer select-none" onClick={() => handleSort('zk_user_id')}>ID {sortBy === 'zk_user_id' && (order === 'asc' ? '↑' : '↓')}</div>, cell: ({ getValue }) => <span className="font-mono text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{getValue<string>()}</span> },
    { accessorKey: 'name', header: () => <div className="cursor-pointer select-none" onClick={() => handleSort('name')}>Name {sortBy === 'name' && (order === 'asc' ? '↑' : '↓')}</div>, cell: ({ getValue }) => <span className="font-medium text-slate-800">{getValue<string>()}</span> },
    { accessorKey: 'department', header: () => <div className="cursor-pointer select-none" onClick={() => handleSort('department')}>Department {sortBy === 'department' && (order === 'asc' ? '↑' : '↓')}</div>, cell: ({ getValue }) => <Badge variant="secondary" className="font-normal">{getValue<string>()}</Badge> },
    { accessorKey: 'position', header: () => <div className="cursor-pointer select-none" onClick={() => handleSort('position')}>Position {sortBy === 'position' && (order === 'asc' ? '↑' : '↓')}</div> },
    { accessorKey: 'amount', header: () => <div className="cursor-pointer select-none" onClick={() => handleSort('amount')}>Amount {sortBy === 'amount' && (order === 'asc' ? '↑' : '↓')}</div>, cell: ({ getValue }) => <span className="font-medium">₦{(getValue<number>() ?? 0).toLocaleString()}</span> },
    {
      id: 'select',
      header: () => <input type="checkbox" className="rounded border-slate-300" checked={selected.length === data?.data.length && data?.data.length > 0} onChange={toggleAll} />,
      cell: ({ row }) => <input type="checkbox" className="rounded border-slate-300" checked={selected.includes(row.original.zk_user_id)} onChange={() => toggleOne(row.original.zk_user_id)} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => openEdit(row.original)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => setDeleteZkUserId(row.original.zk_user_id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.total_pages ?? 0,
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${data?.total ?? 0} total employees registered`}
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/bulk-upload')}>
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </Button>
            {selected.length > 0 && (
              <Button variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete ({selected.length})
              </Button>
            )}
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, ID, department..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9"
            />
          </div>
          <Select value={department} onValueChange={(v) => { setDepartment(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-44">
              <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || department) && (
            <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={() => { setSearch(''); setDepartment(''); setPage(1); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {columns.map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-slate-600">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && data?.data.length === 0 && (
            <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filters" />
          )}
        </div>

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, data.total)} of {data.total}
            </p>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editEmployee ? 'Update the employee information below.' : 'Fill in the details to register a new employee.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input placeholder="101" {...register('zk_user_id')} />
              {errors.zk_user_id && <p className="text-xs text-red-500">{errors.zk_user_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Ahmad Fauzi" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Position</Label>
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" placeholder="500" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {editEmployee ? 'Save Changes' : 'Add Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteZkUserId} onOpenChange={() => setDeleteZkUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the employee record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteZkUserId && deleteMutation.mutate(deleteZkUserId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} Employees</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selected.length} employee records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => bulkDeleteMutation.mutate(selected)}
            >
              Delete {selected.length} Employees
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
