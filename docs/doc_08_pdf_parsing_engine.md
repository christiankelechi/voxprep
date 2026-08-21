# Client-Side PDF Parsing Engine

## Introduction
When a user uploads their CV to start an interview, the standard web approach is to upload the file to an AWS S3 bucket, parse it on a backend Python server, and send the text back. This violates user privacy and costs server money. 

VoxPrepAI parses PDFs 100% locally in the browser using `pdfjs-dist`.

## 1. The PDF.js Architecture
PDFs are not text files; they are complex binary blobs of drawing commands. Mozilla's `pdfjs-dist` is the industry standard for decoding these binary files in JavaScript.

## 2. Web Worker Configuration in Vite
Parsing a PDF is computationally heavy. If you do it on the main JavaScript thread, the browser UI will freeze.
- We must run PDF.js in a background thread called a **Web Worker**.
- In standard Webpack, configuring this worker is a nightmare. In Vite 8, it is incredibly clean:
```javascript
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// We tell pdf.js where to find its background worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
```
- The `?url` suffix tells Vite: "Do not execute this file. Just bundle it and give me the raw URL to the file so I can spin it up as a Web Worker."

## 3. Extracting the Text
When the user selects a file:
1. `file.arrayBuffer()`: We read the raw binary data of the PDF.
2. `pdfjsLib.getDocument()`: We send the binary buffer to the Web Worker.
3. **Looping Pages:** We loop through `pdf.numPages`. For each page, we request the `TextContent`.
4. **String Assembly:** `content.items.map(item => item.str)` extracts the actual text layers from the drawing commands. We stitch these strings together into a massive single string.

## 4. Privacy and Context Injection
Because this happens 100% locally:
- The user's private CV never leaves their computer. It is never saved to a database.
- We take the extracted string and inject the first 3000 characters directly into the hidden System Prompt sent to the OpenRouter AI. This is how the AI "knows" their background before the interview even starts.
