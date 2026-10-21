'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, Clock, Target, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
  totalInterviews?: number;
  averageScore?: number;
  recentInterviews?: any[];
  improvement?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[#a1a1aa] mt-1">Welcome back. Track your interview performance and progress.</p>
        </div>
        <Link
          href="/interviews/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-600/25 group"
        >
          <Plus className="w-5 h-5" />
          <span>New Interview</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wide">Total Interviews</span>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-4xl font-display font-bold text-white">
            {stats?.totalInterviews ?? 0}
          </div>
          <p className="text-xs text-[#71717a] mt-2">Completed sessions</p>
        </div>

        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wide">Average Score</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-4xl font-display font-bold text-white">
            {stats?.averageScore ? `${stats.averageScore}%` : 'N/A'}
          </div>
          <p className="text-xs text-[#71717a] mt-2">Overall performance</p>
        </div>

        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-[#a1a1aa] uppercase tracking-wide">Improvement</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-4xl font-display font-bold text-white">
            {stats?.improvement ? `+${stats.improvement}%` : 'N/A'}
          </div>
          <p className="text-xs text-[#71717a] mt-2">From last session</p>
        </div>
      </div>

      {/* Recent Interviews */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold">Recent Interviews</h2>
          <Link
            href="/history"
            className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {stats?.recentInterviews && stats.recentInterviews.length > 0 ? (
          <div className="space-y-3">
            {stats.recentInterviews.map((interview: any, idx: number) => (
              <Link
                key={interview.id || idx}
                href={`/results/${interview.id}`}
                className="block p-4 rounded-xl border border-[#27272a] hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white group-hover:text-purple-400 transition-colors">
                      {interview.title || interview.position || 'Interview Session'}
                    </p>
                    <p className="text-xs text-[#71717a] mt-1">
                      {interview.date ? new Date(interview.date).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                  <div className="text-right">
                    {interview.score !== undefined ? (
                      <div className="text-2xl font-display font-bold text-white">
                        {interview.score}%
                      </div>
                    ) : (
                      <div className="text-sm text-[#71717a]">Pending</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-[#27272a] mx-auto mb-4" />
            <p className="text-[#a1a1aa] mb-4">No interviews yet</p>
            <Link
              href="/interviews/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start Your First Interview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
