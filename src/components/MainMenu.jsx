import React from 'react';

export default function MainMenu({ onStart, onTranscriber, onAligner }) {
  return (
    <div className="container">
      <h1 className="text-2xl text-center mb-4">Global English Assessment Simulator</h1>
      
      <div className="rules-list">
        <h3 className="text-xl mb-4 text-center text-primary">About This Assessment</h3>
        <p>This simulator prepares you for standard English speaking assessments. There are two parts:</p>
        <p><b>Part 1:</b> Listen and repeat, verbatim, a series of phrases. You are scored on pronunciation and completeness. Say all words in the correct order.</p>
        <p><b>Part 2:</b> 3 questions. 30s to prepare, 60s to speak (must speak for at least 15s).</p>
        <p className="italic mt-4">Tips: Speak slowly and clearly. Make sure you are in a quiet place. We recommend using Google Chrome or Microsoft Edge.</p>
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="flex justify-center gap-4">
          <button onClick={onStart} style={{ padding: '16px 32px', fontSize: '18px' }}>
            START ASSESSMENT
          </button>
          <button onClick={onTranscriber} style={{ padding: '16px 32px', fontSize: '18px', backgroundColor: '#8b5cf6' }}>
            FREE TRANSCRIBER
          </button>
        </div>
        <button onClick={onAligner} style={{ padding: '16px 32px', fontSize: '18px', backgroundColor: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
          ALIGNER EXAM TOOL
        </button>
      </div>
    </div>
  );
}
