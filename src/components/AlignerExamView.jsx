import React, { useState, useRef, useEffect } from 'react';
import { ERMIS_INSTRUCTIONS } from '../data/ermisInstructions';
import { ERMIS_INSTRUCTIONS_ITALIAN } from '../data/ermisInstructionsItalian';
import { useTranscriber } from '../hooks/useTranscriber';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function AlignerExamView({ onBack }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [translationText, setTranslationText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translationDir, setTranslationDir] = useState('it2en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [modelEngine, setModelEngine] = useState('v1');
  
  const transcriber = useTranscriber();
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleTranslate = async () => {
    if (!translationText.trim()) return;
    setIsTranslating(true);
    setTranslatedText('');
    setError(null);
    try {
      const promptText = translationDir === 'it2en' 
        ? `Translate the following Italian text to English. Respond ONLY with the translation.\n\nText: ${translationText}`
        : `Translate the following English text to Italian. Respond ONLY with the translation.\n\nText: ${translationText}`;
        
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.3
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Gemini API failed");
      }

      const responseData = await response.json();
      const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) {
        setTranslatedText(generatedText);
      }
    } catch (err) {
      console.error(err);
      setError(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };



  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      setError(null);
      setResult(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorderRef.current.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          if (audioChunksRef.current.length === 0) return;
          
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const recordedFile = new File([blob], "recording.webm", { type: 'audio/webm' });
          setFile(recordedFile);
          
          processAudio(recordedFile);
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (e) {
        setError("Microphone access denied or error: " + e.message);
      }
    }
  };

  const handleProcess = () => processAudio(file);

  const processAudio = async (targetFile) => {
    if (modelEngine === 'v1') {
      return processAudioV1(targetFile);
    } else if (modelEngine === 'v3') {
      return processAudioV3(targetFile);
    } else {
      return processAudioV2(targetFile);
    }
  };

  const processAudioV3 = async (targetFile) => {
    if (!targetFile) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (!GROQ_API_KEY) {
        throw new Error("Groq API Key is missing. Please add VITE_GROQ_API_KEY to your .env file.");
      }

      // Step 1: Transcribe audio using Groq Whisper (whisper-large-v3)
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: formData
      });

      if (!whisperRes.ok) {
        const errData = await whisperRes.json();
        throw new Error(errData.error?.message || "Groq Whisper API failed");
      }

      const whisperData = await whisperRes.json();
      const transcript = whisperData.text;

      // Step 2: Process transcript with Groq Llama 3 to format it according to Ermis rules
      const instructions = selectedProject === 'Italian' ? ERMIS_INSTRUCTIONS_ITALIAN : ERMIS_INSTRUCTIONS;
      const systemText = selectedProject === 'Italian' 
        ? "CRITICAL: YOU MUST FOLLOW EVERY SINGLE RULE IN THE ERMIS ITALIAN INSTRUCTIONS WITH 100% ACCURACY AND PRECISION. " + instructions
        : "CRITICAL: YOU MUST FOLLOW EVERY SINGLE RULE IN THE ERMIS INSTRUCTIONS WITH 100% ACCURACY AND PRECISION. DO NOT MISS ANY SPECIAL SYMBOLS, SPEAKER TAGS (<s1>, <s2>), OR OVERLAPPING SPEECH (<ol>). " + instructions;

      const userText = `You MUST achieve 100% accuracy and precision. Here is the raw transcript: "${transcript}". Format it and output JSON. You must rigorously apply ALL rules in the Ermis instructions:
1. NO COMMAS, FULL STOPS, EXCLAMATION MARKS, OR QUESTION MARKS. Strip all punctuation except hyphens/apostrophes as allowed.
2. YOU MUST SPELL OUT SYMBOLS: Replace % with "percent", $ with "dollars", & with "and", € with "euros". Do NOT output the symbols themselves.
3. IF THERE IS ONLY ONE SPEAKER IN THE ENTIRE AUDIO, DO NOT USE THE <s1> TAG AT ALL. Just output the text.
4. Pay extreme attention to identifying multiple speakers using <s1> and <s2>, and properly tag overlapping speech with <ol>. 
5. Do not miss any special symbols, filled pauses [fp], non-lexical vocal sounds [hn], [laughter], or background speech [bg]. 
Transcribe the audio exactly as spoken, formatting strictly as the requested JSON structure without hallucinating. The output must be JSON with keys: spoken_form, written_form, save_state, discard_reasons (array), and speaker_metadata (array of objects with speaker, gender, nativity). Return ONLY valid JSON, no markdown formatting.`;

      const llamaRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: systemText },
            { role: "user", content: userText }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!llamaRes.ok) {
         const errData = await llamaRes.json();
         throw new Error(errData.error?.message || "Groq LLM API failed");
      }

      const llamaData = await llamaRes.json();
      const generatedText = llamaData.choices[0].message.content;
      
      const parsedResult = JSON.parse(generatedText);
      setResult(parsedResult);

    } catch (err) {
      console.error(err);
      setError(`V3 Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAudioV2 = async (targetFile) => {
    if (!targetFile) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Web Workers cannot decode MP3/WebM because they lack AudioContext.
      // So we must decode the audio on the main thread to 16kHz Float32Array first.
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const arrayBuffer = await targetFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      let float32Data = audioBuffer.getChannelData(0); // Get mono channel
      
      // Removed Peak Normalization hack: it amplifies background static noise to 100%, causing Whisper to endlessly hallucinate numbers on silent audio tracks.

      transcriber.transcribe(float32Data);
    } catch (err) {
      console.error(err);
      setError(`V2 Processing failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (modelEngine === 'v2') {
      if (transcriber.transcript) {
        // Dynamically extract all unique speakers (e.g. <s1>, <s2>, [bg], <nt>) from the transcript
        const speakerMatches = transcriber.transcript.match(/(<s\d+>|\[bg\]|<nt>)/g) || [];
        const uniqueSpeakers = [...new Set(speakerMatches)];
        
        // If no speakers found, default to <s1>
        if (uniqueSpeakers.length === 0) uniqueSpeakers.push('<s1>');
        
        const metadata = uniqueSpeakers.map(spk => ({
            speaker: spk,
            gender: "Unknown",
            nativity: "Unknown"
        }));

        setResult({
          save_state: 'Good',
          spoken_form: transcriber.transcript,
          written_form: transcriber.rawTranscript,
          discard_reasons: [],
          speaker_metadata: metadata
        });
        setIsProcessing(false);
      }
    }
  }, [transcriber.transcript, transcriber.rawTranscript, modelEngine]);

  const processAudioV1 = async (targetFile) => {
    if (!targetFile) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (!API_KEY) {
        throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
      }

      // Convert file to base64 for Gemini
      const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          let mimeType = file.type || 'audio/webm';
          if (!mimeType.includes('audio')) {
             mimeType = 'audio/mp3'; // fallback
          }
          const base64Data = reader.result.split(',')[1];
          resolve({ mimeType, data: base64Data });
        };
        reader.onerror = reject;
      });

      const audioInlineData = await getBase64(targetFile);

        const instructions = selectedProject === 'Italian' ? ERMIS_INSTRUCTIONS_ITALIAN : ERMIS_INSTRUCTIONS;
        const systemText = selectedProject === 'Italian' 
          ? "CRITICAL: YOU MUST FOLLOW EVERY SINGLE RULE IN THE ERMIS ITALIAN INSTRUCTIONS WITH 100% ACCURACY AND PRECISION. " + instructions
          : "CRITICAL: YOU MUST FOLLOW EVERY SINGLE RULE IN THE ERMIS INSTRUCTIONS WITH 100% ACCURACY AND PRECISION. DO NOT MISS ANY SPECIAL SYMBOLS, SPEAKER TAGS (<s1>, <s2>), OR OVERLAPPING SPEECH (<ol>). " + instructions;

        const userText = `You MUST achieve 100% accuracy and precision. Capture EVERY SINGLE DETAIL in the audio. You must rigorously apply ALL rules in the Ermis instructions:
1. NO COMMAS, FULL STOPS, EXCLAMATION MARKS, OR QUESTION MARKS. Strip all punctuation except hyphens/apostrophes as allowed.
2. YOU MUST SPELL OUT SYMBOLS: Replace % with "percent", $ with "dollars", & with "and", € with "euros". Do NOT output the symbols themselves.
3. IF THERE IS ONLY ONE SPEAKER IN THE ENTIRE AUDIO, DO NOT USE THE <s1> TAG AT ALL. Just output the text.
4. Pay extreme attention to identifying multiple speakers using <s1> and <s2>, and properly tag overlapping speech with <ol>. 
5. Do not miss any special symbols, filled pauses [fp], non-lexical vocal sounds [hn], [laughter], or background speech [bg]. 
Transcribe the audio exactly as spoken, formatting strictly as the requested JSON structure without hallucinating. The output must be JSON with keys: spoken_form, written_form, save_state, discard_reasons (array), and speaker_metadata (array of objects with speaker, gender, nativity).`;

        const payload = {
        system_instruction: { parts: [{ text: systemText }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: userText },
              { inline_data: { mime_type: audioInlineData.mimeType, data: audioInlineData.data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Gemini API failed");
      }

      const responseData = await response.json();
      const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) throw new Error("No response generated from Gemini");
      
      const parsedResult = JSON.parse(generatedText);
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-primary">Aligner Exam Tool (Ermis)</h2>
          <button onClick={onBack} className="text-sm bg-secondary">Back to Menu</button>
        </div>
        <div className="flex flex-col gap-6 p-8 bg-dark rounded border border-gray-700 text-center">
          <h3 className="text-xl text-white mb-4">Select Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setSelectedProject('English')}
              className="p-8 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
            >
              <h4 className="text-xl font-bold text-indigo-400 mb-2">Ermis English</h4>
              <p className="text-sm text-gray-400">English transcription guidelines</p>
            </button>
            <button 
              onClick={() => setSelectedProject('Italian')}
              className="p-8 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
            >
              <h4 className="text-xl font-bold text-emerald-400 mb-2">Ermis Italian</h4>
              <p className="text-sm text-gray-400">Italian transcription guidelines</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-primary">Aligner Exam Tool ({selectedProject})</h2>
        <div>
          <button onClick={() => setSelectedProject(null)} className="text-sm bg-secondary mr-2">Change Project</button>
          <button onClick={onBack} className="text-sm bg-secondary">Back to Menu</button>
        </div>
      </div>

      <div className="mb-6 p-4 rounded bg-dark border border-gray-700">
        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-700">
          <button 
            onClick={() => setModelEngine('v1')}
            style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: modelEngine === 'v1' ? '#3b82f6' : '#333', color: '#fff', border: '1px solid #3b82f6' }}
          >
            V1: Gemini API (Cloud)
          </button>
          <button 
            onClick={() => setModelEngine('v2')}
            style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: modelEngine === 'v2' ? '#10b981' : '#333', color: '#fff', border: '1px solid #10b981' }}
          >
            V2: TensorFlow Web (100% Free)
          </button>
          <button 
            onClick={() => setModelEngine('v3')}
            style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: modelEngine === 'v3' ? '#f59e0b' : '#333', color: '#fff', border: '1px solid #f59e0b' }}
          >
            V3: Groq Cloud (Fast & Free)
          </button>
        </div>

        {modelEngine === 'v2' && transcriber.isBusy && (
           <div className="mb-4">
             <p className="text-sm text-yellow-400 animate-pulse">Running 3-Brain Pipeline locally in your browser...</p>
             <p className="text-xs text-gray-400 mb-2">{transcriber.currentTask}</p>
             {transcriber.progressItems.length > 0 && transcriber.progressItems.some(i => i.status !== 'ready' && i.status !== 'done') && (
                 <div className="bg-gray-800 p-3 rounded text-xs space-y-1">
                     <p className="text-green-400 font-bold mb-1">Downloading/Installing AI Models (First time only):</p>
                     {transcriber.progressItems.filter(i => i.status !== 'ready' && i.status !== 'done').map((item, idx) => (
                         <div key={item.file || idx} className="flex justify-between">
                             <span className="truncate w-3/4 text-gray-300">{item.file}</span>
                             <span className="text-gray-400">{Math.round(item.progress || 0)}%</span>
                         </div>
                     ))}
                 </div>
             )}
           </div>
        )}

        <h3 className="text-lg mb-2">Upload Audio File</h3>
        <p className="text-sm text-gray-400 mb-4">Upload a .wav, .mp3, or .webm file to transcribe it according to the exact Ermis instructions.</p>
        
        <input 
          type="file" 
          accept=".wav,.mp3,.webm,audio/*" 
          onChange={handleFileChange}
          ref={fileInputRef}
          className="mb-4 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-primary file:text-white
            hover:file:bg-purple-600"
        />

        <div className="flex gap-4">
          <button 
            onClick={toggleRecording} 
            disabled={isProcessing}
            style={{ padding: '10px 24px', backgroundColor: isRecording ? '#ef4444' : '#3b82f6', color: '#fff' }}
            className={isRecording ? "pulse" : ""}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>

          <button 
            onClick={handleProcess} 
            disabled={!file || isProcessing || isRecording}
            style={{ padding: '10px 24px', backgroundColor: (isProcessing || isRecording) ? '#555' : (modelEngine === 'v1' ? '#10b981' : '#8b5cf6'), color: '#fff' }}
            className={isProcessing ? "pulse" : ""}
          >
            {isProcessing ? `Analyzing Audio with ${modelEngine === 'v1' ? 'Gemini' : modelEngine === 'v2' ? 'Local Model' : 'Groq'}...` : `Process Audio (${modelEngine === 'v1' ? 'V1' : modelEngine === 'v2' ? 'V2' : 'V3'})`}
          </button>
        </div>
        
        {file && !isRecording && !isProcessing && (
          <p className="mt-3 text-sm text-green-400">Audio ready: {file.name}</p>
        )}
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-900 border border-red-500 rounded text-white">
          {error}
        </div>
      )}

      {result && (
        <div className="results-container mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl text-green-400">Analysis Complete</h3>
            <div className={`px-3 py-1 rounded text-sm font-bold ${result.save_state === 'Good' ? 'bg-green-600' : 'bg-red-600'}`}>
              Save State: {result.save_state}
            </div>
          </div>

          <div className="mb-6 p-4 bg-dark rounded border border-gray-700">
            <h4 className="text-md text-gray-400 mb-2 font-semibold">Spoken Form Transcription</h4>
            <p className="text-lg" style={{ fontFamily: 'monospace' }}>{result.spoken_form || '(none)'}</p>
          </div>

          <div className="mb-6 p-4 bg-dark rounded border border-gray-700">
            <h4 className="text-md text-gray-400 mb-2 font-semibold">Written Form Transcription</h4>
            <p className="text-lg">{result.written_form || '(none)'}</p>
          </div>

          {result.discard_reasons && result.discard_reasons.length > 0 && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-30 rounded border border-red-800">
              <h4 className="text-md text-red-400 mb-2 font-semibold">Discard Reasons</h4>
              <ul className="list-disc pl-5">
                {result.discard_reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {result.speaker_metadata && result.speaker_metadata.length > 0 && (
            <div className="mb-6 p-4 bg-dark rounded border border-gray-700">
              <h4 className="text-md text-blue-400 mb-2 font-semibold">Speaker Metadata</h4>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="py-2">Speaker</th>
                    <th className="py-2">Gender</th>
                    <th className="py-2">Nativity</th>
                  </tr>
                </thead>
                <tbody>
                  {result.speaker_metadata.map((meta, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 font-mono text-pink-400">{meta.speaker}</td>
                      <td className="py-2">{meta.gender}</td>
                      <td className="py-2">{meta.nativity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedProject === 'Italian' && (
        <div className="mt-8 p-6 bg-dark rounded border border-emerald-700/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl text-emerald-400">Team Communicator</h3>
            <select 
              value={translationDir}
              onChange={(e) => {
                setTranslationDir(e.target.value);
                setTranslatedText('');
              }}
              className="bg-zinc-800 border border-gray-700 text-sm text-gray-300 rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
            >
              <option value="it2en">Italian -&gt; English</option>
              <option value="en2it">English -&gt; Italian</option>
            </select>
          </div>
          <p className="text-sm text-gray-400 mb-4">Translate text for seamless team communication.</p>
          <textarea 
            className="w-full bg-zinc-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 mb-4"
            rows={4}
            placeholder={translationDir === 'it2en' ? "Scrivi qui in italiano..." : "Type here in English..."}
            value={translationText}
            onChange={(e) => setTranslationText(e.target.value)}
          ></textarea>
          <button 
            onClick={handleTranslate} 
            disabled={isTranslating || !translationText.trim()}
            style={{ padding: '8px 16px', backgroundColor: (isTranslating || !translationText.trim()) ? '#555' : '#10b981', color: '#fff' }}
            className={`rounded ${isTranslating ? "pulse" : ""}`}
          >
            {isTranslating ? 'Translating...' : (translationDir === 'it2en' ? 'Translate to English' : 'Translate to Italian')}
          </button>
          
          {translatedText && (
            <div className="mt-4 p-4 bg-zinc-800 rounded border border-gray-700">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {translationDir === 'it2en' ? 'English Translation' : 'Italian Translation'}
              </h4>
              <p className="text-white">{translatedText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
