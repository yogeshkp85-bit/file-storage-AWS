'use client';

import { useState } from 'react';
import { Cloud, Lock, Mail, KeyRound, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup' | 'confirm';

interface AuthModalProps {
  onSuccess: (token: string, user: { email: string; userId: string }) => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        toast.success('Successfully signed in!');
        
        // Fetch User Info
        const userRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` }
        });
        const userData = await userRes.json();

        onSuccess(data.accessToken, userData.user || { email, userId: email });
      } else if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        toast.success('Account created! Please check your email for the verification code.');
        setMode('confirm');
      } else if (mode === 'confirm') {
        const res = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');

        toast.success('Email verified! You can now log in.');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all">
        {/* Header */}
        <div className="bg-muted/40 p-6 text-center border-b border-border">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Cloud className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {mode === 'login' && 'Welcome back to CloudVault'}
            {mode === 'signup' && 'Create your CloudVault Account'}
            {mode === 'confirm' && 'Verify your Email'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === 'login' && 'Enter your credentials to access your secure backups'}
            {mode === 'signup' && 'Sign up to start backing up files to your AWS cloud'}
            {mode === 'confirm' && `We sent a 6-digit confirmation code to ${email}`}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAuth} className="p-6 space-y-4">
          {mode !== 'confirm' ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="pl-9 text-sm font-mono tracking-widest"
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              'Processing...'
            ) : (
              <span className="flex items-center gap-2">
                {mode === 'login' && 'Sign in'}
                {mode === 'signup' && 'Create account'}
                {mode === 'confirm' && 'Verify & Continue'}
                <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="bg-muted/20 px-6 py-4 text-center border-t border-border text-xs text-muted-foreground">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">
                Create one now
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">
                Sign in
              </button>
            </p>
          )}
          {mode === 'confirm' && (
            <p>
              Didn't receive a code?{' '}
              <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">
                Try registering again
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
