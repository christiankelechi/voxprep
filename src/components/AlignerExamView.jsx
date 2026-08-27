import React, { useState, useRef } from 'react';
import { ERMIS_INSTRUCTIONS } from '../data/ermisInstructions';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URI prefix (e.g., "data:audio/wav;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const determineMimeType = (file) => {
    if (file.type) return file.type;
    const extension = file.name?.split('.').pop().toLowerCase();
    if (extension === 'wav') return 'audio/wav';
    if (extension === 'mp3') return 'audio/mp3';
    if (extension === 'webm') return 'audio/webm';
    return 'audio/wav'; // fallback
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
      const base64Audio = await fileToBase64(targetFile);
      const mimeType = determineMimeType(targetFile);

      const requestBody = {
        contents: [
          {
            parts: [
              { text: ERMIS_INSTRUCTIONS },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json"
        }
      };

      let response;
      let retries = 3;
      let delay = 2000;
      
      while (retries > 0) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          break; // Success!
        }
        
        const errData = await response.json();
        
        // If it's a 503 (high demand) or 429 (rate limit) and we have retries left
        if ((response.status === 503 || response.status === 429) && retries > 1) {
          retries--;
          setIsProcessing(true);
          setError(`Google Servers busy. Retrying in ${delay/1000}s... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw new Error(errData.error?.message || 'API request failed');
        }
      }

      const data = await response.json();
      
      let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) throw new Error("No response generated");
      
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
            {isProcessing ? "Analyzing Audio with Gemini 1.5 Pro..." : "Process Audio"}
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
