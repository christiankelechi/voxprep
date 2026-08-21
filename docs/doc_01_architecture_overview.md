# VoxPrepAI Architecture Overview

## Introduction
The VoxPrepAI `web-simulator` is a modern, high-performance web application designed to evaluate engineering and communication skills. It was built using the absolute latest standards in web development for the 2025/2026 era.

## 1. Core Technology Stack
- **React 19:** The UI library. We utilize modern React hooks (`useState`, `useEffect`, `useMemo`, `useRef`) instead of class components. React 19 provides aggressive background compilation and faster hydration.
- **Vite 8:** The build tool. Traditional apps used Webpack or Create-React-App, which are slow and outdated. Vite compiles code instantly using native ES modules (ESM) in the browser, making the development experience blazing fast.
- **Tailwind CSS v4:** A utility-first CSS framework. Rather than writing thousands of lines of custom CSS in separate files, we use inline classes like `flex`, `p-6`, and `bg-zinc-900`. Tailwind v4 integrates natively with Vite without needing obsolete PostCSS plugins.

## 2. Directory Structure Philosophy
Our codebase is structured for scalability:
- `/src/components`: Contains the heavy, stateful view controllers (e.g., `CodingAssessmentView`, `AIInterviewView`). These are the main "pages".
- `/src/utils`: Contains headless logic and services (e.g., `speech.js`, `aiService.js`). By separating logic from UI, we make the app easier to test and maintain.
- `/src/data`: Contains mock data or initial states (e.g., `codingQuestions.js`). In a production setting, this data would eventually come from a database.

## 3. Global vs. Local State
**Local State:** We rely heavily on `useState` within specific components. For example, the `chatLog` in the AI Interview only matters to that specific page. When you leave the page, that state is intentionally destroyed to free up memory.
**Global State:** For a multi-page SaaS, you typically need a global state manager (like Zustand or Redux) to hold user authentication tokens and theme preferences. In VoxPrepAI, global state is handled at the `App.jsx` level using React Router to manage the active view.

## 4. Routing Architecture
We use `react-router-dom` to handle navigation without reloading the browser.
- **Client-Side Routing:** When a user clicks "Vocal Interview", React Router destroys the `MainMenu` component and mounts the `AIInterviewView` component instantly.
- **Single Page Application (SPA):** The browser only downloads `index.html` once. Everything else is dynamically rendered by JavaScript. This is what makes VoxPrepAI feel like a native desktop application rather than a traditional website.

## 5. Security & Environment Variables
- In Vite, any variable that must remain secret (like API keys) is placed in the `.env` file and prefixed with `VITE_`.
- *Crucial Note:* Because this is a frontend application, any key starting with `VITE_` is technically visible to advanced users who inspect the network tab. In a scaled deployment, these keys would be moved to a backend server. However, for a limitless free API like OpenRouter's free tier, exposing the key poses zero financial risk.
