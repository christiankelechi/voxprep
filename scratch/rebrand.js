const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/MainMenu.jsx',
  'src/components/CodingAssessmentView.jsx',
  'src/components/AIInterviewView.jsx',
  'src/App.jsx',
  'index.html',
  'docs/doc_01_architecture_overview.md',
  'docs/doc_02_ui_ux_obsidian_design.md',
  'docs/doc_03_coding_simulator_engine.md',
  'docs/doc_04_pyodide_wasm_execution.md',
  'docs/doc_05_ai_copilot_integration.md',
  'docs/doc_06_openrouter_llm_api.md',
  'docs/doc_07_vocal_interview_ui.md',
  'docs/doc_08_pdf_parsing_engine.md',
  'docs/doc_09_speech_recognition_synthesis.md',
  'docs/doc_10_deployment_future_scaling.md'
];

const basePath = 'c:\\2026\\crossover\\englishgrammar\\web-simulator';

filesToUpdate.forEach(relPath => {
  const fullPath = path.join(basePath, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const newContent = content.replace(/OmniAssess/g, 'VoxPrepAI');
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      console.log(`Updated: ${relPath}`);
    }
  } else {
    console.warn(`Missing: ${relPath}`);
  }
});
console.log('Rebrand complete.');
