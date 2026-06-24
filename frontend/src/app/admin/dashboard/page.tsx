'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  ShieldAlert,
  BellRing
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import api from '../../../lib/api';

interface DashboardData {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    usersCompletedToday: number;
    usersPendingToday: number;
    completionPercentage: number;
  };
  charts: {
    dailyTrend: Array<{ date: string; completionRate: number }>;
    weeklyTrend: Array<{ name: string; completionRate: number }>;
  };
  tables: {
    incompleteUsers: Array<{ userId: string; name: string; completed: number; total: number }>;
    recentActivity: Array<{
      id: string;
      action: string;
      createdAt: string;
      details: string;
      user?: { name: string; email: string };
    }>;
    notificationHistory: Array<{
      id: string;
      title: string;
      message: string;
      createdAt: string;
    }>;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard/admin');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Error Loading Dashboard</h3>
        <p className="text-zinc-500 max-w-sm mt-1">{error || 'Something went wrong'}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { kpis, charts, tables } = data;

  const kpiCards = [
    {
      title: 'Total Employees',
      value: kpis.totalUsers,
      sub: `${kpis.activeUsers} Active Accounts`,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Checklists Completed Today',
      value: kpis.usersCompletedToday,
      sub: 'All tasks checked off',
      icon: CheckCircle2,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      title: 'Checklists Pending Today',
      value: kpis.usersPendingToday,
      sub: 'Still have tasks left',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Overall Task Success',
      value: `${kpis.completionPercentage}%`,
      sub: 'Tasks completed today',
      icon: Percent,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">System Overview</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Monitor checklist progress, compliance metrics, and latest security events
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`rounded-xl p-2.5 ${kpi.color} transition-transform group-hover:scale-110`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {kpi.value}
              </span>
              <span className="mt-1 block text-xs text-zinc-400 font-medium">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Completion Chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Daily Completion Trend</h3>
            <span className="text-xs text-zinc-400 font-medium">Last 7 Days</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} dx={-10} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(9, 9, 11, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#FFF' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Completion Chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Weekly Completion Trend</h3>
            <span className="text-xs text-zinc-400 font-medium">Last 4 Weeks</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} dx={-10} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(9, 9, 11, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="completionRate" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables section */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Incomplete Checklists list */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Pending Completion</h3>
            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950/40 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
              {tables.incompleteUsers.length} Incomplete
            </span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900 max-h-96 overflow-y-auto pr-1">
            {tables.incompleteUsers.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-xs text-zinc-500 font-medium">All users are caught up!</p>
              </div>
            ) : (
              tables.incompleteUsers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3.5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                    <span className="text-[10px] text-zinc-400">Employee Account</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {item.completed} / {item.total} Done
                    </span>
                    <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${(item.completed / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Logs list */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 xl:col-span-2">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">Recent System Logs</h3>
          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-900">
              {tables.recentActivity.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                  <p className="text-xs">No recent events recorded</p>
                </div>
              ) : (
                tables.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3.5 text-xs text-left">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1 text-zinc-500">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 max-w-sm truncate">
                          Details: {log.details}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right shrink-0">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {log.user ? log.user.name : 'System Scheduler'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString()} at{' '}
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
