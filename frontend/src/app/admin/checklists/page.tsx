'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  UserCheck,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Globe
} from 'lucide-react';
import api from '../../../lib/api';

interface Checklist {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isRequired: boolean;
  createdAt: string;
  assignments: Array<{ userId: string | null }>;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ChecklistManagement() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    isActive: true,
    isRequired: true,
  });

  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [assignmentType, setAssignmentType] = useState<'GLOBAL' | 'SPECIFIC'>('GLOBAL');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const fetchChecklists = async () => {
    try {
      const res = await api.get('/checklists');
      setChecklists(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch checklist items');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { params: { role: 'USER', limit: 100 } });
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchChecklists(), fetchUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');

    try {
      if (formData.id) {
        // Update
        await api.put(`/checklists/${formData.id}`, {
          title: formData.title,
          description: formData.description,
          isActive: formData.isActive,
          isRequired: formData.isRequired,
        });
      } else {
        // Create
        await api.post('/checklists', {
          title: formData.title,
          description: formData.description,
          isActive: formData.isActive,
          isRequired: formData.isRequired,
        });
      }
      setIsFormOpen(false);
      resetForm();
      fetchChecklists();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save checklist item');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleToggleActive = async (chk: Checklist) => {
    try {
      await api.put(`/checklists/${chk.id}`, {
        isActive: !chk.isActive,
      });
      setChecklists(checklists.map((c) => (c.id === chk.id ? { ...c, isActive: !c.isActive } : c)));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleToggleRequired = async (chk: Checklist) => {
    try {
      await api.put(`/checklists/${chk.id}`, {
        isRequired: !chk.isRequired,
      });
      setChecklists(checklists.map((c) => (c.id === chk.id ? { ...c, isRequired: !c.isRequired } : c)));
    } catch (err) {
      console.error('Failed to toggle required flag', err);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedChecklist) return;
    setLoadingSubmit(true);
    setError('');
    try {
      await api.delete(`/checklists/${selectedChecklist.id}`);
      setIsDeleteOpen(false);
      fetchChecklists();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete checklist item');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChecklist) return;
    setLoadingSubmit(true);
    setError('');

    try {
      await api.post('/checklists/assign', {
        checklistId: selectedChecklist.id,
        userIds: assignmentType === 'GLOBAL' ? [] : assignedUserIds,
      });
      setIsAssignOpen(false);
      fetchChecklists();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update assignments');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const openFormModal = (chk?: Checklist) => {
    if (chk) {
      setFormData({
        id: chk.id,
        title: chk.title,
        description: chk.description || '',
        isActive: chk.isActive,
        isRequired: chk.isRequired,
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const openAssignModal = (chk: Checklist) => {
    setSelectedChecklist(chk);
    const existingUserIds = chk.assignments
      .filter((a) => a.userId !== null)
      .map((a) => a.userId as string);

    const isGlob = chk.assignments.some((a) => a.userId === null) || chk.assignments.length === 0;

    setAssignmentType(isGlob ? 'GLOBAL' : 'SPECIFIC');
    setAssignedUserIds(existingUserIds);
    setIsAssignOpen(true);
  };

  const handleCheckboxChange = (userId: string) => {
    if (assignedUserIds.includes(userId)) {
      setAssignedUserIds(assignedUserIds.filter((id) => id !== userId));
    } else {
      setAssignedUserIds([...assignedUserIds, userId]);
    }
  };

  const resetForm = () => {
    setFormData({ id: '', title: '', description: '', isActive: true, isRequired: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Checklist Manager</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Define daily duties, customize targets, and toggle checklist items across employees
          </p>
        </div>
        <button
          onClick={() => openFormModal()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 self-start"
        >
          <Plus className="h-4 w-4" />
          Create Task Template
        </button>
      </div>

      {/* Grid of Checklists */}
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent dark:border-indigo-400" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-500">No checklist items defined</p>
          <p className="text-xs text-zinc-400 max-w-xs mt-1">Get started by creating your first daily checklist template.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {checklists.map((chk) => {
            const isGlob = chk.assignments.some((a) => a.userId === null) || chk.assignments.length === 0;
            return (
              <div
                key={chk.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 transition-all hover:shadow-md"
              >
                <div>
                  {/* Status header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isGlob
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                    }`}>
                      {isGlob ? <Globe className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                      {isGlob ? 'Global Task' : `${chk.assignments.length} User(s)`}
                    </span>

                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      chk.isRequired
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {chk.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </div>

                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {chk.title}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed min-h-12">
                    {chk.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                  {/* Toggle Activations */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(chk)}
                      className={`text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200`}
                      title={chk.isActive ? 'Deactivate Task' : 'Activate Task'}
                    >
                      {chk.isActive ? (
                        <ToggleRight className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-zinc-300 dark:text-zinc-700" />
                      )}
                    </button>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      {chk.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openAssignModal(chk)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      title="Manage Assignments"
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openFormModal(chk)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      title="Edit Details"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedChecklist(chk); setIsDeleteOpen(true); }}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Form Modal (Create / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              {formData.id ? 'Edit Checklist Item' : 'Create Checklist Item'}
            </h3>
            {error && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                {error}
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="e.g. Check Emails"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                  placeholder="Details about how to complete this task"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Active Template</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isRequired" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Required Task</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {formData.id ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssignOpen && selectedChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Task Assignments
            </h3>
            <p className="text-xs text-zinc-400 mb-4 truncate font-medium">
              Task: {selectedChecklist.title}
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Assignment Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentType('GLOBAL')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                      assignmentType === 'GLOBAL'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Global (All Users)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentType('SPECIFIC')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                      assignmentType === 'SPECIFIC'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    Specific Users
                  </button>
                </div>
              </div>

              {assignmentType === 'SPECIFIC' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Select Target Employees ({assignedUserIds.length} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100 p-2 dark:border-zinc-800 dark:divide-zinc-900">
                    {users.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 text-center py-4">No active employees to assign</p>
                    ) : (
                      users.map((u) => {
                        const isChecked = assignedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className="flex items-center gap-3 py-2 px-1 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(u.id)}
                              className="h-4 w-4 rounded-sm border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</p>
                              <p className="text-[10px] text-zinc-400">{u.email}</p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingSubmit}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-md font-bold">Delete Task Template</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to delete the task template: <strong>{selectedChecklist.title}</strong>? This will permanently delete this checklist template and any completions logged by users for this task.
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
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
