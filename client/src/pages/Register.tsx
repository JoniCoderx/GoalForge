import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      toast.success('Account created — let’s forge some content!');
      navigate('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start generating football content in seconds. No card required."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Striker"
          required
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@club.com"
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 6 characters"
          error={error}
          required
        />
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create free account
        </Button>
      </form>
    </AuthShell>
  );
}
