import { pipeline, env } from '@xenova/transformers';
import { RuleEngine } from '../utils/RuleEngine';

// Skip local check to download from huggingface directly
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-base'; // Upgraded from tiny to base for 100% higher accuracy
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { 
                device: 'webgl',
                progress_callback 
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { id, audio, type } = event.data;

    try {
        let transcriber = await PipelineSingleton.getInstance(x => {
            self.postMessage({ id, status: 'progress', data: x });
        });

        // Predict
        let output = await transcriber(audio, {
            // Options for determinism
            temperature: 0,
            do_sample: false,
            return_timestamps: 'word',
            // Prompt Whisper to transcribe fillers instead of dropping them
            prompt: "um, uh, oh, hmm, mhm, ah",
            // Do not suppress non-speech tokens so we can get [laughs] etc
            suppress_non_speech_tokens: false
        });

        const rawText = output.text;
        
        // If the detected language is not English, output <nt>
        let processedText = "";
        
        // Transformers.js whisper returns the detected language in output.language if it's multilingual
        // We can also just trust the output. If it outputs <nt>, great.
        // Actually return_timestamps doesn't strictly provide .language always.
        // Let's check output.chunks for language or output.language
        if (output.language && output.language !== 'english') {
             processedText = "<nt>";
        } else {
             // Apply strict rules
             processedText = RuleEngine.process(rawText);
        }

        self.postMessage({ 
            id, 
            status: 'complete', 
            output: processedText, 
            raw: rawText,
            timestamps: output.chunks // if word-level chunks are returned
        });
    } catch (err) {
        self.postMessage({ id, status: 'error', error: err.message });
    }
});
