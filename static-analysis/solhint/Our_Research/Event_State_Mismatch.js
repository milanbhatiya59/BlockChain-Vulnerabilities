const { exec } = require('child_process');

console.log("Running static analysis with solhint...");
console.log("Target: Event-State Mismatch Vulnerability\n");

// This script simulates how a developer might integrate a static analysis tool like solhint
// into their CI/CD pipeline or build process using Node.js.
// Solhint checks for security vulnerabilities and style guide violations.

exec(
  'npx solhint "contracts/Our_Research/Event_State_Mismatch/Event_State_Mismatch_Victim.sol"',
  (error, stdout, stderr) => {
    // solhint exits with a non-zero code if it finds issues.
    // We should still log the output.
    if (stdout) {
      console.log(`solhint output:\n${stdout}`);
    }
    if (stderr) {
      console.error(`solhint stderr:\n${stderr}`);
    }
    // If there's an error object but there was output, it's likely just linting errors.
    // If there's no output, then it's a more serious execution error.
    if (error && !stdout && !stderr) {
      console.error(`Error executing solhint: ${error}`);
    }
  }
);
