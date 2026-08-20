# The AI Vocal Interview UI Architecture

## Introduction
The AI Vocal Interview module (`AIInterviewView.jsx`) is designed to simulate a high-pressure, live technical interview. The UX (User Experience) relies entirely on maintaining a highly responsive, glowing interface that provides continuous feedback to the user.

## 1. Complex State Management
This view manages several interlocking boolean states:
- `isInterviewing`: True when a session is active. It hides the PDF upload screen and shows the live chat interface.
- `isLoading`: True when the AI is computing a response. It triggers the bouncing dots animation.
- `isListening`: True when the user is speaking into the microphone. It triggers the pulsing "Listening..." badge.

## 2. The Glowing Microphone Interaction
To make the app feel "premium", the "Hold to Speak" button state is closely tied to the `isListening` state.
- When `isListening` is true, we render a highly stylized `<div className="animate-[glow_2s_ease-in-out_infinite_alternate]">`.
- This glow effect utilizes custom CSS keyframes defined in `index.css` to create a smooth, breathing animation. This assures the user that their microphone is actively capturing data.

## 3. Real-Time Feedback Loops
Unlike the coding simulator, an interview must feel synchronous.
1. The user clicks "Hold to Speak" and talks.
2. The browser translates the speech to text (Doc 09).
3. The text is immediately appended to the `chatLog` as a User message, proving to the user they were heard.
4. The API request is fired to OpenRouter.
5. The AI's response is appended to the `chatLog`.
6. The browser immediately synthesizes the text back into speech audio.

## 4. The Evaluation Generation
When the user clicks "End Session", the standard chat loop ends. We take the entire `chatLog` array, map it into a massive text transcript string, and send it to the AI with a strict grading rubric. 
The AI generates the final score and actionable feedback, which replaces the entire chat UI with a clean, centered "Evaluation Report" dashboard.
