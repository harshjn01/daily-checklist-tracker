'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, ShieldAlert, Camera, KeyRound, User2 } from 'lucide-react';
import api from '../../../lib/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  if (!user) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoadingName(true);
    try {
      const res = await api.put(`/users/${user.id}`, { name });
      updateUser({ name: res.data.name });
      setSuccess('Profile name updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile name');
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoadingPass(true);
    try {
      await api.put(`/users/${user.id}`, { password });
      setSuccess('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoadingPass(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setLoadingPhoto(true);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await api.post('/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profilePhoto: res.data.profilePhoto });
      setSuccess('Profile picture updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload image. Ensure it is jpg/png under 2MB.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto text-left">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile Settings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage your personal information, profile photo, and security passwords
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/50">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <div>{success}</div>
        </div>
      )}

      {/* Profile Photo Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
            {user.profilePhoto ? (
              <img
                src={`${API_URL}${user.profilePhoto}`}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-bold text-3xl text-indigo-600 dark:text-indigo-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          {loadingPhoto && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
          />
        </div>

        <div className="text-center sm:text-left space-y-1">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Profile Picture</h3>
          <p className="text-xs text-zinc-500">
            JPG, JPEG or PNG. Max size of 2MB.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Upload New Photo
          </button>
        </div>
      </div>

      {/* Edit Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Name Info */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 mb-4">
              <User2 className="h-5 w-5 text-zinc-400" />
              <h3 className="font-bold text-sm">Account Details</h3>
            </div>
            
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Account Role</label>
                <input
                  type="text"
                  disabled
                  value={user.role === 'ADMIN' ? 'Administrator' : 'Employee'}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                />
              </div>
              
              <button
                type="submit"
                disabled={loadingName}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loadingName ? 'Saving...' : 'Update Name'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 mb-4">
              <KeyRound className="h-5 w-5 text-zinc-400" />
              <h3 className="font-bold text-sm">Security</h3>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPass}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loadingPass ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
