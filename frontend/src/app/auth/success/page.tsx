'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('Authentication failed: Missing token');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    loginWithToken(token)
      .catch((err) => {
        console.error('Login with token failed:', err);
        setError('Failed to authenticate session.');
        setTimeout(() => router.push('/login'), 3000);
      });
  }, [searchParams, loginWithToken, router]);

  return (
    <div className="w-full max-w-md text-center">
      {error ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-500 dark:border-t-transparent" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Authenticating...</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Please wait while we complete your sign in.</p>
        </div>
      )}
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={
        <div className="flex flex-col items-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-500 dark:border-t-transparent" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Loading...</h2>
        </div>
      }>
        <AuthSuccessContent />
      </Suspense>
    </div>
  );
}
