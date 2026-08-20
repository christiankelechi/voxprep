import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeechService } from '../utils/speech';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdfjs worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export default function AIInterviewView() {
  const navigate = useNavigate();
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");
  
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);

  const fileInputRef = useRef(null);
  const speechService = useMemo(() => new SpeechService(), []);

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(" ") + "\\n";
      }
      return fullText;
    } catch (err) {
      console.error("PDF Extraction failed:", err);
      throw new Error("Could not parse PDF document.");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCvFile(file);
    try {
      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(file);
        setCvText(text);
      } else {
        const text = await file.text();
        setCvText(text);
      }
    } catch (err) {
      alert(err.message);
      setCvFile(null);
    }
  };

  const startInterview = async () => {
    if (!cvFile || !cvText) {
      alert("Please upload your CV first.");
      return;
    }
    
    setIsInterviewing(true);
    setIsLoading(true);
    setChatLog([]);
    setEvaluation(null);

    const systemPromptText = `You are a senior technical recruiter and hiring manager conducting a live interview. 
The candidate has provided their CV. Read the CV provided below.
Start the interview by greeting the candidate, mentioning one interesting thing from their CV, and asking the first interview question. 
Keep your responses conversational, professional, and concise (under 3 sentences). Ask one question at a time.

--- CANDIDATE CV ---
${cvText.substring(0, 3000)}`;

    const initialMessage = {
      role: 'user',
      content: systemPromptText
    };

    setInterviewHistory([initialMessage]);

    try {
      const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OmniAssess'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [initialMessage],
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "API Error");
      }
      
      const botReply = data.choices?.[0]?.message?.content;
      if (!botReply) throw new Error("No text response from AI.");

      setChatLog([{ role: 'model', text: botReply }]);
      setInterviewHistory(prev => [...prev, { role: 'assistant', content: botReply }]);
      await speechService.speak(botReply);
    } catch (err) {
      alert("Failed to start interview: " + err.message);
      setIsInterviewing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakAnswer = async () => {
    setIsListening(true);
    try {
      const transcript = await speechService.listen(false);
      setIsListening(false);
      
      if (!transcript) {
        alert("Couldn't hear anything. Try again.");
        return;
      }

      setChatLog(prev => [...prev, { role: 'user', text: transcript }]);
      setIsLoading(true);

      const updatedHistory = [...interviewHistory, { role: 'user', content: transcript }];
      setInterviewHistory(updatedHistory);

      const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OmniAssess'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: updatedHistory,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "API Error");
      }
      
      const botReply = data.choices?.[0]?.message?.content;
      if (!botReply) throw new Error("No text response from AI.");

      setChatLog(prev => [...prev, { role: 'model', text: botReply }]);
      setInterviewHistory(prev => [...prev, { role: 'assistant', content: botReply }]);
      await speechService.speak(botReply);
    } catch (err) {
      alert("Error: " + err.message);
      setIsListening(false);
    } finally {
      setIsLoading(false);
    }
  };

  const finishInterview = async () => {
    setIsLoading(true);
    try {
      const evaluationPrompt = `
Based on the following interview transcript, provide a comprehensive evaluation of the candidate using standard recruiter auto-marking criteria:
1. Communication Skills (out of 10)
2. Technical Depth (out of 10)
3. Culture Fit (out of 10)
4. Overall Recommendation (Hire / No Hire / Weak Hire)
5. Actionable Feedback & Solutions (Provide 2-3 specific examples of what the candidate should have said or done differently to 'crush' this interview next time).

Provide a brief 3-sentence summary of their performance before listing the criteria.

Transcript:
${chatLog.map(m => m.role + ': ' + m.text).join('\\n')}
`;

      const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OmniAssess'
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.2
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "API Error");
      }
      
      const evalText = data.choices?.[0]?.message?.content;
      setEvaluation(evalText);
      setIsInterviewing(false);
    } catch (err) {
      alert("Failed to evaluate: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-8 py-8">
      
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold tracking-tight text-white">
          Vocal Interface
        </h2>
        <p className="text-zinc-500 font-medium tracking-wide text-sm uppercase">AI Screening Session</p>
      </div>

      {!isInterviewing && !evaluation && (
        <div className="premium-panel p-12 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-6 shadow-inner">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Upload your Profile</h3>
          <p className="text-zinc-400 mb-8 max-w-sm text-sm">
            Provide your CV in PDF format. The intelligence layer will analyze your background to contextualize the interview.
          </p>
          
          <div className="w-full max-w-sm relative group">
            <input 
              type="file" 
              accept=".pdf,.txt" 
              onChange={handleFileChange}
              ref={fileInputRef}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`w-full py-4 px-6 rounded-xl border transition-all duration-300 ${cvFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700/50 bg-zinc-800/30 group-hover:border-zinc-500'} flex items-center justify-center gap-3`}>
              {cvFile ? (
                <>
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-indigo-100 font-medium text-sm">{cvFile.name}</span>
                </>
              ) : (
                <>
                  <span className="text-zinc-400 font-medium text-sm group-hover:text-zinc-300 transition-colors">Select PDF Document</span>
                </>
              )}
            </div>
          </div>

          <button 
            onClick={startInterview} 
            disabled={isLoading || !cvFile}
            className="btn-premium mt-8 w-full max-w-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Connecting...
              </span>
            ) : "Initialize Interview"}
          </button>
        </div>
      )}

      {isInterviewing && (
        <div className="premium-panel flex flex-col h-[600px] overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-obsidian-light/50">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-400 font-bold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-obsidian"></div>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">OmniAssess Recruiter</h3>
                <p className="text-xs text-zinc-500">Live Session Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-medium text-zinc-400">REC</span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${msg.role === 'model' ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 rounded-tl-sm' : 'bg-white text-black rounded-tr-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800/80 border border-zinc-700/50 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
            {isListening && (
              <div className="flex justify-end">
                <div className="bg-zinc-800 border border-indigo-500/30 px-5 py-3 rounded-2xl rounded-tr-sm text-indigo-300 flex items-center gap-2 animate-[glow_2s_ease-in-out_infinite_alternate]">
                  <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                  Listening...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-obsidian border-t border-border flex gap-3">
            <button 
              onClick={handleSpeakAnswer}
              disabled={isLoading || isListening}
              className="flex-1 btn-premium border border-zinc-700 py-3 rounded-xl disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              Hold to Speak
            </button>
            <button 
              onClick={finishInterview}
              disabled={isLoading || isListening}
              className="btn-outline px-6 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {evaluation && (
        <div className="premium-panel p-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">Evaluation Report</h3>
          <p className="text-zinc-400 text-sm mb-8 text-center max-w-sm">Summary of your technical and cultural alignment.</p>
          
          <div className="w-full bg-obsidian-light/50 p-6 rounded-xl border border-border mb-8">
            <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed text-sm">{evaluation}</pre>
          </div>
          
          <button 
            onClick={() => { setEvaluation(null); setChatLog([]); setCvFile(null); setCvText(""); }} 
            className="btn-outline w-full max-w-sm"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
}
