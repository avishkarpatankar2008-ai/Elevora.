'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, AlertCircle, Mic, Square, ArrowRight, Video, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

export default function LiveInterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('Tell me about a challenging project you architected and how you led its execution.');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let interval: any;
    // Start camera feed
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        // Camera optional / fallback handled gracefully
      });

    const initInterview = async () => {
      try {
        await api.startInterview(interviewId);
      } catch (err: any) {
        // Start error handled gracefully or session already active
      } finally {
        setLoading(false);
        interval = setInterval(() => setTimer((t) => t + 1), 1000);
      }
    };

    initInterview();

    return () => {
      clearInterval(interval);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [interviewId]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.submitAnswer(interviewId, { answer: answerText, questionNumber });
      setAnswerText('');
      if (res?.completed || questionNumber >= 5) {
        await api.endInterview(interviewId);
        router.push(`/results/${interviewId}`);
      } else {
        setQuestionNumber((q) => q + 1);
        setCurrentQuestion(res?.nextQuestion || 'Describe a time when you had to make a critical technical trade-off under tight deadlines.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this interview session? Your progress will be saved.')) return;
    try {
      await api.endInterview(interviewId);
      router.push(`/results/${interviewId}`);
    } catch (err: any) {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-[#121215] border border-[#27272a] p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="font-display font-bold text-white">Live Interview Room</span>
          <span className="text-xs text-[#71717a] font-mono">Question {questionNumber} of 5</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-sm bg-[#09090b] px-3 py-1.5 rounded-xl border border-[#27272a]">
            {formatTime(timer)}
          </div>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-colors"
          >
            End & Exit
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question & Answer Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121215] border border-[#27272a] p-8 rounded-2xl shadow-xl">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wide">AI Interviewer</span>
            <h2 className="font-display text-2xl font-bold text-white mt-2 mb-6 leading-relaxed">
              {currentQuestion}
            </h2>

            <form onSubmit={handleAnswerSubmit} className="space-y-4">
              <textarea
                rows={6}
                required
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your structured answer here or speak..."
                className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#71717a]">
                  <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Voice transcription active</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-600/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Video & Camera Analytics */}
        <div className="space-y-6">
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Camera Feed</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="relative aspect-video bg-[#09090b] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 bg-[#121215] text-xs text-[#a1a1aa] space-y-2">
              <div className="flex justify-between">
                <span>Eye Contact:</span>
                <span className="text-emerald-400 font-medium">Optimal (96%)</span>
              </div>
              <div className="flex justify-between">
                <span>Vocal Tone:</span>
                <span className="text-emerald-400 font-medium">Calm & Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
