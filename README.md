# CDK CanteenTrack Enterprise Management System

A modern, production-ready enterprise React application for managing employee meal records and canteen operations. This system connects to a backend API to provide comprehensive analytics, reporting, and data management capabilities.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend API Configuration](#backend-api-configuration)
- [Features](#features)
- [Data Models](#data-models)
- [Services](#services)
- [Pages](#pages)
- [Components](#components)
- [Development Guidelines](#development-guidelines)
- [Adding New Features](#adding-new-features)
- [Changelog](#changelog)

---

## Overview

CDK CanteenTrack is an enterprise management system designed for:
- **Employee Data Management** - Add, edit, search, and filter employee records
- **Meal Records Tracking** - View and analyze historical meal consumption data
- **Reports & Analytics** - Generate visual reports, financial summaries, and export data
- **Role-based Access Control** - Restrict features to Admin and HR personnel

**IMPORTANT**: This system does NOT generate or print tickets. All ticket/meal records are historical data imported from a backend system (ZKTeco or similar).

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.2.1 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.2.2 | Type safety |
| TanStack React Query | 5.x | Server state management |
| TanStack React Table | 8.x | Table components |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| Recharts | 2.x | Data visualization |
| Radix UI | 1.x | UI primitives |
| Tailwind CSS | 3.x | Styling |
| Lucide React | Latest | Icons |
| Sonner | Latest | Toast notifications |
| Axios | Latest | HTTP client |

---

## Project Structure

```
canteen-ticket/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Login page
│   ├── globals.css                # Global styles
│   ├── dashboard/                 # Protected dashboard routes
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home (analytics)
│   │   ├── employees/             # Employee management
│   │   │   └── page.tsx          # Employees CRUD + bulk upload
│   │   ├── tickets/              # Meal records
│   │   │   └── page.tsx          # Records viewing and filtering
│   │   ├── reports/              # Reports & Analytics
│   │   │   └── page.tsx          # Full analytics dashboard
│   │   ├── settings/             # System settings
│   │   └── audit-logs/           # Audit trail
│   └── login/                    # Authentication
│       └── page.tsx
├── components/                    # Reusable UI components
│   ├── ui/                        # Base UI components (Button, Input, Card, etc.)
│   ├── layout/                    # Layout components (Sidebar, Topbar)
│   └── common/                    # Common components (PageHeader, EmptyState)
├── hooks/                         # Custom React hooks
│   └── useAuth.tsx               # Authentication hook
├── services/                      # API service layer
│   ├── api.ts                    # Axios instance + error handling
│   ├── employees.service.ts      # Employee API calls
│   ├── tickets.service.ts        # Ticket/Records API calls
│   ├── dashboard.service.ts       # Dashboard stats API calls
│   └── auth.service.ts          # Authentication API calls
├── types/                         # TypeScript type definitions
│   └── index.ts                  # All interfaces and types
├── lib/                           # Utility functions
│   └── utils.ts                  # Helper functions (cn, formatting)
├── public/                        # Static assets
│   └── logo.png                  # CDK Logo
└── package.json                   # Dependencies
```

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Backend API running at `http://localhost:3001` (or configured URL)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd canteen-ticket

# Install dependencies (use --legacy-peer-deps for React 19 compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Running the Application

```bash
# Development mode (port 3000)
npm run dev

# Development mode (specific port)
npm run dev -- -p 3001

# Production build
npm run build
npm run start
```

Access the application at:
- **Development**: http://localhost:3000 (or configured port)
- **Production**: http://localhost:3000

---

## Backend API Configuration

The frontend connects to the backend API at `http://localhost:3001`.

### API Base URL Configuration

The base URL is configured in `services/api.ts`:

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

To change the backend URL, either:
1. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-api-url.com`
2. Or modify the default in `services/api.ts`

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/employees` | Fetch paginated employees |
| POST | `/employees` | Create new employee |
| PUT | `/employees/{id}` | Update employee |
| DELETE | `/employees/{id}` | Delete employee |
| POST | `/employees/bulk-upload` | Bulk upload employees (multipart) |
| GET | `/tickets` | Fetch meal records |
| GET | `/dashboard/stats` | Fetch dashboard statistics |

### Expected Data Structures

**Employee (Request/Response)**
```typescript
{
  id: string;
  zk_user_id: string;      // Employee ID from ZKTeco
  name: string;
  department: string;
  position: 'Manager' | 'Staff' | 'Workmen' | 'Visitor';
  amount: number;
  created_at: string;
  updated_at: string;
}
```

**UsageRecord/Ticket (Response)**
```typescript
{
  id: string;
  ticket_number: string;
  zk_user_id: string;
  name: string;
  department: string;
  position: string;
  event_name: string;
  event_date: string;
  amount: number;
  printed_at: string;
}
```

---

## Features

### 1. Dashboard (`/dashboard`)
- **Analytics Overview**: Total employees, total records, daily meal count
- **Recent Activity**: Latest meal records
- **Quick Stats Cards**: Visual indicators for key metrics

### 2. Employees Page (`/dashboard/employees`)
- **Table View**: Paginated list of all employees
- **Search & Filter**: By name, department, position
- **Add Employee**: Form with validation (zk_user_id, name, department, position, amount)
- **Edit Employee**: Update existing employee data
- **Delete Employee**: Remove employee with confirmation
- **Bulk Upload**: Upload CSV/XLS/XLSX/PDF files for batch import
- **Duplicate Prevention**: Frontend check for duplicate employee IDs

### 3. Meal Records Page (`/dashboard/tickets`)
- **Historical Records**: View all meal records from backend
- **Search**: By ticket number, employee ID, name
- **Filters**: By date, department
- **Pagination**: Handle large datasets efficiently

### 4. Reports & Analytics (`/dashboard/reports`)
- **KPI Cards**: Total meals, total amount, today's stats
- **Charts**:
  - Pie Chart: Meal distribution by position
  - Bar Chart: Daily meal count
  - Line Chart: Amount spent over time
- **Financial Summary**: Breakdown by position
- **Individual Spending**: Per-employee meal analysis
- **Report Table**: Full data with pagination
- **Export**: PDF download and Print functionality (Restricted to Admin/HR)
- **Access Control**: Viewable by Admin, HR, and Canteen Rep roles. Export/Print restricted to Admin/HR.

### 5. Settings (`/dashboard/settings`)
- System configuration options
- Theme settings (if implemented)

---

## Data Models

### Types (`types/index.ts`)

```typescript
// User roles
type UserRole = 'admin' | 'hr' | 'canteen_rep';

// User
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

// Employee positions
type EmployeePosition = 'Manager' | 'Staff' | 'Workmen' | 'Visitor';

// Employee
interface Employee {
  id: string;
  zk_user_id: string;
  name: string;
  department: string;
  position: EmployeePosition;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Meal record (from tickets endpoint)
interface UsageRecord {
  id: string;
  ticket_number: string;
  zk_user_id: string;
  name: string;
  department: string;
  position: string;
  event_name: string;
  event_date: string;
  amount: number;
  printed_at: string;
}

// Dashboard statistics
interface DashboardStats {
  total_employees: number;
  total_records: number;
  daily_meal_count: number;
  recent_activity: any[];
}

// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

---

## Services

### API Service (`services/api.ts`)

Centralized Axios instance with error handling:

```typescript
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Error message extraction
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Cannot connect to local server. Please ensure the backend is running on port 3001.';
    }
    const data = error.response.data as { message?: string; detail?: string; error?: string };
    return data?.message || data?.detail || data?.error || `Server error: ${error.response.status}`;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
```

### Employee Service (`services/employees.service.ts`)

```typescript
// Fetch employees with filters
export async function getEmployees(filters: EmployeeFilters = {}): Promise<PaginatedResponse<Employee>>

// Create new employee
export async function createEmployee(data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee>

// Update employee
export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee>

// Delete employee
export async function deleteEmployee(id: string): Promise<void>

// Bulk upload
export async function uploadEmployees(file: File): Promise<void>

// Constants
export const DEPARTMENTS: string[]
export const POSITIONS: EmployeePosition[]
```

### Tickets Service (`services/tickets.service.ts`)

```typescript
// Fetch meal records
export async function getRecords(filters: RecordFilters = {}): Promise<PaginatedResponse<UsageRecord>>
```

---

## Pages

### Login Page (`app/page.tsx`)
- User authentication
- Redirects to dashboard on success

### Dashboard Layout (`app/dashboard/layout.tsx`)
- Sidebar navigation
- Top bar with user info
- Session management

### Dashboard Home (`app/dashboard/page.tsx`)
- Analytics overview
- Recent activity feed
- Quick stats

### Employees Page (`app/dashboard/employees/page.tsx`)
- Full employee CRUD
- Bulk upload functionality
- React Hook Form + Zod validation
- React Query for data fetching
- TanStack Table for display

### Tickets/Records Page (`app/dashboard/tickets/page.tsx`)
- Historical meal records
- Search and filter capabilities
- Date-based filtering

### Reports Page (`app/dashboard/reports/page.tsx`)
- Five tabs: Overview, Charts, Financial, Individual, Table
- Recharts for visualization
- Role-based access (admin/hr only)
- Print and CSV export

---

## Components

### UI Components (`components/ui/`)

| Component | Description |
|-----------|-------------|
| `button.tsx` | Button with variants |
| `input.tsx` | Form input |
| `label.tsx` | Form label |
| `card.tsx` | Card container |
| `select.tsx` | Dropdown select |
| `dialog.tsx` | Modal dialog |
| `alert-dialog.tsx` | Confirmation dialog |
| `tabs.tsx` | Tab navigation |
| `badge.tsx` | Status badge |
| `skeleton.tsx` | Loading skeleton |

### Layout Components (`components/layout/`)

| Component | Description |
|-----------|-------------|
| `Sidebar.tsx` | Main navigation sidebar |
| `Topbar.tsx` | Top navigation bar |

### Common Components (`components/common/`)

| Component | Description |
|-----------|-------------|
| `PageHeader.tsx` | Page title and actions |
| `EmptyState.tsx` | Empty data placeholder |

---

## Development Guidelines

### Adding a New Page

1. Create a new folder in `app/dashboard/` (e.g., `app/dashboard/new-feature/`)
2. Create `page.tsx` with the page component
3. Add navigation link in `Sidebar.tsx`
4. Implement access control if needed (Admin/HR only)

Example:
```typescript
'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';

export default function NewFeaturePage() {
  const { user } = useAuth();

  // Access control example
  if (user && !['admin', 'hr'].includes(user.role)) {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <PageHeader title="New Feature" description="Description here" />
      {/* Page content */}
    </div>
  );
}
```

### Adding a New API Service

1. Add functions to appropriate service file or create new service
2. Follow existing patterns for consistency
3. Use `getApiErrorMessage` for error handling

Example:
```typescript
// services/new-service.ts
import { api } from './api';
import { SomeType, PaginatedResponse } from '@/types';

export async function getSomeData(filters: SomeFilters = {}): Promise<PaginatedResponse<SomeType>> {
  const response = await api.get('/some-endpoint', { params: filters });
  return response.data;
}
```

### Adding a New Type

1. Add to `types/index.ts`
2. Export both the type and related constants
3. Update services if needed

### Form Validation

Use React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  field1: z.string().min(1, 'Required'),
  field2: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // ...
}
```

### Using TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function MyComponent() {
  const qc = useQueryClient();

  // Fetching data
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-key', param1, param2],
    queryFn: () => myServiceFunction(param1, param2),
  });

  // Mutations
  const mutation = useMutation({
    mutationFn: (data) => myCreateService(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-key'] });
      toast.success('Success!');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  // ...
}
```

### Styling Guidelines

- Use Tailwind CSS classes
- Follow existing color schemes (slate, blue, green, amber, red)
- Use `cn()` utility for conditional classes
- Keep consistent spacing

---

## Adding New Features

### Feature Checklist

1. **Types**: Add any new types to `types/index.ts`
2. **Service**: Add API functions to appropriate service file
3. **Component**: Create or modify components in `components/`
4. **Page**: Add or update page in `app/dashboard/`
5. **Navigation**: Update `Sidebar.tsx` if new route needed
6. **Access Control**: Implement role-based restrictions if needed
7. **Tests**: Add tests if testing framework is configured
8. **Documentation**: Update this README

### Common Tasks

**Adding a filter to existing page:**
1. Add state for filter value
2. Add filter UI component
3. Update query key to include filter
4. Pass filter to service function

**Adding a chart:**
1. Import from recharts
2. Prepare data with useMemo
3. Wrap in ResponsiveContainer
4. Configure axes, tooltips, legends

**Adding export functionality:**
```typescript
const handleExport = () => {
  const headers = ['Col1', 'Col2'];
  const rows = data.map(item => [item.col1, item.col2]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## Changelog

### [Current Version] - Reports & Analytics Module

**Added:**
- Complete Reports & Analytics dashboard at `/dashboard/reports`
- KPI Cards: Total Meals, Total Amount, Today's Stats
- Charts: Pie (position distribution), Bar (daily meals), Line (amount over time)
- Financial Summary with breakdown by position
- Individual Spending Report per employee
- Report Table with pagination
- PDF Export and Print functionality (CSV removed for security)
- Role-based access control:
  - **Admin/HR**: View reports + Export PDF + Print
  - **Canteen Rep**: View reports only (no export/print)
- `Visitor` position added to EmployeePosition type

**Updated:**
- `EmployeePosition` enum now includes 'Visitor'
- `UsageRecord` interface includes `position` field
- `POSITIONS` constant updated to include 'Visitor'
- All services use backend API with improved error handling

**Files Modified:**
- `types/index.ts` - Added Visitor position, position field in UsageRecord
- `services/employees.service.ts` - Added POSITIONS export, removed mock data
- `app/dashboard/reports/page.tsx` - Complete rewrite for analytics
- `app/dashboard/employees/page.tsx` - Updated POSITIONS, added Visitor option
- `app/dashboard/Sidebar.tsx` - Simplified navigation (Reports, Employees, Meal Records, Settings)

### [Previous Versions] - Initial Setup

**Implemented:**
- Employee management (CRUD, search, filter, pagination)
- Bulk upload functionality
- Meal records viewing
- Dashboard with analytics
- Authentication flow
- API service layer
- Component library

---

## Support

For questions or issues:
1. Review this README
2. Check the backend API is running
3. Verify environment variables are set
4. Review browser console for errors

---

## Future Enhancements

- PDF export functionality
- Chart download as images
- Dark/light mode toggle
- Advanced filtering options
- Data visualization improvements
- Mobile responsive optimizations
- Real-time updates with WebSocket
