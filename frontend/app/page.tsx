'app/page.tsx'
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Cpu, Zap, BarChart3, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] selection:bg-purple-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-purple-500/20">
              E
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">ELEVORA</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a1a1aa]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#a1a1aa] hover:text-white px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/25 flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden border-b border-[#27272a]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold tracking-wide uppercase mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Production-Ready AI Interview Intelligence
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Master Your Career With <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">Precision Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl text-[#a1a1aa] max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Elevora combines advanced voice AI, real-time camera analytics, and deep structured reporting to simulate high-stakes interviews with editorial rigor.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 group text-base"
            >
              Start Free Interview
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border border-[#27272a] hover:border-zinc-700 bg-[#121215] text-[#fafafa] px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center text-base"
            >
              Sign In to Dashboard
            </Link>
          </div>

          {/* Hero Visual Preview */}
          <div className="mt-16 rounded-2xl border border-[#27272a] bg-[#121215] p-2 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent pointer-events-none z-10" />
            <div className="rounded-xl bg-[#09090b] border border-[#27272a] p-8 text-left">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#27272a]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs text-[#a1a1aa] font-mono ml-2">elevora-secure-session://live-room</span>
                </div>
                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">Active Analysis</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#121215] border border-[#27272a] p-5 rounded-xl">
                  <span className="text-xs font-mono text-[#a1a1aa]">COMMUNICATION</span>
                  <div className="text-3xl font-display font-bold mt-2 text-white">94%</div>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ Exceptional clarity & pace</p>
                </div>
                <div className="bg-[#121215] border border-[#27272a] p-5 rounded-xl">
                  <span className="text-xs font-mono text-[#a1a1aa]">TECHNICAL DEPTH</span>
                  <div className="text-3xl font-display font-bold mt-2 text-white">88%</div>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ Strong system design recall</p>
                </div>
                <div className="bg-[#121215] border border-[#27272a] p-5 rounded-xl">
                  <span className="text-xs font-mono text-[#a1a1aa]">CONFIDENCE INDEX</span>
                  <div className="text-3xl font-display font-bold mt-2 text-white">91%</div>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">↑ Steady vocal tone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-b border-[#27272a] bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Engineered for Professional Excellence
            </h2>
            <p className="text-[#a1a1aa]">
              Every module is crafted with rigorous standards, ensuring zero noise and maximum analytical insight.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-[#27272a] bg-[#121215] p-8 rounded-2xl hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Adaptive AI Interviewer</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Dynamic follow-up questions tailored directly to your resume and target job description with natural voice simulation.
              </p>
            </div>
            <div className="border border-[#27272a] bg-[#121215] p-8 rounded-2xl hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Granular Scoring Engine</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Objective multi-dimensional evaluations measuring technical accuracy, structural clarity, and behavioral alignment.
              </p>
            </div>
            <div className="border border-[#27272a] bg-[#121215] p-8 rounded-2xl hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Secure Session Architecture</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                HTTP-only session cookies, encrypted draft storage, and strict CSRF protection with zero credential exposure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#27272a] text-center text-xs text-[#a1a1aa]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
              E
            </div>
            <span className="font-display font-semibold text-white">ELEVORA</span>
          </div>
          <p>© {new Date().getFullYear()} Elevora Intelligence Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
