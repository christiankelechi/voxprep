import React, { useMemo } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import Part1View from './components/Part1View';
import Part2View from './components/Part2View';
import ResultsView from './components/ResultsView';
import TranscriberView from './components/TranscriberView';
import AlignerExamView from './components/AlignerExamView';
import CodingAssessmentView from './components/CodingAssessmentView';
import AIInterviewView from './components/AIInterviewView';
import { SpeechService } from './utils/speech';

function App() {
  const speechService = useMemo(() => new SpeechService(), []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Global Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-obsidian-light/80 backdrop-blur-md border-b border-border">
        <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <img src="/logo.png" alt="VoxPrepAI Logo" className="w-8 h-8 object-contain filter drop-shadow-[0_0_10px_rgba(79,70,229,0.6)]" />
          VoxPrepAI
        </Link>
        <div className="flex gap-4">
          <Link to="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Platform</Link>
          <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Enterprise</a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-8 animate-[fadeIn_0.5s_ease-out]">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/part1" element={<Part1View speechService={speechService} />} />
          <Route path="/part2" element={<Part2View speechService={speechService} />} />
          <Route path="/results" element={<ResultsView />} />
          <Route path="/transcriber" element={<TranscriberView />} />
          <Route path="/aligner" element={<AlignerExamView />} />
          <Route path="/coding" element={<CodingAssessmentView />} />
          <Route path="/ai-interview" element={<AIInterviewView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
