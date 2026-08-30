import os
from groq import Groq

# Use the API key from the .env file
os.environ["GROQ_API_KEY"] = "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"

client = Groq()
completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
      {
        "role": "user",
        "content": "hi"
      },
      {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      {
        "role": "user",
        "content": ""
      }
    ],
    temperature=1,
    max_tokens=2048, # Groq python SDK uses max_tokens usually, but let's keep it close to user's code
    top_p=1,
    stream=True,
    stop=None
)

for chunk in completion:
    print(chunk.choices[0].delta.content or "", end="")
