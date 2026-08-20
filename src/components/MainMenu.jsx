import React from 'react';
import { Link } from 'react-router-dom';

export default function MainMenu() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 py-12 animate-[slideUp_0.6s_ease-out]">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          OmniAssess Platform v2.0
        </div>
        <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tighter">
          Evaluate with <span className="text-gradient-accent">precision.</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light">
          The intelligent evaluation platform for modern engineering and talent teams. Code, converse, and analyze globally.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Coding Simulator Card */}
        <div className="premium-panel p-8 flex flex-col items-start gap-4 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="p-3 bg-zinc-800/80 rounded-xl text-indigo-400 mb-2 border border-zinc-700/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">Engineering Simulator</h2>
          <p className="text-zinc-400 mb-6 flex-1 text-sm leading-relaxed">
            Progressive algorithmic challenges with an embedded Monaco IDE, real-time execution via Pyodide, and Cosmo AI copilot.
          </p>
          <Link to="/coding" className="btn-outline w-full group-hover:bg-white group-hover:text-black group-hover:border-white">
            Start Assessment
          </Link>
        </div>

        {/* AI Vocal Interview Card */}
        <div className="premium-panel p-8 flex flex-col items-start gap-4 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="p-3 bg-zinc-800/80 rounded-xl text-cyan-400 mb-2 border border-zinc-700/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">AI Vocal Interview</h2>
          <p className="text-zinc-400 mb-6 flex-1 text-sm leading-relaxed">
            Context-aware live vocal screening. Upload a CV and converse with a Gemini-powered senior recruiter with auto-evaluation.
          </p>
          <Link to="/ai-interview" className="btn-outline w-full group-hover:bg-white group-hover:text-black group-hover:border-white">
            Begin Interview
          </Link>
        </div>

        {/* English Assessment Card */}
        <div className="premium-panel p-8 flex flex-col items-start gap-4 transition-all duration-300 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="p-3 bg-zinc-800/80 rounded-xl text-purple-400 mb-2 border border-zinc-700/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">Language Fluency</h2>
          <p className="text-zinc-400 mb-6 flex-1 text-sm leading-relaxed">
            Automated spoken English proficiency testing. Listen, repeat, and answer open-ended questions evaluated in real-time.
          </p>
          <Link to="/part1" className="btn-outline w-full group-hover:bg-white group-hover:text-black group-hover:border-white">
            Start Test
          </Link>
        </div>

        {/* Aligner & Tools Card */}
        <div className="premium-panel p-8 flex flex-col items-start gap-4 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="p-3 bg-zinc-800/80 rounded-xl text-emerald-400 mb-2 border border-zinc-700/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">Transcription & Alignment</h2>
          <p className="text-zinc-400 mb-6 flex-1 text-sm leading-relaxed">
            Enterprise-grade transcription guidelines test and audio alignment tools.
          </p>
          <div className="flex gap-4 w-full">
            <Link to="/transcriber" className="btn-outline flex-1 group-hover:border-zinc-500">Workspace</Link>
            <Link to="/aligner" className="btn-outline flex-1 group-hover:bg-white group-hover:text-black group-hover:border-white">Aligner Exam</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
