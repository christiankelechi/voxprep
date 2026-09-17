import { useState, useRef, useEffect, useCallback } from 'react';

export function useTranscriber() {
    const [isReady, setIsReady] = useState(false);
    const [progressItems, setProgressItems] = useState([]);
    const [transcript, setTranscript] = useState('');
    const [rawTranscript, setRawTranscript] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [currentTask, setCurrentTask] = useState('');
    
    const workerTranscriber = useRef(null);
    const workerDiarizer = useRef(null);
    const workerAi = useRef(null);
    
    const resultsRef = useRef({
        transcription: null,
        diarization: null
    });

    useEffect(() => {
        if (!workerTranscriber.current) {
            workerTranscriber.current = new Worker(new URL('../workers/transcriberWorker.js', import.meta.url), { type: 'module' });
            workerDiarizer.current = new Worker(new URL('../workers/diarizationWorker.js', import.meta.url), { type: 'module' });
            workerAi.current = new Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' });

            const handleMessage = (workerName, e) => {
                if (e.data.status === 'progress') {
                    setProgressItems(prev => {
                        const map = new Map(prev.map(i => [i.file, i]));
                        map.set(e.data.data.file, e.data.data);
                        return Array.from(map.values());
                    });
                } else if (e.data.status === 'error') {
                    console.error(`${workerName} Error:`, e.data.error);
                    setCurrentTask(`Error in ${workerName}: ${e.data.error}`);
                    setIsBusy(false);
                }
            };

            workerTranscriber.current.addEventListener('message', (e) => {
                handleMessage('Transcriber', e);
                if (e.data.status === 'complete') {
                    resultsRef.current.transcription = e.data;
                    checkMerge();
                }
            });

            workerDiarizer.current.addEventListener('message', (e) => {
                handleMessage('Diarizer', e);
                if (e.data.status === 'complete') {
                    resultsRef.current.diarization = e.data;
                    checkMerge();
                }
            });

            workerAi.current.addEventListener('message', (e) => {
                handleMessage('Semantic AI', e);
                if (e.data.status === 'complete') {
                    setTranscript(e.data.output);
                    setIsBusy(false);
                    setCurrentTask('');
                }
            });
        }

        return () => {
            if (workerTranscriber.current) workerTranscriber.current.terminate();
            if (workerDiarizer.current) workerDiarizer.current.terminate();
            if (workerAi.current) workerAi.current.terminate();
        };
    }, []);

    const checkMerge = useCallback(() => {
        const { transcription, diarization } = resultsRef.current;
        if (transcription && diarization) {
            setCurrentTask('Merging & Semantic Analysis...');
            // Merge Diarization and Transcription
            let mergedText = "";
            let currentSpeaker = null;
            
            const words = transcription.timestamps || [];
            const segments = diarization.segments || [];

            // A very simple merge logic for demonstration
            if (segments.length === 0 || words.length === 0) {
                 mergedText = transcription.output;
            } else {
                 for (let word of words) {
                     const mid = (word.timestamp[0] + word.timestamp[1]) / 2;
                     const segment = segments.find(s => mid >= s.start && mid <= s.end);
                     const speaker = segment ? segment.speaker : '<s1>';
                     if (speaker !== currentSpeaker) {
                         mergedText += ` ${speaker} `;
                         currentSpeaker = speaker;
                     }
                     mergedText += word.text;
                 }
            }

            // Fallback rule processing on the merged text (cleaning up spaces etc)
            mergedText = mergedText.replace(/\s+/g, ' ').trim();

            // Run through Semantic LLM
            workerAi.current.postMessage({
                id: Date.now(),
                messages: [
                    { role: 'system', content: 'You are an Ermis auditor. Review the transcript. If any word seems mispronounced or contextually ambiguous (e.g. libary instead of library, or authentication/verification), format it as {{corrected_word}}. Leave everything else EXACTLY as is, including tags like [laughter] and <s1>. Return only the corrected text.' },
                    { role: 'user', content: mergedText }
                ],
                max_new_tokens: 500
            });
        }
    }, []);

    const transcribe = useCallback((audioBuffer) => {
        setIsBusy(true);
        setCurrentTask('Transcribing and Diarizing (Running 2 Models)...');
        setTranscript('');
        setRawTranscript('');
        resultsRef.current = { transcription: null, diarization: null };
        
        workerTranscriber.current.postMessage({ id: 1, audio: audioBuffer });
        workerDiarizer.current.postMessage({ id: 2, audio: audioBuffer, sampleRate: 16000 });
    }, []);

    return {
        isReady: true,
        progressItems,
        isBusy,
        currentTask,
        transcript,
        rawTranscript: resultsRef.current.transcription?.raw || '',
        transcribe
    };
}
