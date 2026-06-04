'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Factory, Wifi, Eye, EyeOff, CircleAlert as AlertCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { registerUser } from '@/services/auth.service';
import { getApiErrorMessage, isOfflineError } from '@/services/api';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['admin', 'hr', 'canteen_rep', 'accountant', 'auditor']),
  zk_user_id: z.string().min(1, 'Employee/User ID is required'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const DEMO_ACCOUNTS = [
  { email: 'admin@company.com', password: 'admin123', role: 'Admin' },
  { email: 'hr@company.com', password: 'hr123', role: 'HR' },
  { email: 'canteen@company.com', password: 'canteen123', role: 'Canteen Rep' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { status } = useSystemStatus();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const {
    register: regRegister,
    handleSubmit: regHandleSubmit,
    reset: regReset,
    setValue: regSetValue,
    formState: { errors: regErrors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data);
      toast.success('Signed in successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setRegistering(true);
    try {
      await registerUser(data);
      toast.success('User registered successfully');
      regReset();
      setRegisterOpen(false);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full w-full p-8">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="h-8 w-8 border border-white rounded" />
            ))}
          </div>
        </div>
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-2xl shadow-blue-500/30">
              <img src="/logo.png" alt="CDK Logo" className="h-full w-full object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">CDK CanteenTrack</h1>
          <p className="text-slate-400 text-lg mb-8">Enterprise Management System</p>
          <div className="grid grid-cols-3 gap-4 text-center mt-8">
            {[
              { label: 'Employees', value: '250+' },
              { label: 'Daily Tickets', value: '215' },
              { label: 'Departments', value: '9' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-2xl font-bold text-blue-400">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1 border border-slate-200">
              <img src="/logo.png" alt="CDK Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-slate-900">CDK CanteenTrack</p>
              <p className="text-xs text-slate-500">Enterprise Management System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1.5">Sign in to your account to continue</p>
          </div>

          {status === 'disconnected' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Backend server offline</p>
                <p className="text-xs text-amber-700 mt-0.5">Please ensure the backend is running on http://localhost:3001 for full functionality.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className={cn('h-11', errors.email && 'border-red-400 focus-visible:ring-red-400')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={cn('h-11 pr-10', errors.password && 'border-red-400 focus-visible:ring-red-400')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Register New User
            </button>
          </div>

          

          <div className="mt-8 flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', status === 'connected' ? 'bg-green-500' : status === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse')} />
            <p className="text-xs text-slate-400">
              API server: <span className="font-medium">http://localhost:3001</span> &mdash;{' '}
              {status === 'connected' ? 'Online' : status === 'disconnected' ? 'Offline' : 'Checking...'}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New User</DialogTitle>
            <DialogDescription>
              Create a new system user with an assigned role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={regHandleSubmit(onRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full Name</Label>
              <Input id="reg-name" placeholder="John Doe" {...regRegister('name')} />
              {regErrors.name && <p className="text-xs text-red-500">{regErrors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="user@company.com" {...regRegister('email')} />
              {regErrors.email && <p className="text-xs text-red-500">{regErrors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" placeholder="Min 6 characters" {...regRegister('password')} />
              {regErrors.password && <p className="text-xs text-red-500">{regErrors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-zk">Employee / User ID</Label>
              <Input id="reg-zk" placeholder="e.g. 001" {...regRegister('zk_user_id')} />
              {regErrors.zk_user_id && <p className="text-xs text-red-500">{regErrors.zk_user_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select onValueChange={(v) => regSetValue('role', v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR Manager</SelectItem>
                  <SelectItem value="canteen_rep">Canteen Rep</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
              {regErrors.role && <p className="text-xs text-red-500">{regErrors.role.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setRegisterOpen(false); regReset(); }}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={registering}>
                {registering ? 'Registering...' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}