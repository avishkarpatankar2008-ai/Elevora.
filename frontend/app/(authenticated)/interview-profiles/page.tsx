'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Loader2, AlertCircle, X, FolderKanban } from 'lucide-react';
import { api } from '@/lib/api';

interface InterviewProfile {
  id: string;
  name?: string;
  title?: string;
  role?: string;
  description?: string;
  difficulty?: string;
  createdAt?: string;
  [key: string]: any;
}

export default function InterviewProfilesPage() {
  const [profiles, setProfiles] = useState<InterviewProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<InterviewProfile | null>(null);
  const [form, setForm] = useState({ name: '', role: '', description: '', difficulty: 'medium' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await api.getInterviewProfiles();
      setProfiles(Array.isArray(data) ? data : data?.results || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load interview profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openCreate = () => {
    setEditingProfile(null);
    setForm({ name: '', role: '', description: '', difficulty: 'medium' });
    setShowModal(true);
  };

  const openEdit = (profile: InterviewProfile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name || profile.title || '',
      role: profile.role || '',
      description: profile.description || '',
      difficulty: profile.difficulty || 'medium',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Name is required');
      return;
    }
    setFormLoading(true);
    try {
      if (editingProfile) {
        await api.put(`/interview-profiles/${editingProfile.id}`, form);
      } else {
        await api.createInterviewProfile(form);
      }
      setShowModal(false);
      fetchProfiles();
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await api.delete(`/interview-profiles/${id}`);
      setProfiles(profiles.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete profile');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Interview Profiles</h1>
          <p className="text-[#a1a1aa] mt-1">Create and manage reusable interview templates for different roles.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-600/25"
        >
          <Plus className="w-5 h-5" />
          New Profile
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#27272a] flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-[#71717a]" />
          </div>
          <p className="text-[#a1a1aa] mb-4">No interview profiles yet</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 hover:border-purple-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(profile)}
                    className="p-2 rounded-lg hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                    aria-label="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-[#a1a1aa] hover:text-red-400 transition-colors"
                    aria-label="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                {profile.name || profile.title || 'Untitled Profile'}
              </h3>
              {profile.role && (
                <p className="text-sm text-purple-400 font-medium mb-2">{profile.role}</p>
              )}
              {profile.description && (
                <p className="text-sm text-[#a1a1aa] line-clamp-2 mb-4">{profile.description}</p>
              )}
              {profile.difficulty && (
                <span className="inline-block px-2.5 py-1 text-xs rounded-full border border-[#27272a] bg-[#09090b] text-[#a1a1aa] capitalize">
                  {profile.difficulty}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[#121215] border border-[#27272a] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">
                {editingProfile ? 'Edit Profile' : 'New Interview Profile'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-[#27272a] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">Profile Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Senior Frontend Engineer"
                  className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g., Frontend Engineer"
                  className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the interview focus..."
                  className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-purple-500 transition-colors text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProfile ? 'Update Profile' : 'Create Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
