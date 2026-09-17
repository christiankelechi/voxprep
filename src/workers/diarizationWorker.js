import { pipeline, env } from '@xenova/transformers';
import { kmeans } from 'ml-kmeans';

// Disable local models since we will fetch from huggingface
env.allowLocalModels = false;
env.useBrowserCache = true;

class DiarizationPipeline {
    static instance = null;
    
    static async getInstance(progress_callback) {
        if (this.instance === null) {
            this.instance = await pipeline('feature-extraction', 'Xenova/wavlm-base-plus-sv', {
                device: 'webgl',
                progress_callback
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (e) => {
    const { id, audio, sampleRate = 16000 } = e.data;

    try {
        const extractor = await DiarizationPipeline.getInstance(x => {
            self.postMessage({ id, status: 'progress', data: x });
        });

        // 1. Chunk audio into 3s segments with NO overlap to slash processing time by 80%
        const chunkSize = Math.floor(3 * sampleRate);
        const stepSize = Math.floor(3 * sampleRate);
        
        const chunks = [];
        const timestamps = [];
        
        for (let i = 0; i < audio.length - chunkSize; i += stepSize) {
            const chunk = audio.slice(i, i + chunkSize);
            chunks.push(chunk);
            timestamps.push({
                start: i / sampleRate,
                end: (i + chunkSize) / sampleRate
            });
        }

        if (chunks.length === 0 && audio.length > 0) {
           chunks.push(audio);
           timestamps.push({ start: 0, end: audio.length / sampleRate });
        }

        // 2. Extract embeddings and calculate RMS volume for all chunks
        const embeddings = [];
        const volumes = [];
        let maxRms = 0;

        for (let chunk of chunks) {
            // Calculate RMS (Root Mean Square) volume
            let sumSquares = 0;
            for (let i = 0; i < chunk.length; i++) {
                sumSquares += chunk[i] * chunk[i];
            }
            const rms = Math.sqrt(sumSquares / chunk.length);
            volumes.push(rms);
            if (rms > maxRms) maxRms = rms;

            // Predict
            const output = await extractor(chunk);
            embeddings.push(Array.from(output.data));
        }

        // 3. Cluster using K-Means
        if (embeddings.length === 0) {
            self.postMessage({ id, status: 'complete', segments: [] });
            return;
        }

        const bgThreshold = maxRms * 0.15; // 15% of max volume
        const k = Math.min(2, embeddings.length); // Assume up to 2 speakers
        let segments = [];
        
        if (k > 1) {
            const ans = kmeans(embeddings, k, { initialization: 'kmeans++' });
            
            for (let i = 0; i < timestamps.length; i++) {
                let speakerTag = `<s${ans.clusters[i] + 1}>`;
                if (volumes[i] < bgThreshold) {
                    speakerTag = '[bg]'; // Override distant/quiet speech as background
                }
                segments.push({
                    start: timestamps[i].start,
                    end: timestamps[i].end,
                    speaker: speakerTag
                });
            }
        } else {
             for (let i = 0; i < timestamps.length; i++) {
                let speakerTag = `<s1>`;
                if (volumes[i] < bgThreshold) {
                    speakerTag = '[bg]';
                }
                segments.push({
                    start: timestamps[i].start,
                    end: timestamps[i].end,
                    speaker: speakerTag
                });
            }
        }

        self.postMessage({ id, status: 'complete', segments });
    } catch (err) {
        self.postMessage({ id, status: 'error', error: err.message });
    }
});
