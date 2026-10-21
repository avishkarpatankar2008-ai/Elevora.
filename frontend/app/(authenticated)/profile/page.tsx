'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Mail, User, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getCurrentUser();
        setProfile(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-[#a1a1aa] mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-[#a1a1aa] mt-1">View your account information. Profile editing coming soon.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-display text-3xl font-bold text-white shadow-lg shadow-purple-600/30">
              {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-white mb-1">
              {profile?.name || 'User'}
            </h2>
            <p className="text-[#a1a1aa] mb-4">{profile?.email || 'No email'}</p>
            <div className="flex flex-wrap gap-4">
              {profile?.createdAt && (
                <div className="text-sm">
                  <span className="text-[#71717a]">Member since</span>
                  <p className="text-white font-medium">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-[#a1a1aa]">Email Address</span>
          </div>
          <p className="text-white font-mono text-sm">{profile?.email || 'Not available'}</p>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-[#a1a1aa]">Full Name</span>
          </div>
          <p className="text-white font-medium">{profile?.name || 'Not provided'}</p>
        </div>

        {profile?.createdAt && (
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-[#a1a1aa]">Account Created</span>
            </div>
            <p className="text-white font-medium">
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {profile?.updatedAt && (
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-[#a1a1aa]">Last Updated</span>
            </div>
            <p className="text-white font-medium">
              {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>This is a read-only profile view. Profile editing will be available in a future update. Contact support to change your account information.</p>
      </div>
    </div>
  );
}
