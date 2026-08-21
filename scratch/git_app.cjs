const { execSync } = require('child_process');
try {
  console.log(execSync('git add src/App.jsx').toString());
  console.log(execSync('git commit -m "Replace navbar icon with custom logo"').toString());
} catch (error) {
  console.error("Git error:", error.message);
}
