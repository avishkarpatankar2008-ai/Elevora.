'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowRight, Upload } from 'lucide-react';
import { api } from '@/lib/api';

export default function NewInterviewPage() {
  const router = useRouter();
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) {
      setError('Position/Title is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('position', position);
      formData.append('jobDescription', jobDescription);
      formData.append('difficulty', difficulty);
      if (resume) {
        formData.append('resume', resume);
      }

      const res = await api.createInterview(formData);
      const interviewId = res.id || res.interviewId;
      if (interviewId) {
        router.push(`/interviews/${interviewId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Configure New Interview</h1>
        <p className="text-[#a1a1aa] mt-1">Set up your target role, difficulty, and upload your resume for tailored AI questioning.</p>
      </div>

      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Position / Title</label>
            <input
              type="text"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Job Description (Optional)</label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description requirements..."
              className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-purple-500 transition-colors text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resume Upload (PDF / TXT)</label>
            <div className="border-2 border-dashed border-[#27272a] rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-[#71717a] mx-auto mb-2" />
              <p className="text-sm text-[#fafafa] font-medium">
                {resume ? resume.name : 'Click to upload resume or drag and drop'}
              </p>
              <p className="text-xs text-[#71717a] mt-1">PDF, TXT up to 10MB</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Initializing Interview...</span>
              </>
            ) : (
              <>
                <span>Start Live Interview</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
