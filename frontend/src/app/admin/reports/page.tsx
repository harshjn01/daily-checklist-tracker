'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import api from '../../../lib/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = React.useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = `/reports/${reportType}`;
      let params = {};
      if (reportType === 'daily') {
        params = { date: dateFilter };
      }
      const res = await api.get(endpoint, { params });
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, dateFilter]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'csv' | 'excel') => {
    setExportDropdownOpen(false);
    try {
      const res = await api.get(`/reports/export/${reportType}`, {
        params: {
          format,
          date: reportType === 'daily' ? dateFilter : undefined,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const dateStr = reportType === 'daily' ? dateFilter : new Date().toISOString().split('T')[0];
      
      link.setAttribute('download', `${reportType}-report-${dateStr}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to export', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reporting Center</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Generate and export compliance reports to audit employee daily tasks completion rates
          </p>
        </div>

        {/* Export Button */}
        <div className="relative self-start" ref={exportRef}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
          
          {exportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 z-30">
              <button
                onClick={() => handleExport('excel')}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Microsoft Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                CSV text (.csv)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs / Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
        {/* Report Type selector */}
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl self-start">
          <button
            onClick={() => { setReportType('daily'); setReportData(null); }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              reportType === 'daily'
                ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => { setReportType('weekly'); setReportData(null); }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              reportType === 'weekly'
                ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => { setReportType('monthly'); setReportData(null); }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              reportType === 'monthly'
                ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-950 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Monthly (30-Day)
          </button>
        </div>

        {/* Date Filter (only for Daily) */}
        {reportType === 'daily' && (
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 self-start sm:self-auto">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-hidden border-none"
            />
          </div>
        )}
      </div>

      {/* Reports Content */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
      ) : !reportData ? (
        <div className="text-center py-12">
          <p className="text-xs text-zinc-400">Failed to render report data. Verify your connectivity.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly highlights */}
          {reportType === 'monthly' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top performers */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Best Performing Employees</h3>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {reportData.topPerformers.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md">
                        {item.completionRate}% Done
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Lowest performers */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                  <TrendingDown className="h-5 w-5" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Lowest Performing Employees</h3>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {reportData.lowestPerformers.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md">
                        {item.completionRate}% Done
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Report Main Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  {reportType === 'daily' && (
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Assigned Tasks</th>
                      <th className="px-6 py-4">Completed</th>
                      <th className="px-6 py-4">Pending</th>
                      <th className="px-6 py-4 text-right">Completion Rate</th>
                    </tr>
                  )}
                  {reportType === 'weekly' && (
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Tasks</th>
                      <th className="px-6 py-4">Completed</th>
                      <th className="px-6 py-4">Rate</th>
                      {reportData.dates.map((d: string) => (
                        <th key={d} className="px-4 py-4 text-center min-w-24">
                          {new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </th>
                      ))}
                    </tr>
                  )}
                  {reportType === 'monthly' && (
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">30-Day Tasks</th>
                      <th className="px-6 py-4">Completed</th>
                      <th className="px-6 py-4 text-right">Completion Rate</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 text-xs">
                  {reportType === 'daily' &&
                    reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-500">{row.email}</td>
                        <td className="px-6 py-4 text-zinc-500 font-semibold">{row.totalTasks}</td>
                        <td className="px-6 py-4 text-green-600 dark:text-green-400 font-semibold">{row.completedTasks}</td>
                        <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-semibold">{row.pendingTasks}</td>
                        <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-50">
                          {row.completionRate}%
                        </td>
                      </tr>
                    ))}

                  {reportType === 'weekly' &&
                    reportData.usersReport.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{row.email}</p>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-semibold">{row.totalTasks}</td>
                        <td className="px-6 py-4 text-green-600 dark:text-green-400 font-semibold">{row.completedTasks}</td>
                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{row.completionRate}%</td>
                        {reportData.dates.map((d: string) => {
                          const isComplete = row.dailyDetails[d];
                          return (
                            <td key={d} className="px-4 py-4 text-center">
                              {isComplete ? (
                                <span className="inline-flex rounded-full bg-green-50 dark:bg-green-950/20 p-1 text-green-600 dark:text-green-400">
                                  <Check className="h-4 w-4" />
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-red-50 dark:bg-red-950/20 p-1 text-red-600 dark:text-red-400">
                                  <X className="h-4 w-4" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                  {reportType === 'monthly' &&
                    reportData.allUsers.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</td>
                        <td className="px-6 py-4 text-zinc-500">{row.email}</td>
                        <td className="px-6 py-4 text-zinc-500 font-semibold">{row.totalTasks}</td>
                        <td className="px-6 py-4 text-green-600 dark:text-green-400 font-semibold">{row.completedTasks}</td>
                        <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-50">
                          {row.completionRate}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
