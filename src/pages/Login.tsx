import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from '@/components/Field';
import { useLog } from '@/context/LogContext';

export default function Login() {
  const { login, register } = useAuth();
  const { addLog } = useLog();
  const [form, setForm] = useState({ name: 'Admin User', email: 'admin@aarezhealth.com', password: 'admin123' });
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [errors, setErrors] = useState<{[k: string]: string}>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validate = () => {
    const errs: {[k: string]: string} = {};
    if (mode === 'register' && !form.name.trim()) {
      errs.name = 'Name is required.';
    }
    if (!form.email) {
      errs.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = 'Email is invalid.';
    }
    if (!form.password) {
      errs.password = 'Password is required.';
    } else if (mode === 'register' && form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    return errs;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        addLog(`Login successful for ${form.email}`);
      } else {
        await register(form.name, form.email, form.password);
        addLog(`Registration successful for ${form.email}`);
      }
      navigate('/dashboard');
    } catch (e: any) {
      setApiError(e.message || 'Failed');
      addLog(`Login failed for ${form.email}: ${e.message || e}`);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-center p-12 text-white" style={{
        background: 'radial-gradient(100% 100% at 0% 0%, #7c3aed 0%, #4f46e5 45%, #1e40af 100%)'
      }}>
        <div className="flex items-center gap-3 text-2xl font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10">📄</span>
          Aarez HealthCare
        </div>
        <p className="mt-6 text-lg max-w-xl text-white/90">Complete pharmaceutical business management solution for modern healthcare companies.</p>
        <div className="mt-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center">🛡️</div>
            <div>
              <div className="font-medium">Secure Investment Tracking</div>
              <div className="text-white/80 text-sm">Track doctor investments with advanced analytics</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center">👥</div>
            <div>
              <div className="font-medium">Multi-Role Access</div>
              <div className="text-white/80 text-sm">Admin, Data Entry & MR role management</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="bg-white border rounded-xl p-6 w-full max-w-md shadow-sm">
          <h1 className="text-xl font-semibold mb-1">Sign in to access your pharmaceutical management dashboard</h1>
          <div className="text-sm text-slate-500 mb-4">{mode === 'login' ? 'Enter your credentials' : 'Create your admin account'}</div>
          {mode === 'register' && (
            <div className='mb-2'>
              <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
            </div>
          )}
          <div className='mb-2'>
            <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            {errors.email && <div className="text-xs text-red-600 mt-1">{errors.email}</div>}
          </div>
          <div className='mb-2'>
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            {errors.password && <div className="text-xs text-red-600 mt-1">{errors.password}</div>}
          </div>
          {apiError && <div className="text-sm text-red-600 mb-2">{apiError}</div>}
          <Button type="submit" className="w-full">{mode === 'login' ? 'Sign In' : 'Register & Sign In'}</Button>

          <div className="mt-6 border-t pt-4 text-sm">
            <div className="font-medium mb-2">Demo Credentials:</div>
            <ul className="space-y-1 text-slate-600">
              <li>Admin: admin@aarezhealth.com / admin123</li>
              <li>Data Entry: entry@aarezhealth.com / entry123</li>
              <li>MR: mr@aarezhealth.com / mr123</li>
            </ul>
          </div>

          <div className="text-sm text-slate-600 mt-3 text-center">
            {mode === 'login' ? (
              <button type="button" className="text-indigo-600 hover:underline" onClick={() => { setMode('register'); setErrors({}); setApiError(null); }}>Create an account</button>
            ) : (
              <button type="button" className="text-indigo-600 hover:underline" onClick={() => { setMode('login'); setErrors({}); setApiError(null); }}>Have an account? Sign in</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
