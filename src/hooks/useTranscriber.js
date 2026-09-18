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

        }

        return () => {
            if (workerTranscriber.current) workerTranscriber.current.terminate();
            if (workerDiarizer.current) workerDiarizer.current.terminate();
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

            // Rule processing on the merged text (cleaning up spaces etc)
            mergedText = mergedText.replace(/\s+/g, ' ').trim();
            
            // Ermis Rule: No commas, no full stops, no question marks, no exclamation marks
            mergedText = mergedText.replace(/[.,!?]/g, '');
            
            // Ermis Rule: Transcribe the dollar sign ($), euro (€), percent (%), and ampersand (&) as words.
            mergedText = mergedText.replace(/%/g, ' percent').replace(/\$/g, 'dollars ').replace(/&/g, ' and ').replace(/€/g, 'euros ');

            // Mathematically construct the Written Form (by stripping Ermis tags) to match Gemini formatting
            let writtenText = mergedText.replace(/(<s\d+>|\[bg\]|<nt>|\[laughter\]|\[fp\]|\[hn\])/g, '').replace(/\s+/g, ' ').trim();

            // Set final deterministic results directly without hallucination
            setTranscript(mergedText);
            setRawTranscript(writtenText);
            setIsBusy(false);
            setCurrentTask('');
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
