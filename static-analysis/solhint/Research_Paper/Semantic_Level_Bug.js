const { exec } = require('child_process');

console.log("Running static analysis with solhint...");
console.log("Target: Semantic Level Bug Vulnerability\n");

exec(
  'npx solhint "contracts/Research_Paper/Semantic_Level_Bug/Semantic_Level_Bug_Victim.sol"',
  (error, stdout, stderr) => {
    if (stdout) {
      console.log(`solhint output:\n${stdout}`);
    }
    if (stderr) {
      console.error(`solhint stderr:\n${stderr}`);
    }
    if (error && !stdout && !stderr) {
      console.error(`Error executing solhint: ${error}`);
    }
  }
);
