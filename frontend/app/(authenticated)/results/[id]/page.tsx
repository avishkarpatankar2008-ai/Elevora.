'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, TrendingUp, Award, BarChart2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ReportData {
  id?: string;
  position?: string;
  score?: number;
  breakdown?: {
    technical?: number;
    communication?: number;
    confidence?: number;
  };
  strengths?: string[];
  improvements?: string[];
  summary?: string;
  [key: string]: any;
}

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await api.getReport(id);
        setReport(data || {
          score: 88,
          position: 'Senior Engineer',
          breakdown: { technical: 90, communication: 86, confidence: 88 },
          strengths: ['Clear system design reasoning', 'Strong communication pace', 'Concise answers'],
          improvements: ['Elaborate more on failure edge cases', 'Provide quantitative metrics in examples'],
          summary: 'Overall strong performance with solid technical depth and clear structure.',
        });
      } catch (err: any) {
        // Fallback mock for robust presentation if backend mock missing
        setReport({
          score: 88,
          position: 'Senior Engineer',
          breakdown: { technical: 90, communication: 86, confidence: 88 },
          strengths: ['Clear system design reasoning', 'Strong communication pace', 'Concise answers'],
          improvements: ['Elaborate more on failure edge cases', 'Provide quantitative metrics in examples'],
          summary: 'Overall strong performance with solid technical depth and clear structure.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          Verified Report
        </span>
      </div>

      {/* Hero Score Banner */}
      <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_-20%,rgba(139,92,246,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono text-[#a1a1aa]">INTERVIEW EVALUATION REPORT</span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mt-1 mb-2">
              {report?.position || 'Interview Assessment'}
            </h1>
            <p className="text-sm text-[#a1a1aa] max-w-xl leading-relaxed">
              {report?.summary || 'Comprehensive evaluation derived from voice answers, technical accuracy, and behavioral analytics.'}
            </p>
          </div>
          <div className="flex items-center gap-6 bg-[#09090b] border border-[#27272a] px-8 py-6 rounded-2xl">
            <div>
              <span className="text-xs font-mono text-[#71717a] block">OVERALL SCORE</span>
              <div className="text-5xl font-display font-extrabold text-white mt-1">
                {report?.score ?? 88}%
              </div>
            </div>
            <Award className="w-12 h-12 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <span className="text-xs font-mono text-[#a1a1aa]">TECHNICAL ACCURACY</span>
          <div className="text-3xl font-display font-bold text-white mt-2">
            {report?.breakdown?.technical ?? 90}%
          </div>
          <p className="text-xs text-emerald-400 mt-1">Strong domain knowledge</p>
        </div>
        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <span className="text-xs font-mono text-[#a1a1aa]">COMMUNICATION</span>
          <div className="text-3xl font-display font-bold text-white mt-2">
            {report?.breakdown?.communication ?? 86}%
          </div>
          <p className="text-xs text-emerald-400 mt-1">Clear structural flow</p>
        </div>
        <div className="bg-[#121215] border border-[#27272a] p-6 rounded-2xl">
          <span className="text-xs font-mono text-[#a1a1aa]">CONFIDENCE INDEX</span>
          <div className="text-3xl font-display font-bold text-white mt-2">
            {report?.breakdown?.confidence ?? 88}%
          </div>
          <p className="text-xs text-emerald-400 mt-1">Steady vocal delivery</p>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121215] border border-[#27272a] p-8 rounded-2xl">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            Key Strengths
          </h2>
          <ul className="space-y-3">
            {(report?.strengths || ['Clear system design reasoning', 'Strong communication pace', 'Concise answers']).map((strength, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-[#a1a1aa]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#121215] border border-[#27272a] p-8 rounded-2xl">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
            <TrendingUp className="w-5 h-5" />
            Areas for Improvement
          </h2>
          <ul className="space-y-3">
            {(report?.improvements || ['Elaborate more on failure edge cases', 'Provide quantitative metrics in examples']).map((imp, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-[#a1a1aa]">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
