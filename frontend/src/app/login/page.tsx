'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/user/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (!err.response) {
        setError('CONNECTION FAILED: The API server is unreachable. Please verify your backend is running and NEXT_PUBLIC_API_URL is correct.');
      } else if (err.response.status === 404 || err.response.status === 405) {
        setError('MISSING BACKEND: Vercel is returning a Not Found error. This means NEXT_PUBLIC_API_URL is not set in your Vercel Environment Variables. Please set it to your Render backend URL and redeploy Vercel.');
      } else {
        setError(err.response.data?.message || 'Invalid email or password');
      }
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-2xl shadow-lg shadow-indigo-600/20">
            ✓
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to access your checklist and tracker
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50 dark:backdrop-blur-md">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-xs placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-xs placeholder-zinc-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/50 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/google`}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.54998L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25528 2.69 1.28027 6.60998L5.27028 9.70498C6.21528 6.86 8.87028 4.75 12.0003 4.75Z"
                    fill="#EA4335"
                  />
                  <path
                    d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21538 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                    fill="#34A853"
                  />
                </svg>
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
