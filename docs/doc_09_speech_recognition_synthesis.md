# Speech Recognition & Synthesis APIs

## Introduction
To create a true "Vocal Interview", we must convert the user's voice into text, and the AI's text back into a voice. We achieved this without using expensive external services like ElevenLabs or Google Cloud Speech. We used the browser's native Web Speech APIs.

## 1. The `SpeechService` Utility
In `src/utils/speech.js`, we wrapped the chaotic native APIs into a clean, promise-based class called `SpeechService`. By moving this out of the UI components, we ensure the React components remain clean and only handle visual states.

## 2. Speech Recognition (Speech-to-Text)
We use `window.SpeechRecognition` (or `webkitSpeechRecognition` for Chrome compatibility).
- **The Process:** When `speechService.listen()` is called, we instantiate a recognition object and call `.start()`.
- **Handling Permissions:** The browser automatically asks the user for microphone permissions the first time this is called.
- **Continuous Listening:** The API fires an `onresult` event when it detects words. We grab `event.results[0][0].transcript`.
- **Promise Resolution:** Once the user stops speaking, the `onend` event fires, resolving the Javascript Promise and returning the final text string back to React.

## 3. Speech Synthesis (Text-to-Speech)
We use `window.speechSynthesis` to give the AI a voice.
- **The Process:** When `speechService.speak(text)` is called, we create a new `SpeechSynthesisUtterance(text)`.
- **Voice Selection:** Different operating systems (Windows, macOS, iOS) have different built-in voices. We iterate through `speechSynthesis.getVoices()` to find the best available English voice.
- **Playback Control:** We hook into the `.onend` event of the utterance so that React knows exactly when the AI has finished talking, allowing us to cleanly re-enable the user's microphone button.

## 4. Cross-Browser Limitations
Native speech APIs are incredibly powerful and free, but they are heavily reliant on the browser. Chrome has the best implementation, while Firefox and Safari have limited support. For a global SaaS, if native APIs fail, the ultimate fallback is simply relying on the text chat interface, which works 100% of the time.
