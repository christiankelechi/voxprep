import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'text-generation';
    static model = 'Xenova/Qwen1.5-0.5B-Chat'; // Super lightweight and capable
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { 
                device: 'webgl',
                progress_callback 
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { id, messages, max_new_tokens = 150 } = event.data;

    try {
        let generator = await PipelineSingleton.getInstance(x => {
            self.postMessage({ id, status: 'progress', data: x });
        });

        // Format messages for Qwen ChatML
        let prompt = messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join('\n') + '\n<|im_start|>assistant\n';

        let output = await generator(prompt, {
            max_new_tokens,
            temperature: 0.0,
            do_sample: false,
            return_full_text: false // IMPORTANT: prevents it from returning the prompt!
        });

        const botReply = output[0].generated_text.replace('<|im_end|>', '').trim();

        self.postMessage({ id, status: 'complete', output: botReply });
    } catch (err) {
        self.postMessage({ id, status: 'error', error: err.message });
    }
});
