const { execSync } = require('child_process');
try {
  console.log(execSync('git add index.html').toString());
  console.log(execSync('git commit -m "Update favicon to new VoxPrepAI logo"').toString());
} catch (error) {
  console.error("Git error:", error.message);
}
