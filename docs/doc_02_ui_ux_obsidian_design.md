# The "Obsidian" UI/UX Design System

## Introduction
VoxPrepAI was specifically designed to compete globally with top-tier SaaS platforms. To achieve this, we abandoned generic bootstrap designs and implemented a bespoke "Obsidian" minimalist theme inspired by tools like Linear and Vercel.

## 1. Color Palette & The Obsidian Aesthetic
The defining characteristic of modern premium software is the use of deep, rich dark modes rather than plain black (`#000000`).
- **Backgrounds:** We use a custom color called `obsidian` (`#0a0a0a`) and `obsidian-light` (`#121212`). These provide a soft, luxurious dark mode that reduces eye strain.
- **Accents:** We rely on `zinc` for text and borders, as zinc has a subtle bluish-purple undertone that feels more premium than standard gray.
- **Highlights:** Actions and important elements glow with `indigo-500`, `cyan-400`, and `emerald-500`.

## 2. Typography
A premium UI requires premium typography.
- **Font Stack:** We imported the `Inter` font via Google Fonts. Inter is specifically designed for highly legible computer interfaces.
- **Tracking (Letter Spacing):** You will notice utility classes like `tracking-tight` on headers and `tracking-wide` on sub-headers. Adjusting letter spacing is a classic designer trick to make text look sophisticated.

## 3. Micro-Interactions
An interface must feel "alive." We achieve this using CSS animations and transitions:
- **Hover States:** Almost every button has `transition-colors duration-300` so that when a user hovers, the color shifts smoothly rather than instantly snapping.
- **Pulse and Bounce:** In the AI interview and coding chat, when the AI is "thinking", we render small pulsing dots (`animate-bounce`). This provides psychological feedback to the user that the system is working, preventing them from clicking away or thinking the app froze.
- **Glow Effects:** We use custom shadow classes like `shadow-[0_0_15px_rgba(255,255,255,0.1)]` to give active elements a subtle, high-end glow.

## 4. Glassmorphism & Translucency
To create depth, we frequently use opacity modifiers on colors, such as `bg-zinc-800/50`. The `/50` tells Tailwind to make the background 50% transparent. When layered over the deep obsidian background, it creates a subtle glass-like effect that looks incredibly modern.

## 5. CSS Variables
In `index.css`, we define standard CSS variables (e.g., `--color-obsidian: #0a0a0a`). This allows Tailwind to dynamically read these colors and generate utility classes like `bg-obsidian` on the fly, keeping our code dry and centralized.
