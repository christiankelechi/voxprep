class LocalAIService {
  constructor() {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/aiWorker.js', import.meta.url), {
        type: 'module'
      });
      this.callbacks = {};

      this.worker.addEventListener('message', (event) => {
        const { id, status, data, output, error } = event.data;
        
        if (status === 'progress' && this.onProgress) {
          this.onProgress(data);
        } else if (status === 'complete' && this.callbacks[id]) {
          this.callbacks[id].resolve(output);
          delete this.callbacks[id];
        } else if (status === 'error' && this.callbacks[id]) {
          this.callbacks[id].reject(new Error(error));
          delete this.callbacks[id];
        }
      });
    }
  }

  setProgressListener(callback) {
    this.onProgress = callback;
  }

  async generate(messages, max_new_tokens = 150) {
    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      this.callbacks[id] = { resolve, reject };
      
      this.worker.postMessage({
        id,
        messages,
        max_new_tokens
      });
    });
  }
}

export const aiService = new LocalAIService();
