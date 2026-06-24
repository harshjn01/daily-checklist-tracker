'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Check, X, ClipboardList } from 'lucide-react';
import api from '../../../lib/api';

interface DaySummary {
  date: string;
  total: number;
  completed: number;
  rate: number;
  items?: Array<{ id: string; title: string; isCompleted: boolean }>;
}

export default function UserHistoryPage() {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Array<{ id: string; title: string; isCompleted: boolean }>>>({});
  const [loadingDates, setLoadingDates] = useState<string[]>([]);

  // Helper to format date object to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getPastDates = (daysCount: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  };

  const loadHistory = async () => {
    setLoading(true);
    const dates = getPastDates(10); // Load last 10 days of history
    const historyList: DaySummary[] = [];

    for (const d of dates) {
      try {
        // Fetch tasks assigned to the user on this date
        const res = await api.get('/checklists/assigned/today', { params: { date: d } });
        const list = res.data;
        const total = list.length;
        const completed = list.filter((item: any) => item.isCompleted).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 100; // 100% if no tasks assigned

        // We only save days that had some tasks assigned, or just keep all
        historyList.push({
          date: d,
          total,
          completed,
          rate,
        });

        // Store items cache
        setItemsMap(prev => ({
          ...prev,
          [d]: list.map((item: any) => ({
            id: item.id,
            title: item.title,
            isCompleted: item.isCompleted,
          })),
        }));
      } catch (err) {
        console.error(`Failed to fetch history for date ${d}`, err);
      }
    }

    setSummaries(historyList);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const toggleExpand = async (dateStr: string) => {
    if (expandedDates.includes(dateStr)) {
      setExpandedDates(expandedDates.filter((d) => d !== dateStr));
    } else {
      setExpandedDates([...expandedDates, dateStr]);
      
      // If items not in cache, fetch them (lazy load fallback, though we pre-cached them)
      if (!itemsMap[dateStr]) {
        setLoadingDates(prev => [...prev, dateStr]);
        try {
          const res = await api.get('/checklists/assigned/today', { params: { date: dateStr } });
          setItemsMap(prev => ({
            ...prev,
            [dateStr]: res.data.map((item: any) => ({
              id: item.id,
              title: item.title,
              isCompleted: item.isCompleted,
            })),
          }));
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingDates(prev => prev.filter(d => d !== dateStr));
        }
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-left">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Completion History</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Review your task summaries and compliance check-offs for the last 10 calendar days
        </p>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-500">No completion logs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((day) => {
            const isExpanded = expandedDates.includes(day.date);
            const items = itemsMap[day.date] || [];
            const isDateLoading = loadingDates.includes(day.date);
            const hasNoTasks = day.total === 0;

            return (
              <div
                key={day.date}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950 transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(day.date)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-500">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {new Date(day.date).toLocaleDateString([], {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {hasNoTasks ? 'No tasks assigned' : `${day.completed} of ${day.total} completed`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {!hasNoTasks && (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        day.rate === 100
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                          : day.rate > 50
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {day.rate}% Compliance
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details list */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/30 px-6 py-4 dark:border-zinc-900 dark:bg-zinc-950/30">
                    {isDateLoading ? (
                      <div className="flex py-4 justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      </div>
                    ) : hasNoTasks ? (
                      <p className="text-[10px] text-zinc-400 text-center font-medium italic">No checklist tasks were assigned on this day.</p>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${
                              item.isCompleted
                                ? 'text-zinc-500 line-through dark:text-zinc-600'
                                : 'text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {item.title}
                            </span>
                            
                            {item.isCompleted ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md">
                                <Check className="h-3 w-3" />
                                Done
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md">
                                <X className="h-3 w-3" />
                                Missed
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
