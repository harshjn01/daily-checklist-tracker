'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, CheckCircle2, Award, Percent, Clock, AlertTriangle } from 'lucide-react';
import api from '../../../lib/api';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
}

interface UserDashboardData {
  kpis: {
    completionPercentage: number;
    completedTasks: number;
    pendingTasks: number;
    currentStreak: number;
  };
  checklist: ChecklistItem[];
}

export default function UserDashboard() {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingItems, setLoadingItems] = useState<string[]>([]); // Track item-level toggle loading state

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard/user');
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch today\'s checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggle = async (item: ChecklistItem) => {
    if (!data) return;
    
    // Add item to loading state to disable double clicks
    setLoadingItems((prev) => [...prev, item.id]);
    
    const isChecking = !item.isCompleted;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (isChecking) {
        await api.post(`/checklists/complete/${item.id}`, { date: todayStr });
      } else {
        await api.delete(`/checklists/complete/${item.id}`, { params: { date: todayStr } });
      }

      // Update dashboard values in local state instantly
      const updatedChecklist = data.checklist.map((c) => {
        if (c.id === item.id) {
          return { ...c, isCompleted: isChecking, completedAt: isChecking ? new Date().toISOString() : null };
        }
        return c;
      });

      const completedCount = updatedChecklist.filter((c) => c.isCompleted).length;
      const totalCount = updatedChecklist.length;
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const pendingCount = totalCount - completedCount;

      // Re-fetch dashboard KPIs (like streak) to stay in sync
      const resKpis = await api.get('/reports/dashboard/user');

      setData({
        kpis: resKpis.data.kpis,
        checklist: updatedChecklist,
      });
    } catch (err) {
      console.error('Failed to toggle completion status', err);
    } finally {
      // Remove item from loading state
      setLoadingItems((prev) => prev.filter((id) => id !== item.id));
    }
  };

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
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Error Loading Checklist</h3>
        <p className="text-zinc-500 max-w-sm mt-1">{error || 'Something went wrong'}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { kpis, checklist } = data;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Daily Checklist</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Check off your assigned tasks daily before 7 PM. All active check-offs can be updated before day ends.
        </p>
      </div>

      {/* User KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Progress Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <Percent className="h-4 w-4" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{kpis.completionPercentage}%</span>
            <span className="text-xs text-zinc-400 font-medium">Done Today</span>
          </div>
        </div>

        {/* Tasks Counters Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tasks</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{kpis.completedTasks}</span>
            <span className="text-xs text-zinc-400 font-medium">of {checklist.length} Completed</span>
          </div>
        </div>

        {/* Streaks Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Daily Streak</span>
            <Award className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              🔥 {kpis.currentStreak}
            </span>
            <span className="text-xs text-zinc-400 font-medium">Consecutive Days</span>
          </div>
        </div>
      </div>

      {/* Main Checklist Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-6">
        {/* Progress bar info */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
            <span>Overall Progress</span>
            <span>{kpis.completedTasks} / {checklist.length} Completed</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
              style={{ width: `${kpis.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Task Items List */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {checklist.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">No Tasks Assigned</h4>
              <p className="text-xs text-zinc-400 mt-1">You have no pending checklist tasks assigned for today.</p>
            </div>
          ) : (
            checklist.map((item) => {
              const isItemLoading = loadingItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => !isItemLoading && handleToggle(item)}
                  className={`flex items-start gap-4 py-4 px-2 cursor-pointer transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 rounded-xl ${
                    item.isCompleted ? 'opacity-75' : ''
                  } ${isItemLoading ? 'pointer-events-none' : ''}`}
                >
                  {/* Checkbox Icon */}
                  <div className="mt-0.5 shrink-0 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    {isItemLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    ) : item.isCompleted ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </div>

                  {/* Task details */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold text-zinc-900 dark:text-zinc-50 ${
                        item.isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600 font-medium' : ''
                      }`}>
                        {item.title}
                      </h4>
                      {item.isRequired && (
                        <span className="inline-flex rounded-full bg-red-50 dark:bg-red-950/20 px-2 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className={`mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed ${
                        item.isCompleted ? 'text-zinc-400 dark:text-zinc-600' : ''
                      }`}>
                        {item.description}
                      </p>
                    )}
                    {item.completedAt && (
                      <span className="mt-2 block text-[9px] font-semibold text-indigo-500 uppercase tracking-wider">
                        Completed at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
