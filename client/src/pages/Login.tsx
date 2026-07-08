import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@goalforge.ai');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/app');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to forge your next viral football short."
      footer={
        <>
          Don’t have an account?{' '}
          <Link to="/register" className="font-medium text-brand-400 hover:text-brand-300">
            Create one free
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          required
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Sign in
        </Button>
        <p className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-center text-xs text-slate-500">
          Demo account is pre-filled — just click Sign in.
        </p>
      </form>
    </AuthShell>
  );
}
