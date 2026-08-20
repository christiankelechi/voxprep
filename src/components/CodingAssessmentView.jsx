import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codingQuestions } from '../data/codingQuestions';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export default function CodingAssessmentView() {
  const navigate = useNavigate();
  const [levelIndex, setLevelIndex] = useState(0);
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [pyodide, setPyodide] = useState(null);
  
  const [chatLog, setChatLog] = useState([
    { role: 'model', text: "Hi, I'm Cosmo, your AI copilot. I have context on your current problem and code. Need a hint?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const question = codingQuestions[levelIndex];

  useEffect(() => {
    async function load() {
      if (window.loadPyodide && !pyodide) {
        try {
          const py = await window.loadPyodide();
          setPyodide(py);
        } catch (err) {
          console.error("Failed to load Pyodide", err);
        }
      }
    }
    load();
  }, [pyodide]);

  useEffect(() => {
    if (question) {
      setCode(question.initialCode);
      setTestResults([]);
    }
  }, [question]);

  const handleRunTests = async () => {
    if (!pyodide) {
      alert("Python environment is still loading. Please wait a moment.");
      return;
    }

    setIsRunning(true);
    const results = [];
    
    for (let i = 0; i < question.testCases.length; i++) {
      const tc = question.testCases[i];
      try {
        await pyodide.runPythonAsync(code);
        const rawRes = await pyodide.runPythonAsync(tc.code);
        const actualRes = typeof rawRes?.toJs === 'function' ? rawRes.toJs() : rawRes;
        
        const passed = JSON.stringify(actualRes) === JSON.stringify(tc.expected);
        results.push({
          id: i + 1, passed, actual: actualRes, expected: tc.expected, error: null
        });
      } catch (err) {
        results.push({
          id: i + 1, passed: false, actual: null, expected: tc.expected, error: err.toString()
        });
      }
    }
    
    setTestResults(results);
    setIsRunning(false);
  };

  const handleNextLevel = () => {
    if (levelIndex < codingQuestions.length - 1) {
      setLevelIndex(levelIndex + 1);
    } else {
      alert("You've completed all levels!");
      navigate('/');
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setChatLog(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput("");
    setIsChatting(true);

    try {
      const contextPrompt = `You are Cosmo, an AI guide for a coding assessment. 
The user is currently working on: "${question.title}"
Description: ${question.description}
User's current code:
${code}

User's message: ${userMessage}
Provide a helpful, concise hint without writing the entire solution for them. Be encouraging.`;

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
          messages: [
            { role: 'system', content: 'You are Cosmo, a concise and helpful AI coding copilot.' },
            { role: 'user', content: contextPrompt }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const botText = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";
      setChatLog(prev => [...prev, { role: 'model', text: botText }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'model', text: "Error connecting to AI copilot." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleRevealSolution = async () => {
    if (isChatting) return;
    setIsChatting(true);
    setChatLog(prev => [...prev, { role: 'user', text: "I'm stuck. Please reveal the full solution and explain how it works." }]);

    try {
      const contextPrompt = `You are Cosmo, an AI guide for a coding assessment. 
The user is currently working on: "${question.title}"
Description: ${question.description}

The user has explicitly requested the full solution. Provide the optimal Python code solution in a code block, followed by a brief, step-by-step breakdown of how the solution works so the user can learn from it.`;

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
          messages: [
            { role: 'system', content: 'You are Cosmo, an expert coding tutor.' },
            { role: 'user', content: contextPrompt }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const botText = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate the solution.";
      setChatLog(prev => [...prev, { role: 'model', text: botText }]);
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'model', text: "Error fetching the solution." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);

  return (
    <div className="flex w-full h-[calc(100vh-100px)] animate-[fadeIn_0.3s_ease-out]">
      
      {/* Left Panel: Context & Chat */}
      <div className="w-[400px] flex flex-col border-r border-border bg-obsidian">
        
        {/* Problem Description */}
        <div className="flex-1 p-6 overflow-y-auto border-b border-border flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white tracking-tight">{question.title}</h2>
            <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-xs font-semibold border border-indigo-500/20">
              Level {levelIndex + 1} / {codingQuestions.length}
            </div>
          </div>
          <div className="prose prose-invert prose-sm text-zinc-400 max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent p-0 m-0 border-0">{question.description}</pre>
          </div>
        </div>

        {/* Cosmo Chat */}
        <div className="h-[300px] p-6 flex flex-col bg-obsidian-light">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            <h3 className="font-semibold text-zinc-200 text-sm">Cosmo Copilot</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                <div className={`p-3 rounded-lg max-w-[90%] text-sm ${msg.role === 'model' ? 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50' : 'bg-indigo-600/90 text-white'}`}>
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>
              </div>
            ))}
            
            {isChatting && (
              <div className="flex justify-start">
                <div className="p-3 rounded-lg bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></span>
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <button 
              type="button" 
              onClick={handleRevealSolution}
              disabled={isChatting}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded border border-emerald-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Reveal Solution
            </button>
          </div>
          
          <form onSubmit={handleChatSubmit} className="flex gap-2 relative">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              className="w-full bg-zinc-900 text-sm py-2.5 pl-4 pr-10 rounded-md border border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600" 
              placeholder="Ask Cosmo for help..." 
            />
            <button type="submit" disabled={isChatting} className="absolute right-2 top-2 text-zinc-400 hover:text-indigo-400 transition-colors disabled:opacity-50">
              <svg className="w-5 h-5 transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel: Editor & Tests */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        
        {/* Editor Toolbar */}
        <div className="h-12 bg-[#18181b] border-b border-[#27272a] flex justify-between items-center px-4 select-none">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" opacity="0"/></svg>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-3 py-1 rounded-sm border border-zinc-700">solution.py</span>
          </div>
          
          <div className="flex items-center gap-4">
            {!pyodide ? (
              <span className="text-xs text-amber-500 animate-pulse flex items-center gap-1.5 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Booting Pyodide VM...
              </span>
            ) : (
              <span className="text-xs text-emerald-500 flex items-center gap-1.5 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> VM Ready
              </span>
            )}
            
            <button 
              onClick={handleRunTests} 
              disabled={isRunning || !pyodide}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 px-4 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isRunning ? (
                <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Running...</>
              ) : (
                <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Run Tests</>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 24 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              formatOnPaste: true,
              lineNumbersMinChars: 3,
            }}
          />
        </div>
        
        {/* Test Results */}
        <div className="h-64 bg-obsidian border-t border-border flex flex-col">
          <div className="h-10 bg-obsidian-light border-b border-border flex items-center px-4 justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Test Output</span>
            {allPassed && (
              <button 
                onClick={handleNextLevel}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {levelIndex === codingQuestions.length - 1 ? 'Finish Assessment' : 'Next Level'}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {testResults.map(res => (
              <div key={res.id} className="text-sm font-mono flex items-start gap-3 border-b border-zinc-800/50 pb-2">
                {res.passed ? (
                  <span className="text-emerald-500 mt-0.5"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></span>
                ) : (
                  <span className="text-red-500 mt-0.5"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg></span>
                )}
                <div className="flex-1">
                  <div className="text-zinc-300 font-semibold mb-1">Test Case {res.id}</div>
                  {!res.passed && (
                    <div className="text-xs text-zinc-500">
                      {res.error ? (
                        <div className="text-red-400">{res.error}</div>
                      ) : (
                        <div className="space-y-1">
                          <div><span className="text-zinc-600">Expected:</span> <span className="text-emerald-400/80">{JSON.stringify(res.expected)}</span></div>
                          <div><span className="text-zinc-600">Actual:</span> <span className="text-red-400/80">{JSON.stringify(res.actual)}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {testResults.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic font-mono">
                Awaiting execution...
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
