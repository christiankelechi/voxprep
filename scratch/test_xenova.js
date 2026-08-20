import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

async function test() {
    console.log("Loading model...");
    const generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat');
    
    console.log("Generating...");
    const prompt = "<|im_start|>user\nHello!<|im_end|>\n<|im_start|>assistant\n";
    const output = await generator(prompt, { max_new_tokens: 50 });
    
    console.log("Output:");
    console.log(output);
}

test().catch(console.error);
