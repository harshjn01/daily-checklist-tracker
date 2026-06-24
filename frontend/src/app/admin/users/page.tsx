'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  Mail,
  Trash2,
  Edit,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Calendar,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
  Clock
} from 'lucide-react';
import api from '../../../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_INVITE';
  profilePhoto?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Queries
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // User Checklist View state
  const [isViewChecklistOpen, setIsViewChecklistOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [checklistDate, setChecklistDate] = useState(new Date().toISOString().split('T')[0]);
  const [userChecklist, setUserChecklist] = useState<ChecklistItem[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE',
  });

  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResults, setCsvResults] = useState<any>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          search,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: 8,
        },
      });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter, page]);

  // Fetch viewing user checklist when date or user changes
  useEffect(() => {
    async function fetchUserChecklist() {
      if (!viewingUser) return;
      setLoadingChecklist(true);
      try {
        const res = await api.get('/checklists/assigned/today', {
          params: {
            userId: viewingUser.id,
            date: checklistDate,
          },
        });
        setUserChecklist(res.data);
      } catch (err) {
        console.error('Failed to load user checklist', err);
      } finally {
        setLoadingChecklist(false);
      }
    }
    if (isViewChecklistOpen && viewingUser) {
      fetchUserChecklist();
    }
  }, [viewingUser, checklistDate, isViewChecklistOpen]);

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');
    try {
      await api.post('/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setIsCreateOpen(false);
      resetFormData();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');
    try {
      await api.post('/auth/invite', inviteData);
      setIsInviteOpen(false);
      setInviteData({ name: '', email: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');
    try {
      await api.put(`/users/${formData.id}`, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        password: formData.password || undefined,
      });
      setIsEditOpen(false);
      resetFormData();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setLoadingSubmit(true);
    setError('');
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setLoadingSubmit(true);
    setError('');
    setCsvResults(null);

    const fData = new FormData();
    fData.append('file', csvFile);

    try {
      const res = await api.post('/users/import-csv', fData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResults(res.data);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process CSV file');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const openEditModal = (user: User) => {
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: '', // Leave blank unless updating
    });
    setIsEditOpen(true);
  };

  const openChecklistModal = (user: User) => {
    setViewingUser(user);
    setChecklistDate(new Date().toISOString().split('T')[0]);
    setIsViewChecklistOpen(true);
  };

  const resetFormData = () => {
    setFormData({ id: '', name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' });
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">User Directory</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Invite, configure permissions, and monitor checklist completion status of all employees
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk CSV Import
          </button>
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-2.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
          >
            <Mail className="h-4 w-4" />
            Invite Member
          </button>
          <button
            onClick={() => { resetFormData(); setIsCreateOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <Plus className="h-4 w-4" />
            Add User Directly
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-3 left-4 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-4 pl-11 text-xs text-zinc-900 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden border-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">Employee</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden border-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Disabled</option>
              <option value="PENDING_INVITE">Invited</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-zinc-500">No users found</p>
            <p className="text-xs text-zinc-400 max-w-xs mt-1">Try adjusting your filters or query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Join Date</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 text-xs">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => user.role === 'USER' && openChecklistModal(user)}>
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          {user.profilePhoto ? (
                            <img
                              src={`${API_URL}${user.profilePhoto}`}
                              alt={user.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                          : user.status === 'INACTIVE'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-600 dark:bg-green-400'
                            : user.status === 'INACTIVE'
                            ? 'bg-red-600 dark:bg-red-400'
                            : 'bg-amber-600 dark:bg-amber-400'
                        }`} />
                        {user.status === 'ACTIVE' ? 'Active' : user.status === 'INACTIVE' ? 'Disabled' : 'Invited'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'USER' && (
                          <button
                            onClick={() => openChecklistModal(user)}
                            className="rounded-lg border border-zinc-150 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:border-indigo-900 transition-colors"
                          >
                            View Checklist
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setIsDeleteOpen(true); }}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

      {/* ================= MODALS ================= */}

      {/* User Checklist Date-Wise View Modal */}
      {isViewChecklistOpen && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Employee Task Details</h3>
                <p className="text-[10px] text-zinc-500">{viewingUser.name} ({viewingUser.email})</p>
              </div>
              <button
                onClick={() => setIsViewChecklistOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900 mb-6">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <input
                type="date"
                value={checklistDate}
                onChange={(e) => setChecklistDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-hidden border-none w-full"
              />
            </div>

            {loadingChecklist ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            ) : userChecklist.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-zinc-400">
                <Clock className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-xs">No tasks assigned or active on this date.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress summary */}
                <div>
                  {(() => {
                    const completed = userChecklist.filter(c => c.isCompleted).length;
                    const total = userChecklist.length;
                    const pct = Math.round((completed / total) * 100);
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          <span>Progress for {checklistDate}</span>
                          <span>{completed} / {total} Checked</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-150 dark:bg-zinc-800">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Items List */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900 max-h-56 overflow-y-auto pr-1">
                  {userChecklist.map((item) => (
                    <div key={item.id} className="flex items-start justify-between py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-semibold ${item.isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {item.title}
                          </p>
                          {item.isRequired && (
                            <span className="text-[8px] bg-red-50 text-red-600 px-1 rounded-sm">Req</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </div>

                      <div className="shrink-0 ml-4">
                        {item.isCompleted ? (
                          <span className="flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-700 dark:bg-green-950/20 dark:text-green-400">
                            <CheckCircle className="h-3 w-3 shrink-0" /> Checked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            <XCircle className="h-3 w-3 shrink-0" /> Missed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-900 mt-6">
              <button
                onClick={() => setIsViewChecklistOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Create User</h3>
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="Employee name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="employee@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                >
                  <option value="USER">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Invite Member</h3>
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                {error}
              </div>
            )}
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Name</label>
                <input
                  type="text"
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="Invitee's name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="invitee@company.com"
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed dark:text-zinc-400">
                The user will receive an email invitation containing a secure link to set up their name and password. The token is valid for 24 hours.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Edit User Account</h3>
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                {error}
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                  >
                    <option value="USER">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Disabled</option>
                    <option value="PENDING_INVITE">Invited</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-md font-bold">Delete Account</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to delete the account for <strong>{selectedUser.name}</strong>? This action is permanent and will delete all associated checklists and completions.
            </p>
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-4">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={loadingSubmit}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">Bulk CSV Import</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Upload a CSV file containing columns <code>name</code> and <code>email</code>. The system will automatically invite all users listed.
            </p>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-6 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/20">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <UploadCloud className="h-10 w-10 text-zinc-400" />
                  <span className="text-xs font-semibold">
                    {csvFile ? csvFile.name : 'Select CSV file'}
                  </span>
                  {!csvFile && <span className="text-[10px] text-zinc-400">Drag & drop or browse</span>}
                </button>
              </div>

              {csvResults && (
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 text-xs">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Import Results</h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-semibold mb-2">
                    <div className="bg-white p-2 rounded border dark:border-zinc-800 dark:bg-zinc-950">
                      <p className="text-[10px] text-zinc-400 font-normal">Total</p>
                      <p className="text-sm">{csvResults.total}</p>
                    </div>
                    <div className="bg-green-50/50 border border-green-200 p-2 rounded text-green-700 dark:bg-green-950/20 dark:border-green-900">
                      <p className="text-[10px] text-zinc-400 font-normal">Success</p>
                      <p className="text-sm">{csvResults.successCount}</p>
                    </div>
                    <div className="bg-red-50/50 border border-red-200 p-2 rounded text-red-700 dark:bg-red-950/20 dark:border-red-900">
                      <p className="text-[10px] text-zinc-400 font-normal">Failed</p>
                      <p className="text-sm">{csvResults.failedCount}</p>
                    </div>
                  </div>
                  {csvResults.errors.length > 0 && (
                    <div className="max-h-24 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-850 text-[10px] text-red-600 mt-2 pr-1">
                      {csvResults.errors.map((err: string, i: number) => (
                        <p key={i} className="py-1">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsImportOpen(false); setCsvFile(null); setCsvResults(null); setError(''); }}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Close
                </button>
                {csvFile && !csvResults && (
                  <button
                    type="submit"
                    disabled={loadingSubmit}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {loadingSubmit ? 'Processing...' : 'Upload & Import'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
