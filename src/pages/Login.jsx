import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn, Heart, Building2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, homePathFor } from '../context/AuthContext';
import { FormInput } from '../components/Forms';
import { LogoMark } from '../components/Logo';
import { attempt } from '../utils/notify';

const ROLES = [
  { v: 'donor', label: 'Donor', Icon: Heart },
  { v: 'hospital', label: 'Hospital', Icon: Building2 },
  { v: 'admin', label: 'Admin', Icon: ShieldCheck },
];
const DEMOS = {
  donor: ['donor', 'donor123'],
  hospital: ['hospital', 'hospital123'],
  admin: ['admin', 'admin123'],
};

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { identifier: '', password: '', role: loc.state?.role || 'donor' },
  });
  const role = watch('role');

  const onSubmit = async (v) => {
    setBusy(true);
    const res = await attempt(() => login(v));
    setBusy(false);
    if (res.ok) {
      toast.success(`Welcome back, ${res.data.name}!`);
      nav(loc.state?.from && loc.state?.role === res.data.role ? loc.state.from : homePathFor(res.data.role), { replace: true });
    }
  };

  const fillDemo = () => {
    setValue('identifier', DEMOS[role][0]);
    setValue('password', DEMOS[role][1]);
  };

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md animate-fade-in p-6 sm:p-8">
        <div className="mb-5 text-center">
          <LogoMark size={48} />
          <h1 className="mt-2 text-2xl font-extrabold">Welcome back</h1>
          <p className="muted text-sm">Log in to continue saving lives.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset>
            <legend className="label">I am a</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ v, label, Icon }) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" value={v} className="peer sr-only" {...register('role')} />
                  <span className="flex flex-col items-center gap-1 rounded-xl border-2 border-red-200 bg-white py-2.5 text-xs font-bold text-red-800 transition peer-checked:border-red-600 peer-checked:bg-red-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-red-500">
                    <Icon size={18} aria-hidden="true" /> {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <FormInput label="Username, phone or email" autoComplete="username" placeholder={role === 'donor' ? 'Phone number or username' : role === 'hospital' ? 'Hospital email or username' : 'admin'} error={errors.identifier?.message}
            {...register('identifier', { required: 'Enter your username, phone or email' })} />
          <div>
            <label htmlFor="pw" className="label">Password</label>
            <div className="relative">
              <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" className={`input pr-11 ${errors.password ? 'input-error' : ''}`} aria-invalid={!!errors.password}
                {...register('password', { required: 'Enter your password' })} />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-red-800 hover:bg-red-100" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs font-semibold text-red-700" role="alert">{errors.password.message}</p>}
            <button type="button" className="mt-2 text-xs font-semibold text-red-700 underline" onClick={() => toast('Password reset is coming soon. Please contact support.', { icon: '🔒' })}>Forgot password?</button>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}><LogIn size={16} aria-hidden="true" /> {busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <button type="button" onClick={fillDemo} className="mt-3 w-full rounded-xl border border-dashed border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100">
          Demo mode: fill {role} credentials ({DEMOS[role][0]} / {DEMOS[role][1]})
        </button>
        <p className="muted mt-5 text-center text-sm">
          New here? <Link to="/register/donor" className="font-bold text-red-700 underline">Become a donor</Link> or <Link to="/register/hospital" className="font-bold text-red-700 underline">register a hospital</Link>
        </p>
      </div>
    </div>
  );
}
