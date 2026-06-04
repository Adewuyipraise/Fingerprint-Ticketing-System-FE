'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { bulkSaveEmployees } from '@/services/employees.service';
import { getApiErrorMessage } from '@/services/api';
import * as XLSX from 'xlsx';

type Step = 'upload' | 'mapping' | 'preview' | 'result';

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  source: string;
  target: string;
}

const TARGET_COLUMNS = ['employee_id', 'name', 'department', 'role', 'amount', '(ignore)'];
const TARGET_LABELS: Record<string, string> = {
  employee_id: 'Employee ID',
  name: 'Full Name',
  department: 'Department',
  role: 'Role/Position',
  amount: 'Amount',
  '(ignore)': 'Ignore this column',
};

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

function parseExcel(file: File): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { header: 1 });
        
        if (jsonData.length === 0) {
          return resolve({ headers: [], rows: [] });
        }
        
        const headers = (jsonData[0] as unknown as string[]).map((h) => String(h ?? '').trim());
        const rows = jsonData.slice(1).map((row) => {
          const values = headers.map((_, i) => String((row as unknown as string[])[i] ?? '').trim());
          const parsedRow: ParsedRow = {};
          headers.forEach((h, i) => { parsedRow[h] = values[i]; });
          return parsedRow;
        });
        
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function parseFile(f: File): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  if (f.name.endsWith('.csv')) {
    const text = await f.text();
    return parseCSV(text);
  } else if (f.name.endsWith('.xlsx')) {
    return parseExcel(f);
  }
  throw new Error('Unsupported file format');
}

export default function BulkUploadPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    try {
      const { headers: h, rows: r } = await parseFile(f);
      setHeaders(h);
      setRows(r);
      setMappings(h.map((col) => {
        const lower = col.toLowerCase();
        const autoTarget = TARGET_COLUMNS.find((t) =>
          lower.includes(t) || (t === 'employee_id' && lower.includes('id')) || (t === 'name' && (lower.includes('name') || lower.includes('nama')))
        ) ?? '(ignore)';
        return { source: col, target: autoTarget };
      }));
      setStep('mapping');
    } catch (error) {
      toast.error('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      processFile(f);
    } else {
      toast.error('Please upload a CSV or Excel file');
    }
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!file || validRows.length === 0) return;
    
    setStep('result');
    setProgress(0);
    
    try {
      // Send the mapped valid rows to the backend
      await bulkSaveEmployees(validRows);
      
      setProgress(100);
      setUploadResult({ success: validRows.length, errors: 0 });
      toast.success(`Upload complete: ${validRows.length} records imported`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setProgress(0);
    setUploadResult(null);
  };

  const mappedRows = rows.map((row) => {
    const mapped: ParsedRow = {};
    mappings.forEach(({ source, target }) => {
      if (target !== '(ignore)') mapped[target] = row[source] ?? '';
    });
    return mapped;
  });

  const validRows = mappedRows.filter((r) => r.employee_id && r.name);
  const invalidRows = mappedRows.filter((r) => !r.employee_id || !r.name);

  const STEPS = [
    { key: 'upload', label: 'Upload File' },
    { key: 'mapping', label: 'Column Mapping' },
    { key: 'preview', label: 'Preview' },
    { key: 'result', label: 'Result' },
  ];

  return (
    <div>
      <PageHeader title="Bulk Upload" description="Import employee data from CSV or Excel files" icon={Upload} />

      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
              step === s.key ? 'bg-blue-600 text-white' :
              STEPS.findIndex((x) => x.key === step) > i ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
            )}>
              {STEPS.findIndex((x) => x.key === step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium', step === s.key ? 'text-slate-800' : 'text-slate-400')}>{s.label}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-all cursor-pointer',
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Upload className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700 mb-1">Drop your file here</p>
            <p className="text-sm text-slate-400 mb-4">or click to browse</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">CSV, XLSX accepted</span>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />

          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Expected CSV Format:</p>
            <code className="text-xs text-slate-500 block">
              employee_id,name,department,role<br />
              EMP001,Ahmad Fauzi,Production,Operator<br />
              EMP002,Siti Rahayu,HR,Staff
            </code>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <a href="/templates/employees-template.csv" download>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> CSV Template
              </Button>
            </a>
            <a href="/templates/employees-template.xlsx" download>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Excel Template
              </Button>
            </a>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{file?.name}</p>
              <p className="text-xs text-slate-500">{rows.length} rows detected &middot; {headers.length} columns</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Map Source Columns to System Fields</p>
            <div className="space-y-2.5">
              {mappings.map((m, i) => (
                <div key={m.source} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <div className="flex-1">
                    <p className="text-xs font-mono text-slate-600">{m.source}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Sample: {rows[0]?.[m.source] ?? '—'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  <div className="w-48">
                    <Select value={m.target} onValueChange={(v) => {
                      setMappings((prev) => prev.map((x, j) => j === i ? { ...x, target: v } : x));
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_COLUMNS.map((t) => <SelectItem key={t} value={t} className="text-xs">{TARGET_LABELS[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setStep('preview')}>
              Preview Data
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Data Preview</p>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-green-600 font-medium">{validRows.length} valid rows</span>
                {invalidRows.length > 0 && <> &middot; <span className="text-red-500 font-medium">{invalidRows.length} invalid rows</span></>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('mapping')}>Back</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleUpload}>
                Upload {validRows.length} Records
              </Button>
            </div>
          </div>

          {invalidRows.length > 0 && (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">{invalidRows.length} rows are missing required fields (employee_id or name) and will be skipped.</p>
            </div>
          )}

          <div className="overflow-x-auto m-4">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border border-slate-200 rounded">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                  {mappings.filter((m) => m.target !== '(ignore)').map((m) => (
                    <th key={m.target} className="px-3 py-2 text-left font-semibold text-slate-500">{TARGET_LABELS[m.target]}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-slate-500">Valid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mappedRows.slice(0, 20).map((row, i) => {
                  const isValid = !!row.employee_id && !!row.name;
                  return (
                    <tr key={i} className={cn('hover:bg-slate-50', !isValid && 'bg-red-50/40')}>
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      {mappings.filter((m) => m.target !== '(ignore)').map((m) => (
                        <td key={m.target} className="px-3 py-2 text-slate-700">{row[m.target] ?? <span className="text-red-400">—</span>}</td>
                      ))}
                      <td className="px-3 py-2">
                        {isValid
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mappedRows.length > 20 && (
              <p className="text-xs text-slate-400 text-center mt-2">Showing first 20 of {mappedRows.length} rows</p>
            )}
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {progress < 100 ? (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
              </div>
              <p className="text-base font-semibold text-slate-800">Uploading records...</p>
              <div className="w-full max-w-md">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">{progress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">Upload Complete</p>
                <p className="text-slate-500 mt-1 text-sm">Your data has been processed</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 w-full max-w-xs">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-2xl font-bold text-green-700">{uploadResult?.success}</p>
                  <p className="text-xs text-green-600 mt-0.5">Imported</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-2xl font-bold text-red-600">{uploadResult?.errors}</p>
                  <p className="text-xs text-red-500 mt-0.5">Skipped</p>
                </div>
              </div>
              <Button className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={reset}>
                Upload Another File
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
