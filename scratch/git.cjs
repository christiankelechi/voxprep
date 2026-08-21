const { execSync } = require('child_process');
try {
  console.log(execSync('git add .').toString());
  console.log(execSync('git commit -m "Rebrand to VoxPrepAI and add custom logo"').toString());
  console.log(execSync('git push').toString());
} catch (error) {
  console.error("Git error:", error.message);
  if (error.stdout) console.error("Stdout:", error.stdout.toString());
  if (error.stderr) console.error("Stderr:", error.stderr.toString());
}
