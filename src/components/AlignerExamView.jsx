import React, { useState, useRef } from 'react';
import { ERMIS_INSTRUCTIONS } from '../data/ermisInstructions';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export default function AlignerExamView({ onBack }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
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
    if (!targetFile) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      if (!GROQ_API_KEY) {
        throw new Error("Groq API Key is missing. Please add VITE_GROQ_API_KEY to your .env file.");
      }

      // ---------------------------------------------------------
      // STAGE 1: Audio to Text via Groq Whisper API
      // ---------------------------------------------------------
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('model', 'whisper-large-v3');
      formData.append('temperature', '0');
      formData.append('prompt', '[fp], [hn], [laughter], [bg], [artifact], <s1>, <s2>, <ol>, </ol>, <ct>, (()), {{}}, <ga>, <na>, <ns>, <nt>, <sc>');

      const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: formData
      });

      if (!sttResponse.ok) {
        const err = await sttResponse.json();
        throw new Error(err.error?.message || "Speech-to-Text failed");
      }

      const sttData = await sttResponse.json();
      const transcript = sttData.text;

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No speech detected in audio.");
      }

      // ---------------------------------------------------------
      // STAGE 2: Text to JSON Analysis via Groq Llama 3 API
      // ---------------------------------------------------------
      const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: ERMIS_INSTRUCTIONS },
            { role: 'user', content: `Please align, analyze, and format the following audio transcript strictly as the requested JSON structure:\n\n${transcript}` }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!llmResponse.ok) {
        const err = await llmResponse.json();
        throw new Error(err.error?.message || "LLM Analysis failed");
      }

      const llmData = await llmResponse.json();
      let generatedText = llmData.choices?.[0]?.message?.content;
      
      if (!generatedText) throw new Error("No response generated from LLM");
      
      const parsedResult = JSON.parse(generatedText);
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-primary">Aligner Exam Tool (Ermis)</h2>
        <button onClick={onBack} className="text-sm bg-secondary">Back to Menu</button>
      </div>

      <div className="mb-6 p-4 rounded bg-dark border border-gray-700">
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
            style={{ padding: '10px 24px', backgroundColor: (isProcessing || isRecording) ? '#555' : '#10b981', color: '#fff' }}
            className={isProcessing ? "pulse" : ""}
          >
            {isProcessing ? "Analyzing Audio with Groq..." : "Process Audio"}
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
    </div>
  );
}
