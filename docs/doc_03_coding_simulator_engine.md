# Coding Simulator Engine

## Introduction
The Coding Assessment environment is the flagship feature of VoxPrepAI. It had to look and feel exactly like a professional IDE (Integrated Development Environment) like VS Code.

## 1. The Monaco Editor Integration
To achieve a world-class typing experience, we integrated `@monaco-editor/react`. 
- **What is Monaco?** Monaco is the exact same underlying text editor engine that powers Microsoft's Visual Studio Code.
- **Why we used it:** Standard `<textarea>` HTML tags cannot handle syntax highlighting, line numbers, or smart indentation. Monaco provides all of this out-of-the-box.
- **Custom Configuration:** We pass specific options to the editor, such as `fontFamily: "'JetBrains Mono', monospace"` and `smoothScrolling: true`. This ensures the code looks professional and types beautifully.

## 2. Split-Pane Architecture
The view is divided into complex flexbox regions:
- **Left Panel (Width: 400px fixed):** This holds the problem description and the Cosmo AI Chat. It uses `flex-col` so the chat always stays anchored to the bottom.
- **Right Panel (Flex-1):** This expands to fill the remaining screen space. It houses the Monaco Editor on top and the Test Results console on the bottom.

## 3. State Management in the Simulator
Managing the state of code requires careful memory management:
- `code` state: Every time the user types a character, Monaco updates the `code` string in React.
- `levelIndex`: An integer tracking which question the user is currently solving. When a user passes all tests and clicks "Next Level", `levelIndex` increments, forcing React to swap out the prompt and reset the `code` string to the new initial template.

## 4. The Test Results Console
When the user clicks "Run Tests", we execute the code (detailed in Doc 04). The results populate a `testResults` array.
- We iterate over this array using `.map()` to render a list of pass/fail indicators.
- We use conditional rendering (`res.passed ? <GreenCheck/> : <RedX/>`) to visually guide the user.
- If an error is caught (e.g., a Python SyntaxError), we extract `err.toString()` and display it in bright red text, giving the user immediate, actionable debugging information.
