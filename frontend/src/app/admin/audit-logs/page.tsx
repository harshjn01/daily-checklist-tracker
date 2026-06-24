'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, ShieldAlert, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import api from '../../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', {
        params: { page, limit: 15 },
      });
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Security Audit Trail</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Trace administrative changes, login attempts, user configurations, and automation events
        </p>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          </div>
        ) : error ? (
          <div className="flex h-60 flex-col items-center justify-center text-center p-6">
            <ShieldAlert className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-zinc-500">No logs recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          {new Date(log.createdAt).toLocaleDateString()} at{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{log.user.name}</p>
                          <p className="text-[10px] text-zinc-400">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="font-semibold text-zinc-400">System / Cron</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-mono text-[10px] text-zinc-600 dark:text-zinc-400" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[11px]">
                      {log.ipAddress || 'Internal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/30 dark:bg-zinc-950/20">
            <span className="text-[10px] font-semibold text-zinc-500">
              Showing page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
