'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertCircle, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface Interview {
  id: string;
  title?: string;
  position?: string;
  date?: string;
  score?: number;
  status?: string;
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');

  const LIMIT = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await api.getHistory(LIMIT, offset);
        const results = Array.isArray(data) ? data : data.results || [];
        setInterviews(results);
        setHasMore(results.length === LIMIT);
      } catch (err: any) {
        setError(err?.message || 'Failed to load interview history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [offset]);

  const filteredInterviews = interviews.filter((interview) =>
    (interview.title || interview.position || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Interview History</h1>
        <p className="text-[#a1a1aa] mt-1">Review all your previous interviews and detailed reports.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717a]" />
        <input
          type="text"
          placeholder="Search interviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#121215] border border-[#27272a] rounded-xl text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Content */}
      {loading && offset === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-[#a1a1aa] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#27272a] flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-[#71717a]" />
          </div>
          <p className="text-[#a1a1aa] mb-2">
            {search ? 'No interviews match your search' : 'No interview history yet'}
          </p>
          <Link
            href="/interviews/new"
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Create Your First Interview
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredInterviews.map((interview) => (
              <Link
                key={interview.id}
                href={`/results/${interview.id}`}
                className="block p-4 bg-[#121215] border border-[#27272a] rounded-2xl hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-white group-hover:text-purple-400 transition-colors">
                      {interview.title || interview.position || 'Interview Session'}
                    </p>
                    <p className="text-xs text-[#71717a] mt-1">
                      {interview.date ? new Date(interview.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : 'Date unknown'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    {interview.status && (
                      <span className="text-xs px-2.5 py-1 rounded-full border border-[#27272a] bg-[#09090b] text-[#a1a1aa] font-medium">
                        {interview.status}
                      </span>
                    )}
                    {interview.score !== undefined ? (
                      <div className="text-right">
                        <div className="text-2xl font-display font-bold text-white">
                          {interview.score}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[#71717a]">Pending</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#27272a] pt-6">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#27272a] hover:border-purple-500/50 text-[#a1a1aa] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-xs text-[#a1a1aa]">
              Showing {offset + 1}–{offset + filteredInterviews.length} of loaded results
            </span>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!hasMore}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#27272a] hover:border-purple-500/50 text-[#a1a1aa] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
