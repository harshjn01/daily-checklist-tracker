'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

function SetupAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, login } = useAuth();

  const [loadingVerify, setLoadingVerify] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('No invitation token was provided. Please use the link sent to your email.');
        setLoadingVerify(false);
        return;
      }
      try {
        const res = await api.get(`/auth/invite/verify/${token}`);
        setEmail(res.data.email);
        setName(res.data.name);
      } catch (err: any) {
        setError(err.response?.data?.message || 'The invitation token is invalid or has expired.');
      } finally {
        setLoadingVerify(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoadingSubmit(true);
    try {
      // Accept invitation
      const res = await api.post('/auth/invite/accept', {
        token,
        name,
        password,
      });

      // Save credentials & log in
      const { token: authToken, user: loggedUser } = res.data;
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      
      setSuccess(true);
      
      // Redirect
      setTimeout(() => {
        window.location.href = loggedUser.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard';
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set up account. Please try again.');
      setLoadingSubmit(false);
    }
  };

  if (loadingVerify) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-2xl shadow-lg">
          ✓
        </div>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account Setup
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Complete your profile and secure your password
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50">
        {error && !email && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/50">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <div>Account verified! Redirecting to dashboard...</div>
          </div>
        )}

        {!success && email && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loadingSubmit}
              className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
            >
              {loadingSubmit ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Complete Account Setup'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
      }>
        <SetupAccountForm />
      </Suspense>
    </div>
  );
}
