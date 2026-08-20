# AI Copilot & OpenRouter Integration

## Introduction
The OmniAssess platform relies heavily on AI to provide an interactive, premium experience. After experimenting with heavy local models (which crashed browsers), we standardized on **OpenRouter**, an ultra-reliable, free REST API.

## 1. The OpenRouter API Architecture
OpenRouter acts as a router. Instead of connecting directly to Meta or Google, we connect to OpenRouter, which proxies the request to the fastest available open-source model.
- **The Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **The Standard:** OpenRouter strictly follows the OpenAI API specification. This means the payload format (`messages: [{role, content}]`) is exactly the same as if we were using ChatGPT-4. If you ever want to upgrade to a paid model, you change exactly one string (the `model` ID) and everything else works perfectly.

## 2. The "openrouter/free" Alias
To guarantee the platform remains 100% free and immune to model deprecations, we use the model ID `openrouter/free`. 
- OpenRouter constantly hosts free models (like Llama 3 or Gemma 2). 
- If one goes offline, OpenRouter automatically routes `openrouter/free` to the next available one. Your code never breaks.

## 3. Prompt Engineering
The AI is only as smart as the instructions it is given.
- **System Prompt:** We start every array with a hidden system message: `{ role: 'system', content: 'You are Cosmo, an expert coding tutor.' }`. This forces the LLM to adopt a specific persona.
- **Context Injection:** In the coding simulator, we inject the problem description, the user's current code, and their chat message into a massive template string. The AI reads this entire context invisibly before answering.

## 4. Actionable Solutions Feature
When a user clicks "Reveal Solution", we bypass the standard chat loop.
- We forcefully inject a prompt asking for the optimal Python solution in a code block.
- We then parse the JSON response (`data.choices[0].message.content`) and push it into the React state `chatLog`.
- Because Tailwind has typography plugins and the UI is designed to handle `whitespace-pre-wrap`, the AI's raw markdown and code blocks render beautifully in the chat window.
